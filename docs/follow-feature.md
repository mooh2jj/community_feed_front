# 팔로우 기능 — 설계·구현·의사결정 가이드 (v2)

> **작성 목적**: 팔로우/언팔로우, 팔로워·팔로잉 목록, 통계 정보, 팔로잉 피드 기능의
> 설계 배경과 구현 계획을 기록하여 AI(LLM) 보조 개발 및 미래의 나 자신이
> 빠르게 컨텍스트를 파악할 수 있도록 한다.

---

## 1. 개요 (Why)

커뮤니티 피드에 **Facebook/Instagram 스타일의 팔로우 소셜 그래프**를 도입한다.

**핵심 목표**:

1. 사용자가 특정 유저를 팔로우/언팔로우할 수 있다
2. 팔로워·팔로잉 목록(누구나 공개)을 페이지네이션으로 조회할 수 있다
3. 프로필 페이지에 **팔로워 N명 / 팔로잉 N명** 통계 정보를 표시한다
4. 피드(" `/api/v1/posts/feed`")는 팔로잉한 사람의 게시글 + 공개 게시글을 혼합 반환한다
5. 게시글/사용자 응답에 `isFollowing` 필드를 포함하여 프론트가 팔로우 버튼을 즉시 렌더링할 수 있다

---

## 2. 아키텍처 결정 (ADR)

### 2-1. Feed 범위: 팔로잉 전용 vs 혼합 피드?

| 항목          | 팔로잉 전용                         | **팔로잉 + 공개 혼합 (채택)**            |
| ------------- | ----------------------------------- | ---------------------------------------- |
| 신규 유저     | 팔로잉이 없으면 빈 피드 → 이탈 위험 | **공개 게시글로 피드가 채워짐**          |
| 콘텐츠 다양성 | 팔로잉 풀로 제한됨                  | **더 많은 게시글 노출**                  |
| 구현 복잡도   | 단순 JOIN                           | `LEFT JOIN + DISTINCT + UNION` 조건 필요 |
| UX            | Twitter/Instagram 방식              | **Facebook 방식 (채택)**                 |

> **결론**: 신규 유저 이탈 방지 및 콘텐츠 다양성을 위해 **혼합 피드**를 채택.
> 팔로잉 게시글 OR 공개 게시글을 `DISTINCT` + `createdAt DESC`로 정렬한다.

---

### 2-2. 통계 계산: 엔티티 컬렉션 vs Repository.count() 쿼리?

**문제**: `UserResponse.from(user)` 기존 코드

```java
// AS-IS (N+1 위험)
.followingCount(user.getFollowingCount())  // List<Follow>.size() → 전체 컬렉션 로드
.followerCount(user.getFollowerCount())    // 동일 문제
```

팔로워가 수만 명이라면 **전체 Follow 레코드를 메모리에 로드**한 뒤 `.size()`를 반환한다.

| 방법                            | 쿼리 수           | 메모리 사용              |
| ------------------------------- | ----------------- | ------------------------ |
| `user.getFollowers().size()`    | N+1 (컬렉션 로드) | O(follower 수) **위험**  |
| `@Formula` 서브쿼리             | 매번 서브 SELECT  | 낮음, 단 @Formula 한계   |
| **`repository.count()` (채택)** | **1 쿼리**        | **O(1), COUNT() 최적화** |

> **결론**: `FollowRepository.countByFollower(user)` / `countByFollowing(user)` 쿼리로
> 통계를 계산한다. 엔티티 컬렉션(`user.followings`)은 통계 계산에 사용하지 않는다.

---

### 2-3. 팔로워/팔로잉 목록 공개 여부?

- **결정**: 누구나 조회 가능 (Public)
- **이유**: Facebook·Instagram·Twitter 모두 팔로우 목록 기본 공개
- **인증 조건**: `isFollowing` 필드는 요청자가 인증된 경우에만 채움 (비인증 = `false`)

---

### 2-4. `isFollowing`을 PostResponse에 포함하는 이유?

게시글 목록 API(`/api/v1/posts`, `/api/v1/posts/feed`)에서 각 게시글의
`isFollowing`을 알아야 **팔로우 버튼을 즉시 렌더링**할 수 있다.

별도 API 호출 없이 한 번에 상태를 가져오는 방식:

```
[AS-IS] 게시글 목록 로드 → 각 게시글의 작성자에 대해 추가 API 호출 (N번)
[TO-BE] 게시글 목록 로드 시 isFollowing 포함 → 추가 호출 없음
```

---

### 2-5. 팔로워/팔로잉 목록 페이징: `@Query` JOIN FETCH 선택 이유?

`Page<Follow>` 반환 시 Follow → User 정보가 필요하다.
Lazy 로딩을 허용하면 **목록 N건에 대해 N번 추가 SELECT**가 발생한다.

```java
// JOIN FETCH로 Follow + User 한 번에 로드
@Query("SELECT f FROM Follow f JOIN FETCH f.following WHERE f.follower = :follower")
Page<Follow> findFollowingByFollower(@Param("follower") User follower, Pageable pageable);
```

> `countQuery`를 별도 지정하지 않으면 Spring Data가 JOIN FETCH + COUNT를 함께 실행해
> `HibernateQueryException`이 발생할 수 있으므로, **countQuery를 명시적으로 분리**한다.

---

## 3. 데이터 모델

### Follow 엔티티

```
Follow
├── id          : Long (PK, auto)
├── follower    : User (ManyToOne, FK = follower_id)
├── following   : User (ManyToOne, FK = following_id)
└── createdAt   : LocalDateTime

UNIQUE(follower_id, following_id)  ← 중복 팔로우 DB 레벨 방지
```

### 연관 관계

```
User ──< Follow >── User
 (follower)          (following)

한 사용자가 N명을 팔로우 (following 관계)
한 사용자가 N명에게 팔로우 받음 (follower 관계)
```

### 이미 정의된 ErrorCode (신규 추가 불필요)

| ErrorCode            | 상황                               |
| -------------------- | ---------------------------------- |
| `ALREADY_FOLLOWING`  | 이미 팔로우한 상태에서 팔로우 시도 |
| `NOT_FOLLOWING`      | 팔로우하지 않은 상태에서 언팔로우  |
| `CANNOT_FOLLOW_SELF` | 자기 자신을 팔로우 시도            |

---

## 4. API 설계

### 4-1. 팔로우 / 언팔로우

| 메서드 | 경로                                 | 인증 | 설명     |
| ------ | ------------------------------------ | ---- | -------- |
| POST   | `/api/v1/users/{targetEmail}/follow` | 필요 | 팔로우   |
| DELETE | `/api/v1/users/{targetEmail}/follow` | 필요 | 언팔로우 |

**팔로우 응답 (201 Created)**:

```json
{
  "targetEmail": "target@example.com",
  "followerCount": 101
}
```

**언팔로우 응답 (200 OK)**:

```json
{
  "targetEmail": "target@example.com",
  "followerCount": 100
}
```

---

### 4-2. 팔로워 / 팔로잉 목록

| 메서드 | 경로                              | 인증   | 설명                      |
| ------ | --------------------------------- | ------ | ------------------------- |
| GET    | `/api/v1/users/{email}/followers` | 불필요 | 팔로워 목록 (나를 팔로우) |
| GET    | `/api/v1/users/{email}/following` | 불필요 | 팔로잉 목록 (내가 팔로우) |

**쿼리 파라미터**:

| 파라미터 | 기본값 | 설명        |
| -------- | ------ | ----------- |
| `page`   | 0      | 페이지 번호 |
| `size`   | 20     | 페이지 크기 |

**목록 응답 (200 OK)**:

```json
{
  "content": [
    {
      "email": "user@example.com",
      "name": "홍길동",
      "profileImageUrl": "https://...",
      "isFollowing": true
    }
  ],
  "totalElements": 100,
  "totalPages": 5,
  "page": 0,
  "size": 20
}
```

---

### 4-3. 사용자 통계 (기존 API 변경)

**`GET /api/v1/users/{email}` 응답 변경 사항**:

```json
{
  "email": "user@example.com",
  "name": "홍길동",
  "followingCount": 50, // AS-IS: lazy 컬렉션 size() → TO-BE: count() 쿼리
  "followerCount": 100, // 동일
  "isFollowing": true // 신규 추가
}
```

**`GET /api/v1/users/me` 응답 변경 사항**:

```json
{
  "email": "me@example.com",
  "name": "내 이름",
  "roles": ["USER"],
  "followerCount": 100, // 신규 추가
  "followingCount": 50 // 신규 추가
}
```

---

### 4-4. 게시글에 isFollowing 추가 (기존 API 변경)

**`GET /api/v1/posts`, `GET /api/v1/posts/feed` 응답 변경 사항**:

```json
{
  "id": 1,
  "content": "게시글 내용",
  "authorEmail": "author@example.com",
  "authorName": "홍길동",
  "likeCount": 42,
  "liked": false,
  "isFollowing": true // 신규 추가
}
```

---

### 4-5. 피드 API (기존 API 동작 변경)

| 메서드 | 경로                 | 인증 | 설명                             |
| ------ | -------------------- | ---- | -------------------------------- |
| GET    | `/api/v1/posts/feed` | 필요 | 팔로잉 게시글 + 공개 게시글 혼합 |

**현재**: 팔로잉 필터 주석 처리 → 공개 게시글 전체 반환
**변경 후**: 팔로잉한 유저 게시글 OR 공개 게시글, DISTINCT, createdAt DESC

---

## 5. 전체 흐름 시퀀스 다이어그램

### 5-1. 팔로우 플로우

```
Client → FollowController: POST /api/v1/users/{targetEmail}/follow
FollowController → FollowServiceImpl: follow(requesterEmail, targetEmail)

FollowServiceImpl → UserRepository: findByEmail(requesterEmail) → requester
FollowServiceImpl → UserRepository: findByEmail(targetEmail) → target
FollowServiceImpl → FollowRepository: existsByFollowerAndFollowing(requester, target) → 중복 체크

[중복 시] → throw BusinessException(ALREADY_FOLLOWING)
[자기 자신] → throw BusinessException(CANNOT_FOLLOW_SELF)

FollowServiceImpl → FollowRepository: save(new Follow(requester, target))
FollowServiceImpl → FollowRepository: countByFollowing(target) → followerCount
FollowServiceImpl → Client: FollowResponse(targetEmail, followerCount)
```

### 5-2. 피드 조회 플로우

```
Client → PostController: GET /api/v1/posts/feed?page=0&size=20
PostController → PostServiceImpl: getFeedPosts(requesterEmail, pageable)

PostServiceImpl → UserRepository: findByEmail(requesterEmail) → requester
PostServiceImpl → PostRepositoryCustomImpl: findFeedPosts(requester, pageable)

findFeedPosts():
  SELECT DISTINCT p
  FROM Post p
  LEFT JOIN Follow f ON (f.follower = requester AND f.following = p.author)
  WHERE p.visibility = 'PUBLIC'
     OR (p.visibility = 'FOLLOWERS_ONLY' AND f.id IS NOT NULL)
  ORDER BY p.createdAt DESC

PostServiceImpl → FollowRepository: existsByFollowerAndFollowing(requester, author) × N건
                  ← (배치 조회 or Set 캐싱으로 N+1 방지)
PostServiceImpl → Client: Page<PostResponse> (isFollowing 포함)
```

### 5-3. 팔로잉 목록 조회 플로우

```
Client → FollowController: GET /api/v1/users/{email}/following?page=0&size=20
FollowController → FollowServiceImpl: getFollowingList(email, viewerEmail, pageable)

FollowServiceImpl → UserRepository: findByEmail(email) → target
FollowServiceImpl → FollowRepository: findFollowingByFollower(target, pageable)
  → JOIN FETCH f.following (N+1 방지)

[인증된 경우] each follow → FollowRepository.existsByFollowerAndFollowing(viewer, follow.following)
               → UserSummaryResponse(email, name, profileImageUrl, isFollowing)

FollowServiceImpl → Client: Page<UserSummaryResponse>
```

---

## 6. 구현 계획 (5 Phase)

```
Phase 1 (독립) ─────────────────── Phase 2 (Phase 1 후)
  DTO/Repository 준비                FollowService/Controller

Phase 1 (독립) ─────────────────── Phase 3 (Phase 1 후, Phase 2와 병렬)
                                     기존 UserService 개선

                 Phase 2/3 완료 후 → Phase 4: PostResponse isFollowing

                                     Phase 4 완료 후 → Phase 5: Feed QueryDSL 완성
```

---

### Phase 1 — DTO / Repository 준비 (독립 작업)

**작업 1**: `UserSummaryResponse` DTO 신규 생성

```
경로: domain/user/dto/response/UserSummaryResponse.java
필드: email, name, profileImageUrl, isFollowing
목적: 팔로워/팔로잉 목록의 각 유저 정보
```

**작업 2**: `UserResponse` N+1 수정 + `isFollowing` 추가

```java
// AS-IS: user.getFollowingCount()  → lazy 컬렉션 로드 (N+1)
// TO-BE: 파라미터로 전달받은 count 값 사용

// 팩토리 메서드 오버로드
static UserResponse from(User user, long followerCount, long followingCount, boolean isFollowing)
```

**작업 3**: `UserInfo` 통계 필드 추가

```java
// 추가할 필드
private long followerCount;
private long followingCount;

// 팩토리 메서드 오버로드
static UserInfo of(User user, long followerCount, long followingCount)
```

**작업 4**: `FollowRepository` JOIN FETCH 페이징 쿼리 추가

```java
// 팔로잉 목록 (내가 팔로우한 사람들)
@Query(value = "SELECT f FROM Follow f JOIN FETCH f.following WHERE f.follower = :follower",
       countQuery = "SELECT COUNT(f) FROM Follow f WHERE f.follower = :follower")
Page<Follow> findFollowingByFollower(@Param("follower") User follower, Pageable pageable);

// 팔로워 목록 (나를 팔로우한 사람들)
@Query(value = "SELECT f FROM Follow f JOIN FETCH f.follower WHERE f.following = :following",
       countQuery = "SELECT COUNT(f) FROM Follow f WHERE f.following = :following")
Page<Follow> findFollowersByFollowing(@Param("following") User following, Pageable pageable);
```

---

### Phase 2 — FollowService / Controller 신규 (Phase 1 완료 후)

**작업 5**: `FollowService` 인터페이스 신규

```java
public interface FollowService {
    FollowResponse follow(String requesterEmail, String targetEmail);
    FollowResponse unfollow(String requesterEmail, String targetEmail);
    Page<UserSummaryResponse> getFollowingList(String targetEmail, String viewerEmail, Pageable pageable);
    Page<UserSummaryResponse> getFollowerList(String targetEmail, String viewerEmail, Pageable pageable);
}
```

**작업 6**: `FollowServiceImpl` 구현체 신규

```
경로: domain/user/service/FollowServiceImpl.java
의존성: UserRepository, FollowRepository
주요 로직:
  - follow(): 자기 자신 체크 → 중복 체크 → save → followerCount 반환
  - unfollow(): 존재 체크 → delete → followerCount 반환
  - getFollowingList(): JOIN FETCH 페이징 → 각 항목 isFollowing 계산
  - getFollowerList(): JOIN FETCH 페이징 → 각 항목 isFollowing 계산
```

**작업 7**: `FollowController` 신규

```
경로: domain/user/controller/FollowController.java
인증: @AuthenticationPrincipal UserDetails userDetails (팔로우/언팔로우만 필요)
```

---

### Phase 3 — 기존 UserService 개선 (Phase 1 완료 후, Phase 2와 병렬)

**작업 8**: `UserServiceImpl.getUserByEmail()` N+1 수정

```java
// AS-IS
UserResponse.from(user)  // lazy 컬렉션 → N+1

// TO-BE
long followerCount = followRepository.countByFollowing(user);
long followingCount = followRepository.countByFollower(user);
boolean isFollowing = requesterEmail != null &&
    followRepository.existsByFollowerAndFollowing(requester, user);
UserResponse.from(user, followerCount, followingCount, isFollowing)
```

**작업 9**: `UserServiceImpl.getUserInfoByEmail()` 통계 주입

```java
// AS-IS
UserInfo.of(user)  // 통계 없음

// TO-BE
long followerCount = followRepository.countByFollowing(user);
long followingCount = followRepository.countByFollower(user);
UserInfo.of(user, followerCount, followingCount)
```

---

### Phase 4 — PostResponse isFollowing (Phase 2/3 완료 후)

**작업 10**: `PostResponse` 필드 추가

```java
// 신규 필드
private boolean isFollowing;

// 팩토리 메서드 오버로드 또는 별도 파라미터 추가
static PostResponse from(Post post, boolean liked, boolean isFollowing)
```

**작업 11**: `PostServiceImpl` isFollowing 주입

```java
// 게시글 목록 조회 시 작성자별 isFollowing 배치 계산
// 동일 작성자 중복 체크 최소화: Set<String> 캐싱
Set<String> followingEmails = followRepository.findFollowingEmailsByFollower(requester);
boolean isFollowing = followingEmails.contains(post.getAuthor().getEmail());
```

> **N+1 방지**: 게시글 N건에 대해 N번 `existsByFollowerAndFollowing()` 호출 대신
> `followingEmails` Set을 한 번 조회 후 포함 여부를 메모리에서 확인한다.

---

### Phase 5 — Feed QueryDSL 완성 (Phase 4 완료 후)

**작업 12**: `PostRepositoryCustomImpl.findFeedPosts()` 주석 해제 + 완성

```java
// 현재 (주석 처리됨)
// .leftJoin(follow).on(...)
// .where(post.visibility.eq(PostVisibility.PUBLIC)
//     .or(follow.id.isNotNull()))

// TO-BE (완성)
QFollow follow = QFollow.follow;

return queryFactory
    .selectDistinct(post)
    .from(post)
    .leftJoin(follow)
        .on(follow.follower.eq(requester)
            .and(follow.following.eq(post.author)))
    .where(
        post.visibility.eq(PostVisibility.PUBLIC)
        .or(
            post.visibility.eq(PostVisibility.FOLLOWERS_ONLY)
            .and(follow.id.isNotNull())
        )
    )
    .orderBy(post.createdAt.desc())
    .offset(pageable.getOffset())
    .limit(pageable.getPageSize())
    .fetch();
```

---

## 7. 패키지 구조

```
domain/user/
├── controller/
│   ├── UserController.java           (기존 — 통계 반환 방식 변경)
│   └── FollowController.java         ← 신규 (Phase 2)
├── dto/
│   ├── request/
│   └── response/
│       ├── UserInfo.java             (기존 — 통계 필드 추가)
│       ├── UserResponse.java         (기존 — isFollowing 추가, N+1 수정)
│       ├── UserSummaryResponse.java  ← 신규 (Phase 1)
│       └── FollowResponse.java       ← 신규 (Phase 2)
├── entity/
│   ├── User.java
│   └── Follow.java
├── repository/
│   ├── UserRepository.java
│   └── FollowRepository.java         (기존 — JOIN FETCH 쿼리 추가)
└── service/
    ├── UserService.java
    ├── UserServiceImpl.java          (기존 — N+1 수정, 통계 주입)
    ├── FollowService.java            ← 신규 (Phase 2)
    └── FollowServiceImpl.java        ← 신규 (Phase 2)

domain/post/
├── dto/response/
│   └── PostResponse.java             (기존 — isFollowing 추가)
├── repository/querydsl/
│   └── PostRepositoryCustomImpl.java (기존 — findFeedPosts() 완성)
└── service/
    └── PostServiceImpl.java          (기존 — isFollowing 주입)
```

---

## 8. Flyway 마이그레이션

현재 `Follow` 테이블은 이미 존재한다.
이번 기능 추가에서 **스키마 변경은 없다**. 새로운 Flyway 마이그레이션 파일 불필요.

> 인덱스 최적화가 필요하다면 별도 마이그레이션으로 추가한다:
>
> ```sql
> -- V{N}__add_follow_index.sql
> CREATE INDEX IF NOT EXISTS idx_follow_follower_id ON follow(follower_id);
> CREATE INDEX IF NOT EXISTS idx_follow_following_id ON follow(following_id);
> ```

---

## 9. N+1 문제 총정리

| 위치                          | 문제 원인                            | 해결 방법                                      |
| ----------------------------- | ------------------------------------ | ---------------------------------------------- |
| `UserResponse.from(user)`     | `user.getFollowingCount()` lazy size | `followRepository.countByFollower(user)` 쿼리  |
| `UserResponse.from(user)`     | `user.getFollowerCount()` lazy size  | `followRepository.countByFollowing(user)` 쿼리 |
| 팔로잉 목록 `Follow → User`   | Follow 로드 후 User 개별 쿼리        | `JOIN FETCH f.following` JPQL                  |
| 팔로워 목록 `Follow → User`   | Follow 로드 후 User 개별 쿼리        | `JOIN FETCH f.follower` JPQL                   |
| `PostServiceImpl` isFollowing | 게시글 N건 × existsByFollower 호출   | `followingEmails` Set 한 번 조회               |

---

## 10. 에러 처리

| 상황                 | ErrorCode             | HTTP Status |
| -------------------- | --------------------- | ----------- |
| 이미 팔로우 중       | `ALREADY_FOLLOWING`   | 409         |
| 팔로우하지 않았음    | `NOT_FOLLOWING`       | 404         |
| 자기 자신 팔로우     | `CANNOT_FOLLOW_SELF`  | 400         |
| 대상 유저 없음       | `USER_NOT_FOUND`      | 404         |
| 비인증 사용자 팔로우 | Spring Security → 401 | 401         |

---

## 11. 테스트 전략

### 단위 테스트 (FollowServiceImplTest)

| 테스트 케이스                            | 검증 포인트                     |
| ---------------------------------------- | ------------------------------- |
| 정상 팔로우                              | save 호출, followerCount 반환   |
| 이미 팔로우한 경우                       | `ALREADY_FOLLOWING` 예외        |
| 자기 자신 팔로우                         | `CANNOT_FOLLOW_SELF` 예외       |
| 정상 언팔로우                            | delete 호출, followerCount 반환 |
| 팔로우하지 않은 상태에서 언팔로우        | `NOT_FOLLOWING` 예외            |
| 팔로잉 목록 — 인증 유저 isFollowing 포함 | Set 캐싱 결과 검증              |

### 통합 테스트 (FollowControllerTest)

| 테스트 케이스                  | 검증 포인트                  |
| ------------------------------ | ---------------------------- |
| `POST .../follow` — 201 반환   | Location 헤더, followerCount |
| `POST .../follow` — 409 중복   | ErrorCode 포함               |
| `DELETE .../follow` — 200 반환 | followerCount 감소 확인      |
| `GET .../followers` — 200      | Page 구조, isFollowing 포함  |
| `GET .../following` — 200      | Page 구조, isFollowing 포함  |
| 비인증 팔로우 — 401            | Spring Security 차단 확인    |

### 피드 통합 테스트 (PostControllerTest)

| 테스트 케이스                              | 검증 포인트                     |
| ------------------------------------------ | ------------------------------- |
| 팔로잉 없는 신규 유저 — 공개 게시글만 반환 | 빈 피드가 아닌 공개 게시글 포함 |
| 팔로잉 있는 유저 — 팔로잉 + 공개 혼합 반환 | DISTINCT, createdAt DESC        |
| FOLLOWERS_ONLY 게시글 — 팔로잉 시에만 포함 | 비팔로잉 유저에게 미노출        |
| 게시글 응답 isFollowing 필드               | 팔로우한 작성자 = true          |

---

## 12. 프론트엔드 통합 가이드

> **목적**: React/Next.js 등 프론트엔드에서 팔로우 API를 연동할 때 필요한
> 요청 형식, 응답 파싱, 상태 관리, 에러 처리 패턴을 한 곳에 정리한다.

---

### 12-1. 공통 응답 래퍼 구조

모든 API는 `ApiResult<T>` 형식으로 감싸져 반환된다.

```json
{
  "success": true,
  "message": "팔로우 완료",
  "errorCode": null,
  "data": { ... }
}
```

**실패 시 구조**:

```json
{
  "success": false,
  "message": "이미 팔로우 중인 사용자입니다.",
  "errorCode": "ALREADY_FOLLOWING",
  "data": null
}
```

---

### 12-2. 인증 헤더 설정

팔로우 / 언팔로우 API는 **JWT Bearer 토큰이 필수**다.
팔로워·팔로잉 목록 조회는 인증 없이도 호출 가능하지만, 인증 시 `isFollowing` 필드가 채워진다.

```http
Authorization: Bearer {accessToken}
Content-Type: application/json
```

---

### 12-3. API 레퍼런스

#### POST `/api/v1/users/{targetEmail}/follow` — 팔로우

```http
POST /api/v1/users/target%40example.com/follow
Authorization: Bearer {accessToken}
```

**성공 응답 (201 Created)**:

```json
{
  "success": true,
  "message": "팔로우 완료",
  "errorCode": null,
  "data": {
    "targetEmail": "target@example.com",
    "followerCount": 101
  }
}
```

**실패 응답 예시**:

| 상황             | HTTP | errorCode            |
| ---------------- | ---- | -------------------- |
| 이미 팔로우 중   | 409  | `ALREADY_FOLLOWING`  |
| 자기 자신 팔로우 | 400  | `CANNOT_FOLLOW_SELF` |
| 대상 유저 없음   | 404  | `USER_NOT_FOUND`     |
| 미인증           | 401  | —                    |

---

#### DELETE `/api/v1/users/{targetEmail}/follow` — 언팔로우

```http
DELETE /api/v1/users/target%40example.com/follow
Authorization: Bearer {accessToken}
```

**성공 응답 (200 OK)**:

```json
{
  "success": true,
  "message": "언팔로우 완료",
  "errorCode": null,
  "data": {
    "targetEmail": "target@example.com",
    "followerCount": 100
  }
}
```

---

#### GET `/api/v1/users/{email}/following` — 팔로잉 목록

```http
GET /api/v1/users/user%40example.com/following?page=0&size=20
Authorization: Bearer {accessToken}   (선택 — 없으면 isFollowing = false)
```

**성공 응답 (200 OK)**:

```json
{
  "success": true,
  "message": "요청이 성공했습니다.",
  "errorCode": null,
  "data": {
    "content": [
      {
        "email": "alice@example.com",
        "name": "Alice",
        "profileImageUrl": "https://cdn.example.com/alice.jpg",
        "isFollowing": true
      }
    ],
    "totalElements": 50,
    "totalPages": 3,
    "number": 0,
    "size": 20,
    "first": true,
    "last": false
  }
}
```

---

#### GET `/api/v1/users/{email}/followers` — 팔로워 목록

```http
GET /api/v1/users/user%40example.com/followers?page=0&size=20
Authorization: Bearer {accessToken}   (선택)
```

응답 구조는 팔로잉 목록과 동일하다.

---

### 12-4. TypeScript 타입 정의

```typescript
// 공통 API 응답 래퍼
interface ApiResult<T> {
  success: boolean;
  message: string;
  errorCode: string | null;
  data: T;
}

// 팔로우 / 언팔로우 결과
interface FollowResponse {
  targetEmail: string;
  followerCount: number;
}

// 팔로워·팔로잉 목록 아이템
interface UserSummaryResponse {
  email: string;
  name: string;
  profileImageUrl: string | null;
  isFollowing: boolean;
}

// Spring Page 래퍼
interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number; // 현재 페이지 (0-based)
  size: number;
  first: boolean;
  last: boolean;
}

// 게시글 응답 (isFollowing 필드 포함)
interface PostResponse {
  id: number;
  content: string;
  authorEmail: string;
  authorName: string;
  likeCount: number;
  liked: boolean;
  isFollowing: boolean; // 작성자를 팔로우 중인지 여부
  createdAt: string; // ISO 8601
}
```

---

### 12-5. API 클라이언트 구현 예시 (axios 기반)

```typescript
// followApi.ts
import axios from "axios";
import {
  ApiResult,
  FollowResponse,
  UserSummaryResponse,
  PageResponse,
} from "./types";

const BASE_URL = "/api/v1/users";

export const followApi = {
  /** 팔로우 */
  follow: (targetEmail: string) =>
    axios.post<ApiResult<FollowResponse>>(
      `${BASE_URL}/${encodeURIComponent(targetEmail)}/follow`,
    ),

  /** 언팔로우 */
  unfollow: (targetEmail: string) =>
    axios.delete<ApiResult<FollowResponse>>(
      `${BASE_URL}/${encodeURIComponent(targetEmail)}/follow`,
    ),

  /** 팔로잉 목록 */
  getFollowing: (email: string, page = 0, size = 20) =>
    axios.get<ApiResult<PageResponse<UserSummaryResponse>>>(
      `${BASE_URL}/${encodeURIComponent(email)}/following`,
      { params: { page, size } },
    ),

  /** 팔로워 목록 */
  getFollowers: (email: string, page = 0, size = 20) =>
    axios.get<ApiResult<PageResponse<UserSummaryResponse>>>(
      `${BASE_URL}/${encodeURIComponent(email)}/followers`,
      { params: { page, size } },
    ),
};
```

---

### 12-6. 팔로우 버튼 상태 관리 패턴 (React)

`isFollowing` 필드는 API 응답에 이미 포함되어 있으므로, 별도 조회 없이
**게시글 목록 / 프로필 조회 시 즉시 버튼 상태를 렌더링**할 수 있다.

```typescript
// useFollowButton.ts
import { useState } from "react";
import { followApi } from "./followApi";

export function useFollowButton(
  targetEmail: string,
  initialIsFollowing: boolean,
  initialFollowerCount: number,
) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    // 낙관적 업데이트 — 요청 전 UI를 즉시 반전
    const prevState = isFollowing;
    setIsFollowing(!prevState);
    setFollowerCount((c) => (prevState ? c - 1 : c + 1));
    setLoading(true);

    try {
      const res = prevState
        ? await followApi.unfollow(targetEmail)
        : await followApi.follow(targetEmail);

      // 서버 실제 followerCount로 보정
      setFollowerCount(res.data.data.followerCount);
    } catch (err: any) {
      // 실패 시 롤백
      setIsFollowing(prevState);
      setFollowerCount((c) => (prevState ? c + 1 : c - 1));
      handleFollowError(err);
    } finally {
      setLoading(false);
    }
  };

  return { isFollowing, followerCount, loading, toggle };
}

function handleFollowError(err: any) {
  const errorCode = err.response?.data?.errorCode;
  switch (errorCode) {
    case "ALREADY_FOLLOWING":
      console.warn("이미 팔로우 중입니다.");
      break;
    case "CANNOT_FOLLOW_SELF":
      alert("자기 자신을 팔로우할 수 없습니다.");
      break;
    case "USER_NOT_FOUND":
      alert("존재하지 않는 사용자입니다.");
      break;
    default:
      alert("요청 처리 중 오류가 발생했습니다.");
  }
}
```

**버튼 컴포넌트 사용 예시**:

```tsx
// FollowButton.tsx
function FollowButton({ targetEmail, isFollowing, followerCount }) {
  const follow = useFollowButton(targetEmail, isFollowing, followerCount);

  return (
    <button
      onClick={follow.toggle}
      disabled={follow.loading}
      className={follow.isFollowing ? "btn-unfollow" : "btn-follow"}
    >
      {follow.loading ? "처리 중..." : follow.isFollowing ? "팔로잉" : "팔로우"}
    </button>
  );
}
```

---

### 12-7. 피드 페이지 연동 포인트

```
GET /api/v1/posts/feed?page=0&size=20
Authorization: Bearer {accessToken}
```

각 게시글 아이템에 `isFollowing` 포함 → 별도 API 호출 없이 팔로우 버튼 즉시 렌더링.

```typescript
// 피드 게시글 렌더링 예시
posts.map(post => (
  <PostCard key={post.id}>
    <AuthorInfo name={post.authorName} />
    <FollowButton
      targetEmail={post.authorEmail}
      isFollowing={post.isFollowing}   // ← API에서 바로 제공됨
      followerCount={0}                // 피드에서는 count 표시 불필요
    />
    <PostContent content={post.content} liked={post.liked} />
  </PostCard>
))
```

---

### 12-8. 목록 API 무한 스크롤 구현 패턴

`last: false`이면 다음 페이지가 존재한다. `page`를 1씩 증가시켜 추가 로드한다.

```typescript
const [items, setItems] = useState<UserSummaryResponse[]>([]);
const [page, setPage] = useState(0);
const [hasMore, setHasMore] = useState(true);

const loadMore = async () => {
  const res = await followApi.getFollowing(targetEmail, page);
  const pageData = res.data.data;

  setItems((prev) => [...prev, ...pageData.content]);
  setPage((p) => p + 1);
  setHasMore(!pageData.last);
};
```

---

### 12-9. 이메일 URL 인코딩 주의사항

경로 변수 `{targetEmail}`에 `@` 문자가 포함되므로 반드시 `encodeURIComponent()`를 적용해야 한다.

```typescript
// ❌ 잘못된 예 — @ 미인코딩 시 경로 파싱 오류
axios.post(`/api/v1/users/user@example.com/follow`);

// ✅ 올바른 예
axios.post(`/api/v1/users/${encodeURIComponent("user@example.com")}/follow`);
// → /api/v1/users/user%40example.com/follow
```

---

## 13. 구현 체크리스트

### Phase 1 — DTO/Repository

- [ ] `UserSummaryResponse` 신규 생성
- [ ] `UserResponse.from()` 오버로드 + isFollowing 추가
- [ ] `UserInfo.of()` 오버로드 + 통계 필드 추가
- [ ] `FollowRepository` JOIN FETCH 쿼리 2개 + countQuery 분리

### Phase 2 — FollowService/Controller

- [ ] `FollowService` 인터페이스 신규
- [ ] `FollowServiceImpl` 구현체 신규
- [ ] `FollowController` 신규 + Swagger 문서화

### Phase 3 — UserService 개선

- [ ] `UserServiceImpl.getUserByEmail()` N+1 수정
- [ ] `UserServiceImpl.getUserInfoByEmail()` 통계 주입

### Phase 4 — PostResponse isFollowing

- [ ] `PostResponse` isFollowing 필드 추가
- [ ] `PostServiceImpl` followingEmails Set 캐싱 적용

### Phase 5 — Feed QueryDSL

- [ ] `PostRepositoryCustomImpl.findFeedPosts()` 주석 해제 + 완성
- [ ] FOLLOWERS_ONLY 가시성 로직 추가

### 공통

- [ ] 팔로우 관련 단위 테스트
- [ ] 팔로우 API 통합 테스트
- [ ] 피드 통합 테스트
- [ ] (선택) Follow 인덱스 Flyway 마이그레이션
