# 시선(Sison) — 한국 여행 봉사 기록 앱

> 여행 중 지역 봉사활동을 발견하고, 참여 후 조용히 기록하는 감성 기반 모바일 여행 서비스

시선은 봉사활동을 신청하고 관리하는 행정형 서비스가 아니라, 여행 중 지역과 자연스럽게 연결되는 활동을 발견하고 그 순간을 기록하는 모바일 여행 앱입니다.

## 프로젝트 방향

### 브랜드 의미

- 시선(施善): 선행을 베풀다
- 시선(視線): 여행지와 세상을 새롭게 바라보는 시선

### 핵심 UX 방향

- 여행 일정 기반 봉사활동 탐색
- 상세 지역 검색: 광안리, 안목해변, 애월 등
- 여행 중 자연스럽게 참여 가능한 활동 발견
- 참여 후 감성 스토리 기록
- 여행 카드 생성
- 조용한 기록 아카이브 경험

### 디자인 방향

- 모바일 퍼스트
- Pretendard 기반
- soft mint + cream palette
- spacious layout
- rounded card UI
- calm Korean travel atmosphere
- editorial travel mood

### 피해야 할 방향

- 공공기관/행정 시스템 느낌
- 봉사 인증/랭킹/성과 과시 중심
- 과한 SNS, 배지, 경쟁 유도
- 딱딱한 모집/마감/관리자식 표현

---

## 기술 스택

- React 18
- TypeScript
- Vite 6
- Tailwind CSS v4
- Lucide React
- Pretendard Variable Font

현재 프로젝트는 프론트엔드 프로토타입 단계입니다.

- 별도 라우터 없음
- 별도 서버/API 없음
- 별도 DB 없음
- 대부분 mock data 기반
- 저장/좋아요/댓글/프로필 수정은 React state 기반

---

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 아래 주소로 접속합니다.

```bash
http://localhost:5173
```

빌드 확인:

```bash
npm run build
```

> 다른 환경에서 압축된 `node_modules`가 포함되어 있거나 의존성 오류가 발생하면, `node_modules`와 lock 파일을 정리한 뒤 `npm install`을 다시 실행하는 것이 안전합니다.

---

## 화면 구조

하단 탭은 5개로 구성되어 있습니다.

| 탭 | 컴포넌트 | 설명 |
|---|---|---|
| 홈 | `Home` | 히어로, 여행지/일정/인원 검색 카드, 추천 활동 |
| 검색 | `SearchTab` | 검색 전 기본 화면, 검색 결과, 필터, 상세 바텀시트 |
| 스토리 | `StoryCreation` | 지도, 활동 선택, 사진/글 업로드, 여행 카드 생성 |
| 저장 | `SavedArchive` | 저장 활동, 내 스토리, 여행 카드 아카이브 |
| 내 정보 | `ProfileScreen` | 프로필, 여행 요약, 최근 스토리, 설정 |

---

## 스토리 탭 흐름

`StoryCreation` 내부의 `currentView` 상태로 화면이 전환됩니다.

```txt
map
→ my-activities
→ upload
→ card
```

상세 흐름:

```txt
map (RegionMapView)
  └─ [+] → my-activities (MyActivitiesView)
       └─ 활동 클릭 → upload (StoryUploadView)
            └─ 카드 만들기 → card (CardCreationView)
```

스토리는 기본적으로 지난 활동 또는 참여 완료 활동을 기록하는 흐름을 지향합니다.

---

## 주요 폴더 구조

```txt
src/
├── main.tsx
├── app/
│   ├── App.tsx
│   ├── activitySaveState.ts
│   ├── searchState.ts
│   ├── storyInteractionState.ts
│   └── components/
│       ├── Home.tsx
│       ├── SearchTab.tsx
│       ├── AIRecommendation.tsx
│       ├── SavedArchive.tsx
│       ├── ProfileScreen.tsx
│       ├── BottomTabBar.tsx
│       ├── CompactActivityCard.tsx
│       ├── EnhancedDetailBottomSheet.tsx
│       ├── CalendarBottomSheet.tsx
│       ├── PeopleCountModal.tsx
│       ├── NotificationSheet.tsx
│       ├── SettingsDetailScreens.tsx
│       └── story/
│           ├── RegionMapView.tsx
│           ├── MyActivitiesView.tsx
│           ├── StoryUploadView.tsx
│           ├── CardCreationView.tsx
│           ├── StoryCard.tsx
│           ├── StoryDetailSheet.tsx
│           ├── StoryCommentSheet.tsx
│           └── storyTypes.ts
└── styles/
    ├── index.css
    ├── tailwind.css
    ├── theme.css
    ├── globals.css
    └── fonts.css

public/
├── home-hero-1.png
├── home-hero-2.png
├── home-hero-3.png
├── icon.png
└── manifest.json
```

---

## 라우팅 구조

현재는 `react-router`를 사용하지 않습니다.

`App.tsx`의 `currentScreen` 상태로 화면을 전환합니다.

```ts
'home' | 'search' | 'ai-recommendation' | 'story' | 'saved' | 'profile'
```

화면 이동은 `onNavigate(screen: string)` 패턴을 유지합니다.

---

## 현재 저장 방식

현재 저장은 실제 DB가 아니라 React state 기반입니다.

| 기능 | 현재 상태 |
|---|---|
| 활동 저장 | React state |
| 좋아요 | React state |
| 댓글 | React state |
| 프로필 수정 | React state |
| 스토리 업로드 | mock state |
| 여행 카드 생성 | mock state / alert |
| 이미지 업로드 | 실제 업로드 아님 |
| AI 추천 | 실제 API 미연동 |

새로고침하거나 재접속하면 일부 상태는 유지되지 않을 수 있습니다.

---

## 현재 없는 기능

실제 서비스화를 위해서는 아래 기능이 추가로 필요합니다.

- 로그인/회원 관리
- 활동 데이터 DB
- 저장 활동 영구 저장
- 신청/참여 상태 저장
- 스토리 저장
- 댓글/좋아요 저장
- 이미지 업로드 스토리지
- 여행 카드 이미지 저장
- 실제 AI 추천 API
- 지도/장소 검색 API
- 관리자 활동 등록 화면

---

## 개발 시 주의사항

### 유지할 것

- 모바일 390px 기준 사용성
- 기존 파일 구조
- `App.tsx` 기반 화면 전환
- `onNavigate(screen)` 패턴
- Pretendard
- cream background
- soft mint 포인트
- 둥근 카드 UI
- 여백 중심의 담백한 레이아웃

### 피할 것

- 새 패키지 무분별한 추가
- `react-router-dom` 추가
- 무관한 화면까지 함께 리디자인
- 공공기관/행정 시스템 느낌
- 과한 버튼 강조
- 랭킹/배지/성과 과시형 UX
- “종료됨”, “마감됨” 같은 딱딱한 표현 남용

사용자-facing 문구는 가능한 한 다음 표현을 우선합니다.

- `지난 활동`
- `기록하기`
- `여행 카드`
- `조용한 기록`
- `근처에서 이어가기 좋은 일정`

---

## AI 기능 방향

AI 기능은 보조 기능으로 사용합니다.

예상 기능:

- 홈 화면 활동 추천
- 봉사활동 이후 여행 일정 추천
- 감성 여행 카드 생성

중요 원칙:

- LLM이 임의 장소/활동을 생성하지 않도록 제한
- 활동 추천은 DB에 있는 활동 중에서만 선택
- 여행 일정 추천은 검증된 장소 데이터 또는 내부 장소 pool 기반으로 제한
- 추천 결과에는 가능한 한 `activityId`, `placeId` 등 근거 ID 포함
- 카드 문구 생성은 허용하되, 사실 정보 생성은 제한

---

## 데이터 모델 방향

활동 데이터는 모집 기간과 실제 활동 기간을 분리해야 합니다.

```ts
interface Activity {
  id?: number;
  imageUrl: string;
  title: string;
  location: string;
  region?: string;

  recruitmentStartDate?: string;
  recruitmentEndDate?: string;

  activityStartDate?: string;
  activityEndDate?: string;
  date?: string;
  time: string;

  status?: string;
  isRecruiting?: boolean;

  distance?: string;
  description: string;
  materials: string;
  capacity: string;
  currentParticipants: string;
  recommendation: string;

  duration?: string;
  difficulty?: string;
  indoorOutdoor?: string;
  category?: string;
}
```

주의:

- 신청 기간과 실제 활동 기간은 다릅니다.
- “오늘 참여하기 좋은 활동” 같은 표현은 신청기간/활동기간을 혼동할 수 있어 주의해야 합니다.

---

## 핵심 기준

앞으로 모든 수정은 아래 기준을 우선합니다.

1. 여행앱다운 감성
2. 모바일 사용성
3. 디자인 일관성
4. 조용한 기록 경험
5. 봉사 정보의 정확성
6. 과하지 않은 AI 보조 기능

핵심 문장:

> 시선은 봉사활동을 관리하는 서비스가 아니라, 여행 중 지역과 조용히 연결되는 순간을 기록하는 모바일 여행 앱이다.
