export const UNIT_CODES = ["PIECE", "PACK"] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28] as const;
export type GstRate = (typeof GST_RATES)[number];

/** One row of the list (`GET /products`): no image data, only whether there is an image. */
export interface ProductListItem {
  id: string;
  name: string;
  unit: UnitCode;
  /** Paise (₹1 = 100). */
  unitPrice: number;
  hsnCode: string;
  gstRate: GstRate;
  stock: { qtyOnHand: number };
  isActive: boolean;
  hasImage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPage {
  items: ProductListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ProductImage {
  fileId: string;
  mime: string;
  size: number;
}

/** A whole product (`GET /products/:id`). */
export interface Product extends Omit<ProductListItem, "hasImage"> {
  image?: ProductImage;
  isDeleted: boolean;
  createdBy?: string;
  updatedBy?: string;
}

/** What the create form sends. Stock and the active flag are never sent on create. */
export interface ProductInput {
  name: string;
  unit: UnitCode;
  unitPrice: number;
  hsnCode: string;
  gstRate: GstRate;
  /** Pieces on hand at creation; left out when 0. Only accepted on create. */
  openingStock?: number;
}

/** An edit may send any subset, plus `isActive`; never stock. */
export type ProductUpdate = Partial<Omit<ProductInput, "openingStock">> & { isActive?: boolean };

/** One line of a product's stock history (`GET /products/:id/stock-movements`). */
export interface StockMovement {
  id: string;
  type: "OPENING" | "STOCK_IN" | "SALE" | "SALE_CANCEL" | "ADJUSTMENT";
  quantity: number;
  balanceAfter: number;
  invoiceId?: string;
  note?: string;
  createdAt: string;
  createdBy?: { id: string; name: string };
}

/** The answer to a stock-in or adjustment: the product with its new stock, and the movement written. */
export interface StockEntryResult {
  product: Product;
  movement: StockMovement;
}

export interface StockMovementPage {
  items: StockMovement[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}
