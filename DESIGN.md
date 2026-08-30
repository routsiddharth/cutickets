---
name: Morningside Tickets
description: A warm, restrained marketplace interface for verified campus ticket exchange.
colors:
  paper: "#FBFAF7"
  surface: "#FFFFFF"
  ink: "#14233D"
  muted: "#5C6B82"
  line: "#E7E2D8"
  columbia: "#5B8FB9"
  columbia-soft: "#E8F0F7"
  columbia-deep: "#3D6E97"
  seller: "#1F7A63"
  seller-soft: "#E6F2ED"
  buyer: "#A8651A"
  buyer-soft: "#F7ECDB"
typography:
  display:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1.05
  headline:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
    lineHeight: 1.25
  title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1.25
  body:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Public Sans, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: "0.12em"
rounded:
  xs: "4px"
  sm: "6px"
  control: "8px"
  container: "12px"
  panel: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  3xl: "28px"
  4xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-accent:
    backgroundColor: "{colors.columbia}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-seller:
    backgroundColor: "{colors.seller}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.container}"
    padding: "16px"
  avatar-fallback:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.surface}"
    typography: "{typography.body}"
    rounded: "{rounded.full}"
    size: "42px"
---

# Design System: Morningside Tickets

## Overview

**Creative North Star: "The Campus Ticket Board"**

Morningside Tickets feels like a trusted notice board translated into a precise digital marketplace: warm paper underfoot, crisp white working surfaces, Columbia blue for orientation, and seller green for supply-side action. Newsreader supplies an editorial, collegiate voice at moments of hierarchy; Public Sans keeps every transaction, label, and compact row direct and legible.

The system is restrained, flat, and operational. Information is organized with simple rules, dividers, and compact list rows rather than decorative dashboard furniture. Brand character comes from the type pairing, the warm-and-navy palette, and sparse semantic color—not gradients, glass effects, oversized metric cards, or ornamental chrome.

**Key Characteristics:**

- Warm paper canvas with white working surfaces and navy text.
- Editorial display type paired with compact, practical sans-serif copy.
- Border-led structure, quiet density, and row-based marketplace patterns.
- Columbia blue for navigation and focus; seller green for selling and availability.
- Restrained 8–12px control and container radii, with 16px reserved for larger panels.

## Colors

The palette combines collegiate navy and Columbia blue with warm paper neutrals, then reserves green and amber for marketplace roles.

### Primary

- **Campus Ink:** The default text color, strongest action fill, avatar fallback, and dark branded field.
- **Columbia Blue:** Search and administrative actions, focus outlines, and selective interactive emphasis.
- **Deep Columbia:** Links, active navigation indicators, and notification markers that need stronger contrast.
- **Columbia Wash:** A quiet state background for unread or selected rows.

### Secondary

- **Seller Green:** Selling actions, availability counts, and successful marketplace states.
- **Seller Wash:** A low-emphasis seller-tinted surface when a filled action would be too strong.
- **Buyer Amber:** Buying labels in history and other explicit buyer-side distinctions.
- **Buyer Wash:** A low-emphasis buyer-tinted surface.

### Neutral

- **Warm Paper:** The application canvas and recessed input or message background.
- **Surface White:** Cards, navigation, inputs, and contained work areas.
- **Slate Copy:** Secondary copy, metadata, labels, and de-emphasized controls.
- **Warm Rule:** Borders, row dividers, and structural separation.

### Named Rules

**The Semantic Accent Rule.** Columbia blue orients and focuses; seller green communicates supply-side action or availability; buyer amber appears only when a buyer/seller distinction is explicit.

**The Paper-and-Ink Rule.** Most of every screen remains warm paper, white, and navy. Accent colors are signals, not surface decoration.

## Typography

**Display Font:** Newsreader (with Georgia and serif fallbacks)  
**Body Font:** Public Sans (with system-ui and sans-serif fallbacks)

**Character:** Newsreader brings an editorial campus tone without making the marketplace feel ceremonial. Public Sans is deliberately neutral and compact, supporting scanning, forms, prices, dates, and account details.

### Hierarchy

- **Display** (regular, 3rem, 1.05): Reserved for the landing statement and rare top-level brand moments.
- **Headline** (regular, 2.25rem, 1.25): Large event titles at wider breakpoints.
- **Title** (regular, 1.5rem, 1.25): Section titles, empty-state headings, and ordinary screen subheads.
- **Body** (regular, 0.875rem, 1.5): Default operational copy and metadata; medium weight marks names, prices, and actions.
- **Label** (medium, 0.6875rem, 0.12em tracking): Tiny uppercase eyebrows and form labels.

Prices and quantities use tabular figures. Common screen headings use Newsreader around 1.875rem, while marketplace rows stay primarily in Public Sans at 0.75–0.875rem.

### Named Rules

**The Two-Voice Rule.** Use Newsreader for hierarchy and human warmth, never for dense controls or explanatory copy; use Public Sans everywhere users compare, enter, or act on information.

**The Quiet Label Rule.** Uppercase tracking belongs only to short 11px labels. Do not turn navigation, buttons, or body copy into all-caps display language.

## Layout

The application uses centered single-column work areas: a broad shell capped at 64rem for navigation, event browsing, and administration, and a focused 48rem column for event, deal, and profile tasks. Horizontal page padding is 20px on small screens and 28px from the small breakpoint upward; standard page padding is 32px vertically.

Spacing follows a compact 4px-derived rhythm, with 8–12px inside controls, 16–24px inside containers, and 24–32px between major sections. Marketplace collections favor stacked rows separated by 1px rules. Dense rows usually pair a flexible identity or event block with a compact right-aligned price/action block.

Administrative search and filter bars use the same compact controls as the marketplace. A simple search is a flexible field followed by Search and optional Clear actions; combined filters become a responsive grid with a constrained select and grouped actions. Administrative identity and trade records use the full 64rem shell so long names, emails, counts, dates, and prices can form stable reading columns without becoming a dashboard table.

At the 640px breakpoint, navigation moves from a secondary mobile row into the header, dense records gain explicit identity/detail and trailing-stat columns, filter layouts gain constrained columns, and page gutters widen. Before that breakpoint, record metadata flows below the primary identity and keeps its natural left alignment. At 1024px, the landing surface becomes a two-column composition; the authenticated marketplace remains centered and intentionally narrow.

The admin subnavigation remains one 44px-tall horizontal line aligned to the 64rem shell. It uses horizontal overflow on narrow screens rather than wrapping, shrinking, or hiding destinations.

**The Row-Before-Card Rule.** When presenting comparable marketplace records, start with a divided list or compact bordered row. Use a large standalone panel only when the content is a form, profile summary, empty state, or bounded conversation.

**The Admin Continuity Rule.** Administrative tools inherit the marketplace shell, controls, and row density. Do not introduce a separate dashboard grid or table aesthetic for back-office data.

**The Peer-Index Rule.** Distinct account classes receive peer destinations and dedicated indexes. Keep regular users and administrators visually separate instead of mixing privileged accounts into the ordinary user list with badges alone.

## Elevation & Depth

The authenticated product is flat by default and uses no shadows. Depth comes from warm-paper/white contrast, 1px borders, dividers, and occasional tinted state backgrounds. The elevated Google sign-in control is an isolated landing-page exception, using a soft medium shadow that strengthens on hover.

### Shadow Vocabulary

- **Sign-in lift** (`0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): Used only for the white Google sign-in button on the dark brand field.
- **Sign-in hover lift** (`0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`): Hover feedback for that same exceptional control.

### Named Rules

**The Flat-by-Default Rule.** Do not add shadows to marketplace cards, list rows, forms, navigation, or admin panels; use borders and surface contrast instead.

## Shapes

Controls are gently curved at 8px. Compact secondary controls may tighten to 6px; recurring cards and contained rows use 12px; larger profile, notification, onboarding, and administrative panels use 16px. Pills and circles are reserved for avatars, counters, status chips, and small numbered markers.

Borders are 1px Warm Rule strokes. Dashed borders distinguish empty states. Avoid fully rounded pill buttons for ordinary actions and avoid mixing several radii within one component unless geometry communicates a real state, as in chat-bubble tails.

Identity images are always circular and non-shrinking. Stored profile photos use edge-to-edge object cropping; missing or failed images fall back in place to Campus Ink with centered white initials, preserving the same size and geometry.

**The Identity-Fallback Rule.** A broken profile image never leaves an empty frame or browser error icon. Replace it with deterministic initials at the exact intended avatar size.

## Components

### Buttons

- **Shape:** Gently curved controls (8px), usually with 10px vertical and 16px horizontal padding.
- **Primary:** Campus Ink fill with white text and medium-weight Public Sans; use for decisive neutral actions such as reserve, confirm, save, and send.
- **Accent:** Columbia Blue fill with white text for search and administrative actions.
- **Seller:** Seller Green fill with white text for publishing listings and initiating a sale.
- **Hover / Focus:** Darken or reduce fill opacity subtly. All controls use the global 2px Columbia Blue focus outline with a 2px offset.
- **Secondary / Ghost:** White or transparent, with a Warm Rule border and Slate Copy text; hover shifts text toward Campus Ink and may strengthen the border.
- **Disabled:** Preserve the component shape and color role while reducing opacity to roughly 60%.

### Chips

- **Style:** Small status chips use a quiet tinted background, semantic dark text, 12px type, compact horizontal padding, and a full pill radius.
- **State:** Use only for terse roles or statuses; do not turn general navigation or filter controls into decorative pills.

### Cards / Containers

- **Corner Style:** Compact containers use 12px corners; larger bounded panels use 16px.
- **Background:** Surface White against Warm Paper.
- **Shadow Strategy:** Flat; rely on the surface change and border.
- **Border:** A single Warm Rule stroke, with divided rows where content repeats.
- **Internal Padding:** Usually 16–24px; dense list rows may use 12–16px vertically.

### Inputs / Fields

- **Style:** Surface White, Warm Rule border, 8px radius, and 10px vertical by 12px horizontal padding. Text areas keep the same language and do not resize unless the screen explicitly supports it.
- **Focus:** Columbia Blue outline globally; composed fields may shift the border to Columbia Blue and recessed fields may change from Warm Paper to white.
- **Error / Disabled:** Errors use direct red text below the field. Disabled actions reduce opacity without introducing a new surface treatment.

### Navigation

The primary header is sticky, white, and separated by one Warm Rule border. It uses the ticket mark plus a small Newsreader wordmark, followed by quiet 14px links that darken on hover. On small screens, core destinations move to a compact 44px secondary row; account and notification controls remain in the main header.

Administrative sections use a second flat white strip with a Warm Rule bottom border. Tabs are inline-flex, at least 44px tall, and separated by a 20px gap. Users and Admins are separate peer tabs rather than one mixed account index. The active tab uses medium Campus Ink text and a 2px Deep Columbia underline; inactive tabs use Slate Copy and darken on hover. The tab row is width-preserving and horizontally scrollable on narrow screens.

### Marketplace Rows

Comparable records are compact, left-to-right reading units. Identity or event context leads; quantity, availability, and price align to the trailing edge. When a record represents a person, a 42px avatar precedes the primary identity block. Repeated records share dividers instead of becoming independent floating cards. Price and count columns use tabular figures, and semantic green is limited to availability or selling.

Administrative identity rows add email and school context below the name, with trade/listing counts and join dates in a quieter trailing column from 640px upward. Ordinary user rows use 42px avatars; the dedicated admin index uses 48px avatars and may add a profile link to its trailing metadata. Trade records preserve the same hierarchy: event or participant relationship first, status and activity metadata second, and total plus unit-price math in a non-shrinking trailing block. On small screens, these columns stack or flow without truncating identity data.

### Avatars

- **Source:** Use the stored Google profile photo when present. Crop with `object-fit: cover`, keep it circular, and leave the image decorative when the adjacent text already names the person.
- **Fallback:** If the source is absent or fails to load, show deterministic initials on Campus Ink with white medium-to-semibold text. The fallback occupies the same box and never changes row alignment.
- **Scale:** Use 28px beside individual chat messages, 42px in dense user and deal rows, 48px for prominent counterpart or administrator rows, and 64px in an account-detail identity header. The primary navigation may use its established 44px account avatar.
- **Placement:** Keep avatars non-shrinking with a 12px gap to the identity block. Identity copy remains the accessible name; the image itself does not duplicate that label.

### Chat

The conversation is a white, bordered 12px container. Outgoing messages use Campus Ink with white text; incoming messages use Warm Paper with a Warm Rule border. Both use 12px bubbles with one tightened 4px lower corner to indicate direction. Each text message carries the sender’s 28px avatar at the outer edge of the bubble—left for incoming, right for outgoing—while system events remain centered, small, muted, and avatar-free.

## Do's and Don'ts

### Do:

- **Do** build screens from warm paper, white surfaces, navy text, and 1px warm borders.
- **Do** use compact divided rows for inventories, deals, notifications, and administrative records.
- **Do** keep controls in the established 8–12px radius range and larger panels at 16px.
- **Do** use Newsreader selectively for hierarchy and Public Sans for all operational content.
- **Do** align prices and quantities with tabular figures and stable trailing columns.
- **Do** preserve visible keyboard focus with the 2px Columbia Blue outline.
- **Do** keep admin tabs on one horizontally scrollable 44px line and admin records responsive without hiding identity or trade context.
- **Do** preserve one circular avatar geometry across photos and initials fallbacks, using the established size for each density level.

### Don't:

- **Don't** introduce generic dashboard grids, floating metric cards, oversized rounded tiles, or pill-heavy navigation.
- **Don't** add gradients, glassmorphism, ambient glows, decorative shadows, or ornamental background effects to authenticated marketplace surfaces.
- **Don't** use seller green or buyer amber as general-purpose brand accents.
- **Don't** create a new font, radius, or spacing language for an individual route.
- **Don't** trade compact marketplace scanability for spacious marketing-page composition inside the product.
