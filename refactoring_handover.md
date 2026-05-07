# Web UI Refactoring - Progress Handover
> **Last Updated:** 2026-01-29
> **Status:** Phase 1 Completed / Phase 2 Pending

This document summarizes the current progress of the Web UI Refactoring (Task-Driven Growth Model) and includes the analysis and next steps to resume work.

---

## 1. Core Objective
Refactor the web application to a **"Task-Driven"** interface, focusing on:
1.  **Clearer Focus**: "Today's Tasks" vs "Everything else".
2.  **Unified Flow**: Single submission entry point for all content types.
3.  **Modern Aesthetics**: Desktop-optimized layout and theming.

---

## 2. Current Progress (Phase 1: Home & Theme)

### ✅ Completed Items
1.  **Theme System Architecture**:
    -   Created `config/themes.js`: Defined "Classic Blue" (current) and "Tech Blue" (new) themes.
    -   Created `stores/theme.js`: Pinia store for managing theme state and CSS variables.
    -   Updated `App.vue`: Wired up dynamic theme injection.
2.  **New Home Page Implementation**:
    -   Created `views/HomeNew.vue`: The new task-driven dashboard.
    -   **Components Created**:
        -   `TaskCard.vue`: Displays tasks like Diary/Math with status (Pending/Approved/Rejected).
        -   `PointsSummary.vue`: Sidebar widget for points and level progress.
        -   `RejectedAlert.vue`: Prominent alert for rejected submissions.
        -   `ActivityFeed.vue`: Recent activity timeline.
3.  **Routing & Deployment**:
    -   **Default Route (`/`)**: Switched to the NEW Home Page.
    -   **Backup Route (`/home-classic`)**: Preserved the old home page for safety.
    -   **Fixes**: Resolved icon dependency errors (`Musical` icon missing).

### 🚧 Works in Progress / Immediate Next Steps
-   **Theme Switcher UI**: The backend logic for themes is done, but there is currently no button in the UI to switch themes. Need to add this to `Profile.vue` or a settings drawer.

---

## 3. Remaining Implementation Plan

### Phase 2: Sidebar Navigation Refactor (Next Priority)
**Goal**: Replace the current chaotic navigation with a structured sidebar.
-   [ ] **Create `SidebarLayout.vue`**: A dedicated layout component for desktop/tablet.
-   [ ] **Refactor Navigation Items**:
    -   Group into: Core (Home, Submit), Learn (Books, Notes), Create (Works), Play (Games), Profile.
    -   Hide low-frequency items.
-   [ ] **Responsive Behavior**:
    -   Desktop: Fixed expanded.
    -   iPad: Collapsible icons.
    -   Mobile: Hidden / Bottom nav.

### Phase 3: Unified Submission Flow
**Goal**: One "Submit" button for everything.
-   [ ] **Create `views/SubmitTask.vue`**: The unified submission page.
-   [ ] **Dynamic Form Engine**: Render input fields based on task type (Text for Diary, Image for Math, etc.).
-   [ ] **AI Integration**: Move the "AI Analysis" toggle to this unified form.

### Phase 4: Global Achievements
**Goal**: Make achievements visible and exciting.
-   [ ] **Create `views/AchievementsNew.vue`**: Grid view of badges.
-   [ ] **Backend Integration**: Ensure all content types trigger achievement checks.

---

## 4. Original Analysis & Proposal Summary

### The "Silo" Problem
The previous system had separate "chimneys" for Diary, Homework, etc.
-   **Old Way**: Go to Diary -> Write. Go to Math -> Upload.
-   **New Way**: Go to "Submit" -> Choose Type -> Done.

### Use Case: "Student Start of Day"
1.  **Login**: See "Good Morning, Xiaoming".
2.  **Check Status**: "Today's Tasks" shows "Diary (Not Submitted)".
3.  **Action**: Click the "Diary" card.
4.  **Submit**: Write diary in the unified page, toggle "AI Analysis", submit.
5.  **Feedback**: See points +200 animation immediately.
6.  **Progress**: See "Streak: 5 Days" badge update.

---

## 5. How to Resume Work

1.  **Start the Server**:
    ```bash
    npm run dev
    ```
2.  **Verify Current State**:
    -   Open `http://localhost:12250/` (Should see New Home Page).
    -   Open `http://localhost:12250/home-classic` (Should see Old Home Page).
3.  **Pick Up Task**:
    -   Open `views/Profile.vue`.
    -   Add a theme selector UI that calls `themeStore.setTheme('tech')` or `themeStore.setTheme('classic')`.
    -   Then proceed to **Phase 2 (Sidebar)**.
