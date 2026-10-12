import AuthLookbookManager from '@/features/admin/components/AuthLookbookManager';

// Admin gate lives in app/admin/layout.tsx; this route stays thin.
export default function AdminAuthLookbookPage() {
  return <AuthLookbookManager />;
}
