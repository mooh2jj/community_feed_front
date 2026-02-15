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
  commentCount: number;
  viewCount: number;
  createdAt: string;
  modifiedAt: string;
}

// 댓글 응답
export interface CommentResponse {
  id: number;
  content: string;
  authorName: string;
  authorProfileImageUrl?: string;
  likeCount: number;
  createdAt: string;
  modifiedAt: string;
}

// 사용자 응답
export interface UserResponse {
  email: string;
  name: string;
  profileImageUrl?: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
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
}

// 게시물 수정 요청
export interface PostUpdateRequest {
  content: string;
  uploadedFileId?: string; // 파일 ID (업로드된 파일의 UUID)
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
