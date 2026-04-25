# MUJinny — AI Assistant for Metropolitan University Students

> A production-grade AI chat platform built exclusively for MU students — featuring real-time streaming, multi-model support, code execution, PDF analysis, and an admin intelligence dashboard.

**Live:** [mujinny.com](https://mujinny.com)

---

## Overview

MUJinny is a full-stack AI assistant platform designed for the academic environment of Metropolitan University, Bangladesh. It combines large language model capabilities with university-specific context — providing students a powerful tool for studying, writing, research, and problem-solving within a familiar, secure environment.

The system enforces student identity through a structured registration flow (student ID, batch, section) and gives administrators full visibility into platform usage through a real-time analytics dashboard.

---

## Key Features

### AI Chat
- Multi-model support — `GPT-4o`, `GPT-4o mini`, `o3-mini`, and a smart `Auto` routing mode
- Real-time token streaming via Server-Sent Events
- Conversation history with persistent storage per user
- Markdown rendering with syntax-highlighted code blocks
- Anonymous guest mode with local session persistence

### Code Execution
- Sandboxed code runner supporting Python, JavaScript, C++, Java, and more
- Docker-isolated execution environment for security

### Document Intelligence
- PDF upload and analysis — ask questions directly about uploaded documents
- Multi-file context support within a single conversation

### Web & Research Tools
- Live web search integration
- Wikipedia knowledge retrieval
- Faculty information lookup via structured university data

### Admin Dashboard
- Real-time token usage analytics per user, per batch, per model
- Daily usage charts (14-day rolling window)
- Donut charts for batch-wise user distribution and token consumption
- User management with detailed profile modals
- Role-based access control (admin vs. student)

### Authentication & Identity
- Firebase Authentication — email/password with secure token flow
- Structured student registration — student ID (9-digit OTP-style input), batch, section, gender
- Backend user sync with MongoDB on every login

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS v4 |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | Firebase Authentication + Firebase Admin SDK |
| AI | OpenAI API (GPT-4o, o3-mini) with streaming |
| Code Runner | Docker-isolated sandbox |
| Deployment | Vercel (frontend) · Render (backend) |

---

## Architecture

```
mujinny.com                          mugpt-api.onrender.com
┌─────────────────────┐              ┌──────────────────────────┐
│  Next.js Frontend   │ ──HTTPS──▶  │   Express.js Backend     │
│                     │              │                          │
│  ├─ /chat           │              │  ├─ /api/chat (SSE)      │
│  ├─ /register       │              │  ├─ /api/conversations   │
│  ├─ /login          │              │  ├─ /api/auth            │
│  └─ /admin          │              │  ├─ /api/run             │
│                     │              │  ├─ /api/pdf             │
└─────────────────────┘              │  └─ /api/admin           │
                                     └──────────┬───────────────┘
                                                │
                                     ┌──────────▼───────────────┐
                                     │  MongoDB Atlas           │
                                     │  Firebase Auth           │
                                     │  OpenAI API              │
                                     └──────────────────────────┘
```

---

## Product Screenshots

| Chat Interface | Admin Dashboard |
|---|---|
| Multi-model AI chat with streaming | Real-time usage analytics |

---

## Engineering Highlights

- **Token accounting** — every AI response atomically increments a `totalTokens` counter on the User document via MongoDB `$inc`, enabling O(1) per-user token lookup without aggregation at read time
- **Streaming architecture** — responses are streamed token-by-token over SSE, with chunk buffering and graceful error recovery
- **Anonymous → authenticated transition** — guest sessions persist in localStorage; on login, server history loads seamlessly and local state is purged
- **Rate limiting** — per-model daily token quotas enforced server-side with per-user tracking
- **Admin security** — separate admin login with role verification middleware; all admin routes protected behind Firebase token + role check

---

## Repository Structure

```
├── frontend/          # Next.js application
│   └── src/
│       ├── app/       # App Router pages (chat, admin, login, register)
│       ├── components/# Reusable UI components
│       └── lib/       # Firebase client, auth helpers
│
└── backend/           # Express.js API server
    ├── routes/        # API route handlers
    ├── controllers/   # Business logic
    ├── models/        # Mongoose schemas
    ├── middleware/     # Auth, admin verification
    └── services/      # Code runner, external APIs
```

---

## Author

Built by **Abdur Rahman Mamun**
Metropolitan University, Bangladesh

[![Live Demo](https://img.shields.io/badge/Live-mujinny.com-blue?style=flat-square)](https://mujinny.com)
