# Frontend Application

Next.js-based web application for the e-commerce platform storefront.

## Getting Started

### Installation

```bash
pnpm install
```

### Environment Setup

Create a `.env.local` file in the frontend directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=Ecommerce
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### Development Server

```bash
pnpm run dev
```

Open [http://localhost:8000](http://localhost:8000) in your browser to see the application.

The page auto-updates as you edit files.

## Building for Production

```bash
# Build the application
pnpm run build

# Start production server
pnpm run start
```

## Testing

```bash
# Run tests (if configured)
pnpm run test

# Run E2E tests (if configured)
pnpm run test:e2e
```

## Project Structure

```
app/
├── page.tsx              # Home page
├── layout.tsx            # Root layout
├── products/             # Product listing
├── product/[id]/         # Product detail
├── cart/                 # Shopping cart
├── checkout/             # Checkout flow
├── account/              # User account
└── admin/                # Admin dashboard (if applicable)

components/
├── ui/                   # Reusable UI components
├── product/              # Product-specific components
├── cart/                 # Cart components
└── layout/               # Layout components

lib/
├── api.ts               # API client
├── hooks/               # Custom React hooks
└── utils/               # Utility functions

styles/
└── globals.css          # Global styles (Tailwind CSS)
```

See `../docs/component-inventory.md` for the complete component catalog.

## Key Features

- **Responsive Design** - Mobile, tablet, and desktop optimized
- **Product Catalog** - Browse and search products
- **Shopping Cart** - Add/remove items, manage quantities
- **Checkout Flow** - Secure order placement
- **User Authentication** - Sign up and login
- **Account Management** - View orders and profile
- **Admin Dashboard** - Manage products and orders (admin users)

## Styling

This project uses **Tailwind CSS** for styling. Global styles are in `styles/globals.css`.

## API Integration

All API calls go through the API client in `lib/api.ts`. 

Example:
```typescript
import { api } from '@/lib/api';

const products = await api.getProducts();
const order = await api.createOrder(cartData);
```

See `../docs/api-contracts.md` for available endpoints.

## Performance

- Next.js image optimization with `next/image`
- Code splitting and lazy loading
- Static generation where possible
- Server-side rendering for dynamic content

## Deployment

Deploy to Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

Or deploy to any Node.js hosting platform.

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- Project Documentation: `../docs/`

## Support

For questions or issues, refer to the project documentation in `../docs/`.
