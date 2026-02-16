/**
 * API 호출 유틸리티 함수
 * fetch를 사용한 백엔드 통신
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
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8090/api/v1";

// 환경변수 확인 로그
if (typeof window !== "undefined") {
  console.log("🔗 API Base URL:", API_BASE_URL);
}

/**
 * API 요청 헬퍼 함수
 */
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // API 호출 로그
  console.log("📡 API 요청:", {
    method: options?.method || "GET",
    url: fullUrl,
    timestamp: new Date().toISOString(),
  });

  const response = await fetch(fullUrl, {
    headers: {
      "Content-Type": "application/json",
      // ngrok 브라우저 경고 우회 (프로덕션 배포용)
      "ngrok-skip-browser-warning": "true",
      ...options?.headers,
    },
    ...options,
  });

  console.log("📥 API 응답:", {
    status: response.status,
    statusText: response.statusText,
    url: fullUrl,
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "오류가 발생했습니다." }));
    console.error("❌ API 에러:", error);
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
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

  // 게시물 상세 조회
  getPost: async (
    postId: number,
    currentUserEmail?: string,
  ): Promise<ApiResult<PostResponse>> => {
    const params = currentUserEmail
      ? `?currentUserEmail=${encodeURIComponent(currentUserEmail)}`
      : "";
    return fetchAPI(`/posts/${postId}${params}`);
  },

  // 게시물 작성
  createPost: async (
    authorEmail: string,
    data: PostCreateRequest,
  ): Promise<ApiResult<PostResponse>> => {
    return fetchAPI(`/posts?authorEmail=${encodeURIComponent(authorEmail)}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 게시물 수정
  updatePost: async (
    postId: number,
    authorEmail: string,
    data: PostUpdateRequest,
  ): Promise<ApiResult<PostResponse>> => {
    return fetchAPI(
      `/posts/${postId}?authorEmail=${encodeURIComponent(authorEmail)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  },

  // 게시물 삭제
  deletePost: async (
    postId: number,
    authorEmail: string,
  ): Promise<ApiResult<string>> => {
    return fetchAPI(
      `/posts/${postId}?authorEmail=${encodeURIComponent(authorEmail)}`,
      {
        method: "DELETE",
      },
    );
  },

  // 좋아요
  likePost: async (
    postId: number,
    userEmail: string,
  ): Promise<ApiResult<string>> => {
    return fetchAPI(
      `/posts/${postId}/likes?userEmail=${encodeURIComponent(userEmail)}`,
      {
        method: "POST",
      },
    );
  },

  // 좋아요 취소
  unlikePost: async (
    postId: number,
    userEmail: string,
  ): Promise<ApiResult<string>> => {
    return fetchAPI(
      `/posts/${postId}/likes?userEmail=${encodeURIComponent(userEmail)}`,
      {
        method: "DELETE",
      },
    );
  },

  // 사용자 게시물 조회
  getUserPosts: async (
    userEmail: string,
    currentUserEmail?: string,
    page: number = 0,
    size: number = 20,
  ): Promise<ApiResult<SliceResponse<PostResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: "createdAt,desc",
    });
    if (currentUserEmail) {
      params.append("currentUserEmail", currentUserEmail);
    }
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

  // 댓글 작성
  createComment: async (
    postId: number,
    authorEmail: string,
    data: CommentCreateRequest,
  ): Promise<ApiResult<CommentResponse>> => {
    return fetchAPI(
      `/posts/${postId}/comments?authorEmail=${encodeURIComponent(authorEmail)}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
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

  // 좋아요한 게시글 목록 조회 (페이징)
  getLikedPosts: async (
    userEmail: string,
    page: number = 1,
    size: number = 10,
    sort: string = "desc",
  ): Promise<ApiResult<PaginationResponse<PostResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: sort,
    });
    return fetchAPI(`/users/me/liked-posts?${params}`, {
      headers: {
        "X-User-Email": userEmail,
      },
    });
  },

  // 내가 쓴 게시글 목록 조회 (페이징)
  getMyPosts: async (
    userEmail: string,
    page: number = 1,
    size: number = 10,
    sort: string = "desc",
  ): Promise<ApiResult<PaginationResponse<PostResponse>>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
      sort: sort,
    });
    return fetchAPI(`/users/me/posts?${params}`, {
      headers: {
        "X-User-Email": userEmail,
      },
    });
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
        // ngrok 브라우저 경고 우회 (프로덕션 배포용)
        "ngrok-skip-browser-warning": "true",
      },
      body: formData,
      // Content-Type은 자동으로 설정됨 (multipart/form-data)
    });

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: "파일 업로드에 실패했습니다." }));
      throw new Error(
        error.message || `HTTP error! status: ${response.status}`,
      );
    }

    return response.json();
  },
};

/**
 * 로컬스토리지 유틸리티
 */
export const storage = {
  // 좋아요 상태 저장
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

  // 현재 사용자 이메일 (임시)
  getCurrentUserEmail: (): string => {
    if (typeof window === "undefined") return "user@example.com";
    return localStorage.getItem("currentUserEmail") || "user@example.com";
  },

  setCurrentUserEmail: (email: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem("currentUserEmail", email);
  },

  // 내가 작성한 게시글 ID 관리
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
