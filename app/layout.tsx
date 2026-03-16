import "./globals.css";
import type { Metadata } from "next";
import localFont from "next/font/local";
import Navigation from "@/components/Navigation";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import ChatbotFAB from "@/components/chatbot/ChatbotFAB";

const pretendard = localFont({
  src: "./../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

const BASE_URL = "https://study-mate.cloud";
const OG_IMAGE = "https://metatags.io/images/meta-tags.png";

export const metadata: Metadata = {
  title: "StudyMate - 스터디 인증 커뮤니티",
  description: "MZ세대를 위한 스터디 인증 및 랭킹 플랫폼",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    type: "website",
    url: BASE_URL,
    title: "StudyMate - 스터디 인증 커뮤니티",
    description: "MZ세대를 위한 스터디 인증 및 랭킹 플랫폼",
    images: [{ url: OG_IMAGE }],
  },
  twitter: {
    card: "summary_large_image",
    site: BASE_URL,
    title: "StudyMate - 스터디 인증 커뮤니티",
    description: "MZ세대를 위한 스터디 인증 및 랭킹 플랫폼",
    images: [OG_IMAGE],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${pretendard.variable} antialiased min-h-screen bg-[#fafafa]`}
      >
        <AuthProvider>
          <div className="pb-20">{children}</div>
          {/* 로그인 이후 모든 페이지에 표시되는 AI 챗봇 FAB */}
          <ChatbotFAB />
          <Navigation />
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
