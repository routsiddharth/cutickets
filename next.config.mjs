/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Don't bundle firebase-admin into serverless functions — bundling breaks the
  // ESM/CJS resolution of its `jose`/`jwks-rsa` deps (ERR_REQUIRE_ESM). Letting
  // Node require it from node_modules at runtime resolves correctly.
  serverExternalPackages: ["firebase-admin"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
