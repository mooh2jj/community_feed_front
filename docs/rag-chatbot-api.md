# RAG 챗봇 API — Spring AI + pgvector

## 1. 개요 (Why)

커뮤니티 피드의 게시글 데이터를 기반으로 질문에 답변하는 챗봇 API입니다.
일반적인 LLM은 학습 데이터 외의 정보를 임의로 생성(할루시네이션)하는 문제가 있습니다.
이를 해결하기 위해 **RAG(Retrieval-Augmented Generation)** 기법을 적용했습니다.

**핵심 원칙**: LLM에게 답변 전 반드시 실제 게시글 원문을 컨텍스트로 전달하고,
컨텍스트 외 내용의 답변 생성을 시스템 프롬프트로 명시적으로 금지합니다.

---

## 2. 아키텍처

```
Client
  │
  │ POST /api/v1/ai/chat
  ▼
ChatController
  │
  ▼
ChatServiceImpl ──── VectorStore(pgvector) ──── OpenAI Embedding API
  │                       │
  │  similaritySearch()    │
  │  ← 유사 게시글 Document  │
  │
  ▼
OpenAI Chat API (gpt-4o-mini)
  │  SystemPrompt: "반드시 제공된 컨텍스트만 기반으로 답변"
  │  UserPrompt:   [게시글 원문 컨텍스트] + [사용자 질문]
  ▼
ChatResponse { answer, sourcePostIds, noDataFound }
```

### 인프라 구성 (Single Stack)

| 구성 요소    | 기술                   | 비고                 |
| ------------ | ---------------------- | -------------------- |
| 애플리케이션 | Spring Boot 3.5.9      | 기존 서버와 통합     |
| 벡터 DB      | PostgreSQL + pgvector  | 기존 DB에 확장 추가  |
| 임베딩 모델  | text-embedding-ada-002 | 1536차원, OpenAI API |
| 채팅 모델    | gpt-4o-mini            | 빠른 응답 + 저비용   |

> Python/FastAPI 등 별도 서버 없이 **Spring Boot 하나로** 모든 AI 로직 처리

---

## 3. 기술 결정 (ADR)

### 왜 pgvector인가?

- 이미 사용 중인 PostgreSQL에 `pgvector` 확장만 추가하면 됨
- 별도 Pinecone, Weaviate 등 외부 벡터 DB SaaS 불필요 → 인프라 단순화
- Spring Data JPA 트랜잭션과 동일한 DB 내에서 관리 가능

### 왜 text-embedding-ada-002인가?

- 1536차원 — 의미론적 검색 품질이 높고 업계 표준
- gpt-4o 등 최신 embedding 모델 대비 비용이 낮음
- Spring AI `PgVectorStore`의 기본 지원 모델

### 왜 gpt-4o-mini인가?

- RAG 특성상 컨텍스트를 보고 요약/정리하는 작업 → 고성능 모델 불필요
- gpt-4o 대비 약 15배 저렴, 응답 속도 빠름

### 할루시네이션 방지 전략

1. **검색 결과 0건** → LLM 호출 없이 즉시 "데이터 없음" 반환
2. **유사도 임계값** (`SIMILARITY_THRESHOLD = 0.3`) — 관련 없는 문서 제외
3. **시스템 프롬프트 제약** — "제공된 게시글에 없는 정보는 절대 추가 금지"
4. **sourcePostIds 반환** — 클라이언트에서 출처 게시글 직접 확인 가능

---

## 4. 설정

### 4-1. 환경 변수 (`.env`)

```dotenv
OPENAI_API_KEY=sk-proj-xxxx
```

### 4-2. Spring AI 설정 (`application-local.yml`, `application-dev.yml`)

```yaml
spring:
  ai:
    openai:
      api-key: ${OPENAI_API_KEY}
      chat:
        options:
          model: gpt-4o-mini
      embedding:
        options:
          model: text-embedding-ada-002
    vectorstore:
      pgvector:
        index-type: HNSW # 고속 ANN 검색
        distance-type: COSINE_DISTANCE
        initialize-schema: false # Flyway V2가 스키마 관리
        dimensions: 1536
```

### 4-3. Docker 이미지

pgvector 확장이 내장된 공식 이미지로 교체 필요:

```yaml
# docker-compose-local.yml / docker-compose-dev.yml
image: pgvector/pgvector:pg15 # ← postgres:15 에서 변경
```

> **주의**: 기존 컨테이너를 사용 중이라면 재생성 필요
>
> ```bash
> docker-compose -f docker-compose-local.yml down
> docker-compose -f docker-compose-local.yml up -d
> ```

---

## 5. DB 스키마 (Flyway V2)

파일: `src/main/resources/db/migration/V2__add_pgvector_store.sql`

```sql
-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- Spring AI VectorStore 테이블
CREATE TABLE IF NOT EXISTS vector_store (
    id        UUID  NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content   TEXT,                    -- 임베딩된 게시글 원문
    metadata  JSON,                    -- postId, authorEmail 등 부가 정보
    embedding vector(1536)             -- text-embedding-ada-002 기준 차원
);

-- HNSW 인덱스 (코사인 유사도 기반 고속 검색)
CREATE INDEX IF NOT EXISTS vector_store_embedding_idx
    ON vector_store
    USING hnsw (embedding vector_cosine_ops);
```

**왜 `initialize-schema: false`인가?**
`ddl-auto: validate` 환경에서는 Hibernate가 DDL을 생성하지 않습니다.
Spring AI의 자동 스키마 생성(`initialize-schema: true`)은 Flyway와 충돌하므로
Flyway V2 마이그레이션으로 직접 관리합니다.

---

## 6. 패키지 구조

```
domain/chat/
├── controller/
│   └── ChatController.java         # API 진입점
├── dto/
│   ├── request/
│   │   └── ChatRequest.java        # query, topK
│   └── response/
│       └── ChatResponse.java       # answer, sourcePostIds, noDataFound
└── service/
    ├── ChatService.java             # 인터페이스
    ├── ChatServiceImpl.java         # RAG 핵심 로직
    ├── PostIndexingService.java     # 인터페이스
    └── PostIndexingServiceImpl.java # 게시글 → 벡터 색인
```

---

## 7. API 명세

### 7-1. 채팅 질의

```
POST /api/v1/ai/chat
인증: 불필요 (Public)
```

**Request Body**

```json
{
  "query": "요즘 커뮤니티에서 인기 있는 주제가 뭔가요?",
  "topK": 5
}
```

| 필드    | 타입   | 필수 | 설명                                    |
| ------- | ------ | ---- | --------------------------------------- |
| `query` | String | ✅   | 사용자 질문 (2~500자)                   |
| `topK`  | int    | ❌   | 참조할 유사 게시글 수 (기본 5, 최대 10) |

**Response Body**

```json
{
  "status": "SUCCESS",
  "message": null,
  "data": {
    "answer": "최근 게시글에 따르면 개발 관련 주제가 많이 올라오고 있습니다...",
    "sourcePostIds": [42, 17, 3],
    "noDataFound": false
  }
}
```

| 필드            | 타입         | 설명                                         |
| --------------- | ------------ | -------------------------------------------- |
| `answer`        | String       | AI 생성 답변                                 |
| `sourcePostIds` | List\<Long\> | 답변 근거 게시글 ID 목록                     |
| `noDataFound`   | boolean      | 관련 게시글 없음 여부 (`true` 시 LLM 미호출) |

**관련 데이터 없을 때 응답**

```json
{
  "data": {
    "answer": "관련된 게시글을 찾을 수 없습니다. 다른 키워드로 질문해보세요.",
    "sourcePostIds": [],
    "noDataFound": true
  }
}
```

---

### 7-2. 게시글 전체 재색인

```
POST /api/v1/ai/admin/index/sync
인증: 불필요 (현재 Public)
```

현재 공개(`PUBLIC`) 게시글 전체를 벡터 DB에 임베딩합니다.
기존 색인을 삭제 후 재구성하므로, 게시글 수만큼 OpenAI Embedding API 호출이 발생합니다.

**Response**

```json
{
  "status": "SUCCESS",
  "data": "총 127건의 게시글이 성공적으로 색인되었습니다."
}
```

---

### 7-3. 색인 전체 초기화

```
DELETE /api/v1/ai/admin/index
인증: 불필요 (현재 Public)
```

`vector_store` 테이블의 모든 데이터를 삭제합니다.
삭제 후 `/sync`를 다시 호출하기 전까지 채팅 API는 `noDataFound: true`를 반환합니다.

---

## 8. 핵심 코드 흐름

### 색인 흐름 (`PostIndexingServiceImpl`)

```
syncAllPosts()
  │
  ├─ 1. deleteAllIndexedPosts()          # vector_store 테이블 전체 삭제
  │      └─ JdbcTemplate.update("DELETE FROM vector_store")
  │
  ├─ 2. postRepository.findAllByVisibilityWithDetails(PUBLIC)
  │      └─ FETCH JOIN: author, postHashtags, hashtag    # N+1 방지
  │
  ├─ 3. Post → Document 변환 (toDocument)
  │      └─ content: "작성자: {name}\n내용: {content}\n해시태그: {tags}\n작성일: {date}"
  │         metadata: { postId: Long, authorEmail: String }
  │         id: Spring AI 자동 UUID 생성             # Long값으로 설정 시 오류 발생!
  │
  └─ 4. vectorStore.add(documents)
         └─ OpenAI text-embedding-ada-002 API 호출 → vector_store 저장
```

> **주의**: `Document.builder().id(postId)`처럼 Long 숫자를 Document ID로 설정하면
> `PgVectorStore`가 UUID 형식을 요구해 `Invalid UUID string` 오류가 발생합니다.
> ID는 반드시 Spring AI에 위임하거나 UUID 형식으로 변환해야 합니다.

### 채팅 흐름 (`ChatServiceImpl`)

```
chat(request)
  │
  ├─ 1. vectorStore.similaritySearch(query, topK=5, threshold=0.3)
  │      └─ 질문을 임베딩 → vector_store에서 코사인 유사도 검색
  │
  ├─ 2. 결과 0건? → noDataFound: true 즉시 반환 (LLM 호출 없음)
  │
  ├─ 3. Document 목록 → 컨텍스트 텍스트 블록 조합
  │      └─ "[게시글 1]\n{content}\n\n[게시글 2]\n..."
  │
  ├─ 4. metadata에서 postId 추출 → sourcePostIds
  │
  └─ 5. ChatClient.prompt()
         .system("반드시 제공된 컨텍스트만 사용, 없으면 '찾을 수 없습니다' 답변")
         .user("[참고 게시글]\n{context}\n\n[질문]\n{query}")
         .call().content()
```

---

## 9. 초기 사용 순서

```bash
# 1. Docker 컨테이너 재시작 (pgvector 이미지 적용)
docker-compose -f docker-compose-local.yml down
docker-compose -f docker-compose-local.yml up -d

# 2. 앱 구동 후 Flyway V2 마이그레이션 자동 실행 확인
# -> vector_store 테이블 및 HNSW 인덱스 생성됨

# 3. 게시글 색인 (최초 한 번 또는 데이터 변경 후)
curl -X POST http://localhost:8080/api/v1/ai/admin/index/sync

# 4. 채팅 테스트
curl -X POST http://localhost:8080/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"query": "최근 어떤 주제의 게시글이 많나요?", "topK": 5}'
```

---

## 10. 운영 고려사항

| 항목              | 내용                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------- |
| **색인 시점**     | 현재 수동 API 방식. 게시글 증가 시 주기적 재색인 필요                                  |
| **비용**          | 재색인 시 게시글 수 × Embedding API 호출. 게시글 1000건 ≈ $0.0001                      |
| **색인 지연**     | 신규 게시글은 `/sync` 호출 전까지 채팅에 반영 안 됨                                    |
| **Admin 보안**    | 현재 `/admin/**` Public. 운영 환경에서는 JWT + ADMIN 역할 필요                         |
| **pgvector 버전** | `pgvector/pgvector:pg15` 이미지 사용. PostgreSQL 버전 업그레이드 시 이미지도 함께 변경 |

---

/api/v1/ai/chat/stream

curl -X 'POST' \
 'http://localhost:8080/api/v1/ai/chat/stream' \
 -H 'accept: text/event-stream' \
 -H 'Content-Type: application/json' \
 -d '{
"query": "커뮤니티에서 SQL 주제 관련된 건?",
"topK": 5
}'

event:metadata
data:{"sourcePostIds":[86,56,67,96,26]}

event:token
data:SQL

event:token
data: 주

event:token
data:제

event:token
data:와

event:token
data: 관련

event:token
data:된

event:token
data: 게시

event:token
data:글

event:token
data:은

event:token
data: 다음

event:token
data:과

event:token
data: 같습니다

event:token
data::
data:
data:

event:token
data:-

event:token
data: \*\*

event:token
data:게시

event:token
data:글

event:token
data:

event:token
data:3

event:token
data:\*\*
data:

event:token
data:

event:token
data: -

event:token
data: 작성

event:token
data:자

event:token
data::

event:token
data: User

event:token
data:

event:token
data:8

event:token
data:
data:

event:token
data:

event:token
data: -

event:token
data: 내용

event:token
data::

event:token
data: SQL

event:token
data: 쿼

event:token
data:리

event:token
data: 연

event:token
data:습

event:token
data: 오늘

event:token
data: 할

event:token
data:당

event:token
data:량

event:token
data: 클

event:token
data:리

event:token
data:어

event:token
data:!

event:token
data: 내

event:token
data:일

event:token
data:도

event:token
data: 고

event:token
data:고

event:token
data: 🚀

event:token
data:
data:

event:token
data:

event:token
data: -

event:token
data: 해

event:token
data:시

event:token
data:태

event:token
data:그

event:token
data::

event:token
data: #

event:token
data:쿼

event:token
data:리

event:token
data: #

event:token
data:개

event:token
data:발

event:token
data: #

event:token
data:데

event:token
data:이터

event:token
data:베

event:token
data:이스

event:token
data: #

event:token
data:sql

event:token
data:
data:

event:token
data:

event:token
data: -

event:token
data: 작성

event:token
data:일

event:token
data::

event:token
data:

event:token
data:202

event:token
data:6

event:token
data:-

event:token
data:03

event:token
data:-

event:token
data:07

event:token
data:T

event:token
data:22

event:token
data::

event:token
data:29

event:token
data::

event:token
data:33

event:token
data:.

event:token
data:925

event:token
data:241

event:token
data:
data:
data:

event:token
data:이

event:token
data: 게시

event:token
data:글

event:token
data:은

event:token
data: SQL

event:token
data: 쿼

event:token
data:리

event:token
data: 연

event:token
data:습

event:token
data:에

event:token
data: 대한

event:token
data: 내용

event:token
data:입니다

event:token
data:.

event:done
data:
