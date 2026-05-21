# Project Rules for Claude Code

## Project Overview
This is **시선 (Sison)** — a Korean travel volunteer activity app.
Mobile-first React app. All UI is designed for ~390px wide screens.

## Tech Stack
- React 18 + TypeScript (strict mode)
- Vite 6
- Tailwind CSS v4
- lucide-react (icons only — no other icon libraries)
- No other external UI libraries (no shadcn, no framer-motion, no radix)

## File Structure
```
src/
├── app/
│   ├── App.tsx                  # Screen router (useState-based, no react-router)
│   └── components/
│       ├── story/               # Story tab sub-views
│       │   ├── RegionMapView    # Story tab main (map + recent stories)
│       │   ├── MyActivitiesView # Activity selection
│       │   ├── StoryUploadView  # Photo upload + text
│       │   └── CardCreationView # AI card creation
│       └── ...                  # All other components
├── styles/
│   ├── index.css                # Import hub (tailwind → fonts → theme → globals)
│   ├── tailwind.css             # @import "tailwindcss"
│   ├── theme.css                # Design tokens (oklch colors, --text-* vars)
│   ├── globals.css              # Animations, utilities (screen-transition, scrollbar-hide)
│   └── fonts.css                # Pretendard font
└── main.tsx
public/
└── korea-map.svg                # Korea map SVG (used in RegionMapView)
```

## Navigation (App.tsx)
Screen routing is done with a single `useState<Screen>` in App.tsx.
Available screens: `'home' | 'search' | 'ai-recommendation' | 'story' | 'saved' | 'profile'`
- `story` tab renders `<StoryCreation>` which internally manages sub-views (map → activities → upload → card) via its own `currentView` state
- Never add react-router. Always use `onNavigate(screen: string)` prop pattern.

## Design System
- **Primary green**: #a8d5ba (buttons, active states, accents)
- **Background**: #fdfcfa (cream white)
- **Text primary**: #2a2a2a
- **Text secondary**: #5a5a5a
- **Text muted**: #999
- **Card background**: white, border `border-black/5`, shadow `shadow-sm`
- **Border radius**: cards = rounded-2xl or rounded-3xl, buttons = rounded-2xl or rounded-full
- **Font**: Pretendard Variable (loaded via fonts.css)

## Coding Rules

### Always
- Use `type="button"` on all `<button>` elements to prevent accidental form submit
- Use inline styles for flex/grid layouts inside cards (Tailwind flex classes can break in v4)
- Keep components in their existing files — do not reorganize the folder structure
- Use `scrollbar-hide` class for horizontal scroll containers
- Use `safe-area-inset-bottom` class on fixed bottom elements

### Never
- Never install new npm packages without asking first
- Never use `localStorage` or `sessionStorage`
- Never add `react-router-dom` or any router library
- Never use `<form>` tags — use button onClick handlers instead
- Never add default exports to component files (all components use named exports)
- Never change App.tsx screen list without confirming new screen names

### Styling
- Tailwind v4: use `@import "tailwindcss"` not `@tailwind base/components/utilities`
- Custom CSS goes in `globals.css`, not inline `<style>` tags
- For layouts that are tricky with Tailwind (nested flex cards), use inline `style={{}}` props

## When Modifying Components
1. Read the target file first before editing
2. Change only what was asked — do not refactor unrelated code
3. Keep all existing props interfaces intact
4. If a prop type needs to change, update both the component AND all places that use it

## Effort Guide (to save tokens)
- Simple text/color/spacing fix → **Effort: Low, Thinking: off**
- Single component rewrite → **Effort: Medium, Thinking: off**
- Complex layout / multi-file change → **Effort: High, Thinking: on**
