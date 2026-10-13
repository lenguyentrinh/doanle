'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiSearch, FiX } from 'react-icons/fi';
import { pushWithLoader } from '@/lib/navigationLoader';

type SearchBarVariant = 'underline' | 'pill';

// 'underline': quiet field for the sticky Header — transparent ground, a
// hairline bottom border that darkens to ink on hover/focus, no pill, no fill.
// 'pill': the 404 page's search box — bordered pill on a filled ground,
// paired with a visible labelled submit button (via `submitLabel`).
const containerVariants: Record<SearchBarVariant, string> = {
  underline: 'gap-2 border-b border-line hover:border-ink focus-within:border-ink',
  pill: 'gap-2.5 rounded-full border border-line bg-fill py-1.5 pl-5 pr-1.5 focus-within:border-line-strong focus-within:bg-white',
};

// Sticky search field (Story 2.4 AC #1). Lives in the already-sticky Header, so
// it stays visible on mobile while scrolling. Submitting navigates to the
// unified PLP: /products?search=<query>. Uses only useRouter (no useSearchParams) so it never
// de-opts the statically-prerendered pages the global Header renders on.
export default function SearchBar({
  className = '',
  variant = 'underline',
  placeholder = 'Tìm kiếm',
  submitLabel,
}: {
  className?: string;
  variant?: SearchBarVariant;
  placeholder?: string;
  /** Renders a second, visibly labelled submit button (e.g. "Tìm") after the input. */
  submitLabel?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = value.trim();
    if (!query) return; // empty submit is a no-op
    pushWithLoader(router, `/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <form
      role="search"
      onSubmit={handleSubmit}
      className={`flex items-center transition-colors duration-200 ${containerVariants[variant]} ${className}`}
    >
      <button
        type="submit"
        aria-label="Tìm kiếm"
        className="flex items-center text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        <FiSearch size={15} aria-hidden="true" />
      </button>
      <input
        type="search"
        aria-label="Tìm kiếm sản phẩm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        className={`min-w-0 flex-1 border-0 bg-transparent text-ink outline-none placeholder:text-ink-muted [&::-webkit-search-cancel-button]:hidden ${
          variant === 'pill' ? 'h-[42px] text-[14px]' : 'h-9 text-body-sm'
        }`}
      />
      {variant === 'underline' && value && (
        <button
          type="button"
          aria-label="Xoá tìm kiếm"
          onClick={() => setValue('')}
          className="flex items-center text-ink-muted transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          <FiX size={15} />
        </button>
      )}
      {submitLabel && (
        <button
          type="submit"
          className="inline-flex h-[46px] shrink-0 items-center rounded-full bg-ink px-6 text-label-xs text-white shadow-btn transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-accent hover:shadow-btn-hover"
        >
          {submitLabel}
        </button>
      )}
    </form>
  );
}
