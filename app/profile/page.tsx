"use client";

import { useState, useEffect } from "react";
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
  faUserFriends,
  faUserCheck,
} from "@fortawesome/free-solid-svg-icons";
import { userAPI, followAPI } from "@/lib/api";
import { PostResponse, UserSummaryResponse } from "@/lib/types";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import PostCard from "@/components/PostCard";
import AuthGuard from "@/components/AuthGuard";
import FollowButton from "@/components/FollowButton";
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

  // 프로필 페이지 진입 시 최신 유저 정보 페치 (게시글 수 실시간 반영)
  const [freshUser, setFreshUser] = useState(user);

  useEffect(() => {
    const refresh = async () => {
      try {
        const result = await userAPI.getMe();
        if (result.success) setFreshUser(result.data);
      } catch {
        // getMe 실패 시는 기존 user 값 유지
      }
    };
    refresh();
  }, []);

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

  // 팔로워 목록 상태
  const [followers, setFollowers] = useState<UserSummaryResponse[]>([]);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followersPage, setFollowersPage] = useState(0);
  const [followersTotalPages, setFollowersTotalPages] = useState(0);

  // 팔로잉 목록 상태
  const [following, setFollowing] = useState<UserSummaryResponse[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingPage, setFollowingPage] = useState(0);
  const [followingTotalPages, setFollowingTotalPages] = useState(0);

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

  // 팔로워 목록 로드
  const loadFollowers = async (page: number = 0) => {
    if (!user?.email) return;
    setFollowersLoading(true);
    try {
      const response = await followAPI.getFollowers(user.email, page, 20);
      if (response.success && response.data) {
        setFollowers(response.data.content);
        setFollowersTotalPages(response.data.totalPages);
        setFollowersPage(page);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "팔로워 목록 로드 실패";
      toast.error(message);
    } finally {
      setFollowersLoading(false);
    }
  };

  // 팔로잉 목록 로드
  const loadFollowing = async (page: number = 0) => {
    if (!user?.email) return;
    setFollowingLoading(true);
    try {
      const response = await followAPI.getFollowing(user.email, page, 20);
      if (response.success && response.data) {
        setFollowing(response.data.content);
        setFollowingTotalPages(response.data.totalPages);
        setFollowingPage(page);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "팔로잉 목록 로드 실패";
      toast.error(message);
    } finally {
      setFollowingLoading(false);
    }
  };

  // 탭 변경 시 데이터 로드
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    if (value === "liked" && likedPosts.length === 0) {
      loadLikedPosts(1);
    } else if (value === "posts" && myPosts.length === 0) {
      loadMyPosts(1);
    } else if (value === "followers" && followers.length === 0) {
      loadFollowers(0);
    } else if (value === "following" && following.length === 0) {
      loadFollowing(0);
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
                {freshUser?.name ?? "사용자"}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                <FontAwesomeIcon
                  icon={faEnvelope}
                  className="mr-1 text-purple-400"
                />
                {freshUser?.email}
              </p>
            </div>

            {/* 탭 구조 */}
            <Tabs
              value={activeTab}
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5 mb-6">
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
                <TabsTrigger value="followers">
                  <FontAwesomeIcon icon={faUserFriends} className="mr-2" />
                  팔로워
                </TabsTrigger>
                <TabsTrigger value="following">
                  <FontAwesomeIcon icon={faUserCheck} className="mr-2" />
                  팔로잉
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
                          {freshUser?.name}
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
                          {freshUser?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 활동 통계 — 팔로워/팔로잉 클릭 시 해당 탭으로 이동 */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-4 bg-white rounded-2xl border border-purple-100">
                      <p className="text-2xl font-bold text-purple-600">
                        {freshUser?.postCount ?? 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">게시글</p>
                    </div>
                    <button
                      onClick={() => handleTabChange("followers")}
                      className="text-center p-4 bg-white rounded-2xl border border-purple-100 hover:border-pink-300 hover:bg-pink-50 transition-colors cursor-pointer"
                    >
                      <p className="text-2xl font-bold text-pink-600">
                        {freshUser?.followerCount ?? 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">팔로워</p>
                    </button>
                    <button
                      onClick={() => handleTabChange("following")}
                      className="text-center p-4 bg-white rounded-2xl border border-purple-100 hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer"
                    >
                      <p className="text-2xl font-bold text-indigo-600">
                        {freshUser?.followingCount ?? 0}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">팔로잉</p>
                    </button>
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

              {/* 팔로워 탭 */}
              <TabsContent value="followers">
                <FollowUserList
                  users={followers}
                  isLoading={followersLoading}
                  emptyMessage="아직 팔로워가 없습니다"
                  emptyIcon={faUserFriends}
                  page={followersPage}
                  totalPages={followersTotalPages}
                  onPageChange={loadFollowers}
                />
              </TabsContent>

              {/* 팔로잉 탭 */}
              <TabsContent value="following">
                <FollowUserList
                  users={following}
                  isLoading={followingLoading}
                  emptyMessage="아직 팔로잉하는 사람이 없습니다"
                  emptyIcon={faUserCheck}
                  page={followingPage}
                  totalPages={followingTotalPages}
                  onPageChange={loadFollowing}
                />
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

// ─── 팔로워/팔로잉 목록 공통 UI ────────────────────────────────────────────────

interface FollowUserListProps {
  users: UserSummaryResponse[];
  isLoading: boolean;
  emptyMessage: string;
  emptyIcon: typeof faUserFriends;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * 팔로워/팔로잉 목록 공통 렌더러
 * - 스피너 → 빈 상태 → 유저 카드 목록 + 페이지네이션 순으로 렌더링
 */
function FollowUserList({
  users,
  isLoading,
  emptyMessage,
  emptyIcon,
  page,
  totalPages,
  onPageChange,
}: FollowUserListProps) {
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
        <p className="mt-4 text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FontAwesomeIcon
          icon={emptyIcon}
          className="text-4xl mb-4 opacity-30"
        />
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {users.map((u) => (
          <div
            key={u.email}
            className="flex items-center gap-3 p-3 bg-purple-50 rounded-2xl hover:bg-purple-100 transition-colors"
          >
            {/* 아바타 */}
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-purple-300 shrink-0">
              <Image
                src={
                  u.profileImageUrl ??
                  `https://api.dicebear.com/7.x/initials/svg?seed=${u.name}`
                }
                alt={u.name}
                fill
                className="object-cover"
              />
            </div>

            {/* 이름 + 이메일 */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">
                {u.name}
              </p>
              <p className="text-xs text-gray-500 truncate">{u.email}</p>
            </div>

            {/* 팔로우 버튼 */}
            <FollowButton
              targetEmail={u.email}
              initialIsFollowing={u.isFollowing}
              size="sm"
            />
          </div>
        ))}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            variant="outline"
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
          >
            이전
          </Button>
          <span className="flex items-center px-4 text-sm">
            {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages - 1}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
