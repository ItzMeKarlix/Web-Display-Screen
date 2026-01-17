# Scrollable Display Board System

A dynamic, web-based digital signage application built with Astro, React, and Supabase. Features a public scrolling display board and a secure, password-protected admin settings panel.

## ✨ Features

- **📺 Public Display Board**: Auto-scrolling carousel of images and videos.
- **🔒 Secure Admin Panel**: 
  - Dedicated `/settings` route.
  - Password-protected access (customizable admin password).
  - First-time setup flow for defining security credentials.
- **⚙️ Content Management**:
  - Upload images and videos.
  - Drag-and-drop reordering.
  - Toggle visibility (Active/Inactive) per item.
  - Custom display durations for each item.
- **🛠️ System Settings**:
  - Configurable page refresh intervals.
  - Default duration settings.
- **🎨 Modern UI**: Built with Shadcn UI, Tailwind CSS, and polished with Toast notifications.

## 🚀 Tech Stack

- **Framework**: [Astro](https://astro.build)
- **Frontend**: React, Tailwind CSS
- **UI Components**: Shadcn UI, Lucide React
- **Backend/Database**: [Supabase](https://supabase.com) (PostgreSQL, Storage, Auth via RPC)

## 🛠️ Installation & Setup Guide

### 1. Prerequisites
- Node.js installed on your machine.
- A [Supabase](https://supabase.com) account.

### 2. Clone and Install
```bash
git clone <repository-url>
cd scrollable-announcements
npm install
```

### 3. Supabase Configuration

1.  **Create a new Supabase Project**.
2.  **Database Setup**:
    *   Navigate to the **SQL Editor** in your Supabase dashboard.
    *   Open the file `db/schema.sql` from this repository.
    *   Copy the entire content and paste it into the SQL Editor.
    *   Click **Run** to set up the tables (`announcements`, `settings`), security policies (RLS), and helper functions.

3.  **Get Credentials**:
    *   Go to **Project Settings** -> **API**.
    *   Copy the **Project URL** and **anon public key**.

### 4. Environment Variables

Create a `.env.local` file in the root of your project:

```bash
PUBLIC_SUPABASE_URL=your_project_url_here
PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 5. Running the Application

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:4321` to see the Display Board.
Visit `http://localhost:4321/settings` to access the Admin Panel.

## 📖 Usage Guide

### First-Time Setup
1.  Navigate to `/settings`.
2.  Since no password is set initially, you will see a "**Setup Security**" screen.
3.  Create your Admin Password.
4.  You will be automatically logged in.

### Managing Content
-   **Upload**: Click the "Upload Media" box to add images or videos.
-   **Ordering**: Drag and drop items to change their display order.
-   **Visibility**: Use the toggle switch to show/hide items from the main board without deleting them.
-   **Duration**: Click the pencil icon next to the duration (e.g., "10s") to change how long that specific item stays on screen.
-   **Titles**: Click the pencil icon next to the title to rename items.

### Changing Password
1.  Go to the **Security** tab in the Settings panel.
2.  Enter your current password and your new desired password.
3.  Click "Update Password".

### Logout
Click the **Logout** button (red icon) in the top header to end your session. You will be asked to confirm before logging out.
