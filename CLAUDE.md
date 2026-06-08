# Project Rules for Claude Code

## Project Overview

This is **시선 (Sison)** — a Korean travel volunteer activity app.

시선 is not an administrative volunteer-management service.  
It is a mobile-first emotional travel app where users discover local volunteer activities during trips and quietly record those moments afterward.

All UI is designed for ~390px wide mobile screens.

## Brand Direction

Meaning of 시선:

- 시선(施善): to give or practice good deeds
- 시선(視線): a new perspective on travel destinations and the world

Core mood:

- Calm Korean travel-app atmosphere
- Editorial travel mood
- Quiet, warm, and lightweight UX
- Travel-memory first, volunteer-activity second

Avoid:

- Public-sector / administrative system feeling
- Ranking, badges, certification-heavy UX
- SNS-like over-engagement
- Loud gamification
- Stiff wording such as “모집 종료”, “마감됨”, “종료”

Prefer:

- “지난 활동”
- “기록하기”
- “여행 카드”
- “조용한 기록”
- “근처에서 이어가기 좋은 일정”

---

## Tech Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS v4
- lucide-react for icons only
- Pretendard Variable Font
- No react-router
- No external UI libraries unless explicitly approved

Do not add:

- shadcn
- framer-motion
- radix
- new icon libraries
- router libraries
- unnecessary npm packages

---

## Current Project Status

This project is currently a frontend prototype.

Current data/state behavior:

- Most data is mock data inside components or state files
- Saved activities are React state based
- Likes are React state based
- Comments are React state based
- Profile edits are React state based
- Story upload is mock behavior
- Travel card creation is mock behavior
- AI recommendation is mock behavior
- No real backend/API/DB is connected yet
- No real image upload storage is connected yet
- State may disappear after refresh

When implementing features, do not assume persistence exists unless explicitly requested.

---

## File Structure

```txt
src/
├── main.tsx
├── app/
│   ├── App.tsx                  # Screen router, useState-based
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
    ├── index.css                # Import hub
    ├── tailwind.css             # @import "tailwindcss"
    ├── theme.css                # Design tokens
    ├── globals.css              # Animations, utilities, scrollbar-hide
    └── fonts.css                # Pretendard font

public/
├── home-hero-1.png
├── home-hero-2.png
├── home-hero-3.png
├── icon.png
└── manifest.json

---

## CSS 아키텍처 주의사항

### PC 마우스 휠 스크롤 — html에 overflow 금지

`src/styles/globals.css`의 `html` 요소에 `overflow-x: hidden` 또는 `overflow-y: auto`를 **절대 추가하지 말 것.**

**이유**: CSS 스펙에 따라 `html`의 overflow가 `visible`(기본값)일 때만 `body`의 overflow가 viewport(브라우저 창)로 전파된다. html에 overflow를 설정하면 html 자체가 루트 스크롤 컨테이너가 되는데, html은 `height: auto`로 콘텐츠에 맞게 늘어나므로 `scrollHeight = clientHeight`가 되어 스크롤 자체가 불가능해진다. 결과적으로 PC에서 마우스 휠 스크롤이 완전히 작동하지 않게 된다.

**올바른 설정**:
- `html`: overflow 미설정 (visible 기본값 유지), `overscroll-behavior-y: none`만 사용
- `body`: `overflow-x: hidden; overflow-y: auto; scrollbar-gutter: stable` 설정 → viewport로 전파됨

**참고**: `overflow-x: hidden`을 설정하면 CSS 스펙상 `overflow-y: visible`이 `auto`로 자동 변환됨. 중간 컨테이너(`.screen-transition`, `.mobile-app-page`)도 이 이유로 암묵적 Y 스크롤 컨테이너가 되지만, `height: auto`로 성장하므로 실제로 스크롤하지 않고 이벤트를 상위로 전달한다.