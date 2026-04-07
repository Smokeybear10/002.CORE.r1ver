# Design System — R1VER

## Product Context
- **What this is:** GTO poker solver with cinematic scroll-driven web showcase
- **Who it's for:** Recruiters, poker researchers, AI/ML engineers evaluating the work
- **Space/industry:** Poker AI research tools (GTO Wizard, PokerStove, PioSOLVER)
- **Project type:** Cinematic data showcase + functional analysis tools

## Aesthetic Direction
- **Direction:** Dark Luxury / Poker Table
- **Decoration level:** Intentional. Subtle felt-green tints, card-back crosshatch patterns, suit symbols as dividers
- **Mood:** A private high-stakes table. Gold on black with whispers of casino felt. The aesthetic says "the solver sees everything" without trying to impress
- **Anti-patterns:** No gradients as decoration, no rounded buttons, no colored backgrounds outside the felt-green tint, no decorative elements that don't reference poker

## Typography
- **Display/Hero:** Instrument Serif — cinematic, editorial, unexpected for poker AI
- **Body:** Instrument Serif italic — chapter body, descriptions, subtitles
- **UI/Labels:** JetBrains Mono — uppercase, 9-10px, letter-spacing: 2-5px, gold or w40 opacity
- **Data/Tables:** JetBrains Mono — tabular-nums, font-variant-numeric for data readability
- **Code:** JetBrains Mono
- **Loading:** next/font/google with display: swap, CSS variables --font-serif and --font-mono
- **Scale:** Labels: 9-10px | Body: 18-20px | Chapter heading: clamp(42px, 5vw, 68px) | Hero: clamp(64px, 11vw, 160px) | Equity: clamp(140px, 22vw, 300px)

## Color
- **Approach:** Monochrome gold + felt-green secondary
- **Gold:** `#c9a84c` — primary accent, data values, active states
- **Gold bright:** `#e6c468` — hover highlights, emphasis
- **Gold opacity scale:** 50% dim, 15% faint, 5% ghost (backgrounds, tracks)
- **Felt green:** `#1a3a2a` — very subtle, 4-8% opacity, references the poker table
- **Background:** `#000000` true black
- **Surface:** `#050505` panels, cards
- **White opacity scale:** 80%, 60%, 40%, 20%, 10% for text hierarchy
- **No semantic colors.** No red/green/blue. Gold or absence of gold
- **Dark mode:** This IS dark mode. No light mode

## Poker Theming
- **Suit symbols:** ♠ ♥ ♦ ♣ as section dividers (11px, gold-faint, centered on border)
- **Felt-green tint:** radial-gradient ellipse at section tops, 4-8% opacity
- **Card-back pattern:** 45deg repeating crosshatch at 1.5% gold opacity on panels
- **Gold top-line:** gradient left-to-right on panels (transparent → gold-dim → transparent)
- **Board cards:** felt-green tinted selection state, green-gold gradient background
- **Active timeline dot:** chipPulse animation (box-shadow oscillation)

## Spacing
- **Base unit:** 4px
- **Density:** Spacious for chapters, comfortable for tool sections
- **Content max-width:** 1280px (chapters/tools), 900px hero-content, 720px query CTA
- **Section padding:** 160px vertical, 120px left (clears scroll progress), 64px right
- **Letter-spacing on labels:** 2-5px (uppercase mono), 6px (hero eyebrow)

## Layout
- **Hero:** 400vh sticky scroll, 3 phases (title → hand → equity), full-viewport canvas
- **Chapters:** 200vh sticky scroll, 2-column grid (text + viz), 80px gap
- **Tool sections:** static, grid layouts (explorer: 1fr 420px, strategy: 320px 1fr)
- **Query CTA:** centered, max-width 720px
- **No nav bar.** Fixed wordmark top-left, telemetry top-right, scroll progress left

## Motion
- **Approach:** Expressive. Scroll-driven via Lenis + GSAP ScrollTrigger
- **Smooth scroll:** Lenis duration 1.2, exponential easing, wheelMultiplier 0.8
- **Hero phases:** opacity crossfade driven by scroll progress (0-0.3, 0.3-0.6, 0.6-1)
- **Entrance animations:** gsap.from with y:60 opacity:0, staggered 80ms for groups
- **Hero entrance:** blur-to-sharp + translateY, 1.2s, staggered 0.3s delays
- **Card hover:** scale(1.08) + box-shadow glow, 0.2s cubic-bezier
- **CTA hover:** translateY(-2px) + inset glow, 0.35s
- **Timeline active:** chipPulse keyframe (box-shadow oscillation, 2s infinite)
- **Distribution SVG:** stroke-dashoffset draw on scroll, area opacity fade
- **Cluster map:** progressive dot reveal on scroll, "you are here" ping

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-04 | Obsidian theme selected | Chosen from 6 design variants via /design-shotgun |
| 2026-04-04 | Monochrome gold palette | Single color at varying opacities creates coherence |
| 2026-04-05 | Instrument Serif + JetBrains Mono | Replaced Georgia. Cinematic editorial serif pairs with technical mono |
| 2026-04-05 | Lenis + GSAP scroll system | Smooth scroll with ScrollTrigger for cinematic pacing |
| 2026-04-06 | Felt-green secondary color | Subtle poker table reference, 4-8% opacity on tool sections |
| 2026-04-06 | Suit symbol dividers | ♠♥♦♣ as section separators, poker identity without being heavy |
| 2026-04-06 | Card-back crosshatch on panels | Repeating 45deg lines at 1.5% opacity, references card backs |
| 2026-04-06 | No light mode | The darkness is the aesthetic. A light mode would be a different product |
