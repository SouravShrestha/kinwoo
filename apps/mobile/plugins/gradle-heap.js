const { withGradleProperties } = require("expo/config-plugins");

// R8 runs out of heap on the 2 GiB prebuild default. ubuntu-latest runners have 16 GiB.
const JVM_ARGS = "-Xmx6g -XX:MaxMetaspaceSize=1g -Dfile.encoding=UTF-8";

module.exports = (config) =>
  withGradleProperties(config, (c) => {
    c.modResults = c.modResults.filter(
      (p) => !(p.type === "property" && p.key === "org.gradle.jvmargs"),
    );
    c.modResults.push({ type: "property", key: "org.gradle.jvmargs", value: JVM_ARGS });
    return c;
  });
