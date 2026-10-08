module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
    // `react-native-reanimated`'s plugin rewrites `worklet` functions at
    // build time and must be the last plugin in the list, per its own setup
    // docs — added for Task 11/12's gesture-driven bottom sheet and the
    // shimmer/nav-bubble animations.
    plugins: ["react-native-reanimated/plugin"],
  };
};
