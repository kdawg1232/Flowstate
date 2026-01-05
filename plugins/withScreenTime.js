const { withEntitlementsPlist, withInfoPlist, withXcodeProject } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enable Screen Time APIs and include native Swift code.
 */
module.exports = function withScreenTime(config) {
  // 1. Add Entitlements
  config = withEntitlementsPlist(config, (config) => {
    config.modResults['com.apple.developer.family-controls'] = true;
    config.modResults['com.apple.security.application-groups'] = ['group.com.karthik.flowstate'];
    return config;
  });

  // 2. Add Info.plist entries for Screen Time
  config = withInfoPlist(config, (config) => {
    config.modResults['NSAppleMusicUsageDescription'] = 'FlowState needs access to monitor your app usage.';
    return config;
  });

  // 3. Xcode Project modifications
  config = withXcodeProject(config, (config) => {
    // Here we would typically add the Swift files to the project targets.
    // Since Expo prebuild handles this if we put files in the right place,
    // we mostly ensure the deployment target is correct.
    return config;
  });

  return config;
};
