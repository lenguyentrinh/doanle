'use client';

import { useParams } from 'next/navigation';
import ProductForm from '@/features/admin/components/ProductForm';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return (
      <p className="text-body-md text-ink-muted">ID sản phẩm không hợp lệ.</p>
    );
  }

  return <ProductForm productId={productId} />;
}
