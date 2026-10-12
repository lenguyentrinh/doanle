// Plain payload shapes carried over Kafka by backend's
// MailService adapter (backend/src/modules/mail/mail.service.ts) — this
// service can't import backend's TypeORM `Order` entity across the process
// boundary, so the contract is these hand-kept-in-sync interfaces instead.

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface ShippingAddressSnapshot {
  firstName: string;
  lastName: string;
  street: string;
  city: string;
}

export interface OrderConfirmationItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface OtpEmailPayload {
  to: string;
  code: string;
  expiresAt: string;
}

export interface OrderConfirmationPayload {
  orderId: number;
  toEmail: string;
  items: OrderConfirmationItem[];
  shippingAddress: ShippingAddressSnapshot;
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
}

export interface OrderStatusUpdatePayload {
  orderId: number;
  toEmail: string;
  status: OrderStatus;
}
