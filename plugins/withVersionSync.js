/**
 * Expo Config Plugin：自动从 expo.version 派生 Android versionCode
 */
const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = (config) => {
  const version = config.version;
  if (!version) return config;
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) return config;
  const [, majorStr, minorStr, patchStr] = match;
  const major = parseInt(majorStr, 10);
  const minor = parseInt(minorStr, 10);
  const patch = parseInt(patchStr, 10);
  const versionCode = major * 10000 + minor * 100 + patch;

  return withAppBuildGradle(config, (config) => {
    if (!config.modResults?.contents) return config;
    let contents = config.modResults.contents;
    const regex = /versionCode\s*=?\s*\d+/;
    if (!regex.test(contents)) return config;
    contents = contents.replace(regex, `versionCode ${versionCode}`);
    config.modResults.contents = contents;
    return config;
  });
};
