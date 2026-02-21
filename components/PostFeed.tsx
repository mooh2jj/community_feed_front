"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostResponse } from "@/lib/types";
import { postAPI } from "@/lib/api";
import PostCard from "./PostCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faTimes, faClock } from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PostCardSkeleton from "./PostCardSkeleton";

// ─── 최근 검색어 localStorage 유틸리티 ─────────────────────────────────────
const RECENT_SEARCHES_KEY = "recentSearches";
const MAX_RECENT = 8;

const recentSearchStorage = {
  /** localStorage에서 최근 검색어 목록 읽기 */
  get: (): string[] => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? "[]");
    } catch {
      return [];
    }
  },
  /** 검색어 추가 (중복 제거 후 맨 앞 삽입, 최대 MAX_RECENT 개) */
  add: (keyword: string): string[] => {
    const prev = recentSearchStorage.get().filter((k) => k !== keyword);
    const next = [keyword, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    return next;
  },
  /** 특정 검색어 삭제 */
  remove: (keyword: string): string[] => {
    const next = recentSearchStorage.get().filter((k) => k !== keyword);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
    return next;
  },
  /** 전체 삭제 */
  clear: (): void => {
    localStorage.setItem(RECENT_SEARCHES_KEY, "[]");
  },
};

interface PostFeedProps {
  sortBy?: "latest" | "popular" | "views";
  onResetSort?: () => void;
  initialSearchKeyword?: string; // 초기 검색어
}

/**
 * 무한 스크롤 피드 컴포넌트
 */
export default function PostFeed({
  sortBy = "latest",
  onResetSort,
  initialSearchKeyword = "",
}: PostFeedProps) {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState(initialSearchKeyword);
  const [searchInput, setSearchInput] = useState(initialSearchKeyword);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // 마운트 시 최근 검색어 로드
  useEffect(() => {
    setRecentSearches(recentSearchStorage.get());
  }, []);

  // 검색창 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!searchWrapperRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // initialSearchKeyword가 변경되면 검색 업데이트 (# 포함 시 제거)
  useEffect(() => {
    if (initialSearchKeyword) {
      const clean = initialSearchKeyword.startsWith("#")
        ? initialSearchKeyword.slice(1)
        : initialSearchKeyword;
      setSearchKeyword(clean);
      setSearchInput(clean);
    }
  }, [initialSearchKeyword]);

  // sortBy 또는 searchKeyword 변경시 초기화
  useEffect(() => {
    console.log("🔄 피드 초기화:", { sortBy, searchKeyword });
    setPosts([]);
    setPage(1);
    setHasMore(true);
  }, [sortBy, searchKeyword]);

  // 컴포넌트 마운트 시 또는 sortBy/searchKeyword 변경 시 첫 로딩
  useEffect(() => {
    console.log("🚀 PostFeed 로딩 시작:", { sortBy, searchKeyword });
    if (page === 1 && posts.length === 0) {
      loadMore();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, searchKeyword]); // sortBy 또는 searchKeyword 변경 시 리로드

  // 게시물 로드
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) {
      console.log("⏸️ 로딩 건너뜀:", { loading, hasMore });
      return;
    }

    // sortBy를 OrderCondition enum 값으로 변환
    // latest(최신순)  -> CREATED_AT_DESC
    // views(조회순)   -> VIEW_COUNT_DESC
    // popular(인기순) -> LIKE_COUNT_DESC
    let orderCondition = "CREATED_AT_DESC";
    if (sortBy === "views") {
      orderCondition = "VIEW_COUNT_DESC";
    } else if (sortBy === "popular") {
      orderCondition = "LIKE_COUNT_DESC";
    }

    console.log("📥 게시물 로드 시작:", {
      page,
      size: 20,
      sortBy,
      orderCondition,
      searchKeyword,
    });
    setLoading(true);
    try {
      const result = await postAPI.getPosts(
        page,
        20,
        orderCondition,
        searchKeyword || undefined,
      );
      console.log("📦 서버 응답:", {
        contentLength: result.data.content.length,
        isLast: result.data.last,
        page,
      });
      const newPosts = result.data.content;

      if (page === 1) {
        setPosts(newPosts);
      } else {
        setPosts((prev) => [...prev, ...newPosts]);
      }

      setHasMore(!result.data.last);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, sortBy, searchKeyword]);

  // Intersection Observer 설정
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore, hasMore, loading]);

  // 검색 실행 - 키워드 저장 후 검색
  const handleSearch = (keyword?: string) => {
    const target = (keyword ?? searchInput).trim();
    if (!target) return;
    setSearchInput(target);
    setSearchKeyword(target);
    setShowDropdown(false);
    setRecentSearches(recentSearchStorage.add(target));
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
    setShowDropdown(false);
  };

  // 최근 검색어 개별 삭제
  const handleRemoveRecent = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    setRecentSearches(recentSearchStorage.remove(keyword));
  };

  // 최근 검색어 전체 삭제
  const handleClearAllRecent = () => {
    recentSearchStorage.clear();
    setRecentSearches([]);
  };

  // 키보드 처리 (Enter: 검색, Escape: 드롭다운 닫기)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowDropdown(false);
  };

  return (
    <div>
      {/* 검색창 및 초기화 - 항상 표시 */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          {/* 검색창 + 최근 검색어 드롭다운 */}
          <div
            ref={searchWrapperRef}
            className="relative flex-1 max-w-2xl mx-auto"
          >
            <Input
              type="text"
              placeholder="게시물 검색... (예: 알고리즘, SQL)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDropdown(true)}
              className="pl-12 pr-24 py-6 text-base border-2 border-purple-200 focus:border-purple-500 rounded-2xl"
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg"
            />
            {searchInput && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearSearch}
                className="absolute right-20 top-1/2 -translate-y-1/2"
              >
                <FontAwesomeIcon icon={faTimes} className="text-gray-400" />
              </Button>
            )}
            <Button
              onClick={() => handleSearch()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-linear-to-r from-purple-600 to-pink-600"
            >
              검색
            </Button>

            {/* 최근 검색어 드롭다운 */}
            {showDropdown && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-purple-50">
                  <span className="text-sm font-semibold text-gray-500">
                    최근 검색어
                  </span>
                  <button
                    onClick={handleClearAllRecent}
                    className="text-xs text-purple-400 hover:text-purple-600 transition-colors"
                  >
                    전체 삭제
                  </button>
                </div>

                {/* 검색어 목록 */}
                <ul>
                  {recentSearches.map((keyword) => (
                    <li
                      key={keyword}
                      onClick={() => handleSearch(keyword)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-purple-50 cursor-pointer group transition-colors"
                    >
                      <FontAwesomeIcon
                        icon={faClock}
                        className="text-gray-300 text-sm shrink-0"
                      />
                      <span className="flex-1 text-sm text-gray-700 truncate">
                        {keyword}
                      </span>
                      {/* 호버 시 표시되는 개별 삭제 버튼 */}
                      <button
                        onClick={(e) => handleRemoveRecent(e, keyword)}
                        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-500 transition-opacity p-1"
                        aria-label={`${keyword} 삭제`}
                      >
                        <FontAwesomeIcon icon={faTimes} className="text-xs" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* 정렬 및 검색 초기화 버튼 - 검색창 오른쪽 */}
          {(sortBy !== "latest" || searchKeyword) && onResetSort && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                onResetSort();
                handleClearSearch();
              }}
              className="px-4 py-6 text-gray-600 hover:text-purple-600 hover:border-purple-400 border-2 rounded-2xl whitespace-nowrap"
            >
              <FontAwesomeIcon icon={faTimes} className="mr-2" />
              초기화
            </Button>
          )}
        </div>
        {searchKeyword && (
          <div className="text-center mt-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm">
              <FontAwesomeIcon icon={faSearch} />
              검색어: <strong>{searchKeyword}</strong>
              <button
                onClick={handleClearSearch}
                className="ml-2 hover:text-purple-900"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* 결과 없을 때 메시지 */}
      {posts.length === 0 && !loading && (
        <div className="text-center py-20">
          <p className="text-lg text-gray-500">
            {searchKeyword
              ? `"${searchKeyword}"에 대한 검색 결과가 없습니다`
              : "아직 게시물이 없습니다"}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {searchKeyword
              ? "다른 키워드로 검색해보세요"
              : "첫 번째 스터디를 인증해보세요!"}
          </p>
        </div>
      )}

      {/* 초기 로딩 시 스켈레톤 그리드 */}
      {loading && posts.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 그리드 레이아웃 - 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* 추가 로딩 시 하단 스켈레톤 (more 로딩 중) */}
      {loading && posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <PostCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* 무한 스크롤 트리거 */}
      <div ref={observerTarget} className="h-10" />

      {/* 더 이상 없을 때 */}
      {!hasMore && posts.length > 0 && (
        <div className="text-center py-8 text-gray-400">
          <p>모든 게시물을 확인했습니다 🎉</p>
        </div>
      )}
    </div>
  );
}
