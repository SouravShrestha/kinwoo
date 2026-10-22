module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    // The reanimated plugin must be the last plugin in the list.
    plugins: ["react-native-reanimated/plugin"],
  };
};
