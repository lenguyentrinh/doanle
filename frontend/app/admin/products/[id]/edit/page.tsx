'use client';

import { useParams } from 'next/navigation';
import { isObjectId } from '@/lib/helpers';
import ProductForm from '@/features/admin/components/ProductForm';

export default function EditProductPage() {
  const params = useParams<{ id: string }>();
  const productId = params.id;

  if (!isObjectId(productId)) {
    return (
      <p className="text-body-md text-ink-muted">ID sản phẩm không hợp lệ.</p>
    );
  }

  return <ProductForm productId={productId} />;
}
