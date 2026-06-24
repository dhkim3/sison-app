# AI Frame Guide

This document describes the current AI frame creation logic for Sison travel cards.

## Goal

AI frame generation must not create a completed card.

The original user photo is always the main content. AI output is used only as decorative frame assets. The final card is composited on the client with the original React-rendered photo, title, location, date, and Sison logo.

## Server Flow

Entry point:

- `api/story.ts`
- `handleCardGenerate`
- `buildFramePrompt`

The client sends only the original photo as a data URL to `/api/story?action=card-generate`.

The server calls OpenAI Images Edits API with:

- model: `OPENAI_IMAGE_MODEL` or `gpt-image-2`
- endpoint: `https://api.openai.com/v1/images/edits`
- image: original source photo only
- output size: `1024x1536`
- quality: `medium`
- output format: `png`

The server now generates two image assets:

- `backgroundUrl`: required full-card frame/background image
- `overlayUrl`: optional transparent decoration overlay image

`url` is kept as a backward-compatible alias for `backgroundUrl`.

The background request uses `background=opaque`. The overlay request uses `background=transparent`, so the overlay can be composited above the original photo without hiding it.

The background image is uploaded first. The overlay is best-effort: if overlay generation fails, the API still returns the background image and `overlayUrl: null`.

## Prompt Contract

The prompt is split into two layer requests.

Background prompt:

- creates the full-card background frame below the original photo
- owns only the card outer frame, lower text-area color, subtle texture, and small decorative border motifs
- must not create foreground objects, second photo frames, or visual elements that need to cover the photo
- must not create characters, people, crabs, large shells, palm trees, suns, clouds, waves, coral, or any object that should appear above the photo
- must not place objects behind the photo that would be cut off by the client-rendered photo layer
- must not create a separate illustrated scene, landscape, environment, beach, forest, city, or decorative world beneath the photo
- keeps the lower card area calm with subtle texture and sparse small accents only

Overlay prompt:

- creates a transparent PNG decoration layer at card level
- must use real alpha transparency for empty areas
- must not draw checkerboard transparency previews, gray/white squares, mattes, or visible placeholder backgrounds
- is rendered above the original photo only through an edge-only mask
- contains only sparse corner/edge-contact decorations that can creatively cross the photo boundary
- is not a scene, illustration, landscape, or second environment
- uses only small boundary accents, not foreground/background storytelling elements
- should not keep all decorations outside the photo
- should encourage small foreground decorations to cross the photo edge naturally
- should create at least three clearly visible edge-crossing pop-out accents
- may extend small decorative elements 10-18% into the photo boundary
- should make the overlap feel intentional, playful, and connected to the card border
- should prefer concrete edge interactions such as crab claws, shell edges, wave foam, palm leaf tips, sun rays, cloud edges, and tiny character hands/hats/tools
- may show a partially hidden cute character or object only as a small edge-crossing detail, never as a large object inside the photo
- may place a complete uncropped character in the lower-right/right-center overlay zone, with only a small part crossing the photo edge
- must complete every visible decorative element
- should prefer fewer high-quality accents over many decorations
- should keep at least 88% of the canvas transparent
- should keep the center of the photo area transparent
- must not rely on overlap in the center or broad interior of the final photo area
- should allow selected small bottom-edge accents to overlap about 10-18%, while still avoiding continuous bands
- must not cover faces, hands, main subjects, or text
- must not place large decorative objects inside the photo

It must not:

- generate card text
- generate letters
- generate numbers
- generate dates
- generate captions
- generate logos
- generate title areas
- replace, redraw, crop, resize, or hide the original photo
- create a smaller photo window, matte, inner photo placeholder, border box, or empty margin that visually reduces the photo area
- create sticker sheets, repeated panels, nested frames, tiled frame strips, or duplicate frame boxes
- create horizontal lines, divider lines, dotted lines, underlines, or separator lines around the text area or under the logo
- create white vertical lines, white horizontal lines, straight border strokes, or panel guide lines inside the photo area
- create broad opaque overlay bands across the lower part of the photo
- create a decorative scene, landscape, beach scene, forest scene, city scene, or world beneath the photo
- create foreground/background storytelling elements
- create unfinished objects, cropped decorative fragments, half-generated objects, faded object remnants, blurry placeholder shapes, random artifacts, or visual clutter
- keep the photo and frame completely separated
- place every decoration outside the photo boundary
- use visible checkerboard, gray, white, or matte pixels to represent transparency

The generated image should:

- match the activity/theme mood
- keep the photo as the visual hero
- keep the frame as a decorative border, not a separate illustration
- keep the active decoration zone limited to about 10-20% around the photo edges and card outer edges
- make the frame lightly interact with the photo boundary
- connect photo and frame with decorative objects, not straight line-based borders
- allow a few small foreground objects to visibly pop over the photo boundary while preserving photo visibility
- use subtle themed color, texture, and sparse small motifs in the lower text area
- keep the lower-left text area readable
- place large characters or objects mostly on the right side
- keep any character or object fully completed and uncropped
- avoid large decorative content in the lower card area; the lower area is not a second scene
- preserve the current restrained style and text readability, but make boundary overlap clearly noticeable like the reference card

Layer split rule:

- Full or medium decorative objects must never be generated in the background layer.
- If a character, palm leaf, sun ray, crab, shell, or similar object needs to touch or cross the photo edge, it belongs in the transparent overlay layer only.
- The original photo must not be the layer that clips a generated object. If an object would be cut by the photo layer, move it to overlay or remove it.

Invalid results:

- the decoration becomes a scene, landscape, large environment, or second image beneath the photo
- the card lower area becomes its own illustrated world
- the user notices the frame illustration before the photo
- decorative objects are cut off, half-generated, or cluttered

## Client Composition

Entry point:

- `src/app/components/story/CardCreationView.tsx`

The AI frame result is not used as the photo. The original `photo` prop always remains the image source for the photo layer.

Current layer order:

1. card background / static frame style
2. AI background frame image, if selected, as one card-level background image
3. original photo
4. AI decoration overlay image, if available, clipped by an edge-only mask
5. loading border while generation is in progress
6. React text area and Sison logo

Current z-index behavior:

- AI background frame image: `z-0`
- original photo: `z-10`
- AI decoration overlay image: `z-20`
- loading border: `z-25`
- title, location, date, logo: `z-30`

The AI background frame image is rendered once:

```tsx
<img
  src={aiFrameBackgroundUrl}
  aria-hidden="true"
  className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-fill"
/>
```

The original photo remains:

```tsx
<img
  src={photo}
  alt="Travel memory"
  className="h-full w-full object-cover"
/>
```

The optional overlay image is rendered outside the photo wrapper, at card level:

```tsx
<img
  src={aiFrameOverlayUrl}
  aria-hidden="true"
  className="ai-frame-photo-edge-overlay pointer-events-none absolute inset-0 z-20 h-full w-full select-none object-fill"
/>
```

The overlay may be above the original photo only with `ai-frame-photo-edge-overlay`. This mask exposes expanded corner and edge-contact zones while hiding the photo center and broad interior. The exposed zones are intentionally wide near the top edge, upper-right/right edge, lower edge, lower-right edge, and left side edge so sun rays, palm leaves, crab claws, shells, wave foam, or a tiny partially hidden character can visibly cross 10-18% into the photo boundary. Do not render an unmasked AI overlay above the photo; that allows second frames, borders, and inner photo containers to appear.

The JSX order should match the visual stack: background first, original photo second, masked overlay third, text/logo last. The overlay is intentionally above the photo (`z-20`) and below text (`z-30`).

Before upload, the server normalizes overlay PNG transparency. Light neutral checkerboard/matte pixels from the image model are converted to alpha 0 so transparent areas do not appear as visible gray/white squares on the card.

## Photo Rules

The photo area is the core content.

The photo must:

- always be visible
- use the original `photo` source
- fill the existing photo box with `object-cover`
- keep the existing card layout size
- stay above the AI frame background
- stay above the optional AI decoration overlay

The photo must not:

- be replaced by `generatedImageUrl`
- be moved behind an opaque AI overlay
- be hidden by the optional AI decoration overlay
- be shrunk to make room for decorations
- show letterbox whitespace caused by `object-contain`
- be visually reduced by an inner AI-generated photo frame

## Text Rules

Text is rendered only by React.

The AI result must not provide title, location, date, captions, or the Sison logo.

The text area should visually belong to the frame theme, but the actual text must remain readable. Large characters and large objects should not appear behind the lower-left title/location/date area.

Do not add a separate white box, card, panel, or large overlay behind the text. Text should sit directly on the AI frame background so the artwork remains visible.

If readability support is absolutely necessary, use only a very weak transparent glass effect at 10-20% opacity. It must not look like a white UI card and must not hide the background artwork.

The prompt should keep the lower-left text zone clear. In particular, do not place clipped or partially cut-off decorative objects along the left or bottom edge behind the text.

## Important Implementation Rules

Do not render the same AI image URL more than once inside the final card.

Do not use the same AI image as both:

- card background
- photo overlay
- repeated background-image bands
- preview image inside the photo area

Use `aiFrameBackgroundUrl` for `z-0` only. Use `aiFrameOverlayUrl` for masked `z-20` only. Existing older responses with only `url` should treat `url` as the background image and omit the overlay.

Do not reintroduce CSS background tiling. If background images are ever used again, explicitly set:

```css
background-repeat: no-repeat;
background-size: 100% 100%;
background-position: center;
```

Prefer one `<img>` per AI layer. The current maximum is two AI images in the final card: one background and one overlay.

## Validation Checklist

Before shipping AI frame changes, confirm:

- `aiFrameBackgroundUrl` appears at most once in the rendered card.
- `aiFrameOverlayUrl` appears at most once in the rendered card.
- Older `url`-only results are rendered as background fallback only.
- The original photo `src={photo}` is still present.
- The original photo is visually above the AI background layer.
- The optional overlay is visually above the original photo and below text.
- The photo is `object-cover`, not `object-contain`.
- The AI background does not hide the photo.
- The AI overlay does not cover central photo subjects or text.
- The text remains React-rendered and readable.
- The lower-left title/location/date zone is not covered by large, dark, or clipped AI objects.
- There is no separate white text box, card, panel, or large text overlay.
- If any glass effect is used, it stays at 10-20% opacity and the artwork remains visible.
- No AI-generated text, numbers, dates, or logos appear.
- No repeated/tiled frame boxes appear.
- No horizontal divider or underline appears near the text or logo.

Recommended checks:

```bash
npm run build
npx tsc --noEmit --target ES2020 --module ESNext --moduleResolution bundler --allowImportingTsExtensions --strict --noImplicitAny false --skipLibCheck --lib ES2020,DOM api/story.ts
```
