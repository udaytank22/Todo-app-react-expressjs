# AI Task & Email Inquiry Manager

A complete, premium web application built for task and inquiry management. The platform imports client requests automatically from Microsoft Outlook (via Graph API), parses attachment formats (PDF invoices, Excel list sheets, and email bodies) using Gemini AI, structures extracted details, and organizes operations using Kanban drag-and-drop boards and grid list sheets with real-time Socket.IO notifications.

---

## Technical Stack
* **Frontend**: React.js, Vite, Tailwind CSS, React Router v6, Axios, `@hello-pangea/dnd` (Kanban drag-and-drop), `socket.io-client`, `Lucide React`
* **Backend**: Node.js, Express.js, PostgreSQL, Prisma ORM, Socket.IO, JWT Authentication, `@google/generative-ai`
* **File Parsers**: `pdf-parse`, `xlsx` (SheetJS)

---

## Folder Structure
The workspace is split into two separate project directories:
```text
c:\Users\HP\Desktop\To-Do app\
├── backend/                  # Express APIs, Prisma schemas, Multer uploads
│   ├── prisma/
│   │   └── schema.prisma      # Prisma schema (PostgreSQL)
│   ├── src/
│   │   ├── controllers/       # Route handlers
│   │   ├── middleware/        # JWT auth, uploads validator
│   │   ├── routes/            # Express routers
│   │   └── services/          # Gemini AI, Outlook Graph, Socket.io
│   └── package.json
└── frontend/                 # Vite React client app, glassmorphic layout
    ├── src/
    │   ├── components/        # Centralized UI Commons, Sidebar, Navbar
    │   ├── context/           # Auth and Theme handlers
    │   ├── pages/             # Dashboard, Kanban, List, Details
    │   └── App.jsx            # Routing and Socket toast listeners
    └── package.json
```

---

## Backend Installation & Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Verify dependencies**:
   Dependencies have been pre-installed. If you need to re-install:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend` root matching the template below:
   ```env
   PORT=5001
   DATABASE_URL="postgresql://postgres:password@localhost:5432/inquiry_db?schema=public"
   JWT_SECRET="generate_a_secure_secret_key"
   GEMINI_API_KEY="your_google_gemini_api_key"

   # Keep DEMO_MODE=true to simulate incoming emails and parse them without Azure setup.
   # Set to false to connect to Microsoft Graph API.
   DEMO_MODE=true

   # Microsoft Graph API credentials (only needed if DEMO_MODE=false)
   MICROSOFT_CLIENT_ID=""
   MICROSOFT_CLIENT_SECRET=""
   MICROSOFT_TENANT_ID="common"
   MICROSOFT_REDIRECT_URI="http://localhost:5001/api/emails/callback"
   ```

4. **Initialize Database Schema & Client**:
   Verify PostgreSQL is running and your `DATABASE_URL` is active, then run:
   ```bash
   # Run migrations to build the tables in PostgreSQL
   npx prisma migrate dev --name init

   # Generate Prisma Client compilation
   npx prisma generate
   ```

5. **Seed Default Accounts**:
   Populate the database with three demo role accounts (`ADMIN`, `MANAGER`, `STAFF`):
   ```bash
   npm run seed
   ```
   * **Admin login**: `admin@manager.com` / `admin123`
   * **Manager login**: `manager@manager.com` / `manager123`
   * **Staff login**: `staff@manager.com` / `staff123`

6. **Start Backend Server**:
   ```bash
   # Production mode
   npm start

   # Development hot-reload mode
   npm run dev
   ```
   The backend server runs on `http://localhost:5001`.

---

## Frontend Installation & Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd ../frontend
   ```

2. **Verify dependencies**:
   Dependencies have been pre-installed. If you need to re-install:
   ```bash
   npm install
   ```

3. **Vite Development Proxy**:
   The Vite config (`vite.config.js`) is configured to proxy `/api`, `/socket.io`, and `/uploads` requests automatically to the backend server. No manual endpoints config is required.

4. **Start Frontend Client**:
   ```bash
   npm run dev
   ```
   The application client opens on `http://localhost:3000`.

---

## Verifying Main Workflows

1. **Access Login Screen**: Open `http://localhost:3000` and sign in using `admin@manager.com` with password `admin123`.
2. **Import Simulated Mail Inquiries**: In the top header bar, click **Simulate Email Fetch**. The backend imports mock emails:
   * Email with standard body text details.
   * Email with a parts order spreadsheet (`.xlsx` sheet).
   * Email with an installation requirements document (`.pdf` file).
   * Email containing external platform support tickets (Jira / HubSpot links).
3. **Real-Time Toast Alerts**: Upon syncing, Socket.IO broadcasts a `new_inquiry` alert, popping up as a glassmorphic toast notification card in the bottom-right corner.
4. **Kanban Board**: Drag card cards to advance the status columns (optimistic state updates are stored in PostgreSQL).
5. **Excel Grid Table**: Go to the details page of the parts order inquiry (`INQ-1002`). Select the **Excel Data Grid** tab to see the parsed spreadsheet items structured inside an interactive HTML table grid.
6. **PDF Specification text logs**: Go to the technical specs details page (`INQ-1003`). Click the **PDF Specification** tab to review the text contents parsed out of the requirement attachment by the backend.
7. **Role Permissions & Theme Toggles**: Log in as a `STAFF` user to test access control restrictions, and toggle dark/light modes using the sun/moon button in the top navbar.
