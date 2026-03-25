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
  ChatStreamCallbacks,
  FollowResponse,
  FollowListResponse,
  PdfImportResponse,
  ImageAnalysisResponse,
  WeeklyPopularPost,
  NotificationResponse,
  NotificationSSECallbacks,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

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
 * Refresh 실패 시 에러코드를 함께 던지는 커스텀 에러
 */
class RefreshTokenError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
  ) {
    super(message);
    this.name = "RefreshTokenError";
  }
}

/**
 * refreshToken(HttpOnly Cookie)으로 새 accessToken 발급
 * - 쿠키는 브라우저가 자동 전송 (credentials: "include")
 * - GET 방식, refreshToken은 쿠키에서 서버가 읽음
 */
async function refreshAccessToken(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/users/refresh`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    // 서버 에러 응답 파싱 후 errorCode별 커스텀 에러 throw
    const errBody = await response
      .json()
      .catch(() => ({ message: "토큰 갱신 실패", errorCode: "UNKNOWN" }));
    const errorCode: string = errBody.errorCode ?? "UNKNOWN";
    const message: string = errBody.message ?? "토큰 갱신 실패";
    throw new RefreshTokenError(message, errorCode);
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
    // 응답 body를 먼저 파싱해서 에러 원인 확인
    const errBody = await response
      .json()
      .catch(() => ({ message: "", errorCode: "" }));
    const errMessage: string = errBody.message ?? "";

    // "Expired" 메시지일 때만 refresh 시도 (만료된 토큰)
    if (errMessage === "Expired") {
      // 이미 갱신 중이면 큐에 대기
      if (isRefreshing) {
        const newToken = await new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        });
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
        _accessToken = null;

        if (typeof window !== "undefined") {
          // errorCode별 이벤트 분기
          if (refreshError instanceof RefreshTokenError) {
            const { errorCode, message } = refreshError;

            if (errorCode === "REFRESH_TOKEN_NOT_FOUND") {
              // Redis에 토큰 없음 / 불일치 → 세션 만료 처리
              window.dispatchEvent(
                new CustomEvent("auth:logout", {
                  detail: {
                    message: "세션이 만료되었습니다. 다시 로그인해주세요.",
                  },
                }),
              );
            } else if (errorCode === "REFRESH_TOKEN_INVALID_EXPIRATION") {
              // 만료 시간 파싱 실패 → 에러 로깅 + 로그인 페이지 이동
              console.error("[Refresh] 토큰 만료 시간 파싱 실패:", message);
              window.dispatchEvent(
                new CustomEvent("auth:logout", {
                  detail: {
                    message: "인증 오류가 발생했습니다. 다시 로그인해주세요.",
                  },
                }),
              );
            } else {
              // INVALID_TOKEN (Expired / MalFormed) 등 나머지 전체
              window.dispatchEvent(
                new CustomEvent("auth:logout", {
                  detail: {
                    message: "세션이 만료되었습니다. 다시 로그인해주세요.",
                  },
                }),
              );
            }
          } else {
            // 네트워크 오류 등 예상 외 실패
            window.dispatchEvent(new Event("auth:logout"));
          }
        }

        throw refreshError;
      } finally {
        isRefreshing = false;
      }
    }

    // 토큰 없음 / 블랙리스트(로그아웃) 등 → 로그인 페이지로 이동
    _accessToken = null;
    if (typeof window !== "undefined") {
      // auth:unauthorized 이벤트로 메시지를 함께 전달
      window.dispatchEvent(
        new CustomEvent("auth:unauthorized", {
          detail: { message: errMessage },
        }),
      );
    }
    throw new Error(errMessage || "인증이 필요합니다.");
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

  // 전체 해시태그 목록 조회 (예: ["#책", "#개발", ...])
  getTags: async (): Promise<ApiResult<string[]>> => {
    return fetchAPI(`/posts/tags`);
  },

  // 인기 태그 목록 조회 (popular=true, 최대 limit 개)
  getPopularTags: async (limit: number = 10): Promise<ApiResult<string[]>> => {
    return fetchAPI(`/posts/tags?popular=true&limit=${limit}`);
  },

  // 주간 인기글 목록 조회 (최대 limit 개)
  getWeeklyPopular: async (
    limit: number = 5,
  ): Promise<ApiResult<WeeklyPopularPost[]>> => {
    return fetchAPI(`/posts/popular/weekly?limit=${limit}`);
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

  /** 토큰 갱신 (GET, refreshToken 쿠키 자동 전송) */
  refresh: async (): Promise<ApiResult<TokenResponse>> => {
    const response = await fetch(`${API_BASE_URL}/users/refresh`, {
      method: "GET",
      credentials: "include",
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
  // 이미지 URL 생성 (Next.js API 프록시 경유)
  // → 브라우저 <Image src>는 헤더 추가 불가이므로
  //   /api/images 프록시를 통해 서버 사이드에서 Authorization 헤더를 부착
  getImageUrl: (
    filename: string,
    type: "POST" | "USER" | "THUMBNAIL" = "POST",
  ): string => {
    if (!filename) return "";
    const params = new URLSearchParams({ filename, type });
    // accessToken이 있으면 프록시로 전달 (서버→백엔드 요청 시 헤더 부착)
    if (_accessToken) {
      params.set("token", _accessToken);
    }
    return `/api/images?${params.toString()}`;
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
 * 팔로우 관련 API
 */
export const followAPI = {
  // 팔로우 (POST /users/{email}/follow)
  follow: async (targetEmail: string): Promise<ApiResult<FollowResponse>> => {
    return fetchAPI(`/users/${encodeURIComponent(targetEmail)}/follow`, {
      method: "POST",
    });
  },

  // 팔로우 취소 (DELETE /users/{email}/follow)
  unfollow: async (targetEmail: string): Promise<ApiResult<FollowResponse>> => {
    return fetchAPI(`/users/${encodeURIComponent(targetEmail)}/follow`, {
      method: "DELETE",
    });
  },

  // 팔로워 목록 조회 (GET /users/{email}/followers)
  getFollowers: async (
    email: string,
    page: number = 0,
    size: number = 20,
  ): Promise<ApiResult<FollowListResponse>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    return fetchAPI(`/users/${encodeURIComponent(email)}/followers?${params}`);
  },

  // 팔로잉 목록 조회 (GET /users/{email}/following)
  getFollowing: async (
    email: string,
    page: number = 0,
    size: number = 20,
  ): Promise<ApiResult<FollowListResponse>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      size: size.toString(),
    });
    return fetchAPI(`/users/${encodeURIComponent(email)}/following?${params}`);
  },
};

// ─── AI / PDF Import API ──────────────────────────────────────────────────────

/**
 * PDF 파일을 업로드하면 AI가 파싱 후 게시글로 자동 등록합니다.
 * multipart/form-data 요청이므로 Content-Type 헤더를 브라우저에 위임합니다.
 */
export const aiAPI = {
  /**
   * POST /ai/pdf/import
   * @param file - 업로드할 PDF 파일
   * @param visibility - 게시글 공개 설정 (PUBLIC | PRIVATE | FOLLOWERS_ONLY)
   * @param hashtags - 해시태그 열세히 (선택)
   */
  importPdf: async (
    file: File,
    visibility: string = "PUBLIC",
    hashtags?: string[],
  ): Promise<ApiResult<PdfImportResponse>> => {
    const token = getAccessToken();
    const params = new URLSearchParams({ visibility });
    if (hashtags && hashtags.length > 0) {
      // 해시태그는 하렬로 구분한 단일 파라미터로 전달
      params.set("hashtags", hashtags.join(","));
    }
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/ai/pdf/import?${params}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      // 4xx/5xx 에러도 throw 대신 ApiResult 형태로 반환하여
      // 호출부에서 errorCode 분기 처리가 가능하도록 함
      try {
        const errBody = await res.json();
        return errBody as ApiResult<PdfImportResponse>;
      } catch {
        return {
          success: false,
          message: `PDF 업로드 실패 (${res.status})`,
          data: null as unknown as PdfImportResponse,
        };
      }
    }
    return res.json() as Promise<ApiResult<PdfImportResponse>>;
  },

  /**
   * POST /ai/image/analysis
   * 이미지를 업로드하면 AI가 분석하여 키워드 목록을 반환합니다.
   * @param file - 분석할 이미지 파일 (jpeg, png 등)
   */
  analyzeImage: async (
    file: File,
  ): Promise<ApiResult<ImageAnalysisResponse>> => {
    const token = getAccessToken();
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/ai/image/analysis`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `이미지 분석 실패 (${res.status})`);
    }
    return res.json() as Promise<ApiResult<ImageAnalysisResponse>>;
  },
};
// ─── 챗봇 스트리밍 API ────────────────────────────────────────────────────────

/**
 * SSE 이벤트 블록 하나를 파싱합니다.
 *
 * SSE 형식: "event:xxx\ndata:yyy"
 * 여러 data: 라인은 \n 으로 합산합니다.
 */
function parseSSEBlock(block: string): { event: string; data: string } | null {
  const lines = block.split("\n");
  let event = "";
  const dataLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6); // 'event:' 이후 값
    } else if (line.startsWith("data:")) {
      dataLines.push(line.slice(5)); // 'data:' 이후 값 (공백 보존)
    }
  }

  if (!event) return null;
  return { event, data: dataLines.join("\n") };
}

/**
 * 챗봇 스트리밍 API 호출 (POST /ai/chat/stream)
 *
 * Server-Sent Events 형식으로 응답을 수신합니다:
 * - event:metadata → 출처 게시글 ID 배열
 * - event:token    → AI 답변 텍스트 토큰
 * - event:done     → 스트리밍 완료
 *
 * @param query - 사용자 질문 (2~500자)
 * @param topK  - 참조할 유사 게시글 수 (기본 5, 최대 10)
 * @param callbacks - 이벤트별 핸들러
 */
export async function streamChat(
  query: string,
  topK: number = 5,
  callbacks: ChatStreamCallbacks,
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai/chat/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        // JWT 인증 헤더 부착 (로그인 상태인 경우)
        ...(_accessToken ? { Authorization: `Bearer ${_accessToken}` } : {}),
      },
      credentials: "include", // refreshToken 쿠키 자동 전송
      body: JSON.stringify({ query, topK }),
    });

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error("응답 스트림을 읽을 수 없습니다.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    // 이전 청크에서 끊긴 불완전 블록 버퍼
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 이벤트 블록은 \n\n 으로 구분됨
      const blocks = buffer.split("\n\n");
      // 마지막 요소는 아직 끊긴 블록 → 버퍼에 보존
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        if (!block.trim()) continue;

        const parsed = parseSSEBlock(block);
        if (!parsed) continue;

        switch (parsed.event) {
          case "metadata": {
            try {
              const meta = JSON.parse(parsed.data) as {
                sourcePostIds: number[];
              };
              callbacks.onMetadata(meta.sourcePostIds ?? []);
            } catch {
              // JSON 파싱 실패 시 빈 배열로 처리
              callbacks.onMetadata([]);
            }
            break;
          }
          case "token": {
            callbacks.onToken(parsed.data);
            break;
          }
          case "done": {
            callbacks.onDone();
            return; // 스트리밍 완료
          }
        }
      }
    }

    // done 이벤트 없이 스트림이 종료된 경우에도 완료 처리
    callbacks.onDone();
  } catch (error) {
    callbacks.onError(
      error instanceof Error
        ? error
        : new Error("알 수 없는 오류가 발생했습니다."),
    );
  }
}

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

/**
 * 알림 관련 REST API
 */
export const notificationAPI = {
  /** 알림 전체 목록 조회 */
  getAll: (): Promise<ApiResult<NotificationResponse[]>> =>
    fetchAPI("/notifications"),

  /** 미읽음 알림 개수 조회 */
  getUnreadCount: (): Promise<ApiResult<number>> =>
    fetchAPI("/notifications/unread-count"),

  /** 전체 알림 읽음 처리 */
  markAllRead: (): Promise<ApiResult<null>> =>
    fetchAPI("/notifications/read-all", { method: "PATCH" }),

  /** 특정 알림 읽음 처리 (PATCH /notifications/{id}/read) */
  markRead: (id: number): Promise<ApiResult<null>> =>
    fetchAPI(`/notifications/${id}/read`, { method: "PATCH" }),
};

/**
 * SSE 실시간 알림 구독
 * - EventSource는 커스텀 헤더를 지원하지 않으므로 token을 query string으로 전달
 * - 반환된 EventSource를 close()로 구독 해제
 */
export function subscribeNotifications(
  token: string,
  callbacks: NotificationSSECallbacks,
): EventSource {
  const url = `${API_BASE_URL}/notifications/subscribe?token=${encodeURIComponent(token)}`;
  const es = new EventSource(url);

  // 서버 연결 확인 이벤트
  es.addEventListener("connected", () => {
    callbacks.onConnected?.();
  });

  // 실시간 알림 수신 이벤트
  es.addEventListener("notification", (e: MessageEvent) => {
    try {
      const notification: NotificationResponse = JSON.parse(e.data);
      callbacks.onNotification(notification);
    } catch {
      console.error("[SSE] 알림 파싱 실패:", e.data);
    }
  });

  // 연결 오류 처리
  es.onerror = (e) => {
    callbacks.onError?.(e);
  };

  return es;
}
