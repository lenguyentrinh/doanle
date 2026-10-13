'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useRequireAuth } from '@/features/auth/hooks/useRequireAuth';
import { selectCartItems, selectCartLoaded, selectCartSubtotal } from '@/features/cart/store/cartSlice';
import { useCheckoutFlow } from '@/features/checkout/hooks/useCheckoutFlow';
import CheckoutSteps from '@/features/checkout/components/CheckoutSteps';
import CheckoutSummary from '@/features/checkout/components/CheckoutSummary';
import ShippingStep from '@/features/checkout/components/ShippingStep';
import DeliveryStep from '@/features/checkout/components/DeliveryStep';
import PaymentStep from '@/features/checkout/components/PaymentStep';
import ReviewStep from '@/features/checkout/components/ReviewStep';
import PageLoader from '@/components/PageLoader';

// Flat under app/, matching app/cart/, app/products/, app/account/ (no
// app/(shop)/ route group — see Dev Notes / Project Structure Notes).
export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, authChecked } = useRequireAuth();
  const cartItems = useSelector(selectCartItems);
  const cartSubtotal = useSelector(selectCartSubtotal);
  const cartLoaded = useSelector(selectCartLoaded);
  const flow = useCheckoutFlow();

  const cartReady = authChecked && isAuthenticated && cartLoaded;

  // Bounce an empty cart back to /cart — but NOT once an order has been placed.
  // Placing the order commits and clears the server cart, so a just-emptied
  // cart with `flow.orderId` set is the success path heading to confirmation,
  // not an abandoned checkout. Without this guard the emptied-cart re-render
  // races the router.push('/order-confirmation/…') and lands on /cart instead.
  useEffect(() => {
    if (cartReady && cartItems.length === 0 && !flow.orderId) {
      router.replace('/cart');
    }
  }, [cartReady, cartItems.length, flow.orderId, router]);

  if (!authChecked || (isAuthenticated && !cartLoaded)) {
    return <PageLoader label="Đang tải trang thanh toán" />;
  }
  if (!isAuthenticated) return <PageLoader />;
  if (cartItems.length === 0) return <PageLoader />;

  return (
    <div className="bg-paper">
      <section className="mx-auto w-full px-5 py-8 sm:py-12 lg:px-10 lg:py-16">
        <header className="mb-10 border-b border-line pb-6">
          <h1 className="mb-6 text-display-lg text-ink">Thanh toán</h1>
          <CheckoutSteps currentStep={flow.step} />
        </header>

        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-14">
          <div className="min-w-0">
            {flow.step === 0 && (
              <ShippingStep
                initialAddress={flow.address}
                onContinue={(address) => {
                  flow.setAddress(address);
                  flow.goNext();
                }}
              />
            )}

            {flow.step === 1 && <DeliveryStep onContinue={flow.goNext} />}

            {flow.step === 2 && (
              <PaymentStep subtotal={cartSubtotal} onContinue={flow.goNext} />
            )}

            {flow.step === 3 && flow.address && (
              <ReviewStep
                items={cartItems}
                subtotal={cartSubtotal}
                address={flow.address}
                orderId={flow.orderId}
                idempotencyKey={flow.idempotencyKey}
                onOrderCreated={flow.setOrderId}
                onBack={flow.goBack}
              />
            )}
          </div>

          <CheckoutSummary subtotal={cartSubtotal} />
        </div>
      </section>
    </div>
  );
}
