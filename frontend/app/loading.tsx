import PageLoader from '@/components/PageLoader';

// Root route-transition fallback. Segments with their own loading.tsx
// (products, product detail) keep their skeletons; everything else shows this.
export default function Loading() {
  return <PageLoader />;
}
