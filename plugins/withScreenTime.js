const { withEntitlementsPlist, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Helper to generate a unique UUID for pbxproj
 */
function generateUuid() {
  return 'XXXXXXXXXXXXXXXXXXXXXXXX'.replace(/X/g, () => 
    '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16))
  );
}

/**
 * Expo Config Plugin to enable Screen Time APIs and the Device Activity Monitor Extension.
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

  // 3. Create the Extension Target and required files
  config = withXcodeProject(config, async (config) => {
    const project = config.modResults;
    const extensionName = 'FlowStateMonitor';
    const extensionBundleId = `${config.ios.bundleIdentifier}.monitor`;
    const projectRoot = config.modRequest.projectRoot;
    const iosRoot = path.join(projectRoot, 'ios');
    const extensionRoot = path.join(iosRoot, extensionName);

    // Create Extension Directory if it doesn't exist
    if (!fs.existsSync(extensionRoot)) {
      fs.mkdirSync(extensionRoot, { recursive: true });
    }

    // A. Create Extension Info.plist
    const appVersion = config.version || '1.0.0';
    const infoPlistContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>${extensionName}</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>${extensionBundleId}</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleName</key>
	<string>${extensionName}</string>
	<key>CFBundlePackageType</key>
	<string>XPC!</string>
	<key>CFBundleShortVersionString</key>
	<string>${appVersion}</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>NSExtension</key>
	<dict>
		<key>NSExtensionPointIdentifier</key>
		<string>com.apple.deviceactivity.monitor-extension</string>
		<key>NSExtensionPrincipalClass</key>
		<string>$(PRODUCT_MODULE_NAME).FlowStateMonitor</string>
	</dict>
</dict>
</plist>`;
    fs.writeFileSync(path.join(extensionRoot, 'Info.plist'), infoPlistContent);

    // B. Create Extension Entitlements
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
    fs.writeFileSync(path.join(extensionRoot, `${extensionName}.entitlements`), entitlementsContent);

    // C. Create a PBX group for the extension
    const extensionGroup = project.addPbxGroup(
      ['DeviceActivityMonitor.swift', 'Info.plist', `${extensionName}.entitlements`],
      extensionName,
      extensionName
    );

    // Add the group to the main project
    const mainGroupKey = project.findPBXGroupKey({ name: undefined, path: undefined });
    if (mainGroupKey) {
      project.addToPbxGroup(extensionGroup.uuid, mainGroupKey);
    }

    // D. Add Target to Xcode
    const target = project.addTarget(extensionName, 'app_extension', extensionName, extensionBundleId);

    // E. Create build phases manually for the extension target
    const sourcesBuildPhaseUuid = generateUuid();
    const frameworksBuildPhaseUuid = generateUuid();
    
    // Initialize PBX build phase sections
    if (!project.hash.project.objects['PBXSourcesBuildPhase']) {
      project.hash.project.objects['PBXSourcesBuildPhase'] = {};
    }
    if (!project.hash.project.objects['PBXFrameworksBuildPhase']) {
      project.hash.project.objects['PBXFrameworksBuildPhase'] = {};
    }
    
    const pbxSourcesBuildPhase = project.hash.project.objects['PBXSourcesBuildPhase'];
    const pbxFrameworksBuildPhase = project.hash.project.objects['PBXFrameworksBuildPhase'];
    
    // Create Sources build phase
    pbxSourcesBuildPhase[sourcesBuildPhaseUuid] = {
      isa: 'PBXSourcesBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    pbxSourcesBuildPhase[sourcesBuildPhaseUuid + '_comment'] = 'Sources';
    
    // Create Frameworks build phase
    pbxFrameworksBuildPhase[frameworksBuildPhaseUuid] = {
      isa: 'PBXFrameworksBuildPhase',
      buildActionMask: 2147483647,
      files: [],
      runOnlyForDeploymentPostprocessing: 0,
    };
    pbxFrameworksBuildPhase[frameworksBuildPhaseUuid + '_comment'] = 'Frameworks';
    
    // Add build phases to target
    let nativeTargets = project.hash.project.objects['PBXNativeTarget'];
    for (const key in nativeTargets) {
      if (nativeTargets[key] && nativeTargets[key].name === `"${extensionName}"`) {
        nativeTargets[key].buildPhases = [
          { value: sourcesBuildPhaseUuid, comment: 'Sources' },
          { value: frameworksBuildPhaseUuid, comment: 'Frameworks' },
        ];
        break;
      }
    }

    // F. Link Swift files from native-ios
    const sourceFile = path.join(projectRoot, 'native-ios', 'ScreenTime', 'DeviceActivityMonitor.swift');
    const destFile = path.join(extensionRoot, 'DeviceActivityMonitor.swift');
    fs.copyFileSync(sourceFile, destFile);

    // Add Swift file to Sources build phase
    const swiftFileUuid = generateUuid();
    const swiftBuildFileUuid = generateUuid();
    
    const pbxFileReference = project.hash.project.objects['PBXFileReference'];
    const pbxBuildFile = project.hash.project.objects['PBXBuildFile'];
    
    pbxFileReference[swiftFileUuid] = {
      isa: 'PBXFileReference',
      lastKnownFileType: 'sourcecode.swift',
      name: 'DeviceActivityMonitor.swift',
      path: `${extensionName}/DeviceActivityMonitor.swift`,
      sourceTree: '"<group>"',
    };
    pbxFileReference[swiftFileUuid + '_comment'] = 'DeviceActivityMonitor.swift';
    
    pbxBuildFile[swiftBuildFileUuid] = {
      isa: 'PBXBuildFile',
      fileRef: swiftFileUuid,
      fileRef_comment: 'DeviceActivityMonitor.swift',
    };
    pbxBuildFile[swiftBuildFileUuid + '_comment'] = 'DeviceActivityMonitor.swift in Sources';
    
    pbxSourcesBuildPhase[sourcesBuildPhaseUuid].files.push({
      value: swiftBuildFileUuid,
      comment: 'DeviceActivityMonitor.swift in Sources',
    });

    // G. Add system frameworks to Frameworks build phase
    const frameworks = ['DeviceActivity', 'ManagedSettings', 'FamilyControls'];
    
    for (const frameworkName of frameworks) {
      const frameworkFileUuid = generateUuid();
      const frameworkBuildFileUuid = generateUuid();
      
      pbxFileReference[frameworkFileUuid] = {
        isa: 'PBXFileReference',
        lastKnownFileType: 'wrapper.framework',
        name: `${frameworkName}.framework`,
        path: `System/Library/Frameworks/${frameworkName}.framework`,
        sourceTree: 'SDKROOT',
      };
      pbxFileReference[frameworkFileUuid + '_comment'] = `${frameworkName}.framework`;
      
      pbxBuildFile[frameworkBuildFileUuid] = {
        isa: 'PBXBuildFile',
        fileRef: frameworkFileUuid,
        fileRef_comment: `${frameworkName}.framework`,
      };
      pbxBuildFile[frameworkBuildFileUuid + '_comment'] = `${frameworkName}.framework in Frameworks`;
      
      pbxFrameworksBuildPhase[frameworksBuildPhaseUuid].files.push({
        value: frameworkBuildFileUuid,
        comment: `${frameworkName}.framework in Frameworks`,
      });
    }

    // H. Configure Build Settings for the extension target
    const configurations = project.pbxXCBuildConfigurationSection();
    
    // Find the extension target's build configuration list
    let extensionConfigListId = null;
    for (const key in nativeTargets) {
      if (nativeTargets[key] && nativeTargets[key].name === `"${extensionName}"`) {
        extensionConfigListId = nativeTargets[key].buildConfigurationList;
        break;
      }
    }
    
    // Apply build settings to the extension's configurations
    if (extensionConfigListId) {
      const configurationLists = project.hash.project.objects['XCConfigurationList'];
      if (configurationLists[extensionConfigListId]) {
        const buildConfigs = configurationLists[extensionConfigListId].buildConfigurations;
        if (buildConfigs) {
          for (const config of buildConfigs) {
            const configKey = config.value;
            if (configurations[configKey] && configurations[configKey].buildSettings) {
              const buildSettings = configurations[configKey].buildSettings;
              buildSettings.PRODUCT_NAME = `"${extensionName}"`;
              buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`;
              buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"15.0"';
              buildSettings.SWIFT_VERSION = '"5.0"';
              buildSettings.SKIP_INSTALL = 'YES';
              buildSettings.CODE_SIGN_ENTITLEMENTS = `"${extensionName}/${extensionName}.entitlements"`;
              buildSettings.INFOPLIST_FILE = `"${extensionName}/Info.plist"`;
              buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
              buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
              buildSettings.CURRENT_PROJECT_VERSION = '"1"';
              buildSettings.MARKETING_VERSION = '"1.0"';
              buildSettings.DEVELOPMENT_TEAM = '"QAH68NNKKZ"';
            }
          }
        }
      }
    }

    return config;
  });

  return config;
};
