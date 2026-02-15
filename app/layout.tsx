import "./globals.css";
import localFont from "next/font/local";
import Navigation from "@/components/Navigation";
import { Toaster } from "@/components/ui/sonner";

const pretendard = localFont({
  src: "./../node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2",
  display: "swap",
  weight: "45 920",
  variable: "--font-pretendard",
});

export const metadata = {
  title: "StudyMate - 스터디 인증 커뮤니티",
  description: "MZ세대를 위한 스터디 인증 및 랭킹 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${pretendard.variable} antialiased min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white`}
      >
        <div className="pb-20">{children}</div>
        <Navigation />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
