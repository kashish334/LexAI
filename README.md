# LexAI — AI-Powered Legal Document RAG Assistant

> Enterprise-grade legal intelligence platform. Upload contracts, ask questions in plain English, get answers with citations, detect risks automatically.

![LexAI](https://img.shields.io/badge/LexAI-Legal%20Intelligence-6366f1?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![Python](https://img.shields.io/badge/Python-3.12-3776AB?style=flat-square&logo=python)

---

## Features

| Feature | Description |
|---|---|
| 📄 **PDF/DOCX Upload** | Drag-and-drop upload with OCR support for scanned PDFs |
| 🧠 **RAG Pipeline** | LangChain + FAISS + Sentence Transformers for semantic search |
| 💬 **AI Chat** | Conversational Q&A with page-level citations |
| ⚠️ **Risk Analysis** | Auto-detect unlimited liability, auto-renewals, ambiguous clauses |
| 📋 **Clause Extraction** | Payment, termination, liability, NDA, renewal clauses |
| 🔍 **Semantic Search** | Cross-document vector search |
| 🔐 **JWT Auth** | Secure user registration + login |
| 📊 **Admin Dashboard** | User management + analytics |

---

## Tech Stack

### Backend
- **FastAPI** + **SQLAlchemy (async)** + **PostgreSQL**
- **LangChain** · **FAISS** · **Sentence Transformers** (all-MiniLM-L6-v2)
- **Google Gemini 2.5 flash** / **OpenAI GPT-4o** (configurable)
- **PyMuPDF** for PDF parsing · **python-docx** for DOCX
- **Redis** for caching · **slowapi** for rate limiting
- **JWT** authentication · **bcrypt** password hashing

### Frontend
- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** + **Framer Motion**
- **Zustand** state management · **Axios**
- **React Dropzone** · **React Markdown** · **Lucide Icons**

---

## Quick Start

### 1. Clone & configure environment

```bash
git clone https://github.com/youruser/lexai.git
cd lexai

# Backend
cp backend/.env.example backend/.env
# Edit backend/.env — set GOOGLE_API_KEY or OPENAI_API_KEY

# Frontend
cp frontend/.env.example frontend/.env.local
```

### 2. Docker (recommended)

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### 3. Manual setup

**Backend:**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Start PostgreSQL and Redis first, then:
uvicorn app.main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Project Structure

```
lexai/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # auth, contracts, chat, analysis, search, admin
│   │   ├── core/             # config, security, logging
│   │   ├── db/               # SQLAlchemy session
│   │   ├── models/           # ORM models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # document_service, ai_service, user_service
│   │   └── main.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router pages
│   │   │   ├── auth/         # login, register
│   │   │   ├── dashboard/    # main dashboard
│   │   │   ├── contracts/    # list + detail ([id])
│   │   │   ├── chat/         # AI chat interface
│   │   │   ├── search/       # semantic search
│   │   │   └── admin/        # admin dashboard
│   │   ├── components/       # Sidebar, AppLayout, UI components
│   │   ├── lib/              # api.ts (Axios client)
│   │   ├── store/            # Zustand auth store
│   │   └── types/            # TypeScript interfaces
│   └── package.json
│
├── docs/
│   └── schema.sql            # PostgreSQL schema
├── docker-compose.yml
└── README.md
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/contracts/upload` | Upload PDF/DOCX |
| GET | `/api/contracts/` | List user contracts |
| GET | `/api/contracts/{id}` | Contract detail |
| DELETE | `/api/contracts/{id}` | Delete contract |
| POST | `/api/chat/` | Send chat message |
| GET | `/api/chat/sessions` | Chat history |
| GET | `/api/chat/sessions/{id}/messages` | Session messages |
| GET | `/api/analysis/{id}/summary` | Contract summary |
| GET | `/api/analysis/{id}/risk` | Risk analysis |
| GET | `/api/analysis/{id}/clauses` | Extracted clauses |
| POST | `/api/search/` | Semantic search |
| GET | `/api/admin/stats` | Admin statistics |
| GET | `/api/admin/users` | User list |

---

## RAG Pipeline

```
PDF Upload → PyMuPDF Parse → Text Chunking (LangChain)
    → Sentence Transformers Embeddings → FAISS Index

Query → Embed Query → FAISS Similarity Search → Top-K Chunks
    → Build Context Prompt → Gemini/GPT-4o → Answer + Citations
```

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
# Set NEXT_PUBLIC_API_URL to your backend URL
```

### Backend → Railway / Render
```bash
# Set all environment variables in Railway/Render dashboard
# DATABASE_URL, REDIS_URL, SECRET_KEY, GOOGLE_API_KEY
# Deploy from GitHub or Docker image
```

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | ✅ | JWT signing key (min 32 chars) |
| `DATABASE_URL` | ✅ | PostgreSQL async URL |
| `GOOGLE_API_KEY` | ✅* | Google Gemini API key |
| `OPENAI_API_KEY` | ✅* | OpenAI API key (*one required) |
| `AI_PROVIDER` | ✅ | `google` or `openai` |
| `REDIS_URL` | ❌ | Redis URL for caching |
| `UPLOAD_DIR` | ❌ | File upload directory |
| `MAX_FILE_SIZE_MB` | ❌ | Max upload size (default 50) |

---
