# Personal Client Hunting Tool

A private, compliant workspace engineered for freelance website developers and small teams to discover opportunities, verify prospects' digital presence, collaborate without collisions, and track deals from discovery to contract.

---

## Key Features

1. **Assisted Deep-Link Search Hub**:
   - High-yield, pre-filtered search queries for **LinkedIn**, **X (Twitter)**, **Upwork**, **Facebook**, and **Instagram**.
   - Supports **English**, **Hindi**, and **Hinglish** intent keywords (e.g., *"website developer chahiye"*, *"website banwani hai"*, *"looking for web developer"*).
   - 100% compliant with platform Terms of Service (zero unauthorized scraping).

2. **Automated Two-Tier Deduplication**:
   - Tier 1: Exact matches against canonical domains (`apexclinic.in`), normalized phone numbers (E.164 `+91...`), and source URLs.
   - Automatically attaches new sources to existing leads rather than polluting the database.

3. **SSRF-Hardened Website Auditor**:
   - Safe, read-only scanner probing target websites.
   - Pre-flight DNS resolution validates IP addresses to strictly prohibit connections to internal networks, loopback (`127.0.0.1`), RFC 1918 private ranges, and cloud metadata (`169.254.169.254`).
   - Extracts SSL validity, mobile viewport configuration, page load latency, meta tags, and detected CMS tech.

4. **AI Lead Qualification & Outreach (Google Gemini)**:
   - Objectively scores leads (0–100) and categorizes them into `EXPLICIT_NEED`, `INFERRED_OPPORTUNITY`, or `SPECULATIVE`.
   - Generates contextual cold email and LinkedIn message drafts addressing the exact technical flaws discovered during the website audit.

5. **Follow-up Reminders & CRM**:
   - Kanban-style status pipeline (`NEW` → `QUALIFIED` → `CONTACTED` → `REPLIED` → `WON`).
   - Date-based follow-up reminders with overdue tracking.

6. **Pluggable Google Places API (New)**:
   - Pre-configured adapter with strict field masking to minimize quota costs.
   - Activates automatically once a `GOOGLE_PLACES_API_KEY` is added to `.env`.

---

## Project Structure

```
Hunter/
├── .env.example              # Configuration template
├── .gitignore
├── README.md
├── backend/                  # FastAPI Application
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py
│   │   ├── api/              # Auth, search, leads, audits, outreach, followups
│   │   ├── core/             # Security (JWT, bcrypt), config (Pydantic)
│   │   ├── db/               # SQLAlchemy 2.0 async engine & session
│   │   ├── models/           # PostgreSQL ORM models
│   │   ├── schemas/          # Pydantic validation schemas
│   │   └── services/         # Deduplication, SSRF auditor, Gemini AI, Adapters
│   └── migrations/           # Alembic database migrations
└── frontend/                 # React SPA (Vite + TypeScript + Tailwind CSS)
    ├── package.json
    ├── vite.config.ts
    └── src/
        ├── App.tsx
        ├── components/       # Navbar, modals, drawers
        ├── pages/            # Discover, Pipeline, FollowUps, Dashboard
        ├── services/         # Axios API client
        └── types/            # TypeScript interfaces
```

---

## Setup & Local Run Instructions

### 1. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure your environment
cp ../.env.example .env
# Edit .env and supply your Supabase connection string and Gemini API key

# Run database migrations
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/healthz`

### 2. Frontend Setup (React)

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
- Open `http://localhost:5173` in your browser.
