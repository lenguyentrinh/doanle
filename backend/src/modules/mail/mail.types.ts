// Plain payload shapes sent over Kafka to mail-service. Must be kept in
// sync by hand with mail-service/src/mail/mail.types.ts — there is no shared
// package between the two services, which is itself the point: crossing a
// service boundary trades compile-time type sharing for a hand-maintained
// wire contract.

export interface OtpEmailPayload {
  to: string;
  code: string;
  expiresAt: string;
}

export interface OrderConfirmationItem {
  productName: string;
  quantity: number;
  price: number;
}

export interface OrderConfirmationPayload {
  orderId: number;
  toEmail: string;
  items: OrderConfirmationItem[];
  shippingAddress: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
  };
  subtotal: number;
  shippingFee: number;
  tax: number;
  total: number;
}

export interface OrderStatusUpdatePayload {
  orderId: number;
  toEmail: string;
  status: string;
}
