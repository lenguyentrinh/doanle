"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiShoppingBag, FiUser } from "react-icons/fi";
import { AppDispatch, RootState } from "@/store/store";
import { usePathname, useRouter } from "next/navigation";
import { logoutThunk } from "@/features/auth/store/authThunk";
import {
  selectCartCount,
  selectCartLoaded,
  getGuestCartCount,
  GUEST_CART_UPDATED_EVENT,
} from "@/features/cart";
import { useCartDrawer } from "@/features/cart/context/CartDrawerContext";
import SearchBar from "@/components/ui/SearchBar";

const navItems = [
  { label: "Trang chủ", href: "/" },
  { label: "Sản phẩm", href: "/products" },
  { label: "Về Oren", href: "/about-me" },
];

// Underline-reveal treatment shared by the desktop nav links — slides in
// terracotta on hover/focus, matching the redesign's accent. The current
// page's link keeps the underline persistently shown (spec's per-item
// `transform:scaleX({{ n.scale }})`), not just on hover/focus.
const navLinkBase =
  "relative py-1 text-[14px] font-normal tracking-[0.01em] text-ink transition-colors duration-200 hover:text-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:bg-accent after:transition-transform after:duration-300 after:ease-[cubic-bezier(0.16,1,0.3,1)] hover:after:scale-x-100 focus-visible:after:scale-x-100";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dispatch = useDispatch<AppDispatch>();
  const router = useRouter();
  const pathname = usePathname();
  const isNavActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const authCartCount = useSelector(selectCartCount);
  const authCartLoaded = useSelector(selectCartLoaded);
  const [guestCartCount, setGuestCartCount] = useState(getGuestCartCount);
  const { open: openCartDrawer } = useCartDrawer();

  useEffect(() => {
    const handleGuestCartChange = () => setGuestCartCount(getGuestCartCount());
    // `storage` only fires in OTHER tabs; `GUEST_CART_UPDATED_EVENT` fires in
    // THIS tab too (dispatched by features/cart/lib/guestCart.ts on every
    // write), so the badge updates immediately after an add/update/remove.
    window.addEventListener("storage", handleGuestCartChange);
    window.addEventListener(GUEST_CART_UPDATED_EVENT, handleGuestCartChange);
    return () => {
      window.removeEventListener("storage", handleGuestCartChange);
      window.removeEventListener(GUEST_CART_UPDATED_EVENT, handleGuestCartChange);
    };
  }, []);

  // Avoid a 0-flash on login: the instant `isAuthenticated` flips true,
  // authCartCount is still 0 until the post-login merge+fetch resolves
  // (selectCartLoaded). Keep showing the guest count until then.
  const cartCount = isAuthenticated
    ? authCartLoaded
      ? authCartCount
      : guestCartCount
    : guestCartCount;
  const accountDisplayName = user?.userName || user?.email || "Account";

  const handleLogout = async () => {
    setIsOpen(false);
    await dispatch(logoutThunk());
    router.replace("/");
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscClose);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscClose);
    };
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!isAuthenticated) setIsOpen(false);
  }, [isAuthenticated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const iconBtn =
    "flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors duration-200 hover:bg-fill focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2";

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/86 shadow-header backdrop-blur-[16px] backdrop-saturate-[1.4]">
      <div className="relative mx-auto flex h-[76px] max-w-[1480px] items-center justify-between gap-8 px-[clamp(16px,3.4vw,44px)]">
        {/* Brand (left) — tracked serif wordmark, the quiet logo */}
        <Link
          href="/"
          className="font-display text-[24px] uppercase tracking-[0.32em] text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          Oren
        </Link>

        {/* Nav (in normal flow, not absolutely centered — an absolutely
            centered nav collides with the utility group at ~768-1100px
            widths, since it's positioned independent of either side's
            actual width; flex-1 + justify-center keeps it centered in
            whatever space is left instead). */}
        <nav className="hidden flex-1 justify-center lg:flex">
          <div className="flex items-center gap-6 xl:gap-10">
            {navItems.map((item) => {
              const active = isNavActive(item.href);
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`${navLinkBase} ${active ? "after:scale-x-100" : "after:scale-x-0"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Utility: search + icons (right) */}
        <div className="flex shrink-0 items-center justify-end gap-6">
          <SearchBar className="w-32 sm:w-44 lg:w-[150px] xl:w-52" />
          <button
            type="button"
            onClick={openCartDrawer}
            aria-label={
              cartCount > 0 ? `Giỏ hàng, ${cartCount} sản phẩm` : "Giỏ hàng"
            }
            className={`relative ${iconBtn}`}
          >
            <FiShoppingBag size={19} />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className={`absolute -right-2.5 -top-2 flex h-[17px] items-center justify-center rounded-full bg-accent text-[10px] font-medium leading-none text-white ${
                  cartCount > 99 ? "min-w-[17px] px-1.5" : "w-[17px]"
                }`}
              >
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </button>

          {isAuthenticated ? (
            <div ref={dropdownRef} className="relative">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-haspopup="true"
                aria-label="Menu tài khoản"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`${iconBtn} ${isOpen ? "bg-fill" : ""}`}
              >
                <FiUser size={19} />
              </button>

              <div
                className={`absolute right-0 top-[calc(100%+14px)] z-50 min-w-56 rounded-[10px] border border-line bg-white shadow-overlay motion-safe:animate-dropdown-in ${
                  isOpen ? "block" : "hidden"
                }`}
              >
                <p className="truncate border-b border-line px-5 py-3.5 text-label-xs text-ink-muted">
                  {accountDisplayName}
                </p>
                <div className="p-1.5">
                  <Link
                    href="/account"
                    onClick={() => setIsOpen(false)}
                    className="block rounded-[8px] px-3.5 py-2.5 text-body-sm text-ink transition-colors duration-200 hover:bg-fill focus-visible:outline-none focus-visible:bg-fill"
                  >
                    Tài khoản của tôi
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full rounded-[8px] px-3.5 py-2.5 text-left text-body-sm text-ink transition-colors duration-200 hover:bg-fill focus-visible:outline-none focus-visible:bg-fill"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link href="/login" aria-label="Đăng nhập" className={iconBtn}>
              <FiUser size={19} />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
