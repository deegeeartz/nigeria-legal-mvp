# Wigally: Legal Lounge & Platform Refinements Plan

## Overview
Implemented key architectural and UX directives:
1. **Intuitive Login & Sign Up Positioning**: Unauthenticated visitors are guided intuitively with prominent header & mobile bottom tab bar entries, dual-tab switchers at the top of `/login` and `/signup` (with role guidance for Client vs Lawyer), and non-intrusive guest invitation banners in `/community`.
2. **Text-Based Chat Discussions Forum**: The Legal Lounge (`/community`) is strictly a written deliberation forum. Live audio rooms, on-mic broadcasting, and voice conversation interfaces have been removed in favor of structured text Q&A threads and asynchronous counsel deliberations.
3. **In-App Video Conferencing Put On Hold**: Video call triggers (including Jitsi links) have been suspended with explicit "Video Room: On Hold" designations, prioritizing secure case messaging, structured intake, and confidential document reviews.

---

## Completed Implementations

### 1. Intuitive Login & Sign Up Positioning
- **Navigation (`/src/components/Navigation.js`)**:
  - **Desktop**: Added dual "Sign In" and high-contrast "Join Free" action buttons with a "Not a member?" indicator.
  - **Mobile Header**: Direct "Sign In" and "Join" actions are accessible without opening menus.
  - **Mobile Bottom Navigation**: When not authenticated, provides an intuitive "Sign In" and "Join Free" bottom bar item so mobile visitors can access auth instantly.
- **Login Pages (`/src/app/login/page.js` & `/src/app/login/[role]/page.js`)**:
  - Integrated a dual-tab header at the very top: `[ Sign In (Active) ]` and `[ New Member? Sign Up ]`.
  - Prominent "Not a member yet?" callout banner with direct role links.
  - Intuitive role toggle (Client Portal vs Lawyer Portal) and one-click Google Sign-In.
- **Signup Pages (`/src/app/signup/page.js` & `/src/app/signup/[role]/page.js`)**:
  - Integrated matching dual-tab header: `[ Already a Member? Sign In ]` and `[ Create Account (Active) ]`.
  - Existing member sign-in callout banner.
  - Role switcher and Google Sign-Up.
- **Community Non-Member Notice (`/src/app/community/page.js`)**:
  - Unauthenticated guests see a welcoming banner inviting them to sign up free or sign in.

### 2. Legal Lounge: Chat & Discussions Forum Only
- **`src/components/community/AmaBanner.js`**:
  - Removed all live audio room artifacts (`Mic` icon, `Radio`, "on mic", "listeners count").
  - Converted into **Featured Counsel Text AMA Forum**, highlighting active lawyers answering questions in text and allowing members to drop questions into the text thread.
  - Explicit badge: `"Chat & Discussions Only"`.
- **`src/app/community/page.js`**:
  - Updated tabs to emphasize text deliberation: `"💬 Lounge Discussions"`, `"📝 Counsel Text AMAs (Text Q&A)"`, `"🗳️ Dilemma Polls"`, `"📖 Survival Playbooks"`.
  - Added Lounge Etiquette Rule 4: *"Chat Discussions Only: All deliberations take place via written text threads. Live audio and voice conversations are not enabled."*
- **`src/lib/communityData.js` & `src/app/page.js`**:
  - Replaced audio terminology with text forum and Q&A discussion thread metadata.

### 3. In-App Video Conferencing Put On Hold
- **Client & Lawyer Dashboard (`/src/app/dashboard/page.js`)**:
  - Removed direct external video room links.
  - Added `"Video Room: On Hold"` badge and clear notification: *"In-app video conferencing is currently on hold. Consultations proceed via confidential case chat, document reviews, and verified intake."*
  - Prominently surfaced `"Case Chat & Docs"` as the primary consultation action.
- **Consultation Booking Flow (`/src/app/book/[lawyerId]/page.js`)**:
  - Added format notice: *"Consultation Format: Secure Case Chat & Document Review. In-app video conferencing is currently on hold."*
  - Updated post-booking confirmation message.
- **Consultation API (`/src/app/api/consultations/route.js`)**:
  - Set `video_status: "on_hold"` and consultation channel to `"secure_case_chat_and_documents"`.

---

## Verification
- Clean build verified via `compile_applet` (Next.js production build succeeded).
- Verified endpoints and pages with `curl` (`/community`, `/login`, `/signup`, `/api/community`).
