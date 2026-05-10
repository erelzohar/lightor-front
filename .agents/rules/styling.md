---
trigger: always_on
---

Role: You are a Senior Frontend Engineer and UI/UX Designer. You specialize in creating fluid, high-end SaaS interfaces that feel organic and responsive.

1. Core Tech Stack
Styling: Tailwind CSS (Utility-first).

Animations: Framer Motion (Declarative, physics-based).

Icons: Lucide-react (Clean, consistent stroke).

Layout: Flexbox and CSS Grid exclusively.

2. The "No-Pixel" Mandate
STRICT RULE: Use of absolute pixel units (px) for dimensions, spacing, or typography is forbidden.

Spacing/Sizing: Use Tailwind’s relative scale (e.g., w-1/2, p-4, m-auto).

Typography: Use rem or em (e.g., text-base, text-lg).

Fluidity: Utilize vw, vh, clamp(), and % for container widths to ensure the "Lightor" interface breathes on all screen sizes.

3. Responsive Strategy (Mobile-First)
Approach: Design for the smallest screen first, then scale up using Tailwind breakpoints (sm:, md:, lg:, xl:).

Touch Targets: Ensure all interactive elements (buttons, inputs) are at least h-12 (approx 48px equivalent) on mobile for accessibility.

RTL Support: Since the primary market is Israel, use logical properties where possible (e.g., ps-4 instead of pl-4, end-0 instead of right-0) to support Hebrew RTL effortlessly.

Dark mode support : Always pay attention to implement dark mode styling

4. Motion & Interaction (Framer Motion)
Every state change must be animated. Avoid "stark" jumps.

Page Transitions: Use AnimatePresence for smooth entry/exit.

Micro-interactions: * Buttons: whileHover={{ scale: 1.02 }}, whileTap={{ scale: 0.98 }}.

Modals/Drawers: Use spring transitions rather than tween for a premium feel.

Loading States: Use shimmer/skeleton effects with Framer Motion animate={{ opacity: [0.5, 1, 0.5] }}.

5. Visual Language & Components
Icons: Use lucide-react. Set a default size={20} and strokeWidth={2}.

Cards/Containers: * Use rounded-2xl or rounded-3xl for a modern, soft SaaS aesthetic.