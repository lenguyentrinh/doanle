# Ecommerce Platform

A full-stack e-commerce platform built with modern web technologies. This monorepo contains the backend API (NestJS) and the frontend application (Next.js).

## Project Structure

- **`backend/`** - NestJS REST API for products, categories, cart, orders, users, auth, admin dashboard, and inventory
- **`frontend/`** - Next.js (App Router) storefront and admin UI
- **`docker-compose.yml`** - Runs MongoDB (single-node replica set), backend, and frontend together

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

**MongoDB:** the backend needs a MongoDB **replica set** (orders, cart and refresh-token rotation use multi-document transactions). `docker compose up mongo` starts a single-node replica set (`rs0`) on port 27017. When running the backend on the host against that container, use `MONGODB_URI=mongodb://localhost:27017/ecommerce?directConnection=true` in `backend/.env`. Inside compose the backend uses `mongodb://mongo:27017/ecommerce?replicaSet=rs0` automatically.

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

Seed the catalogue (run from `backend/`; there are no migrations — MongoDB collections and indexes are created by Mongoose on startup):
```bash
pnpm seed        # default demo catalogue (idempotent, additive)
pnpm seed:oren   # Oren catalogue; replaces existing products (needs PRODUCT_IMAGE_BASE_URL=/images/products)
```

## Technology Stack

**Backend (`backend/`):**
- NestJS (TypeScript framework)
- MongoDB + Mongoose (`@nestjs/mongoose`); ids are ObjectId strings in the API
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
