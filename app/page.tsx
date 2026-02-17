"use client";

import { useState } from "react";
import PostFeed from "@/components/PostFeed";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar } from "@fortawesome/free-solid-svg-icons";
import { storage } from "@/lib/api";

/**
 * 메인 피드 페이지
 * MZ세대를 위한 스터디 인증 커뮤니티
 */
export default function Home() {
  const [userEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return storage.getCurrentUserEmail();
    }
    return "user1@test.com";
  });

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="max-w-screen-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <FontAwesomeIcon icon={faStar} className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">StudyMate</h1>
                <p className="text-xs text-gray-500">스터디 인증 커뮤니티</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-screen-lg mx-auto px-4 py-6">
        {/* 웰컴 배너 */}
        <div className="mb-8 p-6 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-3d">
          <h2 className="text-2xl font-bold mb-2">🔥 오늘도 열공!</h2>
          <p className="text-purple-100">
            친구들의 스터디를 확인하고 응원해주세요!
          </p>
        </div>

        {/* 피드 */}
        <PostFeed />
      </main>
    </div>
  );
}
