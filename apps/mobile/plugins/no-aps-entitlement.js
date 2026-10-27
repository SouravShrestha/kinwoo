const { withEntitlementsPlist } = require("expo/config-plugins");

// Personal Apple teams cannot sign the push entitlement, and push is Android-only for now.
module.exports = (config) =>
  withEntitlementsPlist(config, (c) => {
    delete c.modResults["aps-environment"];
    return c;
  });
