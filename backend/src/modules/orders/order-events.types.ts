// Shape of the post-order stock snapshot handed off to InventoryService
// (see ../inventory/inventory.service.ts) for low-stock alerting.

export interface OrderCreatedItem {
  productId: number;
  productName: string;
  quantityOrdered: number;
  remainingStock: number;
}

export interface OrderCreatedPayload {
  orderId: number;
  items: OrderCreatedItem[];
}
