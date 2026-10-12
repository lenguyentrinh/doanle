'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buttonPrimary, buttonSecondary } from '@/components/Button';
import { showToast } from '@/lib/toast';
import { extractErrorMessage } from '@/lib/apiError';
import {
  getAdminAuthLookbookAPI,
  updateAdminAuthLookbookAPI,
  uploadAdminAuthLookbookImageAPI,
} from '@/features/admin/services/adminAPI';
import { revalidateAuthPages } from '@/app/admin/auth-lookbook/actions';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import {
  DEFAULT_LOOKBOOK_CAPTION,
  DEFAULT_LOOKBOOK_LABEL,
  LOOKBOOK_CAPTION_MAX,
  LOOKBOOK_LABEL_MAX,
  type AuthLookbook,
} from '@/features/auth/types/authLookbook';
import {
  authLookbookSchema,
  type AuthLookbookFormValues,
} from '@/features/auth/validation/authLookbookSchema';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const inputCls =
  'w-full border-0 border-b border-line-strong bg-transparent py-2 text-[15px] text-ink outline-none transition-colors duration-200 focus:border-accent placeholder:text-ink-muted disabled:opacity-40';

function Counter({ value, max }: { value: string; max: number }) {
  const n = value.trim().length;
  return (
    <span className={`tabular-nums tracking-normal ${n > max ? 'text-error-strong' : 'text-ink-faint'}`}>
      {n}/{max}
    </span>
  );
}

export default function AuthLookbookManager() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [savedImage, setSavedImage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<AuthLookbookFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(authLookbookSchema),
    defaultValues: { caption: '', label: '' },
  });

  const values = useWatch({ control });
  const caption = values.caption ?? '';
  const label = values.label ?? '';

  const applySaved = useCallback(
    (data: AuthLookbook) => {
      setSavedImage(data.imageUrl);
      setImageUrl(data.imageUrl);
      reset({ caption: data.caption ?? '', label: data.label ?? '' });
    },
    [reset],
  );

  useEffect(() => {
    let active = true;
    getAdminAuthLookbookAPI()
      .then((data) => {
        if (active) applySaved(data);
      })
      .catch(() => {
        if (active) showToast.error('Không tải được ảnh màn hình đăng nhập');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [applySaved]);

  const dirty = isDirty || imageUrl !== savedImage;

  const handleFile = async (file: File | undefined) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      showToast.error('Chỉ hỗ trợ ảnh JPG, PNG hoặc WebP');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast.error('Ảnh tối đa 5MB');
      return;
    }
    setUploading(true);
    try {
      setImageUrl(await uploadAdminAuthLookbookImageAPI(file));
    } catch (err) {
      showToast.error(extractErrorMessage(err, 'Không tải được ảnh lên'));
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: AuthLookbookFormValues) => {
    try {
      const saved = await updateAdminAuthLookbookAPI({
        imageUrl,
        caption: data.caption || null,
        label: data.label || null,
      });
      applySaved(saved);
      // Best-effort: the save already succeeded, a stale cache just expires in <=60s.
      await revalidateAuthPages().catch(() => undefined);
      showToast.success('Đã lưu ảnh màn hình đăng nhập');
    } catch (err) {
      showToast.error(extractErrorMessage(err, 'Không lưu được ảnh màn hình đăng nhập'));
    }
  };

  if (loading) {
    return <p className="py-12 text-center text-body-md text-ink-muted">Đang tải cấu hình…</p>;
  }

  const fieldError = (msg?: string) =>
    msg ? <span className="mt-1 block text-caption text-error-strong">{msg}</span> : null;

  const pillCls = dirty ? 'border-alert-line bg-alert-bg text-alert' : 'border-line bg-white text-ink-secondary';
  const pillDot = dirty ? 'bg-alert' : 'bg-success';
  const pillText = isSubmitting ? 'Đang lưu…' : dirty ? 'Có thay đổi chưa lưu' : 'Đang hiển thị trên màn hình đăng nhập';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto flex w-full flex-col gap-[22px]">
      <AdminPageHeader
        eyebrow="Quản trị · Cửa hàng"
        title={
          <>
            Ảnh màn hình <em className="italic text-accent">đăng nhập</em>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            role="status"
            aria-live="polite"
            className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-caption ${pillCls}`}
          >
            <span className={`size-1.5 rounded-full ${pillDot}`} />
            {pillText}
          </span>
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className={`${buttonPrimary} min-h-[46px] px-[26px] max-sm:w-full`}
          >
            {isSubmitting ? 'Đang lưu' : 'Lưu thay đổi'}
          </button>
        </div>
      </AdminPageHeader>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="relative aspect-[4/5] w-full">
            <span aria-hidden className="absolute -right-[8%] -top-4 aspect-square w-1/2 rounded-full bg-sand" />
            <div className="absolute inset-0 overflow-hidden rounded-b-[12px] rounded-t-full bg-fill-dark">
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- backend/CDN upload
                <img src={imageUrl} alt="Ảnh màn hình đăng nhập" className="h-full w-full object-cover" />
              )}
            </div>
          </div>
          <div className="mt-3.5 flex justify-between gap-3 text-[11px] text-ink-muted">
            <span className="font-display text-[14px] italic">{caption.trim() || DEFAULT_LOOKBOOK_CAPTION}</span>
            <span className="shrink-0 tracking-[0.2em]">{label.trim() || DEFAULT_LOOKBOOK_LABEL}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-7 rounded-[18px] border border-line bg-white p-5 md:p-6">
          <section className="flex flex-col gap-3.5">
            <span className="font-display text-[21px] text-ink">Ảnh</span>
            <input
              ref={fileRef}
              type="file"
              accept={ALLOWED_TYPES.join(',')}
              aria-label="Chọn ảnh"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || isSubmitting}
                className={`${buttonSecondary} min-h-[46px] px-[22px]`}
              >
                {uploading ? 'Đang tải' : imageUrl ? 'Đổi ảnh' : 'Tải ảnh lên'}
              </button>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => setImageUrl(null)}
                  disabled={uploading || isSubmitting}
                  className={`${buttonSecondary} min-h-[46px] px-[22px]`}
                >
                  Xoá ảnh
                </button>
              )}
            </div>
            <span className="text-caption text-ink-muted">
              JPG, PNG hoặc WebP · tối đa 5MB · nên dùng ảnh dọc tỉ lệ 4:5. Chưa có ảnh thì hiển thị khung trống.
            </span>
          </section>

          <section className="flex flex-col gap-[18px]">
            <span className="font-display text-[21px] text-ink">Chú thích</span>
            <label className="block">
              <span className="flex justify-between text-label-xs text-ink-secondary">
                <span>Mô tả ngắn</span>
                <Counter value={caption} max={LOOKBOOK_CAPTION_MAX} />
              </span>
              <input type="text" {...register('caption')} className={inputCls} placeholder={DEFAULT_LOOKBOOK_CAPTION} />
              {fieldError(errors.caption?.message)}
            </label>
            <label className="block">
              <span className="flex justify-between text-label-xs text-ink-secondary">
                <span>Nhãn</span>
                <Counter value={label} max={LOOKBOOK_LABEL_MAX} />
              </span>
              <input type="text" {...register('label')} className={inputCls} placeholder={DEFAULT_LOOKBOOK_LABEL} />
              {fieldError(errors.label?.message)}
            </label>
            <span className="text-caption text-ink-muted">Để trống để dùng nội dung mặc định.</span>
          </section>
        </div>
      </div>
    </form>
  );
}
