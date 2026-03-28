"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostResponse } from "@/lib/types";
import { postAPI } from "@/lib/api";
import PostCard from "./PostCard";
import PostListItem from "./PostListItem";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSearch,
  faTimes,
  faClock,
  faFire,
  faEye,
  faGrip,
  faList,
  faChevronLeft,
  faChevronRight,
} from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import PostCardSkeleton from "./PostCardSkeleton";
import PostListItemSkeleton from "./PostListItemSkeleton";
import type { ViewMode } from "@/app/page";

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

type SortOption = "latest" | "popular" | "views";

const SORT_OPTIONS: { value: SortOption; label: string; icon: typeof faClock }[] = [
  { value: "latest", label: "최신순", icon: faClock },
  { value: "popular", label: "인기순", icon: faFire },
  { value: "views", label: "조회순", icon: faEye },
];

interface PostFeedProps {
  sortBy?: SortOption;
  onSortChange?: (sort: SortOption) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onResetSort?: () => void;
  initialSearchKeyword?: string;
  /** 외부(page.tsx)에서 주입하는 태그 필터 (예: "#책") */
  activeTag?: string | null;
  /** 검색 초기화 시 부모에게 태그 해제 알림 */
  onTagClear?: () => void;
}

/** 리스트 뷰 클라이언트 페이지네이션 시 한 페이지에 표시할 게시글 수 */
const LIST_PAGE_SIZE = 10;
/** 리스트 뷰에서 서버로부터 가져올 최대 게시글 수 (전체 로드) */
const LIST_FETCH_SIZE = 500;
/** 그리드 뷰 페이지 당 게시글 수 */
const GRID_PAGE_SIZE = 20;

/**
 * 그리드(무한 스크롤) / 리스트(페이지네이션) 뷰 모드 지원 피드 컴포넌트
 */
export default function PostFeed({
  sortBy = "latest",
  onSortChange,
  viewMode = "grid",
  onViewModeChange,
  onResetSort,
  initialSearchKeyword = "",
  activeTag = null,
  onTagClear,
}: PostFeedProps) {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState(initialSearchKeyword);
  const [searchInput, setSearchInput] = useState(initialSearchKeyword);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);

  // ─── 그리드 모드 (무한 스크롤) 전용 상태 ──────────────────────────────────
  const [gridPage, setGridPage] = useState(1);
  const [gridHasMore, setGridHasMore] = useState(true);
  const observerTarget = useRef<HTMLDivElement>(null);

  // ─── 리스트 모드 (클라이언트 페이지네이션) 전용 상태 ─────────────────────
  const [allListPosts, setAllListPosts] = useState<PostResponse[]>([]); // 전체 게시글
  const [listPage, setListPage] = useState(1);

  // ─── sortBy → OrderCondition 변환 헬퍼 ────────────────────────────────────
  const getOrderCondition = useCallback((sort: string) => {
    const orderMap: Record<string, string> = {
      latest: "CREATED_AT_DESC",
      views: "VIEW_COUNT_DESC",
      popular: "LIKE_COUNT_DESC",
    };
    return orderMap[sort] ?? "CREATED_AT_DESC";
  }, []);

  // ─── 공통 초기화 이벤트 ────────────────────────────────────────────────────
  useEffect(() => {
    setRecentSearches(recentSearchStorage.get());
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!searchWrapperRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (initialSearchKeyword) {
      const clean = initialSearchKeyword.startsWith("#")
        ? initialSearchKeyword.slice(1)
        : initialSearchKeyword;
      setSearchKeyword(clean);
      setSearchInput(clean);
    }
  }, [initialSearchKeyword]);

  // 외부 태그 변경 시 searchKeyword 동기화
  useEffect(() => {
    if (activeTag) {
      const keyword = activeTag.startsWith("#")
        ? activeTag.slice(1)
        : activeTag;
      setSearchKeyword(keyword);
      setSearchInput(keyword);
    } else {
      // 태그 해제 시 검색어도 초기화 (단, initialSearchKeyword가 있으면 유지)
      if (!initialSearchKeyword) {
        setSearchKeyword("");
        setSearchInput("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTag]);

  // sortBy · searchKeyword · viewMode 변경 시 피드 초기화
  useEffect(() => {
    setPosts([]);
    setGridPage(1);
    setGridHasMore(true);
    setAllListPosts([]);
    setListPage(1);
  }, [sortBy, searchKeyword, viewMode]);

  // ─── 그리드 모드: 무한 스크롤 로딩 ────────────────────────────────────────
  const loadMoreGrid = useCallback(async () => {
    if (loading || !gridHasMore || viewMode !== "grid") return;
    setLoading(true);
    try {
      const result = await postAPI.getPosts(
        gridPage,
        GRID_PAGE_SIZE,
        getOrderCondition(sortBy),
        searchKeyword || undefined,
      );
      const newPosts = result.data.content;
      setPosts((prev) => (gridPage === 1 ? newPosts : [...prev, ...newPosts]));
      setGridHasMore(!result.data.last);
      setGridPage((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setLoading(false);
    }
  }, [
    gridPage,
    loading,
    gridHasMore,
    sortBy,
    searchKeyword,
    viewMode,
    getOrderCondition,
  ]);

  // 그리드 모드 초기 로딩 트리거
  useEffect(() => {
    if (viewMode === "grid" && gridPage === 1 && posts.length === 0) {
      loadMoreGrid();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, searchKeyword, viewMode]);

  // Intersection Observer (그리드 모드 전용)
  useEffect(() => {
    if (viewMode !== "grid") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && gridHasMore && !loading) {
          loadMoreGrid();
        }
      },
      { threshold: 0.1 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);
    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMoreGrid, gridHasMore, loading, viewMode]);

  // ─── 리스트 모드: sortBy / searchKeyword / viewMode 변경 시 전체 새로 로드 ─
  useEffect(() => {
    if (viewMode !== "list") return;

    let cancelled = false;

    const fetchListPosts = async () => {
      setLoading(true);
      try {
        const result = await postAPI.getPosts(
          1,
          LIST_FETCH_SIZE,
          getOrderCondition(sortBy),
          searchKeyword || undefined,
        );
        if (!cancelled) {
          setAllListPosts(result.data.content);
          setListPage(1);
        }
      } catch (error) {
        console.error("Failed to load posts:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchListPosts();

    // 의존성 변경 시 이전 요청 무시 (race condition 방지)
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, searchKeyword, viewMode]);

  // 클라이언트 페이지네이션: 현재 페이지에 표시할 게시글 슬라이스
  const listTotalPages = Math.max(
    1,
    Math.ceil(allListPosts.length / LIST_PAGE_SIZE),
  );
  const paginatedPosts = allListPosts.slice(
    (listPage - 1) * LIST_PAGE_SIZE,
    listPage * LIST_PAGE_SIZE,
  );
  const isFirstPage = listPage <= 1;
  const isLastPage = listPage >= listTotalPages;

  // 페이지 이동 핸들러
  const goToListPage = (targetPage: number) => {
    const clamped = Math.max(1, Math.min(targetPage, listTotalPages));
    setListPage(clamped);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── 검색 핸들러 ──────────────────────────────────────────────────────────
  const handleSearch = (keyword?: string) => {
    const target = (keyword ?? searchInput).trim();
    if (!target) return;
    setSearchInput(target);
    setSearchKeyword(target);
    setShowDropdown(false);
    onTagClear?.(); // 직접 검색 시 부모 태그 해제
    setRecentSearches(recentSearchStorage.add(target));
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
    setShowDropdown(false);
    onTagClear?.(); // 부모에게 태그 해제 알림
  };

  const handleRemoveRecent = (e: React.MouseEvent, keyword: string) => {
    e.stopPropagation();
    setRecentSearches(recentSearchStorage.remove(keyword));
  };

  const handleClearAllRecent = () => {
    recentSearchStorage.clear();
    setRecentSearches([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowDropdown(false);
  };

  // ─── 렌더링 ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── 검색 + 툴바 영역 ── */}
      <div className="mb-6">

        {/* Row 1: 검색 바 */}
        <div className="flex items-center gap-3 mb-3">
          <div ref={searchWrapperRef} className="relative flex-1">
            <Input
              type="text"
              placeholder="게시물 검색... (예: 알고리즘, SQL)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowDropdown(true)}
              className="pl-11 pr-10 py-5 text-sm border-2 border-gray-200 focus:border-purple-400 rounded-xl"
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-sm" />
              </button>
            )}

            {/* 최근 검색어 드롭다운 */}
            {showDropdown && recentSearches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border-2 border-purple-100 rounded-2xl shadow-xl z-50 overflow-hidden">
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

          {/* 검색 버튼 */}
          <Button
            onClick={() => handleSearch()}
            className="px-5 py-5 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 text-white font-semibold shrink-0"
          >
            검색
          </Button>
        </div>

        {/* Row 2: 구분선 */}
        <div className="border-t border-gray-100 mb-2.5" />

        {/* Row 3: 정렬 텍스트 링크(좌) + 뷰 토글(우) */}
        <div className="flex items-center justify-between">
          {/* 정렬 텍스트 링크 */}
          <div className="flex items-center gap-0.5">
            {SORT_OPTIONS.map((option, idx) => {
              const isActive = sortBy === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => onSortChange?.(option.value)}
                  className={`
                    flex items-center text-sm transition-colors duration-150
                    ${isActive
                      ? "text-purple-600 font-bold"
                      : "text-gray-400 hover:text-gray-700 font-medium"
                    }
                  `}
                >
                  {idx > 0 && (
                    <span className="mx-2 text-gray-200 font-normal select-none">·</span>
                  )}
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mr-1.5 shrink-0 inline-block" />
                  )}
                  {option.label}
                </button>
              );
            })}

            {/* 초기화 버튼 */}
            {(sortBy !== "latest" || searchKeyword) && onResetSort && (
              <button
                onClick={() => { onResetSort(); handleClearSearch(); }}
                className="ml-3 flex items-center gap-1 text-xs text-gray-400 hover:text-purple-600 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
                초기화
              </button>
            )}
          </div>

          {/* 뷰 모드 토글 */}
          {onViewModeChange && (
            <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => onViewModeChange("grid")}
                className={`px-2.5 py-1.5 transition-colors ${
                  viewMode === "grid"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                }`}
                title="그리드 뷰"
              >
                <FontAwesomeIcon icon={faGrip} className="text-xs" />
              </button>
              <button
                onClick={() => onViewModeChange("list")}
                className={`px-2.5 py-1.5 transition-colors ${
                  viewMode === "list"
                    ? "bg-purple-600 text-white"
                    : "text-gray-400 hover:text-purple-600 hover:bg-purple-50"
                }`}
                title="리스트 뷰"
              >
                <FontAwesomeIcon icon={faList} className="text-xs" />
              </button>
            </div>
          )}
        </div>

        {/* 현재 검색어 태그 */}
        {searchKeyword && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-full text-xs font-medium">
              <FontAwesomeIcon icon={faSearch} className="text-[10px]" />
              <strong>{searchKeyword}</strong>
              <button
                onClick={handleClearSearch}
                className="ml-1 text-purple-400 hover:text-purple-700 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-[10px]" />
              </button>
            </span>
          </div>
        )}
      </div>

      {/* 결과 없을 때 (그리드: posts, 리스트: allListPosts 기준) */}
      {(viewMode === "grid" ? posts.length === 0 : allListPosts.length === 0) &&
        !loading && (
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

      {/* ───────── 그리드 뷰 (무한 스크롤) ───────── */}
      {viewMode === "grid" && (
        <>
          {/* 초기 로딩 스켈레톤 */}
          {loading && posts.length === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* 2열 그리드 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>

          {/* 추가 로딩 스켈레톤 */}
          {loading && posts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {Array.from({ length: 2 }).map((_, i) => (
                <PostCardSkeleton key={i} />
              ))}
            </div>
          )}

          {/* 무한 스크롤 트리거 */}
          <div ref={observerTarget} className="h-10" />

          {!gridHasMore && posts.length > 0 && (
            <div className="text-center py-8 text-gray-400">
              <p>모든 게시물을 확인했습니다 🎉</p>
            </div>
          )}
        </>
      )}

      {/* ───────── 리스트 뷰 (클라이언트 페이지네이션) ───────── */}
      {viewMode === "list" && (
        <>
          {/* 초기 로딩 스켈레톤 */}
          {loading && allListPosts.length === 0 && (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <PostListItemSkeleton key={i} />
              ))}
            </div>
          )}

          {/* 게시글 수 표시 */}
          {allListPosts.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                전체{" "}
                <strong className="text-purple-600">
                  {allListPosts.length}
                </strong>
                개의 게시물
              </p>
              {listTotalPages > 1 && (
                <p className="text-sm text-gray-400">
                  {listPage} / {listTotalPages} 페이지
                </p>
              )}
            </div>
          )}

          {/* 1열 리스트 */}
          <div className="space-y-4">
            {paginatedPosts.map((post) => (
              <PostListItem key={post.id} post={post} />
            ))}
          </div>

          {/* 로딩 중 오버레이 */}
          {loading && allListPosts.length > 0 && (
            <div className="flex justify-center py-8">
              <div className="animate-spin w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full" />
            </div>
          )}

          {/* 페이지네이션 컨트롤 (2페이지 이상일 때만 표시) */}
          {allListPosts.length > 0 && listTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8 pb-4">
              {/* 이전 페이지 */}
              <Button
                variant="outline"
                size="sm"
                disabled={isFirstPage}
                onClick={() => goToListPage(listPage - 1)}
                className="border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-40"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="mr-1.5" />
                이전
              </Button>

              {/* 페이지 번호 버튼 */}
              {Array.from({ length: listTotalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // 현재 페이지 기준 앞뒤 2페이지 + 첫/끝 페이지만 표시
                  return (
                    p === 1 ||
                    p === listTotalPages ||
                    Math.abs(p - listPage) <= 2
                  );
                })
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  // 페이지 사이 간격이 있으면 ... 삽입
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "..." ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-1 text-gray-400 text-sm"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goToListPage(item)}
                      className={`inline-flex items-center justify-center min-w-9 h-9 px-2.5 rounded-lg text-sm font-semibold transition-colors ${
                        item === listPage
                          ? "bg-purple-600 text-white shadow-md shadow-purple-500/30"
                          : "text-gray-600 hover:bg-purple-100 hover:text-purple-700"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}

              {/* 다음 페이지 */}
              <Button
                variant="outline"
                size="sm"
                disabled={isLastPage}
                onClick={() => goToListPage(listPage + 1)}
                className="border-purple-200 hover:border-purple-400 hover:bg-purple-50 disabled:opacity-40"
              >
                다음
                <FontAwesomeIcon icon={faChevronRight} className="ml-1.5" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
