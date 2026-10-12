import HomeHeroManager from '@/features/admin/components/HomeHeroManager';

// Admin gate lives in app/admin/layout.tsx; this route stays thin.
export default function AdminHomePage() {
  return <HomeHeroManager />;
}
