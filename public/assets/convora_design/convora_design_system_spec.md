# CONVORA — Master Visual Design System Specification
**Product:** CONVORA  
**Category:** AI Customer Messaging & Automation Platform for Online Merchants  
**Brand Promise:** *Every Conversation. Under Control.*  
**Primary Locales:** Arabic (RTL, Primary Authenticated UI) & French (LTR Option), with Latin / Numbers via Inter.

---

## 1. Brand Essence & Foundations

### Positioning
CONVORA gives e-commerce merchants superpowers over customer communication: organizing incoming multichannel messages, classifying buyer intent (pre-sale, order tracking, complaint, VIP lead), suggesting contextual AI replies, and closing lost checkouts.

### Design Principles
1. **Calm Precision (Inspired by Linear & Stripe):** Dense, utility-first UI without clutter. Every pixel and line has informational intent.
2. **Contextual Intelligence, Not Noise:** AI suggestions and intent tags assist unobtrusively; no generic AI sparkles or distracting robot gimmicks.
3. **Arabic-First Symmetry (RTL Native):** Natural visual flow from right to left with mirroring for navigation, feed hierarchy, message timestamps, and status chips.

---

## 2. Color System & Design Tokens

### Core Brand Palette
| Token Name | Hex Code | Role & Usage |
| :--- | :--- | :--- |
| `color-brand-deep-forest` | `#202C28` | Primary brand accent, primary CTA buttons, active sidebar selection, merchant reply bubble. |
| `color-brand-sage-green` | `#D9E5D4` | Soft tint for selected rows, secondary container backgrounds, active filter chips. |
| `color-brand-warm-ivory` | `#F8F7F2` | Global application canvas background, AI Copilot suggestion surfaces, preview panels. |
| `color-brand-white` | `#FFFFFF` | Core surface container (cards, active panels, inbound customer message bubbles). |
| `color-text-primary` | `#20231F` | High-contrast body text, headings, customer names, conversation previews. |
| `color-text-secondary` | `#737A74` | Metadata, timestamps, placeholders, channel badges, icon strokes. |
| `color-border-subtle` | `#E5E8E2` | Hairline dividers, card outlines, table borders, input borders. |
| `color-accent-gold` | `#B8A27A` | VIP customer indicators, AI confidence markers, order recovery conversion prompts. |

### Semantic Tokens
- **Success:** `#2E7D32` (Resolved, Payment Captured, Verified Order)
- **Warning / Pending:** `#D97706` (Awaiting Merchant, Cart Abandonment Expiring)
- **Error / Urgent:** `#DC2626` (Failed Payment, Return Escalation, SLA Breach)
- **Information / System:** `#3B82F6` (Shopify Webhook Sync, Instagram Direct Message)

---

## 3. Typography Scale & Multilingual Rules

### Font Families
- **Arabic UI:** `IBM Plex Sans Arabic`, `Noto Sans Arabic`, sans-serif
- **Latin & Numerical UI:** `Inter`, -apple-system, BlinkMacSystemFont, sans-serif

### Type Scale (Desktop Baseline)
| Style | Size | Line Height | Weight | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Display / Metric** | `28px` (`1.75rem`) | `34px` | SemiBold (600) | Analytics numbers, conversation velocity |
| **Heading 1 (H1)** | `20px` (`1.25rem`) | `28px` | SemiBold (600) | View titles (e.g., صندوق الوارد الموحد) |
| **Heading 2 (H2)** | `16px` (`1.0rem`) | `24px` | Medium (500) | Section titles, drawer headers, customer name |
| **Body Base** | `14px` (`0.875rem`)| `20px` | Regular (400) / Med (500) | Message copy, customer query text |
| **Body Small** | `12px` (`0.75rem`) | `16px` | Regular (400) | Metadata, timestamps, table cells, intent chips |
| **Micro / Tag** | `11px` (`0.6875rem`)| `14px` | Medium (500) | Status badges, keyboard shortcuts, counter badges |

---

## 4. Spacing, Radii & Grid System

- **Spacing Scale (8pt Grid with 4pt Micro-steps):**
  - `space-1`: `4px` (tag padding, chip spacing)
  - `space-2`: `8px` (button vertical padding, list item gaps)
  - `space-3`: `12px` (input padding, card inner compact padding)
  - `space-4`: `16px` (standard card padding, column gutters)
  - `space-6`: `24px` (section separation, drawer header padding)
  - `space-8`: `32px` (screen outer margin)

- **Border Radii:**
  - `radius-sm`: `4px` (tags, badge pills, keyboard shortcut badges)
  - `radius-md`: `8px` (inputs, buttons, message bubbles, dropdown items)
  - `radius-lg`: `12px` (flyout drawers, order summary cards, copilot boxes)
  - `radius-full`: `9999px` (avatar containers, circular quick-action buttons)

---

## 5. Component Specifications

### A. Buttons & Inputs
1. **Primary Button:** Deep Forest (`#202C28`) background, White (`#FFFFFF`) text, `8px` radius, hover with slight contrast tint (`#2C3D38`), 2px focus ring with `#D9E5D4` offset.
2. **Secondary Button:** White background with subtle `#E5E8E2` border, `#20231F` text, hover `#F8F7F2`.
3. **Ghost / Tertiary:** Transparent background, `#737A74` text, hover `#EFF5EE`.
4. **Input Field:** White container, 36px height (compact density), 1px `#E5E8E2` border, active focus ring in `#202C28`, placeholder `#737A74`.

### B. Core Unified Inbox (3-Pane Architecture)
1. **Pane 1 (Navigation Sidebar - Rightmost in RTL):**
   - Collapsible 240px / 64px width.
   - Channel filters: All Channels, WhatsApp Business, Instagram DM, Shopify Chat, Email.
   - Smart Folders: AI Needs Review, High Intent Leads, Abandoned Cart Inquiries, Resolved.
2. **Pane 2 (Conversation List - Center):**
   - 340px fixed width.
   - Unread indicator: 6px `#202C28` dot.
   - Customer avatar + name + channel badge + relative timestamp (منذ 5 د).
   - Intent badge preview (e.g., `استفسار طلب #1042`, `سؤال مقاس`, `عميل VIP`).
3. **Pane 3 (Thread Canvas & Merchant Context - Leftmost in RTL):**
   - Customer Message Bubble: White background, 1px border `#E5E8E2`, right-aligned tail in RTL.
   - Merchant/Agent Reply Bubble: Deep Forest background `#202C28`, white text.
   - **AI Suggestion Card:** Warm Ivory (`#F8F7F2`) background, subtle hairline border, with a discreet `#B8A27A` indicator. Includes 1-click **"إدراج الرد المقترح" (Insert Draft)** or **"تعديل بالذكاء الاصطناعي" (Refine)**.
   - Side Drawer: Shopify customer order history, lifetime spend, cart status, delivery address.

---

## 6. Language & RTL Guidelines
- **Direction:** `dir="rtl"` by default; typography strictly renders with correct right-to-left punctuation handling (question marks, numbers, currency symbols).
- **French Switcher:** Fluidly mirrors the 3-pane layout into standard `dir="ltr"` without disrupting typography line-heights or alignment.
- **Numbers:** Tabular figures (`font-variant-numeric: tabular-nums`) for currency (e.g., `450.00 ر.س` / `120.00 €`) and order IDs.
