import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // TypeScript 타입 에러를 빌드 시 무시
  typescript: {
    ignoreBuildErrors: true,
  },
  // ESLint 에러를 빌드 시 무시
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
};

export default nextConfig;
