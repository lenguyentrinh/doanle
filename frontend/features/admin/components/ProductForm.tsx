'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatDateVi, formatPrice } from '@/lib/helpers';
import { showToast } from '@/lib/toast';
import {
  getAdminProductByIdAPI,
  getAdminCategoriesAPI,
  createAdminProductAPI,
  updateAdminProductAPI,
  type AdminCategory,
} from '@/features/admin/services/adminAPI';
import { productSchema, type ProductFormValues } from '@/features/admin/validation/productSchemas';
import AdminSelect from '@/features/admin/components/AdminSelect';

const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
const MIN_IMAGES = 1;
const MAX_IMAGES = 5;

const EMPTY: ProductFormValues = {
  name: '',
  description: '',
  categoryId: '',
  price: 0,
  stockQuantity: 0,
  isActive: true,
  discountPercentage: undefined,
};

// Category-tint pairs for the store-preview card, cycled by a deterministic
// name hash — same pattern as the Products/Orders tables (§Tints).
const TINTS: { bg: string; ink: string }[] = [
  { bg: 'bg-sand', ink: 'text-clay' },
  { bg: 'bg-success-bg', ink: 'text-success' },
  { bg: 'bg-alert-bg', ink: 'text-alert' },
  { bg: 'bg-fill-dark', ink: 'text-ink-secondary' },
  { bg: 'bg-error-bg', ink: 'text-error-strong' },
  { bg: 'bg-fill', ink: 'text-ink-muted' },
];

function tintForCategory(category: string): { bg: string; ink: string } {
  let hash = 0;
  for (let i = 0; i < category.length; i++) hash = (hash * 31 + category.charCodeAt(i)) % 997;
  return TINTS[hash % TINTS.length];
}

interface ExistingImage {
  key: string;
  url: string;
}

interface ProductFormProps {
  /** Product id to edit; null/absent = create mode. */
  productId?: string | null;
}

function extractErrorMessage(err: unknown, fallback: string): string {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const response = (err as { response?: { data?: { message?: string } } }).response;
    if (typeof response?.data?.message === 'string') return response.data.message;
  }
  return fallback;
}

// Field error line — dot + message, matching the handoff's §Form validation
// spec (5px dot + text-body-sm text-error-strong, role="alert").
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <span role="alert" className="flex items-center gap-[7px] text-body-sm text-error-strong">
      <span aria-hidden="true" className="size-[5px] shrink-0 rounded-full bg-error-strong" />
      {message}
    </span>
  );
}

// Shared create/edit form (Story 5.2), mirroring AddressForm.tsx's exact
// shape: react-hook-form + zodResolver, hydrate-then-reset() in edit mode,
// disabled inputs until hydration resolves. Validation is untouched by the
// §Form redesign — productSchema stays the single source of truth.
export default function ProductForm({ productId = null }: ProductFormProps) {
  const router = useRouter();
  const isEditing = productId !== null;
  const [isLoading, setIsLoading] = useState(isEditing);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  const [categories, setCategories] = useState<AdminCategory[]>([]);

  const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  // Baseline image set for the sticky bar's "Hoàn tác" (edit mode) and the
  // dirty check below — read during render, so state, not a ref.
  const [loadedImages, setLoadedImages] = useState<ExistingImage[]>([]);
  // Baseline form values for "Hoàn tác" — only read inside its click handler
  // (never during render), so a ref is fine here.
  const loadedValuesRef = useRef<ProductFormValues>(EMPTY);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isSubmitting, isDirty, touchedFields },
  } = useForm<ProductFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY,
  });

  const values = useWatch({ control });

  useEffect(() => {
    getAdminCategoriesAPI({ limit: 100 })
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  // In edit mode, load the target product into the form.
  useEffect(() => {
    if (!isEditing) return;
    let active = true;
    getAdminProductByIdAPI(productId)
      .then((product) => {
        if (!active) return;
        const loaded: ProductFormValues = {
          name: product.name,
          description: product.description,
          categoryId: product.categoryId,
          price: product.price,
          stockQuantity: product.stockQuantity,
          isActive: product.isActive,
          discountPercentage: product.discountPercentage ?? undefined,
        };
        reset(loaded);
        loadedValuesRef.current = loaded;
        const images = product.imageKeys.map((key, i) => ({ key, url: product.imageUrls[i] }));
        setExistingImages(images);
        setLoadedImages(images);
        setUpdatedAt(product.updatedAt);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        showToast.error(extractErrorMessage(err, 'Không tải được sản phẩm'));
        setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [productId, isEditing, reset]);

  const onFilesChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';

    const accepted: File[] = [];
    for (const file of files) {
      if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
        showToast.error(`${file.name} không phải định dạng ảnh được hỗ trợ`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        showToast.error(`${file.name} vượt quá 5 MB`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length === 0) return;

    const totalAfter = existingImages.length + newFiles.length + accepted.length;
    if (totalAfter > MAX_IMAGES) {
      showToast.error(`Một sản phẩm chỉ có tối đa ${MAX_IMAGES} ảnh`);
      return;
    }
    setNewFiles((prev) => [...prev, ...accepted]);
  };

  const removeExistingImage = (key: string) => {
    setExistingImages((prev) => prev.filter((img) => img.key !== key));
  };

  const removeNewFile = (index: number) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ProductFormValues) => {
    const totalImages = existingImages.length + newFiles.length;
    if (totalImages < MIN_IMAGES) {
      showToast.error('Cần ít nhất một ảnh sản phẩm');
      return;
    }
    if (totalImages > MAX_IMAGES) {
      showToast.error(`Một sản phẩm chỉ có tối đa ${MAX_IMAGES} ảnh`);
      return;
    }

    try {
      if (isEditing) {
        await updateAdminProductAPI(productId, {
          ...data,
          newImages: newFiles,
          existingImageKeys: existingImages.map((img) => img.key),
        });
        showToast.success('Đã lưu sản phẩm');
      } else {
        await createAdminProductAPI({ ...data, newImages: newFiles });
        showToast.success('Đã tạo sản phẩm');
      }
      router.push('/admin/products');
    } catch (err: unknown) {
      showToast.error(extractErrorMessage(err, 'Không lưu được sản phẩm'));
    }
  };

  const handleReset = () => {
    if (isEditing) {
      reset(loadedValuesRef.current);
      setExistingImages(loadedImages);
      setNewFiles([]);
    } else {
      router.push('/admin/products');
    }
  };

  const totalImages = existingImages.length + newFiles.length;
  const canAddMoreImages = !isLoading && totalImages < MAX_IMAGES;
  const imagesDirty = newFiles.length > 0 || existingImages.length !== loadedImages.length;
  const dirty = isDirty || imagesDirty;

  const name = values.name ?? '';
  const description = values.description ?? '';
  const categoryId = values.categoryId ?? '';
  const price = values.price ?? 0;
  const stockQuantity = values.stockQuantity ?? 0;
  const isActive = values.isActive ?? true;
  const discountPercentage = values.discountPercentage ?? null;
  const finalPrice = discountPercentage ? price * (1 - discountPercentage / 100) : price;

  const category = categories.find((c) => c.id === categoryId);
  const previewTint = tintForCategory(category?.name ?? '');
  const displayName = name.trim() || 'Sản phẩm chưa có tên';

  const out = stockQuantity === 0;
  const low = stockQuantity > 0 && stockQuantity < 5;
  const stockChip = out
    ? { label: 'Hết hàng — cần nhập', bg: 'bg-error-bg', fg: 'text-error-strong' }
    : low
      ? { label: 'Sắp hết — dưới 5', bg: 'bg-alert-bg', fg: 'text-alert' }
      : { label: 'Đủ hàng', bg: 'bg-success-bg', fg: 'text-success' };

  // Approximate — stockQuantity defaults to 0, so "filled" also accepts an
  // explicit touch (blur) rather than requiring a non-zero value.
  const completionFields = [
    name.trim().length > 0,
    description.trim().length > 0,
    categoryId.length > 0,
    price > 0,
    stockQuantity > 0 || Boolean(touchedFields.stockQuantity),
    totalImages > 0,
  ];
  const completionPct = Math.round(
    (completionFields.filter(Boolean).length / completionFields.length) * 100,
  );

  return (
    <div className="mx-auto flex w-full flex-col gap-5">
      <Link
        href="/admin/products"
        className="inline-flex min-h-10 w-fit items-center gap-2 text-body-sm text-ink-muted transition-all duration-200 hover:gap-3 hover:text-accent"
      >
        <span aria-hidden="true">←</span> Danh sách sản phẩm
      </Link>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-4 motion-safe:animate-[rise_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-label-xs text-accent">{isEditing ? 'Sửa sản phẩm' : 'Sản phẩm mới'}</span>
              {isEditing && (
                <span className="rounded-full bg-fill px-2.5 py-[3px] text-[11px] tabular-nums text-ink-secondary">
                  ID {productId}
                </span>
              )}
              <span
                className={`rounded-full px-2.5 py-[3px] text-[10px] font-semibold uppercase tracking-[.18em] ${
                  isActive ? 'bg-success-bg text-success' : 'bg-fill text-ink-muted'
                }`}
              >
                {isActive ? 'Đang bán' : 'Ngừng bán'}
              </span>
            </div>
            <h1 className="break-words font-display text-[clamp(28px,3.2vw,42px)] leading-[1.06] tracking-[-0.02em] text-ink">
              {displayName}
            </h1>
          </div>

          {isEditing ? (
            updatedAt && (
              <span className="text-caption text-ink-muted">
                Cập nhật lần cuối {formatDateVi(new Date(updatedAt))}
              </span>
            )
          ) : (
            <div className="flex items-center gap-2.5 rounded-full border border-line px-3.5 py-2 max-sm:w-full max-sm:justify-center">
              <span className="text-caption text-ink-secondary">Hoàn thành</span>
              <span className="relative h-[3px] w-[72px] rounded-full bg-line">
                <span
                  className="absolute top-0 left-0 h-full rounded-full bg-accent transition-[width] duration-400 ease-[cubic-bezier(0.16,1,0.3,1)]"
                  style={{ width: `${completionPct}%` }}
                />
              </span>
              <span className="font-display text-[15px] tabular-nums text-ink">{completionPct}%</span>
            </div>
          )}
        </div>

        <div
          className="grid grid-cols-1 items-start gap-4 motion-safe:animate-[rise_0.6s_cubic-bezier(0.16,1,0.3,1)_both] lg:grid-cols-[minmax(0,1fr)_340px]"
          style={{ animationDelay: '0.06s' }}
        >
          <div className="flex min-w-0 flex-col gap-4">
            {/* Not overflow-hidden: it would clip the category listbox panel. */}
            <div className="rounded-[16px] border border-line bg-white">
              <div className="flex items-center justify-between gap-3 rounded-t-[15px] border-b border-line bg-fill px-4 py-3.5 sm:px-[22px]">
                <h2 className="text-label-xs text-ink-secondary">Thông tin</h2>
                <span className="font-display text-[13px] italic text-ink-muted">phần khách hàng đọc</span>
              </div>
              <div className="flex flex-col gap-[22px] p-4 sm:p-[22px]">
                <div className="flex flex-col gap-[7px]">
                  <label htmlFor="name" className="text-label-xs text-ink-muted">
                    Tên sản phẩm<span className="text-error-strong"> *</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    disabled={isLoading}
                    className="w-full border-0 border-b border-line-strong bg-transparent py-2 font-display text-[22px] text-ink outline-none transition-colors duration-200 focus:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                    {...register('name')}
                  />
                  <FieldError message={errors.name?.message} />
                </div>

                <div className="flex flex-col gap-[7px]">
                  <div className="flex items-baseline justify-between gap-3">
                    <label htmlFor="description" className="text-label-xs text-ink-muted">
                      Mô tả<span className="text-error-strong"> *</span>
                    </label>
                    <span className="text-caption tabular-nums text-ink-faint">{description.length} ký tự</span>
                  </div>
                  <textarea
                    id="description"
                    rows={4}
                    disabled={isLoading}
                    className="w-full resize-y border-0 border-b border-line-strong bg-transparent py-2.5 text-[15px] leading-[1.65] text-ink outline-none transition-colors duration-200 focus:border-accent disabled:cursor-not-allowed disabled:opacity-40"
                    {...register('description')}
                  />
                  <FieldError message={errors.description?.message} />
                </div>

                <div className="flex flex-col gap-[7px]">
                  <span className="text-label-xs text-ink-muted">
                    Danh mục<span className="text-error-strong"> *</span>
                  </span>
                  <AdminSelect
                    options={[
                      { value: '', label: 'Chọn danh mục…' },
                      ...categories.map((c) => ({ value: c.id, label: c.name })),
                    ]}
                    value={categoryId}
                    onChange={(value) => setValue('categoryId', value, { shouldValidate: true, shouldDirty: true })}
                    ariaLabel="Danh mục"
                    disabled={isLoading}
                  />
                  <FieldError message={errors.categoryId?.message} />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[16px] border border-line bg-white">
              <div className="border-b border-line bg-fill px-4 py-3.5 sm:px-[22px]">
                <h2 className="text-label-xs text-ink-secondary">Giá &amp; kho</h2>
              </div>
              <div className="grid grid-cols-1 gap-[22px] p-4 sm:p-[22px] sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-[7px]">
                  <label htmlFor="price" className="text-label-xs text-ink-muted">
                    Giá (₫)<span className="text-error-strong"> *</span>
                  </label>
                  <div className="flex items-baseline gap-2.5 border-b border-line-strong transition-colors duration-200 focus-within:border-accent">
                    <input
                      id="price"
                      type="number"
                      step="0.01"
                      disabled={isLoading}
                      className="w-full min-w-0 border-0 bg-transparent py-2 font-display text-[26px] tabular-nums text-ink outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      {...register('price', { valueAsNumber: true })}
                    />
                    <span className="shrink-0 text-body-sm text-ink-muted">₫</span>
                  </div>
                  <span className="text-caption text-ink-secondary">
                    Khách thấy: <span className="font-display text-[15px] text-ink">{formatPrice(price)}</span>
                  </span>
                  <FieldError message={errors.price?.message} />
                </div>

                <div className="flex flex-col gap-[7px]">
                  <label htmlFor="discountPercentage" className="text-label-xs text-ink-muted">
                    % giảm giá
                  </label>
                  <div className="flex items-baseline gap-2.5 border-b border-line-strong transition-colors duration-200 focus-within:border-accent">
                    <input
                      id="discountPercentage"
                      type="number"
                      step="1"
                      min={0}
                      max={100}
                      disabled={isLoading}
                      placeholder="Không giảm"
                      className="w-full min-w-0 border-0 bg-transparent py-2 font-display text-[26px] tabular-nums text-ink outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      {...register('discountPercentage', {
                        setValueAs: (v) => (v === '' || v === null ? undefined : Number(v)),
                      })}
                    />
                    <span className="shrink-0 text-body-sm text-ink-muted">%</span>
                  </div>
                  <span className="text-caption text-ink-secondary">
                    {discountPercentage ? (
                      <>
                        Giá sau giảm:{' '}
                        <span className="font-display text-[15px] text-accent">{formatPrice(finalPrice)}</span>
                      </>
                    ) : (
                      'Không áp dụng giảm giá'
                    )}
                  </span>
                  <FieldError message={errors.discountPercentage?.message} />
                </div>

                <div className="flex flex-col gap-[7px]">
                  <label htmlFor="stockQuantity" className="text-label-xs text-ink-muted">
                    Tồn kho<span className="text-error-strong"> *</span>
                  </label>
                  <div className="flex items-center gap-2.5 border-b border-line-strong transition-colors duration-200 focus-within:border-accent">
                    <input
                      id="stockQuantity"
                      type="number"
                      disabled={isLoading}
                      className="w-full min-w-0 border-0 bg-transparent py-2 font-display text-[26px] tabular-nums text-ink outline-none disabled:cursor-not-allowed disabled:opacity-40"
                      {...register('stockQuantity', { valueAsNumber: true })}
                    />
                    <span className="flex shrink-0 gap-1.5 pb-1.5">
                      <button
                        type="button"
                        aria-label="Giảm tồn kho"
                        disabled={isLoading}
                        onClick={() =>
                          setValue('stockQuantity', Math.max(0, stockQuantity - 1), {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className="grid size-9 place-items-center sm:size-7 rounded-full border border-line-strong text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        −
                      </button>
                      <button
                        type="button"
                        aria-label="Tăng tồn kho"
                        disabled={isLoading}
                        onClick={() =>
                          setValue('stockQuantity', stockQuantity + 1, { shouldValidate: true, shouldDirty: true })
                        }
                        className="grid size-9 place-items-center sm:size-7 rounded-full border border-line-strong text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ＋
                      </button>
                    </span>
                  </div>
                  <span className={`inline-flex w-fit items-center gap-[7px] rounded-full px-[11px] py-1 text-[11px] max-sm:w-full max-sm:justify-center ${stockChip.bg} ${stockChip.fg}`}>
                    <span aria-hidden="true" className={`size-[5px] rounded-full ${stockChip.fg.replace('text-', 'bg-')}`} />
                    {stockChip.label}
                  </span>
                  <FieldError message={errors.stockQuantity?.message} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-[16px] border border-line bg-white px-4 py-5 sm:px-[22px]">
              <div className="flex flex-col gap-1">
                <span className="text-label-xs text-ink-muted">Trạng thái</span>
                <span className="text-body-sm text-ink-secondary">
                  {isActive ? 'Sản phẩm đang hiển thị trên cửa hàng.' : 'Sản phẩm bị ẩn khỏi cửa hàng.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setValue('isActive', !isActive, { shouldValidate: true, shouldDirty: true })}
                aria-pressed={isActive}
                disabled={isLoading}
                className="flex items-center gap-3 text-left disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span
                  className={`flex h-5 w-[34px] flex-none items-center rounded-full px-0.5 transition-colors duration-200 ${
                    isActive ? 'justify-end bg-accent' : 'justify-start bg-line-strong'
                  }`}
                >
                  <span className="h-3.5 w-3.5 rounded-full bg-white shadow-btn" />
                </span>
                <span className="text-body-sm text-ink">{isActive ? 'Đang bán' : 'Ngừng bán'}</span>
              </button>
            </div>
          </div>

          <aside className="flex min-w-0 flex-col gap-4">
            <div className="overflow-hidden rounded-[16px] border border-line bg-white">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-fill px-5 py-3.5">
                <h2 className="text-label-xs text-ink-secondary">Ảnh sản phẩm</h2>
                <span className="text-caption tabular-nums text-ink-muted">{totalImages}/5</span>
              </div>
              <div className="flex flex-col gap-3 p-5">
                <div className="grid grid-cols-2 gap-3">
                  {existingImages.map((img, index) => {
                    const isPrimary = index === 0;
                    return (
                      <div key={img.key} className="relative aspect-[4/5]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- backend-served upload, not a Next-optimizable static asset */}
                        <img
                          src={img.url}
                          alt=""
                          className="h-full w-full rounded-[10px] border border-line object-cover"
                        />
                        {isPrimary && (
                          <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
                            Ảnh chính
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Xoá ảnh"
                          onClick={() => removeExistingImage(img.key)}
                          disabled={isLoading}
                          className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-ink text-white sm:size-6 transition-colors duration-200 hover:bg-error-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  {newFiles.map((file, i) => {
                    const isPrimary = existingImages.length === 0 && i === 0;
                    return (
                      <div key={`${file.name}-${i}`} className="relative aspect-[4/5]">
                        <span className="flex h-full w-full items-center justify-center rounded-[10px] border border-line bg-fill p-2 text-center text-caption text-ink-muted">
                          {file.name}
                        </span>
                        {isPrimary && (
                          <span className="absolute left-2 top-2 rounded-full bg-accent px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-white">
                            Ảnh chính
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Xoá ảnh"
                          onClick={() => removeNewFile(i)}
                          className="absolute -right-2 -top-2 flex size-8 items-center justify-center rounded-full bg-ink text-white sm:size-6 transition-colors duration-200 hover:bg-error-strong focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                  <label
                    className={`flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed border-line-strong bg-fill text-ink-muted transition-all duration-200 ${
                      canAddMoreImages
                        ? 'cursor-pointer hover:border-accent hover:bg-white hover:text-accent'
                        : 'cursor-not-allowed opacity-40'
                    }`}
                  >
                    <span aria-hidden="true" className="text-2xl leading-none">
                      ＋
                    </span>
                    <span className="text-label-xs">Tải ảnh lên</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={!canAddMoreImages}
                      onChange={onFilesChange}
                      className="sr-only"
                    />
                  </label>
                </div>
                <p className="text-caption text-ink-muted">
                  {!isEditing && 'Cần ít nhất 1 ảnh. '}
                  Ảnh đầu tiên là ảnh chính trên lưới{isEditing ? '. Ảnh' : ', ảnh'} thứ hai dùng cho hiệu ứng đổi
                  ảnh khi rê chuột.
                </p>
              </div>
            </div>

            <div className="rounded-[16px] bg-ink-soft p-5">
              <div className="flex flex-col gap-3.5">
                <span className="text-label-xs text-accent-soft">Xem trước trên cửa hàng</span>
                <div className="flex items-end gap-3.5">
                  <span
                    aria-hidden="true"
                    className={`grid h-[78px] w-[62px] shrink-0 place-items-center rounded-t-[31px] rounded-b-[8px] font-display text-[22px] leading-none ${previewTint.bg} ${previewTint.ink}`}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                  <span className="flex min-w-0 flex-col gap-[5px]">
                    <span className="truncate font-display text-[18px] text-white">{displayName}</span>
                    <span className="text-caption text-white/50">{category?.name ?? 'Chưa chọn danh mục'}</span>
                    <span className="font-display text-[17px] tabular-nums text-accent-soft">
                      {formatPrice(price)}
                    </span>
                  </span>
                </div>
                <span className="border-t border-white/12 pt-3 text-[12px] text-white/45">
                  {isActive
                    ? out
                      ? 'Hiện trên cửa hàng nhưng không mua được — hết hàng.'
                      : 'Hiện trên lưới sản phẩm và trang danh mục.'
                    : 'Đang ẩn — khách không thấy sản phẩm này.'}
                </span>
              </div>
            </div>
          </aside>
        </div>

        <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-white/92 p-3 sm:gap-4 sm:rounded-full sm:py-3 sm:pr-3 sm:pl-6 shadow-card backdrop-blur-[12px]">
          <span className={`flex items-center gap-2.5 text-[13px] ${dirty ? 'text-alert' : 'text-ink-muted'}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${dirty ? 'bg-alert' : 'bg-success'}`} />
            {dirty
              ? isEditing
                ? 'Có thay đổi chưa lưu'
                : 'Bản nháp chưa lưu'
              : isEditing
                ? 'Đã lưu mọi thay đổi'
                : 'Điền các trường có dấu * để lưu'}
          </span>
          <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center rounded-full border sm:flex-none border-line-strong px-[22px] text-label-xs text-ink-secondary transition-all duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isEditing ? 'Hoàn tác' : 'Huỷ'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-3 rounded-full bg-ink sm:flex-none px-[26px] text-label-xs text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (isEditing ? 'Đang lưu' : 'Đang tạo') : isEditing ? 'Lưu thay đổi' : 'Lưu sản phẩm'}
              {isSubmitting && (
                <span
                  aria-hidden="true"
                  className="size-[13px] rounded-full border-[1.5px] border-white/35 border-t-white animate-spin"
                />
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
