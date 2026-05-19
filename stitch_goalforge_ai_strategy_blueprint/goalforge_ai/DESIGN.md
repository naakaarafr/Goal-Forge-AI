---
name: GoalForge AI
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#3755c3'
  on-secondary: '#ffffff'
  secondary-container: '#708cfd'
  on-secondary-container: '#00217a'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c4ff'
  on-secondary-fixed: '#001453'
  on-secondary-fixed-variant: '#173bab'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Geist
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sidebar_width: 280px
  topbar_height: 64px
  container_max_width: 1440px
  gutter: 24px
  margin_mobile: 16px
  margin_desktop: 32px
  unit_xs: 4px
  unit_sm: 8px
  unit_md: 16px
  unit_lg: 24px
  unit_xl: 32px
---

## Brand & Style
The design system is built for high-velocity enterprise performance, blending the utility of a developer tool with the refined elegance of a strategic management platform. It evokes a sense of **precision, clarity, and intentionality**.

The aesthetic leans heavily into **Modern Minimalism** with a "Developer-First" polish inspired by high-end SaaS environments. It prioritizes data density without sacrificing whitespace, ensuring that complex goal hierarchies remain legible and actionable. Visual interest is generated through subtle micro-interactions, high-quality typography, and a refined use of light-refracting glassmorphism.

## Colors
The palette is rooted in a professional "Enterprise Blue" spectrum, communicating trust and stability. 

- **Primary & Secondary:** Used for core actions, branding, and active states. 
- **Neutral Scale:** The background utilizes a very cool-toned slate (#F8FAFC) to reduce eye strain, while text levels are strictly tiered between Primary (#0F172A) for headings and Secondary (#475569) for metadata and descriptions.
- **Semantic Colors:** Success, Warning, and Danger are reserved for status indicators and high-priority alerts to ensure data-first communication.

## Typography
This design system employs a dual-font strategy. **Geist** is used for headlines, labels, and technical data to provide a sharp, modern, and slightly "engineered" feel. **Inter** is utilized for body copy and long-form descriptions to ensure maximum readability and a systematic, neutral tone.

- **Weight Usage:** Stick to 400 (Regular) for body and 500/600 (Medium/SemiBold) for UI controls and headings.
- **Tracking:** Use tighter letter-spacing for large Geist headlines to maintain a cohesive, "Vercel-like" impact.

## Layout & Spacing
The layout follows a **Fixed-Fluid hybrid model**. 

1.  **Sidebar:** A fixed 280px sidebar persists on the left for primary navigation and workspace switching.
2.  **Topbar:** A 64px glassmorphic topbar houses the AI-powered "Global Command" search.
3.  **Main Content:** Uses a 12-column fluid grid. On desktop, the content area has a max-width of 1440px to prevent excessive line lengths in data tables and goal lists.
4.  **Responsive Behavior:** On tablet, the sidebar collapses into a hamburger menu. On mobile, margins reduce to 16px and the grid collapses to a single column.

## Elevation & Depth
Depth is handled through **Tonal Layering** and **Ambient Shadows** rather than heavy skeuomorphism.

- **Level 0 (Base):** Background (#F8FAFC).
- **Level 1 (Cards):** Surface (#FFFFFF) with a very soft, 4% opacity shadow (blur: 8px, y: 2px) and a subtle 1px border (#E2E8F0).
- **Level 2 (Overlays/Modals):** Surface (#FFFFFF) with a more pronounced 12% opacity shadow and a backdrop-filter (blur: 12px) on the obscured layer.
- **Glassmorphism:** The Topbar and floating AI panels use a semi-transparent surface (rgba(255, 255, 255, 0.8)) with a saturating backdrop filter to create a sense of being "above" the data stream.

## Shapes
The shape language is modern and approachable. 
- **Standard UI Elements:** Buttons, inputs, and small chips use a 0.5rem (8px) radius.
- **Main Containers:** Content cards and workspace panels use **rounded-2xl** (1rem or 16px) to create a distinct, polished "containerized" look.
- **Avatars:** Strictly circular to contrast against the geometric grid.

## Components
- **Buttons:** Primary buttons use a solid #2563EB fill with white text. Ghost buttons use Primary text and a transparent background that fills with a 5% slate tint on hover.
- **AI Search Input:** A prominent, wide input in the Topbar. It should feature a "Command + K" shortcut indicator and a subtle glowing focus ring (#60A5FA).
- **Cards:** White background, rounded-2xl, with a subtle 1px border (#E2E8F0). Cards should have a hover state that slightly increases shadow depth and shifts the Y-axis by -2px.
- **Status Chips:** Small, semi-transparent background versions of semantic colors (e.g., Success background at 10% opacity) with high-contrast text.
- **Progress Bars:** Thin (4px - 6px height) with rounded caps. Use the Primary blue for active progress and a light grey (#F1F5F9) for the track.
- **AI Insight Panels:** Differentiated by a very light gradient border (Primary to Accent) and a light blue-tinted background to signify AI-generated content.