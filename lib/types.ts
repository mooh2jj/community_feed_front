/**
 * 백엔드 API 응답 타입 정의
 */

// API 공통 응답 형식
export interface ApiResult<T> {
  success: boolean;
  message?: string;
  data: T;
}

// 게시물 가시성
export enum PostVisibility {
  PUBLIC = "PUBLIC",
  PRIVATE = "PRIVATE",
  FOLLOWERS_ONLY = "FOLLOWERS_ONLY",
}

// 게시물 응답
export interface PostResponse {
  id: number;
  imageUrl?: string;
  content: string;
  authorName: string;
  authorEmail: string; // 작성자 이메일 추가
  authorProfileImageUrl?: string;
  visibility: PostVisibility;
  likeCount: number;
  liked: boolean; // 현재 로그인 사용자의 좋아요 여부 (서버 응답)
  commentCount: number;
  viewCount: number;
  hashtags?: string[]; // 해시태그 목록
  isFollowing?: boolean; // 현재 로그인 사용자가 작성자를 팔로우 중인지 여부
  createdAt: string;
  modifiedAt: string;
}

// 댓글 응답
export interface CommentResponse {
  id: number;
  postId: number;
  content: string;
  authorName: string;
  authorEmail: string; // 작성자 이메일
  authorProfileImageUrl?: string;
  likeCount: number;
  createdAt: string;
  modifiedAt: string;
  likedByCurrentUser: boolean; // 현재 사용자가 좋아요 했는지
}

// 사용자 응답
export interface UserResponse {
  email: string;
  name: string;
  profileImageUrl?: string;
  roles?: string[]; // 백엔드 응답에 포함되는 역할 목록
  followerCount: number;
  followingCount: number;
  postCount: number;
  isFollowing?: boolean; // 현재 로그인 사용자가 해당 유저를 팔로우 중인지 여부
}

// 팔로우 API 응답
export interface FollowResponse {
  targetEmail: string;
  followerCount: number;
}

// 팔로워/팔로잉 목록의 단일 유저 요약
export interface UserSummaryResponse {
  email: string;
  name: string;
  profileImageUrl?: string;
  isFollowing: boolean;
}

// 팔로워/팔로잉 목록 페이지 응답
export interface FollowListResponse {
  content: UserSummaryResponse[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// Slice 응답 (무한 스크롤)
export interface SliceResponse<T> {
  content: T[];
  number: number; // 페이지 번호 (0부터 시작)
  size: number; // 페이지 크기
  numberOfElements: number; // 현재 페이지의 요소 개수
  first: boolean; // 첫 페이지 여부
  last: boolean; // 마지막 페이지 여부
  empty: boolean; // 비어있는지 여부
}

// Pagination 응답 (페이징)
export interface PaginationResponse<T> {
  items: T[]; // 현재 페이지의 데이터
  pageNums: number[]; // 페이지 번호 목록
  prev: boolean; // 이전 페이지 존재 여부
  next: boolean; // 다음 페이지 존재 여부
  totalCount: number; // 전체 데이터 개수
  prevPage: number; // 이전 페이지 번호
  nextPage: number; // 다음 페이지 번호
  totalPage: number; // 전체 페이지 수
  current: number; // 현재 페이지 번호
}

// 게시물 작성 요청
export interface PostCreateRequest {
  content: string;
  visibility?: PostVisibility;
  fileId?: string; // 파일 ID (업로드된 파일의 UUID)
  hashtags?: string[]; // 해시태그 목록
}

// 게시물 수정 요청
export interface PostUpdateRequest {
  content: string;
  uploadedFileId?: string; // 파일 ID (업로드된 파일의 UUID)
  hashtags?: string[]; // 해시태그 목록
}

// 파일 업로드 결과
export interface UploadResult {
  totalCount: number;
  successCount: number;
  failCount: number;
  successFileNames: string[];
  successFileIds: string[];
  failFileDetails: Record<string, string>;
}

// 댓글 작성 요청
export interface CommentCreateRequest {
  content: string;
}

// 정렬 옵션
export type SortOption = "latest" | "popular" | "views";

// 로컬 스토리지 좋아요 상태
export interface LikedPosts {
  [postId: string]: boolean;
}

// ─── 인증 관련 타입 ─────────────────────────────────────────────────────────

/** 로그인 요청 */
export interface LoginRequest {
  email: string;
  password: string;
}

/** 회원가입 요청 */
export interface JoinRequest {
  email: string;
  password: string;
  name: string;
}

/** 토큰 응답 (로그인 / 토큰 갱신) - 백엔드 LoginResponse DTO */
export interface TokenResponse {
  email: string;
  name: string;
  roles: string[];
  accessToken: string;
  refreshToken: string | null; // 서버에서 보안상 null 처리됨
  status: string;
}

/** 인증 컨텍스트 타입 */
export interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ─── 챗봇 관련 타입 ─────────────────────────────────────────────────────────

/** 채팅 메시지 역할 */
export type ChatRole = "user" | "ai";

/** UI 채팅 메시지 단위 */
export interface ChatMessage {
  /** 고유 메시지 ID */
  id: string;
  /** 발신자 역할 */
  role: ChatRole;
  /** 메시지 텍스트 (스트리밍 중에는 누적됨) */
  content: string;
  /** 답변 출처 게시글 ID 목록 */
  sourcePostIds?: number[];
  /** 스트리밍 진행 중 여부 */
  isStreaming?: boolean;
}

/** 챗봇 스트리밍 이벤트 콜백 */
export interface ChatStreamCallbacks {
  /** SSE metadata 이벤트: 출처 게시글 ID 수신 */
  onMetadata: (sourcePostIds: number[]) => void;
  /** SSE token 이벤트: 텍스트 토큰 수신 */
  onToken: (token: string) => void;
  /** SSE done 이벤트: 스트리밍 완료 */
  onDone: () => void;
  /** 네트워크/파싱 오류 */
  onError: (error: Error) => void;
}
