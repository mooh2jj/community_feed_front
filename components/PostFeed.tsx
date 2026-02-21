"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PostResponse } from "@/lib/types";
import { postAPI } from "@/lib/api";
import PostCard from "./PostCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSpinner,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const observerTarget = useRef<HTMLDivElement>(null);

  // initialSearchKeyword가 변경되면 검색 업데이트
  useEffect(() => {
    if (initialSearchKeyword) {
      setSearchKeyword(initialSearchKeyword);
      setSearchInput(initialSearchKeyword);
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

  // 검색 실행
  const handleSearch = () => {
    setSearchKeyword(searchInput.trim());
  };

  // 검색 초기화
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchKeyword("");
  };

  // Enter 키 처리
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div>
      {/* 검색창 및 초기화 - 항상 표시 */}
      <div className="mb-6 space-y-4">
        <div className="flex items-center gap-3">
          {/* 검색창 */}
          <div className="relative flex-1 max-w-2xl mx-auto">
            <Input
              type="text"
              placeholder="게시물 검색... (예: 알고리즘, SQL)"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyPress={handleKeyPress}
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
              onClick={handleSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600"
            >
              검색
            </Button>
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

      {/* 그리드 레이아웃 - 2열 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>

      {/* 로딩 인디케이터 */}
      {loading && (
        <div className="text-center py-8">
          <FontAwesomeIcon
            icon={faSpinner}
            className="text-3xl text-purple-600 animate-spin"
          />
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
