"use client";

import { useState, useRef, Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import PostFeed from "@/components/PostFeed";
import PopularTagsSidebar from "@/components/PopularTagsSidebar";
import WeeklyPopularSidebar from "@/components/WeeklyPopularSidebar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faStar,
  faPen,
  faFile,
  faSpinner,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import PostCardSkeleton from "@/components/PostCardSkeleton";
import WeeklyRankingCard from "@/components/WeeklyRankingCard";
import { aiAPI } from "@/lib/api";
import { toast } from "sonner";

type SortOption = "latest" | "popular" | "views";
export type ViewMode = "grid" | "list";

/**
 * useSearchParams를 사용하는 내부 컴포넌트
 * Suspense 경계 안에서만 사용 가능
 */
function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sortBy, setSortBy] = useState<SortOption>("latest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  // 피드를 강제 재조회할 카운터 (PDF 등록 성공 후 피드 갱신)
  const [feedKey, setFeedKey] = useState(0);

  // PDF 업로드 상태
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [isPdfUploading, setIsPdfUploading] = useState(false);
  // 글쓰기 방식 선택 모달 표시 상태
  const [showWriteModal, setShowWriteModal] = useState(false);

  // URL 파라미터에서 검색어 직접 읽기
  const initialSearch = searchParams.get("search") ?? "";

  // compose=true 파라미터 감지 → 모달 자동 오픈 후 URL 파라미터 제거
  useEffect(() => {
    if (searchParams.get("compose") === "true") {
      setShowWriteModal(true);
      // 히스토리를 교체하여 파라미터 제거 (뒤로가기 시 루프 방지)
      router.replace("/");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /**
   * PDF 파일 선택 → aiAPI.importPdf() → 피드 새로고침
   * 비로그인 상태면 로그인 페이지로 리다이렉트
   */
  const handlePdfImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // 동일 파일 재선택 허용
    e.target.value = "";

    if (file.type !== "application/pdf") {
      toast.error("PDF 파일만 업로드할 수 있습니다");
      return;
    }

    setIsPdfUploading(true);
    try {
      const result = await aiAPI.importPdf(file, "PUBLIC");
      if (result.success) {
        toast.success("📄 PDF가 게시글로 등록되었습니다!");
        // 피드 컴포넌트를 언마운트→리마운트시켜 최신 목록 재조회
        setFeedKey((k) => k + 1);
      } else if (result.errorCode === "PDF_CONTENT_TOO_LONG") {
        // 서버에서 내려온 message 값만 그대로 표시
        toast.error(result.message ?? "PDF 내용이 너무 깁니다", {
          duration: 6000,
        });
      } else {
        toast.error(result.message ?? "PDF 등록에 실패했습니다");
      }
    } catch (error) {
      const msg =
        error instanceof Error
          ? error.message
          : "PDF 등록 중 오류가 발생했습니다";
      toast.error(msg);
    } finally {
      setIsPdfUploading(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* 로고 */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
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
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 웰컴 배너 (풀 너비) */}
        <div className="mb-6 p-6 rounded-3xl bg-linear-to-r from-purple-600 to-pink-600 text-white shadow-3d">
          <h2 className="text-2xl font-bold mb-2">🔥 오늘도 열공!</h2>
          <p className="text-purple-100">
            친구들의 스터디를 확인하고 응원해주세요!
          </p>
        </div>

        {/* 2컬럼 레이아웃: 피드(좌) + 인기 태그 사이드바(우) */}
        <div className="flex gap-6 items-start">
          {/* 좌측: 게시글 피드 */}
          <div className="flex-1 min-w-0">
            <PostFeed
              key={feedKey}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onResetSort={() => {
                setSortBy("latest");
                setActiveTag(null);
              }}
              initialSearchKeyword={initialSearch}
              activeTag={activeTag}
              onTagClear={() => setActiveTag(null)}
            />
          </div>

          {/* 우측: 인기 태그 + 주간 랭킹 + 주간 인기글 사이드바 (md 이상에서 표시, 상단 고정) */}
          <div className="hidden md:flex flex-col gap-4 w-52 shrink-0 sticky top-24">
            <PopularTagsSidebar
              activeTag={activeTag}
              onTagClick={setActiveTag}
            />
            <WeeklyRankingCard />
            <WeeklyPopularSidebar />
          </div>
        </div>
      </main>

      {/* 숨겨진 PDF input */}
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handlePdfImport}
      />

      {/* PDF 업로드 진행 중 전체화면 오버레이 */}
      {isPdfUploading && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-5 px-10 py-8 bg-white rounded-3xl shadow-2xl">
            {/* 회전 링 애니메이션 */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FontAwesomeIcon
                  icon={faFile}
                  className="text-indigo-400 text-xl"
                />
              </div>
            </div>
            <div className="text-center">
              <p className="font-bold text-gray-800 text-base">
                AI가 PDF를 분석 중입니다
              </p>
              <p className="text-sm text-gray-500 mt-1">
                잠시만 기다려 주세요...
              </p>
            </div>
            {/* 진행 파동 바 */}
            <div className="w-48 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
              <div className="h-full bg-linear-to-r from-indigo-400 to-purple-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] w-full" />
            </div>
          </div>
        </div>
      )}

      {/* 글쓰기 방식 선택 모달
           - z-60 : Navigation(z-50)보다 위에 렌더링
           - 모바일: 하단 바텀시트(items-end) / 데스크탑: 중앙 모달(sm:items-center)
      */}
      {showWriteModal && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowWriteModal(false)}
        >
          <div
            className="w-full sm:max-w-sm sm:mx-4 sm:mb-0 mb-safe bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">게시글 작성</h3>
              <button
                onClick={() => setShowWriteModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              원하는 작성 방식을 선택하세요
            </p>

            {/* 직접 작성 */}
            <button
              onClick={() => {
                setShowWriteModal(false);
                router.push("/create");
              }}
              className="w-full flex items-center gap-4 p-4 bg-purple-50 hover:bg-purple-100 border-2 border-purple-200 hover:border-purple-400 rounded-2xl transition-colors text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={faPen} className="text-white text-lg" />
              </div>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-purple-700">
                  직접 작성
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  에디터로 게시글을 직접 작성합니다
                </p>
              </div>
            </button>

            {/* PDF 업로드 */}
            <button
              disabled={isPdfUploading}
              onClick={() => {
                setShowWriteModal(false);
                pdfInputRef.current?.click();
              }}
              className="w-full flex items-center gap-4 p-4 bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 hover:border-indigo-400 rounded-2xl transition-colors text-left group disabled:opacity-50"
            >
              <div className="w-12 h-12 rounded-xl bg-linear-to-br from-indigo-500 to-blue-500 flex items-center justify-center shrink-0">
                <FontAwesomeIcon
                  icon={isPdfUploading ? faSpinner : faFile}
                  className={`text-white text-lg ${isPdfUploading ? "animate-spin" : ""}`}
                />
              </div>
              <div>
                <p className="font-semibold text-gray-800 group-hover:text-indigo-700">
                  PDF 업로드
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  PDF를 업로드하면 AI가 자동으로 게시글을 등록합니다
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 메인 피드 페이지
 * useSearchParams 사용을 위해 Suspense로 감싸서 빌드 오류 방지
 */
export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          {/* 헤더 스켈레톤 */}
          <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100 shadow-sm h-16" />
          <div className="max-w-6xl mx-auto px-4 py-6">
            {/* 배너 스켈레톤 */}
            <div className="mb-8 h-24 rounded-3xl bg-linear-to-r from-purple-200 to-pink-200 animate-pulse" />
            {/* 검색창 스켈레톤 */}
            <div className="mb-6 h-14 rounded-2xl bg-gray-100 animate-pulse" />
            {/* 컨텐츠 스켈레톤 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
