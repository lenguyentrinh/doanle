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
MONGODB_URI=mongodb://localhost:27017/ecommerce?directConnection=true
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

## Authentication

The API uses JWT (JSON Web Token) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

## Database

Uses MongoDB (via Mongoose / `@nestjs/mongoose`) for data persistence. The connection string comes from `MONGODB_URI` (falls back to `mongodb://localhost:27017/ecommerce`).

**A replica set is required.** Orders, cart and refresh-token rotation use multi-document transactions, which MongoDB only supports on a replica set (a single-node replica set is fine). `docker compose up mongo` from the repo root starts one (`rs0`). From the host use `?directConnection=true`; from inside the compose network use `?replicaSet=rs0`.

### Schemas and ids

- Schemas live next to their module in `entities/*.entity.ts` (`@Schema` classes) and are registered with `MongooseModule.forFeature(...)`.
- Every document is serialized with a shared transform (`src/common/database/schema-options.ts`): `_id` is exposed as a string `id` (ObjectId hex) and `_id` / `__v` never appear in responses.
- Route params use `ParseObjectIdPipe`; DTO fields use `@IsMongoId` (invalid ids return 400, unknown ids 404).
- Order items are embedded in the order document.

### No migrations

There is no migration step. Collections are created lazily and Mongoose builds the declared indexes (unique email, `(userId, productId)` cart rows, `(userId, idempotencyKey)` orders, ...) on startup.

### Seeding

```bash
pnpm seed        # default demo catalogue (idempotent)
pnpm seed:oren   # Oren catalogue (replaces existing products)
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
