# Design System — R1VER

## Product Context
- **What this is:** Superhuman poker AI solver with web-based analysis frontend
- **Who it's for:** Recruiters, poker researchers, AI/ML engineers evaluating the work
- **Space/industry:** Poker AI research tools (GTO Wizard, PokerStove, PioSOLVER)
- **Project type:** Data analysis dashboard / research showcase

## Aesthetic Direction
- **Direction:** Dark Luxury / Obsidian
- **Decoration level:** Minimal. Typography and space do all the work
- **Mood:** Confident restraint. A private club's custom software. One color, maximum impact. The aesthetic says "I don't need to impress you" which is itself impressive
- **Anti-patterns:** No gradients, no glow effects, no rounded buttons, no colored backgrounds, no decorative elements. If it doesn't serve the data, it doesn't exist

## Typography
- **Display/Hero:** Georgia, 'Times New Roman', serif — classic, authoritative, unexpected for a tech product (that's the point)
- **Body:** Georgia, serif — same as display for coherence, italic for subtitles/descriptions
- **UI/Labels:** Georgia, serif — uppercase, 10px, letter-spacing: 3px, 25% opacity gold
- **Data/Tables:** Geist Mono (monospace) — tabular-nums, clean data readability
- **Code:** Geist Mono
- **Loading:** Geist Mono via next/font/google, Georgia is system-installed
- **Scale:** Labels: 10px | Body: 13px | Subhead: 18px | H1: 32px | Hero number: 48px

## Color
- **Approach:** Monochrome. One color at varying opacities. That's it.
- **Gold:** `#c9a84c` — the only color. Used at 100% for primary data, values, active nav
- **Gold muted:** `rgba(201,168,76,0.5)` — secondary data, action bars
- **Gold subtle:** `rgba(201,168,76,0.3)` — labels, descriptions, inactive nav
- **Gold whisper:** `rgba(201,168,76,0.15)` — column headers, helper text, dividers
- **Gold ghost:** `rgba(201,168,76,0.08)` — active states, selected backgrounds
- **Gold trace:** `rgba(201,168,76,0.05)` — button backgrounds, bar chart tracks
- **Background:** `#050505` — true black
- **Surface:** `#0a0a0a` — cards, card faces, panels
- **No semantic colors.** No red/green/blue for success/error/info. Everything is gold or absence of gold
- **Dark mode:** This IS dark mode. No light mode

## Spacing
- **Base unit:** 4px
- **Density:** Spacious. Luxury = breathing room
- **Content max-width:** 900px
- **Page padding:** 40-48px horizontal, 48px vertical
- **Section dividers:** 28px margin, gradient fade: `linear-gradient(90deg, transparent, rgba(201,168,76,0.15), transparent)`
- **Letter-spacing on labels:** 3px (uppercase), 2px (data headers), 8px (logo)

## Layout
- **Approach:** Single column, centered, no sidebar (Explorer/Strategy pages)
- **Grid:** None. Vertical flow with gradient dividers between sections
- **Nav:** Full-width, 64px height, wide letter-spaced links, no borders except bottom
- **Cards (playing cards):** 44x62px, black bg (#0a0a0a), gold border, gold text, deep shadow (0 4px 16px rgba(0,0,0,0.5))
- **Card separator:** Vertical gold line (1px, 32px tall, 15% opacity) instead of pipe character
- **Inputs:** Transparent background, gold border at 10% opacity, gold text, no border-radius
- **Buttons:** Ghost style only. Gold border at 30%, transparent bg at 5%, gold text, letter-spacing: 2px

## Motion
- **Approach:** None. Static. Restraint is the aesthetic
- **Exception:** CSS transitions on hover states (opacity changes only, no transforms)

## Component Patterns

### Equity Display
Large serif number (48px) right-aligned opposite the cards. Decimal portion at 24px, 50% opacity. Bar is 1px tall, gold with 8px glow shadow.

### Histogram
Monochrome gold bars at three opacity tiers: 15% (low equity), 35% (mid), 100% (high). Bars with equity > 0.66 get a subtle 4px gold shadow. No rounded tops.

### Action Chart
All bars are gold at varying opacities. Active actions (Call, Raise, Shove) at 50%. Passive actions (Fold, Check) at 15%. Labels in italic Georgia. Percentage text in dark (#050505) on gold background.

### Sample Rows
No panel/card wrapper. Just a bottom border at 5% gold opacity. Cards + data inline. Cluster/equity/density labels in 10px uppercase with 15% opacity, 2px letter-spacing.

### Section Labels
10px, uppercase, letter-spacing: 3px, color at 25% gold opacity. These whisper, never shout.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-04-04 | Obsidian theme selected | Chosen from 6 design variants (Bloomberg Terminal, Clean Slate, Neon Noir, Poker Pro, Signal, Obsidian) via /design-shotgun |
| 2026-04-04 | Monochrome gold palette | Single color at varying opacities creates coherence without complexity. Antique gold (#c9a84c) signals sophistication without being flashy |
| 2026-04-04 | Georgia serif for all text | Unexpected for a tech product. Creates immediate visual distinction from every poker tool and SaaS dashboard |
| 2026-04-04 | No light mode | The darkness is the aesthetic. A light mode would require a fundamentally different design, not just inverted colors |
| 2026-04-04 | Black playing cards | Inverted from traditional white-face cards. Gold suit symbols on black. Matches the overall theme |
