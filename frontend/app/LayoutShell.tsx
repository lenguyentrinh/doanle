import { Suspense } from "react";
import NavigationLoader from "@/components/layout/NavigationLoader";
import { CartDrawerProvider } from "@/features/cart/context/CartDrawerContext";
import CartDrawer from "@/features/cart/components/CartDrawer";
import { QuickViewProvider } from "@/features/product/context/QuickViewContext";
import QuickViewModal from "@/features/product/components/QuickViewModal";
import ScrollProgressBar from "@/components/layout/ScrollProgressBar";
import ConditionalFooter from "./ConditionalFooter";
import ConditionalHeader from "./ConditionalHeader";
import ConditionalTicker from "./ConditionalTicker";

// Header and Footer wrap every page. The shell is a flex column so the
// footer is pushed to the bottom and the page content fills the space in
// between — pages should grow with `flex-1` rather than set `min-h-screen`,
// which would stack a second viewport-height block and force a scrollbar.
export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartDrawerProvider>
      <QuickViewProvider>
        <ScrollProgressBar />
        <Suspense fallback={null}>
          <NavigationLoader />
        </Suspense>
        <div className="flex min-h-screen flex-col overflow-x-clip bg-paper">
          <ConditionalTicker />
          <ConditionalHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <ConditionalFooter />
        </div>
        <CartDrawer />
        <QuickViewModal />
      </QuickViewProvider>
    </CartDrawerProvider>
  );
}
