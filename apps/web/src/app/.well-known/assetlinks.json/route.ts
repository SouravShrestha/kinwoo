export const dynamic = "force-static";

// ANDROID_CERT_SHA256 is a comma-separated list of SHA-256 signing certificate fingerprints.
export function GET() {
  const fingerprints = (process.env.ANDROID_CERT_SHA256 ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return Response.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "in.kinwoo.app",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
