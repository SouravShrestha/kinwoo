const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];

// Watching the whole workspace also watches the web app's build output, which churns on every
// web build and can be large.
const webBuildOutput = path.join(workspaceRoot, "apps/web");
config.resolver.blockList = [
  ...[].concat(config.resolver.blockList ?? []),
  ...[".next", ".open-next", ".wrangler"].map(
    (dir) => new RegExp(`^${escapeRegExp(path.join(webBuildOutput, dir))}(/.*)?$`),
  ),
];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = withNativeWind(config, { input: "./src/app/globals.css", inlineRem: 16 });
