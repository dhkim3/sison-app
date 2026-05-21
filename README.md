# 시선 (Sison) — 한국 여행 봉사 기록 앱

> 여행 중 지역 봉사활동을 발견하고, 참여 후 조용히 기록하는 감성 기반 모바일 서비스

## 기술 스택
- React 18 + TypeScript
- Vite 6
- Tailwind CSS v4 (shadcn 디자인 토큰)
- Lucide React (아이콘)

## 시작하기
```bash
npm install
npm run dev
```
브라우저에서 http://localhost:5173 접속

## 화면 구조 (하단 탭 5개)
| 탭 | 컴포넌트 | 설명 |
|----|----------|------|
| 홈 | Home | 히어로 + 검색카드(일정/인원 모달) + 추천 활동 |
| 검색 | SearchTab | 탐색 ↔ 검색결과 ↔ 상세 바텀시트 → AI 일정 추천 |
| 스토리 | StoryCreation | 지도 → 활동선택 → 사진업로드 → AI카드 (내부 흐름) |
| 저장 | SavedArchive | 저장활동 / 내 스토리 / 여행 카드 |
| 내 정보 | ProfileScreen | 프로필 + 여행 스타일 + 설정 |

## 스토리 탭 흐름 (StoryCreation 내부 currentView 상태)
```
map (RegionMapView, 지도)
  └─ [+] → my-activities (MyActivitiesView, 신청활동 선택)
       └─ 활동 클릭 → upload (StoryUploadView, 사진/글)
            └─ 카드 만들기 → card (CardCreationView, AI 카드)
```

## 폴더 구조
```
src/
├── main.tsx
├── app/
│   ├── App.tsx              # 탭 전환 (currentScreen)
│   └── components/          # 화면 + 공통 컴포넌트 (47개)
│       └── story/           # 스토리 흐름 4개 뷰
└── styles/
    ├── index.css            # import 허브
    ├── tailwind.css         # @import "tailwindcss"
    ├── theme.css            # 디자인 토큰
    ├── globals.css          # 애니메이션/유틸
    └── fonts.css            # Pretendard
```
