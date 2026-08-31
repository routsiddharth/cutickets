/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
  experimental: {
    // Default (1MB) is too small for the raw flyer image server action
    // upload; matches FLYER_MAX_UPLOAD_BYTES in src/lib/flyer.ts.
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
