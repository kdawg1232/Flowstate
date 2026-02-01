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
    config.modResults['NSAppleMusicUsageDescription'] = 'FlowState needs access to monitor your app usage.';
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

    // ========================================
    // 1. SETUP MAIN APP NATIVE MODULE
    // ========================================
    fs.copyFileSync(path.join(nativeSourceDir, 'FlowStateScreenTime.swift'), path.join(mainAppRoot, 'FlowStateScreenTime.swift'));
    fs.copyFileSync(path.join(nativeSourceDir, 'FlowStateScreenTime.m'), path.join(mainAppRoot, 'FlowStateScreenTime.m'));

    const mainAppGroup = project.findPBXGroupKey({ name: mainAppName }) || project.findPBXGroupKey({ path: mainAppName });
    
    const targets = project.pbxNativeTargetSection();
    let mainTargetKey = null;
    for (const key in targets) {
      if (targets[key].name === `"${mainAppName}"` || targets[key].name === mainAppName) {
        mainTargetKey = key;
        break;
      }
    }

    if (mainAppGroup && mainTargetKey) {
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
      
      // Ensure main target is at least iOS 16
      const configurations = project.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        if (configurations[key].buildSettings && configurations[key].buildSettings.PRODUCT_NAME === `"${mainAppName}"`) {
          configurations[key].buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"16.0"';
        }
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
        extensionPoint: 'com.apple.ManagedSettings.shield-configuration',
        principalClass: 'ShieldConfigurationExtension',
        sourceFile: 'ShieldConfiguration.swift'
      },
      {
        name: 'FlowStateShieldAction',
        bundleIdSuffix: 'shield-action',
        extensionPoint: 'com.apple.ManagedSettingsUI.shield-action',
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

      // Create Extension Directory
      if (!fs.existsSync(extensionRoot)) {
        fs.mkdirSync(extensionRoot, { recursive: true });
      }

      // A. Create Extension Info.plist
      const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>${ext.name}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>${extensionBundleId}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${ext.name}</string>
	<key>CFBundlePackageType</key>
	<string>XPC!</string>
	<key>CFBundleShortVersionString</key>
	<string>${appVersion}</string>
	<key>CFBundleVersion</key>
	<string>1</string>
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

      // D. Add extension target
      const extensionTarget = project.addTarget(ext.name, 'app_extension', ext.name, extensionBundleId);
      
      // E. Add files to extension target
      const extensionGroup = project.addPbxGroup([ext.sourceFile, 'Info.plist', `${ext.name}.entitlements`], ext.name, ext.name);
      const mainGroupKey = project.findPBXGroupKey({ name: undefined, path: undefined });
      project.addToPbxGroup(extensionGroup.uuid, mainGroupKey);

      // F. Add source file to the extension's compile phase
      const sourceFileKey = project.addSourceFile(`${ext.name}/${ext.sourceFile}`, { target: extensionTarget.uuid }, extensionGroup.uuid);
      
      // Ensure the source file is in the PBXBuildFile section for this target
      if (sourceFileKey && extensionTarget.uuid) {
        const buildPhaseSection = project.pbxSourcesBuildPhaseObj(extensionTarget.uuid);
        if (buildPhaseSection && sourceFileKey.fileRef) {
          // Manually add to build phase if not already there
          if (!buildPhaseSection.files.find(f => f.value === sourceFileKey.uuid)) {
            buildPhaseSection.files.push({
              value: sourceFileKey.uuid,
              comment: `${ext.sourceFile} in Sources`
            });
          }
        }
      }

      // G. Add frameworks to extension target
      for (const framework of frameworks) {
        project.addFramework(`System/Library/Frameworks/${framework}.framework`, {
          target: extensionTarget.uuid,
          customFramework: true
        });
      }

      // H. Configure Build Settings for this extension
      const configurations = project.pbxXCBuildConfigurationSection();
      for (const key in configurations) {
        if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
          const buildSettings = configurations[key].buildSettings;
          if (buildSettings.PRODUCT_NAME === `"${ext.name}"` || buildSettings.PRODUCT_NAME === ext.name) {
            buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`;
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
          }
        }
      }

      // I. Add extension to main app's "Embed App Extensions" build phase
      // This is CRITICAL - without this, iOS won't load the extension
      if (mainTargetKey) {
        // Add dependency so extension builds with main app
        project.addTargetDependency(mainTargetKey, [extensionTarget.uuid]);
      }
    }

    // J. Create a single "Embed App Extensions" build phase for all extensions
    // We need to do this after all extensions are created
    if (mainTargetKey) {
      const nativeTargets = project.pbxNativeTargetSection();
      const mainTarget = nativeTargets[mainTargetKey];
      
      if (mainTarget) {
        // Generate UUIDs for the embed phase
        const embedPhaseUuid = project.generateUuid();
        const embedPhaseCommentKey = `${embedPhaseUuid}_comment`;
        
        // Create the PBXCopyFilesBuildPhase for embedding extensions
        const copyFilesSection = project.hash.project.objects['PBXCopyFilesBuildPhase'] || {};
        
        // Collect all extension product references
        const extensionFiles = [];
        for (const ext of extensions) {
          // Find the extension target
          for (const key in nativeTargets) {
            const target = nativeTargets[key];
            if (target && typeof target === 'object' && 
                (target.name === `"${ext.name}"` || target.name === ext.name)) {
              const productRef = target.productReference;
              if (productRef) {
                // Create a build file entry for this product
                const buildFileUuid = project.generateUuid();
                const buildFileSection = project.hash.project.objects['PBXBuildFile'] || {};
                buildFileSection[buildFileUuid] = {
                  isa: 'PBXBuildFile',
                  fileRef: productRef,
                  settings: { ATTRIBUTES: ['RemoveHeadersOnCopy'] }
                };
                buildFileSection[`${buildFileUuid}_comment`] = `${ext.name}.appex in Embed App Extensions`;
                project.hash.project.objects['PBXBuildFile'] = buildFileSection;
                
                extensionFiles.push({ value: buildFileUuid, comment: `${ext.name}.appex in Embed App Extensions` });
              }
              break;
            }
          }
        }
        
        // Create the embed phase
        copyFilesSection[embedPhaseUuid] = {
          isa: 'PBXCopyFilesBuildPhase',
          buildActionMask: 2147483647,
          dstPath: '""',
          dstSubfolderSpec: 13, // 13 = PlugIns folder
          files: extensionFiles,
          name: '"Embed App Extensions"',
          runOnlyForDeploymentPostprocessing: 0
        };
        copyFilesSection[embedPhaseCommentKey] = 'Embed App Extensions';
        project.hash.project.objects['PBXCopyFilesBuildPhase'] = copyFilesSection;
        
        // Add the embed phase to the main target's build phases
        if (mainTarget.buildPhases) {
          mainTarget.buildPhases.push({ value: embedPhaseUuid, comment: 'Embed App Extensions' });
        }
      }
    }

    return config;
  });

  return config;
};
