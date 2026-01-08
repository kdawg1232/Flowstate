const { withEntitlementsPlist, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

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
    const mainAppName = config.modRequest.projectName || 'FlowState';
    const mainAppRoot = path.join(iosRoot, mainAppName);

    // Create Extension Directory if it doesn't exist
    if (!fs.existsSync(extensionRoot)) {
      fs.mkdirSync(extensionRoot, { recursive: true });
    }

    // ========================================
    // 1. SETUP MAIN APP NATIVE MODULE
    // ========================================
    const nativeSourceDir = path.join(projectRoot, 'native-ios', 'ScreenTime');
    const swiftModuleDest = path.join(mainAppRoot, 'FlowStateScreenTime.swift');
    const objcModuleDest = path.join(mainAppRoot, 'FlowStateScreenTime.m');
    
    fs.copyFileSync(path.join(nativeSourceDir, 'FlowStateScreenTime.swift'), swiftModuleDest);
    fs.copyFileSync(path.join(nativeSourceDir, 'FlowStateScreenTime.m'), objcModuleDest);

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
      // Use addSourceFile which handles the build phase correctly
      project.addSourceFile(`${mainAppName}/FlowStateScreenTime.swift`, { target: mainTargetKey }, mainAppGroup);
      project.addSourceFile(`${mainAppName}/FlowStateScreenTime.m`, { target: mainTargetKey }, mainAppGroup);
    }

    // Add required frameworks to main app target
    const mainAppFrameworks = ['FamilyControls', 'ManagedSettings', 'DeviceActivity'];
    if (mainTargetKey) {
      for (const framework of mainAppFrameworks) {
        project.addFramework(`System/Library/Frameworks/${framework}.framework`, {
          target: mainTargetKey,
          customFramework: true
        });
      }

      // Bump deployment target for the main target to iOS 16 (required for FamilyControls APIs)
      const configurations = project.pbxXCBuildConfigurationSection();
      for (const configKey in configurations) {
        const cfg = configurations[configKey];
        if (cfg && cfg.buildSettings && cfg.buildSettings.PRODUCT_NAME) {
          if (cfg.buildSettings.PRODUCT_NAME.includes(mainAppName)) {
            cfg.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"16.0"';
          }
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
    // 2. SETUP MONITOR EXTENSION
    // ========================================
    
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

    // C. Copy DeviceActivityMonitor.swift
    fs.copyFileSync(path.join(nativeSourceDir, 'DeviceActivityMonitor.swift'), path.join(extensionRoot, 'DeviceActivityMonitor.swift'));

    // D. Add extension target
    const extensionTarget = project.addTarget(extensionName, 'app_extension', extensionName, extensionBundleId);
    
    // E. Add files to extension target
    const extensionGroup = project.addPbxGroup(['DeviceActivityMonitor.swift', 'Info.plist', `${extensionName}.entitlements`], extensionName, extensionName);
    const mainGroupKey = project.findPBXGroupKey({ name: undefined, path: undefined });
    project.addToPbxGroup(extensionGroup.uuid, mainGroupKey);

    project.addSourceFile(`${extensionName}/DeviceActivityMonitor.swift`, { target: extensionTarget.uuid }, extensionGroup.uuid);

    // F. Add frameworks to extension target
    for (const framework of mainAppFrameworks) {
      project.addFramework(`System/Library/Frameworks/${framework}.framework`, {
        target: extensionTarget.uuid,
        customFramework: true
      });
    }

    // G. Configure Build Settings for the extension target
    const configurations = project.pbxXCBuildConfigurationSection();
    for (const key in configurations) {
      if (typeof configurations[key] === 'object' && configurations[key].buildSettings) {
        const buildSettings = configurations[key].buildSettings;
        if (buildSettings.PRODUCT_NAME === `"${extensionName}"` || buildSettings.PRODUCT_NAME === extensionName) {
          buildSettings.PRODUCT_BUNDLE_IDENTIFIER = `"${extensionBundleId}"`;
          buildSettings.IPHONEOS_DEPLOYMENT_TARGET = '"16.0"';
          buildSettings.SWIFT_VERSION = '"5.0"';
          buildSettings.SKIP_INSTALL = 'YES';
          buildSettings.CODE_SIGN_ENTITLEMENTS = `"${extensionName}/${extensionName}.entitlements"`;
          buildSettings.INFOPLIST_FILE = `"${extensionName}/Info.plist"`;
          buildSettings.TARGETED_DEVICE_FAMILY = '"1,2"';
          buildSettings.GENERATE_INFOPLIST_FILE = 'NO';
          buildSettings.DEVELOPMENT_TEAM = '"QAH68NNKKZ"';
          buildSettings.APPLICATION_EXTENSION_API_ONLY = 'YES';
        }
      }
    }

    return config;
  });

  return config;
};
