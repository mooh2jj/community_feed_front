"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowLeft,
  faUser,
  faHeart,
  faPen,
  faSignOutAlt,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { userAPI } from "@/lib/api";
import { PostResponse } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/context/AuthContext";

/**
 * 마이 페이지 - 탭 구조
 * 내 정보 (AuthContext 기반), 좋아요한 글, 내가 쓴 글
 */
export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // 좋아요한 글 상태
  const [likedPosts, setLikedPosts] = useState<PostResponse[]>([]);
  const [likedPostsLoading, setLikedPostsLoading] = useState(false);
  const [likedPostsPage, setLikedPostsPage] = useState(1);
  const [likedPostsTotalPages, setLikedPostsTotalPages] = useState(0);

  // 내가 쓴 글 상태
  const [myPosts, setMyPosts] = useState<PostResponse[]>([]);
  const [myPostsLoading, setMyPostsLoading] = useState(false);
  const [myPostsPage, setMyPostsPage] = useState(1);
  const [myPostsTotalPages, setMyPostsTotalPages] = useState(0);

  // 좋아요한 글 로드 (JWT 인증 — 이메일 전달 불필요)
  const loadLikedPosts = async (page: number = 1) => {
    setLikedPostsLoading(true);
    try {
      const response = await userAPI.getLikedPosts(page, 10);
      if (response.success && response.data) {
        setLikedPosts(response.data.items);
        setLikedPostsTotalPages(response.data.totalPage);
        setLikedPostsPage(page);
      }
    } catch (error) {
      console.error("좋아요한 글 로드 실패:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "좋아요한 글을 불러오는데 실패했습니다";
      toast.error(errorMessage);
    } finally {
      setLikedPostsLoading(false);
    }
  };

  // 내가 쓴 글 로드 (JWT 인증 — 이메일 전달 불필요)
  const loadMyPosts = async (page: number = 1) => {
    setMyPostsLoading(true);
    try {
      const response = await userAPI.getMyPosts(page, 10);
      if (response.success && response.data) {
        setMyPosts(response.data.items);
        setMyPostsTotalPages(response.data.totalPage);
        setMyPostsPage(page);
      }
    } catch (error) {
      console.error("내가 쓴 글 로드 실패:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "내가 쓴 글을 불러오는데 실패했습니다";
      toast.error(errorMessage);
    } finally {
      setMyPostsLoading(false);
    }
  };

  // 탭 변경 시 데이터 로드
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "liked" && likedPosts.length === 0) {
      loadLikedPosts(1);
    } else if (value === "posts" && myPosts.length === 0) {
      loadMyPosts(1);
    }
  };

  // 로그아웃 핸들러
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("로그아웃 되었습니다");
    } catch {
      toast.error("로그아웃에 실패했습니다");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-white">
      {/* 헤더 */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-purple-100">
        <div className="max-w-screen-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <FontAwesomeIcon icon={faArrowLeft} className="mr-2" />
              돌아가기
            </Button>
          </Link>
          <h1 className="text-lg font-bold gradient-text">마이 페이지</h1>
          <div className="w-20" />
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-screen-lg mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* 프로필 헤더 카드 */}
          <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-xl p-8">
            <div className="flex flex-col items-center mb-6">
              <div className="relative w-32 h-32 rounded-full overflow-hidden ring-4 ring-purple-400 ring-offset-4 mb-4">
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-5xl">
                  <FontAwesomeIcon icon={faUser} />
                </div>
              </div>
              <h2 className="text-2xl font-bold gradient-text">
                {user?.name ?? "사용자"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="mr-1 text-purple-400"
                />
                {user?.email}
              </p>
            </div>

            {/* 탭 구조 */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="profile">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />내 정보
                </TabsTrigger>
                <TabsTrigger value="liked">
                  <FontAwesomeIcon icon={faHeart} className="mr-2" />
                  좋아요
                </TabsTrigger>
                <TabsTrigger value="posts">
                  <FontAwesomeIcon icon={faPen} className="mr-2" />내 글
                </TabsTrigger>
              </TabsList>

              {/* 내 정보 탭 */}
              <TabsContent value="profile" className="space-y-4">
                <div className="space-y-4">
                  {/* 사용자 정보 카드 */}
                  <div className="bg-purple-50 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon
                        icon={faUser}
                        className="text-purple-600"
                      />
                      <div>
                        <p className="text-xs text-gray-500">이름</p>
                        <p className="font-semibold text-gray-800">
                          {user?.name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <FontAwesomeIcon
                        icon={faEnvelope}
                        className="text-purple-600"
                      />
                      <div>
                        <p className="text-xs text-gray-500">이메일</p>
                        <p className="font-semibold text-gray-800">
                          {user?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 활동 통계 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 bg-white rounded-2xl border border-purple-100">
                      <p className="text-2xl font-bold text-purple-600">
                        {user?.postCount ?? 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">게시글</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-2xl border border-purple-100">
                      <p className="text-2xl font-bold text-pink-600">
                        {user?.followerCount ?? 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">팔로워</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-2xl border border-purple-100">
                      <p className="text-2xl font-bold text-indigo-600">
                        {user?.followingCount ?? 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">팔로잉</p>
                    </div>
                  </div>
                </div>

                {/* 로그아웃 버튼 */}
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="w-full py-6 border-2 border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 rounded-2xl"
                >
                  <FontAwesomeIcon icon={faSignOutAlt} className="mr-2" />
                  로그아웃
                </Button>
              </TabsContent>

              {/* 좋아요한 글 탭 */}
              <TabsContent value="liked">
                <div className="space-y-4">
                  {likedPostsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="mt-4 text-gray-500">로딩 중...</p>
                    </div>
                  ) : likedPosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FontAwesomeIcon
                        icon={faHeart}
                        className="text-4xl mb-4 opacity-30"
                      />
                      <p>아직 좋아요한 게시글이 없습니다</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {likedPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onLikeChange={() => loadLikedPosts(likedPostsPage)}
                          />
                        ))}
                      </div>

                      {/* 페이지네이션 */}
                      {likedPostsTotalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                          <Button
                            variant="outline"
                            onClick={() => loadLikedPosts(likedPostsPage - 1)}
                            disabled={likedPostsPage === 1}
                          >
                            이전
                          </Button>
                          <span className="flex items-center px-4 text-sm">
                            {likedPostsPage} / {likedPostsTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => loadLikedPosts(likedPostsPage + 1)}
                            disabled={likedPostsPage === likedPostsTotalPages}
                          >
                            다음
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>

              {/* 내가 쓴 글 탭 */}
              <TabsContent value="posts">
                <div className="space-y-4">
                  {myPostsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="mt-4 text-gray-500">로딩 중...</p>
                    </div>
                  ) : myPosts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <FontAwesomeIcon
                        icon={faPen}
                        className="text-4xl mb-4 opacity-30"
                      />
                      <p>아직 작성한 게시글이 없습니다</p>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {myPosts.map((post) => (
                          <PostCard
                            key={post.id}
                            post={post}
                            onLikeChange={() => loadMyPosts(myPostsPage)}
                          />
                        ))}
                      </div>

                      {/* 페이지네이션 */}
                      {myPostsTotalPages > 1 && (
                        <div className="flex justify-center gap-2 mt-6">
                          <Button
                            variant="outline"
                            onClick={() => loadMyPosts(myPostsPage - 1)}
                            disabled={myPostsPage === 1}
                          >
                            이전
                          </Button>
                          <span className="flex items-center px-4 text-sm">
                            {myPostsPage} / {myPostsTotalPages}
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => loadMyPosts(myPostsPage + 1)}
                            disabled={myPostsPage === myPostsTotalPages}
                          >
                            다음
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* 정보 카드 */}
          <div className="bg-white rounded-3xl border-2 border-purple-100 shadow-xl p-6">
            <h3 className="font-bold text-lg mb-4 gradient-text">📱 앱 정보</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                버전: 1.0.0
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-pink-500" />
                스터디메이트와 함께 성장하세요
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                문의: support@studymate.com
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
