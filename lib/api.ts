/**
 * API 호출 유틸리티 함수
 * fetch를 사용한 백엔드 통신 + JWT 인증 interceptor
 */

import {
  ApiResult,
  PostResponse,
  CommentResponse,
  UserResponse,
  SliceResponse,
  PaginationResponse,
  PostCreateRequest,
  PostUpdateRequest,
  CommentCreateRequest,
  TokenResponse,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090/api/v1";

// 환경변수 확인 로그
if (typeof window !== "undefined") {
  console.log("🔗 API Base URL:", API_BASE_URL);
}

// ─── 메모리 기반 AccessToken 관리 (XSS 방어) ────────────────────────────────
let _accessToken: string | null = null;

/** accessToken을 메모리에 저장 */
export function setAccessToken(token: string | null) {
  _accessToken = token;
}

/** 메모리에서 accessToken 읽기 */
export function getAccessToken(): string | null {
  return _accessToken;
}

// ─── 401 자동 갱신을 위한 큐 패턴 ────────────────────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: Error) => void;
}> = [];

/** 대기 중인 요청들을 일괄 처리 */
function processRefreshQueue(error: Error | null, token: string | null) {
  refreshQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token!);
  });
  refreshQueue = [];
}

/**
 * refreshToken(HttpOnly Cookie)으로 새 accessToken 발급
 * - 쿠키는 브라우저가 자동 전송 (credentials: "include")
 */
async function refreshAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/users/refresh`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("토큰 갱신에 실패했습니다.");
  }

  const data: ApiResult<TokenResponse> = await response.json();
  return data.data.accessToken;
}

/**
 * API 요청 헬퍼 함수
 * - accessToken 자동 부착 (Authorization: Bearer)
 * - 401 응답 시 자동 토큰 갱신 후 재시도
 * - 동시 401 발생 시 큐 패턴으로 refresh 1회만 호출
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit & { _retry?: boolean; _skipAuth?: boolean },
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  console.log("📡 API 요청:", {
    method: options?.method || "GET",
    url: fullUrl,
    timestamp: new Date().toISOString(),
  });

  // 인증 헤더 자동 부착 (_skipAuth 플래그 시 제외)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options?.headers as Record<string, string>) ?? {}),
  };

  if (!options?._skipAuth && _accessToken) {
    headers["Authorization"] = `Bearer ${_accessToken}`;
  }

  const response = await fetch(fullUrl, {
    ...options,
    headers,
    credentials: "include", // refreshToken 쿠키 자동 전송
  });

  console.log("📥 API 응답:", {
    status: response.status,
    statusText: response.statusText,
    url: fullUrl,
  });

  // ─── 401 자동 갱신 처리 ──────────────────────────────────────────────────
  if (response.status === 401 && !options?._retry && !options?._skipAuth) {
    // 이미 갱신 중이면 큐에 대기
    if (isRefreshing) {
      const newToken = await new Promise<string>((resolve, reject) => {
        refreshQueue.push({ resolve, reject });
      });
      // 새 토큰으로 원래 요청 재시도
      return fetchAPI<T>(endpoint, {
        ...options,
        _retry: true,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    }

    isRefreshing = true;

    try {
      const newToken = await refreshAccessToken();
      _accessToken = newToken;
      processRefreshQueue(null, newToken);

      // 원래 요청 재시도
      return fetchAPI<T>(endpoint, {
        ...options,
        _retry: true,
        headers: { ...headers, Authorization: `Bearer ${newToken}` },
      });
    } catch (refreshError) {
      processRefreshQueue(refreshError as Error, null);
      // refreshToken도 만료 → 로그아웃 이벤트 발행
      _accessToken = null;
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:logout"));
      }
      throw refreshError;
    } finally {
      isRefreshing = false;
    }
  }

  // ─── 일반 에러 처리 ─────────────────────────────────────────────────────
  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "오류가 발생했습니다." }));
    console.error("❌ API 에러:", error);
    throw new Error(
      (typeof error.data === "string" && error.data) ||
        error.message ||
        `HTTP error! status: ${response.status}`,
    );
  }

  const data = await response.json();
  console.log("✅ API 성공:", {
    url: fullUrl,
    dataSize: JSON.stringify(data).length,
  });

  return data;
}

/**
 * 게시물 관련 API
 */
export const postAPI = {
  // 게시물 목록 조회 (무한 스크롤)
  getPosts: async (
    page: number = 1,
    size: number = 20,
    orderCondition: string = "CREATED_AT_DESC",
    searchKeyword?: string,
  ): Promise<ApiResult<SliceResponse<PostResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      orderCondition: orderCondition,
    });
    if (searchKeyword) {
      params.append("searchKeyword", searchKeyword);
    }
    return fetchAPI(`/posts?${params}`);
  },

  // 게시물 상세 조회 (JWT로 사용자 식별, currentUserEmail은 비로그인 호환용)
  getPost: async (
    postId: number,
    currentUserEmail?: string,
  ): Promise<ApiResult<PostResponse>> => {
    const params = currentUserEmail
      ? `?currentUserEmail=${encodeURIComponent(currentUserEmail)}`
      : "";
    return fetchAPI(`/posts/${postId}${params}`);
  },

  // 게시물 작성 (JWT 인증 — 서버가 토큰에서 사용자 식별)
  createPost: async (
    data: PostCreateRequest,
  ): Promise<ApiResult<PostResponse>> => {
    return fetchAPI(`/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 게시물 수정
  updatePost: async (
    postId: number,
    data: PostUpdateRequest,
  ): Promise<ApiResult<PostResponse>> => {
    return fetchAPI(`/posts/${postId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // 게시물 삭제
  deletePost: async (postId: number): Promise<ApiResult<string>> => {
    return fetchAPI(`/posts/${postId}`, {
      method: "DELETE",
    });
  },

  // 좋아요 (JWT 인증)
  likePost: async (postId: number): Promise<ApiResult<string>> => {
    return fetchAPI(`/posts/${postId}/likes`, {
      method: "POST",
    });
  },

  // 좋아요 취소 (JWT 인증)
  unlikePost: async (postId: number): Promise<ApiResult<string>> => {
    return fetchAPI(`/posts/${postId}/likes`, {
      method: "DELETE",
    });
  },

  // 사용자 게시물 조회
  getUserPosts: async (
    userEmail: string,
    page: number = 0,
    size: number = 20,
  ): Promise<ApiResult<SliceResponse<PostResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: "createdAt,desc",
    });
    return fetchAPI(`/posts/users/${encodeURIComponent(userEmail)}?${params}`);
  },
};

/**
 * 댓글 관련 API
 */
export const commentAPI = {
  // 댓글 목록 조회
  getComments: async (
    postId: number,
    currentUserEmail?: string,
    page: number = 1,
    size: number = 10,
  ): Promise<ApiResult<SliceResponse<CommentResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    // likedByCurrentUser 정보를 위해 currentUserEmail 전달 (선택)
    if (currentUserEmail) {
      params.append("currentUserEmail", currentUserEmail);
    }
    return fetchAPI(`/posts/${postId}/comments?${params}`);
  },

  // 댓글 작성 (JWT 인증)
  createComment: async (
    postId: number,
    data: CommentCreateRequest,
  ): Promise<ApiResult<CommentResponse>> => {
    return fetchAPI(`/posts/${postId}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 댓글 수정 (JWT 인증)
  updateComment: async (
    commentId: number,
    data: CommentCreateRequest,
  ): Promise<ApiResult<CommentResponse>> => {
    return fetchAPI(`/comments/${commentId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // 댓글 삭제 (JWT 인증)
  deleteComment: async (commentId: number): Promise<ApiResult<string>> => {
    return fetchAPI(`/comments/${commentId}`, {
      method: "DELETE",
    });
  },
};

/**
 * 사용자 관련 API
 */
export const userAPI = {
  // 사용자 목록 조회
  getUsers: async (): Promise<ApiResult<UserResponse[]>> => {
    return fetchAPI("/users");
  },

  // 사용자 상세 조회
  getUser: async (email: string): Promise<ApiResult<UserResponse>> => {
    return fetchAPI(`/users/${encodeURIComponent(email)}`);
  },

  // 좋아요한 게시글 목록 조회 (JWT 인증 — X-User-Email 제거)
  getLikedPosts: async (
    page: number = 1,
    size: number = 10,
    sort: string = "desc",
  ): Promise<ApiResult<PaginationResponse<PostResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: sort,
    });
    return fetchAPI(`/users/me/liked-posts?${params}`);
  },

  // 내가 쓴 게시글 목록 조회 (JWT 인증 — X-User-Email 제거)
  getMyPosts: async (
    page: number = 1,
    size: number = 10,
    sort: string = "desc",
  ): Promise<ApiResult<PaginationResponse<PostResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: sort,
    });
    return fetchAPI(`/users/me/posts?${params}`);
  },

  // 내 정보 조회 (JWT 인증)
  getMe: async (): Promise<ApiResult<UserResponse>> => {
    return fetchAPI("/users/me");
  },

  // 이메일 중복 확인 (POST + JSON body)
  checkEmail: async (email: string): Promise<ApiResult<boolean>> => {
    return fetchAPI("/users/check-email", {
      method: "POST",
      body: JSON.stringify({ email }),
      _skipAuth: true,
    } as any);
  },
};

/**
 * 인증 관련 API
 */
export const authAPI = {
  /** 로그인 → accessToken(body) + refreshToken(Set-Cookie) */
  login: async (
    email: string,
    password: string,
  ): Promise<ApiResult<TokenResponse>> => {
    return fetchAPI("/users/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      _skipAuth: true,
    } as any);
  },

  /** 회원가입 */
  join: async (
    email: string,
    password: string,
    name: string,
  ): Promise<ApiResult<string>> => {
    return fetchAPI("/users/join", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
      _skipAuth: true,
    } as any);
  },

  /** 토큰 갱신 (refreshToken 쿠키 자동 전송) */
  refresh: async (): Promise<ApiResult<TokenResponse>> => {
    const response = await fetch(`${API_BASE_URL}/users/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("토큰 갱신에 실패했습니다.");
    }

    return response.json();
  },

  /** 로그아웃 (서버에서 refreshToken 쿠키 삭제) */
  logout: async (): Promise<void> => {
    try {
      await fetchAPI("/users/logout", { method: "POST" });
    } catch {
      // 로그아웃은 실패해도 클라이언트 정리 진행
    }
  },
};

/**
 * 파일 관련 API
 */
export const fileAPI = {
  // 이미지 URL 생성 (파일명 기반)
  getImageUrl: (
    filename: string,
    type: "POST" | "USER" | "THUMBNAIL" = "POST",
  ): string => {
    if (!filename) return "";
    return `${API_BASE_URL}/files/images/view?filename=${encodeURIComponent(filename)}&type=${type}`;
  },

  // 파일 업로드
  uploadFile: async (
    files: File[],
    type: "POST" | "USER" | "THUMBNAIL" = "POST",
  ): Promise<ApiResult<any>> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });
    formData.append("type", type);

    const response = await fetch(`${API_BASE_URL}/files/upload`, {
      method: "POST",
      headers: {
        // JWT 인증 헤더 부착
        ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
      },
      body: formData,
      credentials: "include",
      // Content-Type은 자동으로 설정됨 (multipart/form-data)
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "파일 업로드에 실패했습니다." }));
      // data 필드에 상세 메시지가 있으면 우선 표시, 없으면 message 사용
      throw new Error(
        (typeof error.data === "string" && error.data) ||
          error.message ||
          `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  },
};

/**
 * 로컬스토리지 유틸리티
 */
export const storage = {
  // 좋아요 상태 저장 (클라이언트 캐시 — 서버 상태와 별개)
  getLikedPosts: (): Set<number> => {
    if (typeof window === "undefined") return new Set();
    const liked = localStorage.getItem("likedPosts");
    return liked ? new Set(JSON.parse(liked)) : new Set();
  },

  setLikedPost: (postId: number, liked: boolean) => {
    if (typeof window === "undefined") return;
    const likedPosts = storage.getLikedPosts();
    if (liked) {
      likedPosts.add(postId);
    } else {
      likedPosts.delete(postId);
    }
    localStorage.setItem("likedPosts", JSON.stringify([...likedPosts]));
  },

  // 내가 작성한 게시글 ID 관리 (클라이언트 캐시)
  getMyPostIds: (): Set<number> => {
    if (typeof window === "undefined") return new Set();
    const myPosts = localStorage.getItem("myPostIds");
    return myPosts ? new Set(JSON.parse(myPosts)) : new Set();
  },

  addMyPostId: (postId: number) => {
    if (typeof window === "undefined") return;
    const myPosts = storage.getMyPostIds();
    myPosts.add(postId);
    localStorage.setItem("myPostIds", JSON.stringify([...myPosts]));
  },

  removeMyPostId: (postId: number) => {
    if (typeof window === "undefined") return;
    const myPosts = storage.getMyPostIds();
    myPosts.delete(postId);
    localStorage.setItem("myPostIds", JSON.stringify([...myPosts]));
  },

  isMyPost: (postId: number): boolean => {
    return storage.getMyPostIds().has(postId);
  },
};
