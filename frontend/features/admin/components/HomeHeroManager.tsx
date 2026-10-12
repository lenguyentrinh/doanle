'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { buttonPrimary, buttonSecondary } from '@/components/Button';
import { showToast } from '@/lib/toast';
import { extractErrorMessage } from '@/lib/apiError';
import {
  getAdminHomeHeroAPI,
  updateAdminHomeHeroAPI,
  uploadAdminHomeHeroImageAPI,
} from '@/features/admin/services/adminAPI';
import { revalidateHomePage } from '@/app/admin/home/actions';
import AdminPageHeader from '@/features/admin/components/AdminPageHeader';
import HeroRenderer from '@/features/home/components/hero/HeroRenderer';
import { HeroEditContext, type HeroEditField } from '@/features/home/components/hero/heroParts';
import {
  DEFAULT_HOME_HERO,
  HERO_IMAGE_RULES,
  HERO_TEMPLATES,
  HERO_TEMPLATE_LABELS,
  hasValidHeroImages,
  type HeroTemplate,
  type HomeHero,
} from '@/features/home/types/homeHero';
import {
  homeHeroSchema,
  type HomeHeroFormValues,
} from '@/features/home/validation/homeHeroSchema';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const FIELD_MAX = { eyebrow: 60, title: 120, subtitle: 300 } as const;

const inputCls =
  'w-full border-0 border-b border-line-strong bg-transparent py-2 text-[15px] text-ink outline-none transition-colors duration-200 focus:border-accent placeholder:text-ink-muted disabled:opacity-40';

// Tiny wireframe of each layout for the template cards.
function Schematic({ template }: { template: HeroTemplate }) {
  const bar = 'rounded-full bg-ink/25';
  const img = 'bg-accent/35';
  return (
    <div className="relative h-[52px] w-full overflow-hidden rounded-[8px] border border-line bg-paper" aria-hidden>
      {template === 'split' && (
        <>
          <div className={`absolute left-2 top-3 h-1.5 w-8 ${bar}`} />
          <div className={`absolute left-2 top-6 h-2 w-14 ${bar}`} />
          <div className={`absolute left-2 top-10 h-1.5 w-10 ${bar}`} />
          <div className={`absolute bottom-0 right-2 h-[44px] w-[34%] rounded-t-full ${img}`} />
        </>
      )}
      {template === 'banner' && (
        <>
          <div className="absolute bottom-1.5 left-1/2 top-1.5 w-[26%] -translate-x-1/2 rounded-b-[4px] rounded-t-full bg-accent/35" />
          <div className="absolute right-[calc(63%+4px)] top-[18px] h-[7px] w-[22%] rounded-full bg-ink/30" />
          <div className="absolute left-[calc(63%+4px)] top-[18px] h-[7px] w-[22%] rounded-full bg-accent/55" />
          <div className="absolute left-[calc(63%+4px)] top-8 h-[5px] w-[18%] rounded-full bg-ink/20" />
        </>
      )}
      {template === 'slider' && (
        <>
          <div className={`absolute inset-0 ${img}`} />
          <div className="absolute left-2 top-4 h-2 w-14 rounded-full bg-white" />
          <div className="absolute left-2 top-8 h-1.5 w-9 rounded-full bg-white/80" />
          <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
            <span className="h-1 w-3 rounded-full bg-white" />
            <span className="h-1 w-1 rounded-full bg-white/60" />
            <span className="h-1 w-1 rounded-full bg-white/60" />
          </div>
        </>
      )}
      {template === 'centered' && (
        <>
          <div className={`absolute left-1/2 top-3 h-1.5 w-8 -translate-x-1/2 ${bar}`} />
          <div className={`absolute left-1/2 top-6 h-3 w-24 -translate-x-1/2 ${bar}`} />
          <div className={`absolute left-1/2 top-11 h-1.5 w-14 -translate-x-1/2 ${bar}`} />
        </>
      )}
      {template === 'grid' && (
        <>
          <div className={`absolute left-2 top-4 h-2 w-12 ${bar}`} />
          <div className={`absolute left-2 top-8 h-1.5 w-9 ${bar}`} />
          <div className={`absolute bottom-2 right-[42%] top-2 w-[22%] rounded-md ${img}`} />
          <div className={`absolute right-2 top-2 h-[20px] w-[34%] rounded-md ${img}`} />
          <div className={`absolute bottom-2 right-2 h-[20px] w-[34%] rounded-md ${img}`} />
        </>
      )}
    </div>
  );
}

function slotLabel(template: HeroTemplate, i: number): string {
  if (template === 'grid') return i === 0 ? 'Ảnh lớn' : `Ảnh nhỏ ${i}`;
  if (template === 'slider') return `Ảnh ${i + 1}`;
  return 'Ảnh';
}

function toFormValues(hero: HomeHero): HomeHeroFormValues {
  return { ...hero, images: hero.images.slice(0, HERO_IMAGE_RULES[hero.template].max) };
}

function StepTitle({ n, title, aside }: { n: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2.5">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-[15px] italic text-accent">{n}</span>
        <span className="font-display text-[21px] text-ink">{title}</span>
      </div>
      {aside}
    </div>
  );
}

function Counter({ value, max }: { value: string; max: number }) {
  const n = value.trim().length;
  return (
    <span className={`tabular-nums tracking-normal ${n > max ? 'text-error-strong' : 'text-ink-faint'}`}>
      {n}/{max}
    </span>
  );
}

export default function HomeHeroManager() {
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<number | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // Which slot the open file dialog is for (existing index, or images.length to append).
  const pendingSlot = useRef(0);
  // Images picked per template, so switching layouts back and forth loses nothing.
  const imagesByTemplate = useRef<Partial<Record<HeroTemplate, string[]>>>({});
  const lastSaved = useRef<HomeHeroFormValues>(toFormValues(DEFAULT_HOME_HERO));

  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setFocus,
    control,
    formState: { errors, isSubmitting, isSubmitted, isDirty },
  } = useForm<HomeHeroFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(homeHeroSchema),
    defaultValues: lastSaved.current,
  });

  const values = useWatch({ control }) as HomeHeroFormValues;
  const template = values.template ?? 'split';
  const images = values.images ?? [];
  const rule = HERO_IMAGE_RULES[template];

  const resetTo = useCallback(
    (v: HomeHeroFormValues) => {
      lastSaved.current = v;
      imagesByTemplate.current = {};
      reset(v);
    },
    [reset],
  );

  useEffect(() => {
    let active = true;
    getAdminHomeHeroAPI()
      .then((hero) => {
        if (active && hero) resetTo(toFormValues(hero));
      })
      .catch(() => {
        if (active) showToast.error('Không tải được cấu hình trang chủ');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [resetTo]);

  // Scale the 1280px-wide hero to whatever width the preview frame has.
  useEffect(() => {
    if (loading) return;
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setScale(el.clientWidth / 1280);
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [loading]);

  const setImages = (next: string[]) => {
    setJustSaved(false);
    setValue('images', next, { shouldDirty: true, shouldValidate: isSubmitted });
  };

  const pickTemplate = (t: HeroTemplate) => {
    if (t === template) return;
    imagesByTemplate.current[template] = images;
    setValue('template', t, { shouldDirty: true });
    setImages((imagesByTemplate.current[t] ?? images).slice(0, HERO_IMAGE_RULES[t].max));
  };

  const openPicker = (slot: number) => {
    pendingSlot.current = slot;
    fileRef.current?.click();
  };

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
    const slot = pendingSlot.current;
    setUploading(slot);
    try {
      const url = await uploadAdminHomeHeroImageAPI(file);
      const next = [...images];
      if (slot < next.length) next[slot] = url;
      else next.push(url);
      setImages(next);
    } catch (err) {
      showToast.error(extractErrorMessage(err, 'Không tải được ảnh lên'));
    } finally {
      setUploading(null);
    }
  };

  const onSubmit = async (data: HomeHeroFormValues) => {
    try {
      const saved = await updateAdminHomeHeroAPI(data);
      resetTo(toFormValues(saved));
      setJustSaved(true);
      // Best-effort: the save already succeeded, a stale cache just expires in <=60s.
      await revalidateHomePage().catch(() => undefined);
      showToast.success('Đã lưu trang chủ');
    } catch (err) {
      showToast.error(extractErrorMessage(err, 'Không lưu được trang chủ'));
    }
  };

  const onEditField = useCallback(
    (field: HeroEditField) => {
      setFocus(field, { shouldSelect: field === 'title' });
    },
    [setFocus],
  );

  const slotCount = template === 'slider' ? Math.min(images.length + 1, rule.max) : rule.max;
  const previewHero: HomeHero = {
    template,
    eyebrow: values.eyebrow ?? '',
    title: values.title ?? '',
    subtitle: values.subtitle ?? '',
    primaryCta: values.primaryCta ?? { label: '', href: '' },
    secondaryCta: values.secondaryCta ?? { label: '', href: '' },
    images,
  };
  const canPreview = !!previewHero.title && hasValidHeroImages(previewHero);
  const previewHeight = (template === 'centered' ? 640 : 720) * scale;
  const hasImages = rule.max > 0;

  if (loading) {
    return <p className="py-12 text-center text-body-md text-ink-muted">Đang tải cấu hình…</p>;
  }

  const fieldError = (msg?: string) =>
    msg ? <span className="mt-1 block text-caption text-error-strong">{msg}</span> : null;

  const pillCls = isDirty ? 'border-alert-line bg-alert-bg text-alert' : 'border-line bg-white text-ink-secondary';
  const pillDot = isDirty ? 'bg-alert' : 'bg-success';
  const pillText = isSubmitting
    ? 'Đang lưu…'
    : isDirty
      ? 'Có thay đổi chưa lưu'
      : justSaved
        ? 'Đã lưu · trang chủ đã cập nhật'
        : 'Đang hiển thị trên cửa hàng';

  const emptyHint = !previewHero.title
    ? 'Nhập tiêu đề để xem khối đầu trang.'
    : rule.min === rule.max
      ? `Mẫu này cần đúng ${rule.max} ảnh.`
      : `Mẫu này cần từ ${rule.min} đến ${rule.max} ảnh.`;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="mx-auto flex w-full flex-col gap-[22px]">
      <AdminPageHeader
        eyebrow="Quản trị · Cửa hàng"
        title={
          <>
            Trang <em className="italic text-accent">chủ</em>
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
          {isDirty && (
            <button
              type="button"
              onClick={() => resetTo(lastSaved.current)}
              className={`${buttonSecondary} min-h-[46px] px-[22px]`}
            >
              Hoàn tác
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting || uploading !== null}
            className={`${buttonPrimary} min-h-[46px] px-[26px]`}
          >
            {isSubmitting ? 'Đang lưu' : 'Lưu thay đổi'}
          </button>
        </div>
      </AdminPageHeader>

      <div className="grid items-start gap-6 min-[1180px]:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-3.5 min-[1180px]:sticky min-[1180px]:top-[100px]">
          <div className="overflow-hidden rounded-[18px] border border-line bg-white shadow-[0_40px_80px_-48px_rgba(150,110,78,0.5)]">
            <div className="flex items-center justify-between gap-3 border-b border-line bg-auth-ground px-3.5 py-2.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-[5px] text-[12px] text-ink-secondary">
                <span className="size-1.5 rounded-full bg-success" />
                oren.store
              </span>
              <span className="font-display text-[13px] italic text-ink-muted">
                Bấm vào chữ trên bản xem trước để sửa
              </span>
            </div>
            <div
              ref={viewportRef}
              className="relative w-full overflow-hidden transition-[height] duration-[350ms]"
              style={{ height: previewHeight }}
            >
              {canPreview ? (
                <div
                  className="absolute left-0 top-0 w-[1280px] origin-top-left"
                  style={{ transform: `scale(${scale})` }}
                  onClickCapture={(e) => {
                    if ((e.target as HTMLElement).closest('a')) e.preventDefault();
                  }}
                >
                  <HeroEditContext.Provider value={onEditField}>
                    <HeroRenderer hero={previewHero} />
                  </HeroEditContext.Provider>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 bg-auth-ground px-6 text-center">
                  <span className="font-display text-[24px] text-ink">
                    Chưa đủ để <em className="italic text-accent">xem trước</em>
                  </span>
                  <span className="text-body-sm text-ink-secondary">{emptyHint}</span>
                </div>
              )}
            </div>
          </div>

          <div role="radiogroup" aria-label="Mẫu bố cục" className="grid grid-cols-3 gap-2.5 min-[560px]:grid-cols-5">
            {HERO_TEMPLATES.map((t) => {
              const selected = t === template;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  title={HERO_TEMPLATE_LABELS[t].hint}
                  onClick={() => pickTemplate(t)}
                  className={`flex flex-col gap-2 rounded-[12px] border p-2.5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                    selected ? 'border-accent bg-fill ring-1 ring-accent' : 'border-line bg-white hover:border-line-strong'
                  }`}
                >
                  <Schematic template={t} />
                  <span className="font-display text-[15px] text-ink">{HERO_TEMPLATE_LABELS[t].name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-7 rounded-[18px] border border-line bg-white p-6">
          <section className="flex flex-col gap-[18px]">
            <StepTitle n="01" title="Nội dung" />
            <label className="block">
              <span className="flex justify-between text-label-xs text-ink-secondary">
                <span>Dòng nhỏ phía trên</span>
                <Counter value={values.eyebrow ?? ''} max={FIELD_MAX.eyebrow} />
              </span>
              <input type="text" {...register('eyebrow')} className={inputCls} placeholder="Hàng về mỗi thứ Năm" />
              {fieldError(errors.eyebrow?.message)}
            </label>
            <label className="block">
              <span className="flex justify-between text-label-xs text-ink-secondary">
                <span>Tiêu đề</span>
                <Counter value={values.title ?? ''} max={FIELD_MAX.title} />
              </span>
              <textarea
                rows={2}
                {...register('title')}
                className={`${inputCls} resize-y font-display text-[22px] leading-[1.3]`}
                placeholder={'Chúng tôi lựa,\nbạn chỉ việc mặc'}
              />
              <span className="text-caption text-ink-muted">
                Xuống dòng để dòng cuối được <em className="font-display italic text-accent">nhấn màu</em>.
              </span>
              {fieldError(errors.title?.message)}
            </label>
            <label className="block">
              <span className="flex justify-between text-label-xs text-ink-secondary">
                <span>Mô tả ngắn</span>
                <Counter value={values.subtitle ?? ''} max={FIELD_MAX.subtitle} />
              </span>
              <textarea rows={3} {...register('subtitle')} className={`${inputCls} resize-y leading-[1.6]`} />
              {fieldError(errors.subtitle?.message)}
            </label>
          </section>

          {hasImages && (
            <section className="flex flex-col gap-[18px]">
              <StepTitle
                n="02"
                title="Ảnh"
                aside={
                  <span className="text-caption tabular-nums text-ink-muted">
                    {images.length}/{rule.max}
                  </span>
                }
              />
              <input
                ref={fileRef}
                type="file"
                accept={ALLOWED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <div className="grid grid-cols-3 gap-2.5">
                {Array.from({ length: slotCount }, (_, i) => {
                  const src = images[i];
                  const busy = uploading === i || (src === undefined && uploading !== null && uploading >= images.length);
                  return (
                    <div key={i} className="flex flex-col gap-1.5">
                      <div className="relative aspect-[4/5]">
                        {src ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element -- backend/CDN upload */}
                            <img src={src} alt="" className="h-full w-full rounded-[10px] border border-line object-cover" />
                            <button
                              type="button"
                              aria-label="Xoá ảnh"
                              onClick={() => setImages(images.filter((_, j) => j !== i))}
                              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink/80 text-white transition-colors hover:bg-error-strong"
                            >
                              ×
                            </button>
                            <button
                              type="button"
                              onClick={() => openPicker(i)}
                              disabled={uploading !== null}
                              className="absolute bottom-2 left-2 rounded-full bg-white/90 px-3 py-1 text-label-xs text-ink hover:bg-white disabled:opacity-50"
                            >
                              {uploading === i ? 'Đang tải' : 'Đổi'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openPicker(images.length)}
                            disabled={uploading !== null}
                            className="flex h-full w-full flex-col items-center justify-center gap-1 rounded-[10px] border border-dashed border-line-strong text-ink-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
                          >
                            <span className="text-[22px] leading-none">＋</span>
                            <span className="text-label-xs">{busy ? 'Đang tải' : 'Thêm ảnh'}</span>
                          </button>
                        )}
                      </div>
                      <span className="text-caption text-ink-muted">{slotLabel(template, i)}</span>
                    </div>
                  );
                })}
              </div>
              <span className="text-caption text-ink-muted">JPG, PNG hoặc WebP · tối đa 5MB mỗi ảnh</span>
              {fieldError(errors.images?.message)}
            </section>
          )}

          <section className="flex flex-col gap-[18px]">
            <StepTitle n={hasImages ? '03' : '02'} title="Nút bấm" />
            {(['primaryCta', 'secondaryCta'] as const).map((key) => {
              const primary = key === 'primaryCta';
              const name = primary ? 'Nút chính' : 'Nút phụ';
              return (
                <div key={key} className="flex flex-col gap-2.5 rounded-[14px] bg-fill px-4 py-3.5">
                  <span className="flex items-center gap-2 text-label-xs text-ink-secondary">
                    <span
                      aria-hidden
                      className={`size-3.5 rounded-full ${primary ? 'bg-ink' : 'border border-line-strong bg-transparent'}`}
                    />
                    {name}
                  </span>
                  <div>
                    <input
                      type="text"
                      aria-label={`${name} — nhãn`}
                      placeholder="Nhãn nút"
                      {...register(`${key}.label`)}
                      className={`${inputCls} font-display text-[17px]`}
                    />
                    {fieldError(errors[key]?.label?.message)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 border-b border-line-strong focus-within:border-accent">
                      <span aria-hidden className="text-ink-faint">
                        ↳
                      </span>
                      <input
                        type="text"
                        aria-label={`${name} — đường dẫn`}
                        placeholder="/products"
                        {...register(`${key}.href`)}
                        className="w-full border-0 bg-transparent py-2 text-[14px] text-ink-secondary outline-none placeholder:text-ink-muted"
                      />
                    </div>
                    {fieldError(errors[key]?.href?.message)}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </div>
    </form>
  );
}
