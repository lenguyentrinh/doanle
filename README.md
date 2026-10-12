# Ecommerce Platform

A full-stack e-commerce platform built with modern web technologies. This monorepo contains the backend API (NestJS) and the frontend application (Next.js).

## Project Structure

- **`backend/`** - NestJS REST API for products, categories, cart, orders, users, auth, admin dashboard, and inventory
- **`frontend/`** - Next.js (App Router) storefront and admin UI
- **`docker-compose.yml`** - Runs MySQL, backend, and frontend together

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm

### Installation

Each app manages its own dependencies with pnpm — install them separately:
```bash
cd backend && pnpm install
cd ../frontend && pnpm install
```

Set up environment variables:
- Backend: create `backend/.env` (see `backend/.env.example`)
- Frontend: create `frontend/.env.local` (see `frontend/.env.example`)
- Docker Compose: create `.env` at the repo root (see `.env.example`) — only needed to run everything via `docker compose up`

### Development

Run each service in its own terminal (or use `docker compose up` to run everything together):

**Backend:**
```bash
cd backend
pnpm run start:dev
```
Server runs on http://localhost:3001 (via `PORT` in `backend/.env`)

**Frontend:**
```bash
cd frontend
pnpm run dev
```
App runs on http://localhost:8000

Database migrations (run from `backend/`):
```bash
pnpm run migration:run
```

## Technology Stack

**Backend (`backend/`):**
- NestJS (TypeScript framework)
- MySQL + TypeORM
- JWT authentication (access + refresh tokens)
- Nodemailer (SMTP) for transactional email (OTP, order confirmation, status updates)
- Cloudinary for product image storage
- Swagger (`/api`) in non-production environments

**Frontend (`frontend/`):**
- Next.js 16 (App Router, React 19)
- TypeScript
- Redux Toolkit for global state
- React Hook Form + Zod for forms/validation
- Tailwind CSS

## Key Features

- User authentication and authorization (JWT access/refresh tokens)
- Product catalog with categories, search, and filtering
- Shopping cart and checkout
- Order placement, history, and status tracking (with email notifications)
- Inventory tracking
- Admin dashboard (products, categories, orders, users)
- Health checks for the backend and its SMTP connection

## Contributing

Match the existing conventions in each app (`backend/`, `frontend/`) when adding code — see each app's own `README.md` for app-specific notes.

## License

Proprietary - All rights reserved
