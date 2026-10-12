// Shape of the post-order stock snapshot handed off to InventoryService
// (see ../inventory/inventory.service.ts) for low-stock alerting.
// All ids are ObjectId hex strings.

export interface OrderCreatedItem {
  productId: string;
  productName: string;
  quantityOrdered: number;
  remainingStock: number;
}

export interface OrderCreatedPayload {
  orderId: string;
  items: OrderCreatedItem[];
}
