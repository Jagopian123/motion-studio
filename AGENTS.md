# AGENTS.md — Motion Studio

## Mission
Implement the local-rendering, static-web MVP described in PRD.md. Read PRD.md and IMPLEMENTATION_STATUS.md (if present) at the start of every session. Use example-story.json as the v1 contract fixture. Read the matching session in PROMPTS.md. Work on the requested milestone only; preserve existing working functionality.

## Non-negotiable
- React + TypeScript + Vite SPA. Cloudflare Pages static dist, no backend, VPS, AI API, database server, authentication, PWA/APK or paid rendering.
- Genuine 3D via Three.js/R3F/@remotion/three. One deterministic StoryComposition shared by Player and browser export. Render via @remotion/web-renderer, WebCodecs; use official API for installed versions. Pin ALL Remotion packages to exact identical versions and respect React/R3F peer dependencies.
- Animation based on Remotion frame/fps. No wall-clock state, unseeded randomness, or useFrame-driven animation. Use frame-based interpolation; scene-local frames and global audio frames are distinct.
- No eval, dynamic JS/TSX from user, remote URLs from JSON, API keys, or programmatic access to ChatGPT subscription. JSON is declarative, strictly validated, bounded, versioned. Keep guide/fixtures/schema in sync.
- Render local. Prefer simple geometry, bounded scene size, memory cleanup, no external asset/font CDN, no heavy postprocessing. Target 720p mobile first. Codec/hardware support must be detected and tested, not assumed. Never relabel WebM as MP4.
- Build mobile-first, functional controls, accessible responsive layout. Avoid unnecessary dependencies. Do not implement P1/P2 until P0 stable.

## Workflow every session
1. Inspect repo and previous status. Read official docs and installed types for APIs being used. Do not overwrite working files unnecessarily. Define acceptance checks for current milestone.
2. Implement code (not merely a plan). Keep modules small; tests for pure functions and error paths. Use npm and commit lockfile; do not commit secrets, node_modules, dist, generated large MP4.
3. Run relevant checks: `npm run typecheck`, `npm run lint`, `npm test` (non-watch), `npm run build`, e2e if relevant. Add scripts if missing. Repair failures you can reproduce. Do not disable tests just to pass.
4. Verify visually with browser if available. Test real short export if capability exists. Device tests cannot be fabricated; record NOT TESTED if no physical POCO F6 access. Report exact commands/results, capability-gated skips and limitations.
5. Update IMPLEMENTATION_STATUS.md: milestone, files changed, completed/remaining checks, actual test results, blockers and next milestone. Update README if run/deploy workflow changed. Finish with concise handoff and actionable device test steps.

## Documentation
Use stable, official Remotion docs and Vite/Cloudflare docs. See references in PRD. If installed API differs, choose supported stable solution and document the change. No invented APIs. A POC that cannot export 3D is a blocker to proceeding with complex UI.
