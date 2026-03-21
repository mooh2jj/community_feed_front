# 📱 모바일 UX 가이드

> StudyMate 프론트엔드의 모바일 환경 최적화 설정 및 개발 규칙 문서입니다.

---

## 목차

1. [Viewport 설정](#1-viewport-설정)
2. [iOS Safe Area](#2-ios-safe-area)
3. [Safe Area CSS 유틸리티](#3-safe-area-css-유틸리티)
4. [Z-Index 레이어 체계](#4-z-index-레이어-체계)
5. [모바일 컴포넌트 패턴](#5-모바일-컴포넌트-패턴)
6. [터치 인터랙션 규칙](#6-터치-인터랙션-규칙)
7. [체크리스트](#7-신규-컴포넌트-모바일-체크리스트)

---

## 1. Viewport 설정

**파일**: `app/layout.tsx`

```ts
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // iOS Safari 필드 자동 줌 방지
  viewportFit: "cover", // 노치 / 홈 인디케이터 영역까지 레이아웃 확장
};
```

### 각 설정의 역할

| 옵션           | 값        | 이유                                                                                          |
| -------------- | --------- | --------------------------------------------------------------------------------------------- |
| `viewportFit`  | `"cover"` | iPhone 노치(Dynamic Island) 및 홈 인디케이터 영역까지 배경색이 채워져 여백 없는 풀스크린 제공 |
| `maximumScale` | `1`       | 입력 필드 포커스 시 iOS Safari가 자동으로 줌인하는 동작 방지                                  |
| `initialScale` | `1`       | 페이지 첫 로드 시 기본 배율 1:1 유지                                                          |

> ⚠️ `viewportFit: "cover"` 설정 시, safe area 유틸리티 클래스를 반드시 함께 사용해야 합니다.  
> 미사용 시 홈 인디케이터(하단 바) 뒤에 UI 요소가 가려집니다.

---

## 2. iOS Safe Area

iPhone X 이후 기종은 물리 홈 버튼이 없어 화면 하단에 **홈 인디케이터**(스와이프 바)가 표시됩니다.  
`viewportFit: "cover"` 설정 후 `env(safe-area-inset-*)` CSS 함수로 이 영역을 피해야 합니다.

```
┌──────────────────────────────┐
│  상단: env(safe-area-inset-top)    ← Dynamic Island / 노치 |
│                              │
│       페이지 콘텐츠           │
│                              │
│  하단: env(safe-area-inset-bottom) ← 홈 인디케이터 (34px 내외) |
└──────────────────────────────┘
```

### CSS 환경 변수 참조표

| 변수                          | 설명               | 일반 기기 기본값           |
| ----------------------------- | ------------------ | -------------------------- |
| `env(safe-area-inset-top)`    | 상단 노치 높이     | `0px`                      |
| `env(safe-area-inset-bottom)` | 홈 인디케이터 높이 | `0px` (iPhone은 약 `34px`) |
| `env(safe-area-inset-left)`   | 좌측 여백          | `0px`                      |
| `env(safe-area-inset-right)`  | 우측 여백          | `0px`                      |

---

## 3. Safe Area CSS 유틸리티

**파일**: `app/globals.css`

프로젝트 전역에서 사용 가능한 safe area 커스텀 유틸리티 클래스입니다.

```css
/* 하단 safe area 만큼 padding 추가 (일반 기기에서는 0) */
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* 바텀시트 모달용: safe area 또는 최소 1.5rem 중 더 큰 값 */
.mb-safe {
  margin-bottom: max(env(safe-area-inset-bottom, 0px), 1.5rem);
}

/* 페이지 콘텐츠 하단: 네비게이션(5rem) + safe area */
.pb-safe-nav {
  padding-bottom: calc(5rem + env(safe-area-inset-bottom, 0px));
}
```

### 사용 위치 가이드

| 클래스        | 사용 위치                       | 예시                            |
| ------------- | ------------------------------- | ------------------------------- |
| `pb-safe`     | 하단 고정 nav / 툴바            | `<nav className="... pb-safe">` |
| `mb-safe`     | 모바일 바텀시트 모달의 카드     | `<div className="... mb-safe">` |
| `pb-safe-nav` | 각 페이지 콘텐츠 최상위 wrapper | `<div className="pb-safe-nav">` |

### 실제 적용 위치

```
app/layout.tsx
  └─ <div className="pb-safe-nav">  ← 모든 페이지 콘텐츠 하단 여백

components/Navigation.tsx
  └─ <nav className="... pb-safe">  ← nav 배경이 홈 인디케이터까지 채워짐

app/page.tsx (모달)
  └─ <div className="... mb-safe">  ← 바텀시트 카드가 홈 인디케이터 위에 위치
```

---

## 4. Z-Index 레이어 체계

하단 네비게이션 위에 모달이 뜨지 않는 문제를 방지하기 위해 아래 레이어 규칙을 준수합니다.

```
z-60  ← 모달 오버레이 (글쓰기 방식 선택, PDF 업로드 진행 오버레이)
z-50  ← 하단 Navigation, 상단 sticky 헤더
z-40  ← Dropdown, Tooltip
z-30  ← 플로팅 버튼 (ChatbotFAB)
z-10  ← 카드 hover 이펙트
```

> **핵심 규칙**: 모달/오버레이 클래스에는 반드시 `z-60` 이상을 사용하세요.  
> `z-50`은 Navigation 전용으로 예약되어 있습니다.

```tsx
// ✅ 올바른 사용
<div className="fixed inset-0 z-60 ...">

// ❌ 잘못된 사용 (Navigation에 가려짐)
<div className="fixed inset-0 z-50 ...">
```

---

## 5. 모바일 컴포넌트 패턴

### 바텀시트 모달 (Bottom Sheet)

모바일에서는 화면 하단에서 올라오는 방식, 데스크탑에서는 중앙 모달로 표시합니다.

```tsx
{
  /* 오버레이: 모바일 하단 정렬 / 데스크탑 중앙 정렬 */
}
<div className="fixed inset-0 z-60 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
  {/* 카드: 모바일 전체 너비 둥근 상단 / 데스크탑 최대 너비 제한 */}
  <div
    className="w-full sm:max-w-sm sm:mx-4 sm:mb-0 mb-safe
                  bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl p-6"
  >
    {/* 내용 */}
  </div>
</div>;
```

**핵심 클래스 설명**:

- `items-end sm:items-center` : 모바일 하단 / 데스크탑 중앙
- `rounded-t-3xl sm:rounded-3xl` : 모바일 상단만 / 데스크탑 전체 둥글게
- `mb-safe` : iOS 홈 인디케이터 위 여백 확보
- `w-full sm:max-w-sm` : 모바일 전체 / 데스크탑 제한 너비

### 전체화면 로딩 오버레이

```tsx
{
  isLoading && (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-5 px-10 py-8 bg-white rounded-3xl shadow-2xl">
        {/* 스피너 + 메시지 */}
      </div>
    </div>
  );
}
```

---

## 6. 터치 인터랙션 규칙

### 최소 터치 영역

Apple HIG 및 Google Material 기준, 터치 가능한 요소의 최소 크기는 **44×44pt**입니다.

```tsx
// ✅ 충분한 터치 영역
<button className="h-11 px-4 ...">   {/* h-11 = 44px */}
<button className="w-11 h-11 ...">

// ❌ 너무 작은 터치 영역
<button className="h-6 px-2 ...">
```

### 활성 상태 피드백

모바일에서 탭 즉시 시각적 피드백을 제공해야 합니다.

```tsx
// active: 의사 클래스로 즉각 피드백
<button className="active:scale-95 active:bg-purple-200 transition-all duration-150">
```

### 스크롤 영역

긴 목록은 `-webkit-overflow-scrolling: touch` 스무스 스크롤이 기본 적용됩니다 (iOS).  
수직 스크롤만 허용할 경우 명시적으로 제한:

```tsx
<div className="overflow-y-auto overflow-x-hidden">
```

---

## 7. 신규 컴포넌트 모바일 체크리스트

새 컴포넌트/페이지를 추가할 때 아래 항목을 확인하세요.

```
□ 고정(fixed) UI는 z-50 이하를 사용하는가?
  → 모달/오버레이라면 z-60 이상으로 올릴 것

□ 하단 고정 UI에 pb-safe를 적용했는가?
  → Navigation 아래에 숨겨지는 콘텐츠 없는지 확인

□ 페이지 최상위 wrapper에 pb-safe-nav 적용되어 있는가?
  → layout.tsx에서 전역 적용 중이므로 별도 적용 불필요

□ 모달이 items-end sm:items-center 패턴을 사용하는가?
  → 모바일: 바텀시트, 데스크탑: 센터 모달

□ 모달 카드에 mb-safe를 적용했는가?
  → iOS 홈 인디케이터와 겹치지 않도록

□ 버튼/링크의 터치 영역이 44px 이상인가?
  → h-11(44px)이 기준

□ 입력 필드의 font-size가 16px 이상인가?
  → 미만이면 iOS에서 자동 줌인 발생 (text-base 이상 사용)
```

---

## 관련 파일 요약

| 파일                        | 역할                                                 |
| --------------------------- | ---------------------------------------------------- |
| `app/layout.tsx`            | `viewport` export로 전역 모바일 설정                 |
| `app/globals.css`           | `.pb-safe`, `.mb-safe`, `.pb-safe-nav` 유틸리티 정의 |
| `components/Navigation.tsx` | `pb-safe` 적용으로 홈 인디케이터 위에 배경 확장      |
| `app/page.tsx`              | 모달 `z-60`, `mb-safe`, 바텀시트 패턴 적용 예시      |
