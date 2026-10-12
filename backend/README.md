# Backend API

NestJS-based REST API server for the e-commerce platform.

## Getting Started

### Installation

```bash
pnpm install
```

### Environment Setup

Create a `.env` file in the backend directory with the following variables:

```env
DATABASE_URL=mysql://root:password@localhost:3306/ecommerce
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

### Running the Server

```bash
# Development mode with hot reload
pnpm run start:dev

# Production mode
pnpm run start:prod

# Watch mode
pnpm run start
```

The server will be available at `http://localhost:3001`

## Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov
```

## Project Structure

```
src/
├── modules/           # Feature modules
│   ├── auth/         # Authentication & authorization
│   ├── users/        # User management
│   ├── products/     # Product catalog
│   ├── orders/       # Order processing
│   └── ...
├── common/           # Shared utilities
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   └── interceptors/
├── database/         # Database configuration
└── main.ts          # Application entry point
```

## API Documentation

See `../docs/api-contracts.md` for complete API endpoint documentation and request/response schemas.

Key endpoints:
- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `GET /products` - List products
- `POST /orders` - Create order
- `GET /users/:id` - Get user details

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Database

Uses MySQL for data persistence. See `../docs/data-models.md` for schema details.

### Database Migrations

> **⚠️ IMPORTANT — Required Release Step**
>
> `migrationsRun` is intentionally set to `false`. Migrations are **never**
> run automatically on startup. You **must** run `pnpm migration:run` manually
> as part of every release that includes schema changes.
>
> If this step is skipped, the application will start but behave incorrectly
> (or crash) because the database schema does not match what the code expects.
> In production, `MigrationGuard` detects this and **terminates the process**
> before serving any traffic.

#### Release Checklist (schema change)

```bash
# 1. Check which migrations are pending
pnpm migration:show

# 2. Apply all pending migrations
pnpm migration:run

# 3. (CI gate) Verify no migrations are left — exits 1 if any are pending
pnpm migration:check

# 4. Deploy the new application version
```

#### Common Migration Commands

```bash
# Generate a new migration from entity diff
pnpm migration:generate src/database/migrations/<MigrationName>

# Apply all pending migrations
pnpm migration:run

# Roll back the last applied migration
pnpm migration:revert

# List applied / pending migrations
pnpm migration:show
```

## Building for Production

```bash
pnpm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Debugging

Enable debug logs with:
```bash
DEBUG=nest:* pnpm run start:dev
```

## Support

For questions or issues, refer to:
- NestJS Documentation: https://docs.nestjs.com
- Project Documentation: `../docs/`
