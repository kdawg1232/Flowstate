const { withEntitlementsPlist, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin to enable Screen Time APIs with Shield Customization.
 * Creates 3 extensions:
 * - FlowStateMonitor: Device Activity Monitor (applies shields when limit reached)
 * - FlowStateShieldConfig: Shield Configuration (customizes shield UI)
 * - FlowStateShieldAction: Shield Action (handles button taps on shield)
 */
module.exports = function withScreenTime(config) {
  // 1. Add Entitlements to the Main App
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.family-controls'] = true;
    config.modResults['com.apple.security.application-groups'] = ['group.com.karthik.flowstate'];
    return config;
  });

  // 2. Add Info.plist entries for the Main App
  config = withInfoPlist(config, (config) => {
    if (!config.modResults['UIBackgroundModes']) {
      config.modResults['UIBackgroundModes'] = [];
    }
    if (!config.modResults['UIBackgroundModes'].includes('fetch')) {
      config.modResults['UIBackgroundModes'].push('fetch');
    }
    return config;
  });

  // 3. Create Extension Targets and required files
  config = withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const projectRoot = config.modRequest.projectRoot;
    const iosRoot = path.join(projectRoot, 'ios');
    const mainAppName = config.modRequest.projectName || 'FlowState';
    const mainAppRoot = path.join(iosRoot, mainAppName);
    const nativeSourceDir = path.join(projectRoot, 'native-ios', 'ScreenTime');
    const appVersion = config.version || '1.0.0';

    // Helper: Get target key by name
    const getTargetKey = (targetName) => {
      const targets = project.pbxNativeTargetSection();
      for (const key in targets) {
        const target = targets[key];
        if (target && typeof target === 'object' && 
            (target.name === `"${targetName}"` || target.name === targetName)) {
          return key;
        }
      }
      return null;
    };

    // Helper: Get the Sources build phase for a target
    const getSourcesBuildPhase = (targetKey) => {
      const targets = project.pbxNativeTargetSection();
      const target = targets[targetKey];
      if (!target || !target.buildPhases) return null;
      
      const buildPhases = project.pbxBuildPhaseObj ? project.hash.project.objects.PBXSourcesBuildPhase : project.pbxSourcesBuildPhaseSection();
      
      for (const phaseRef of target.buildPhases) {
        const phaseKey = phaseRef.value;
        if (buildPhases[phaseKey] && buildPhases[phaseKey].isa === 'PBXSourcesBuildPhase') {
          return phaseKey;
        }
      }
      return null;
    };

    // Helper: Check if file is already in a build phase
    const fileInBuildPhase = (buildPhaseKey, fileName) => {
      const buildPhases = project.pbxSourcesBuildPhaseSection();
      const phase = buildPhases[buildPhaseKey];
      if (!phase || !phase.files) return false;
      
      const buildFiles = project.pbxBuildFileSection();
      for (const fileEntry of phase.files) {
        const buildFile = buildFiles[fileEntry.value];
        if (buildFile && buildFile.fileRef) {
          const fileRefs = project.pbxFileReferenceSection();
          const fileRef = fileRefs[buildFile.fileRef];
          if (fileRef && (fileRef.name === fileName || fileRef.name === `"${fileName}"` ||
                         fileRef.path?.includes(fileName))) {
            return true;
          }
        }
      }
      return false;
    };

    // Helper: Add source file to a specific target's build phase
    const addSourceFileToTarget = (filePath, targetKey, groupKey) => {
      const sourcesBuildPhase = getSourcesBuildPhase(targetKey);
      if (!sourcesBuildPhase) {
        console.log(`[withScreenTime] Could not find Sources build phase for target`);
        return;
      }

      const fileName = path.basename(filePath);
      
      // Check if already added
      if (fileInBuildPhase(sourcesBuildPhase, fileName)) {
        console.log(`[withScreenTime] ${fileName} already in target's Sources phase`);
        return;
      }

      // Add file reference
      const fileRefUuid = project.generateUuid();
      const buildFileUuid = project.generateUuid();
      
      project.pbxFileReferenceSection()[fileRefUuid] = {
        isa: 'PBXFileReference',
        fileEncoding: 4,
        lastKnownFileType: 'sourcecode.swift',
        name: `"${fileName}"`,
        path: `"${filePath}"`,
        sourceTree: '"<group>"'
      };
      project.pbxFileReferenceSection()[`${fileRefUuid}_comment`] = fileName;

      // Add build file
      project.pbxBuildFileSection()[buildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: fileRefUuid,
        fileRef_comment: fileName
      };
      project.pbxBuildFileSection()[`${buildFileUuid}_comment`] = `${fileName} in Sources`;

      // Add to sources build phase
      const sourcesPhase = project.pbxSourcesBuildPhaseSection()[sourcesBuildPhase];
      if (sourcesPhase && sourcesPhase.files) {
        sourcesPhase.files.push({
          value: buildFileUuid,
          comment: `${fileName} in Sources`
        });
      }

      console.log(`[withScreenTime] Added ${fileName} to target's Sources phase`);
    };

    // ========================================
    // 1. SETUP MAIN APP NATIVE MODULE
    // ========================================
    fs.copyFileSync(path.join(nativeSourceDir, 'FlowStateScreenTime.swift'), path.join(mainAppRoot, 'FlowStateScreenTime.swift'));
    fs.copyFileSync(path.join(nativeSourceDir, 'FlowStateScreenTime.m'), path.join(mainAppRoot, 'FlowStateScreenTime.m'));

    const mainAppGroup = project.findPBXGroupKey({ name: mainAppName }) || project.findPBXGroupKey({ path: mainAppName });
    const mainTargetKey = getTargetKey(mainAppName);

    if (mainAppGroup && mainTargetKey) {
      // Add main app source files using standard method
      project.addSourceFile(`${mainAppName}/FlowStateScreenTime.swift`, { target: mainTargetKey }, mainAppGroup);
      project.addSourceFile(`${mainAppName}/FlowStateScreenTime.m`, { target: mainTargetKey }, mainAppGroup);
    }

    // Add required frameworks to main app target
    const frameworks = ['FamilyControls', 'ManagedSettings', 'DeviceActivity', 'ManagedSettingsUI'];
    if (mainTargetKey) {
      for (const framework of frameworks) {
        project.addFramework(`System/Library/Frameworks/${framework}.framework`, {
          target: mainTargetKey,
          customFramework: true
        });
      }
    }

    // Update Bridging Header
    const bridgingHeaderPath = path.join(mainAppRoot, 'FlowState-Bridging-Header.h');
    if (fs.existsSync(bridgingHeaderPath)) {
      let content = fs.readFileSync(bridgingHeaderPath, 'utf8');
      if (!content.includes('#import <React/RCTBridgeModule.h>')) {
        content += '\n#import <React/RCTBridgeModule.h>\n';
        content += '#import <React/RCTEventEmitter.h>\n';
        fs.writeFileSync(bridgingHeaderPath, content);
      }
    }

    // ========================================
    // 2. SETUP ALL EXTENSIONS
    // ========================================
    const extensions = [
      {
        name: 'FlowStateMonitor',
        bundleIdSuffix: 'monitor',
        extensionPoint: 'com.apple.deviceactivity.monitor-extension',
        principalClass: 'FlowStateMonitor',
        sourceFile: 'DeviceActivityMonitor.swift'
      },
      {
        name: 'FlowStateShieldConfig',
        bundleIdSuffix: 'shield-config',
        extensionPoint: 'com.apple.ManagedSettingsUI.shield-configuration-service',
        principalClass: 'ShieldConfigurationExtension',
        sourceFile: 'ShieldConfiguration.swift'
      },
      {
        name: 'FlowStateShieldAction',
        bundleIdSuffix: 'shield-action',
        extensionPoint: 'com.apple.ManagedSettings.shield-action-service',
        principalClass: 'ShieldActionExtension',
        sourceFile: 'ShieldAction.swift'
      }
    ];

    const entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.family-controls</key>
	<true/>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>group.com.karthik.flowstate</string>
	</array>
</dict>
</plist>`;

    for (const ext of extensions) {
      const extensionRoot = path.join(iosRoot, ext.name);
      const extensionBundleId = `${config.ios.bundleIdentifier}.${ext.bundleIdSuffix}`;

      // Always create extension directory and copy files
      if (!fs.existsSync(extensionRoot)) {
        fs.mkdirSync(extensionRoot, { recursive: true });
      }

      // A. Create Extension Info.plist
      const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>en</string>
	<key>CFBundleDisplayName</key>
	<string>${ext.name}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
	<key>CFBundleShortVersionString</key>
	<string>${appVersion}</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>MinimumOSVersion</key>
	<string>16.0</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>${ext.extensionPoint}</string>
		<key>NSExtensionPrincipalClass</key>
		<string>$(PRODUCT_MODULE_NAME).${ext.principalClass}</string>
	</dict>
</dict>
</plist>`;
      fs.writeFileSync(path.join(extensionRoot, 'Info.plist'), infoPlistContent);

      // B. Create Extension Entitlements
      fs.writeFileSync(path.join(extensionRoot, `${ext.name}.entitlements`), entitlementsContent);

      // C. Copy Source File
      fs.copyFileSync(path.join(nativeSourceDir, ext.sourceFile), path.join(extensionRoot, ext.sourceFile));

      // C2. Copy assets/icon.png into ShieldConfig extension (loose PNG is in Xcode Resources)
      if (ext.name === 'FlowStateShieldConfig') {
        const iconSrc = path.join(projectRoot, 'assets', 'icon.png');
        if (fs.existsSync(iconSrc)) {
          fs.copyFileSync(iconSrc, path.join(extensionRoot, 'ShieldIcon.png'));
          console.log(`[withScreenTime] Copied assets/icon.png → ${ext.name}/ShieldIcon.png`);
        }
      }

      // D. Get or create extension target
      let extensionTargetKey = getTargetKey(ext.name);
      
      if (!extensionTargetKey) {
        // Create new target
        console.log(`[withScreenTime] Creating new target: ${ext.name}`);
        const extensionTarget = project.addTarget(ext.name, 'app_extension', ext.name, extensionBundleId);
        extensionTargetKey = extensionTarget.uuid;
        
        // Add group
        const extensionGroup = project.addPbxGroup([ext.sourceFile, 'Info.plist', `${ext.name}.entitlements`], ext.name, ext.name);
        const mainGroupKey = project.findPBXGroupKey({ name: undefined, path: undefined });
        project.addToPbxGroup(extensionGroup.uuid, mainGroupKey);

        // Add dependency so extension builds with main app
        if (mainTargetKey) {
          project.addTargetDependency(mainTargetKey, [extensionTargetKey]);
        }
      } else {
        console.log(`[withScreenTime] Target ${ext.name} already exists, ensuring source files are added`);
      }

      // E. ALWAYS add source file to extension target (not main target!)
      // This is the key fix - we must ensure source goes to extension, not main app
      addSourceFileToTarget(`${ext.name}/${ext.sourceFile}`, extensionTargetKey, null);

      // F. Configure Build Settings for this extension
      const configurations = project.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
          const buildSettings = configurations[key].buildSettings;
          if (buildSettings.PRODUCT_NAME === `"${ext.name}"` || buildSettings.PRODUCT_NAME === ext.name) {
            buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`;
            buildSettings.PRODUCT_MODULE_NAME = `"${ext.name}"`;
            buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"16.0"';
            buildSettings.SWIFT_VERSION = '"5.0"';
            buildSettings.SKIP_INSTALL = 'YES';
            buildSettings.CODE_SIGN_ENTITLEMENTS = `"${ext.name}/${ext.name}.entitlements"`;
            buildSettings.INFOPLIST_FILE = `"${ext.name}/Info.plist"`;
            buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
            buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
            buildSettings.DEVELOPMENT_TEAM = '"QAH68NNKKZ"';
            buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES';
            buildSettings.MARKETING_VERSION = `"${appVersion}"`;
            buildSettings.CURRENT_PROJECT_VERSION = '"1"';
            buildSettings.LD_RUNPATH_SEARCH_PATHS = '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"';
            buildSettings.CLANG_ENABLE_MODULES = 'YES';
            buildSettings.SWIFT_OPTIMIZATION_LEVEL = '"-Onone"';
          }
        }
      }
    }

    // ========================================
    // 3. REMOVE EXTENSION SOURCE FILES FROM MAIN APP TARGET
    // ========================================
    // This is critical - the extension source files should NOT be in the main app
    const mainSourcesBuildPhase = getSourcesBuildPhase(mainTargetKey);
    if (mainSourcesBuildPhase) {
      const sourcesPhase = project.pbxSourcesBuildPhaseSection()[mainSourcesBuildPhase];
      if (sourcesPhase && sourcesPhase.files) {
        const extensionSourceFiles = ['DeviceActivityMonitor.swift', 'ShieldConfiguration.swift', 'ShieldAction.swift'];
        const buildFiles = project.pbxBuildFileSection();
        const fileRefs = project.pbxFileReferenceSection();
        
        sourcesPhase.files = sourcesPhase.files.filter(fileEntry => {
          const buildFile = buildFiles[fileEntry.value];
          if (buildFile && buildFile.fileRef) {
            const fileRef = fileRefs[buildFile.fileRef];
            if (fileRef) {
              const fileName = fileRef.name?.replace(/"/g, '') || fileRef.path?.replace(/"/g, '') || '';
              for (const extFile of extensionSourceFiles) {
                if (fileName.includes(extFile)) {
                  console.log(`[withScreenTime] Removing ${extFile} from main app target`);
                  return false; // Remove from main app
                }
              }
            }
          }
          return true; // Keep in main app
        });
      }
    }

    return config;
  });

  return config;
};
