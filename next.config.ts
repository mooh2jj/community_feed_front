import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // // TypeScript 타입 에러를 빌드 시 무시
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
  // // ESLint 에러를 빌드 시 무시
  // eslint: {
  //   ignoreDuringBuilds: true,
  // },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
      // Next.js API 프록시(/api/images)를 통해 로컬 백엔드 이미지를 서빙하므로
      // localhost 직접 접근은 불필요 — 프록시 라우트가 서버 사이드에서 처리
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
  },
};

export default nextConfig;
