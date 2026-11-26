/**
 * Type definitions and contracts for JABA inventory and production management system.
 * Based on system models and invariants defined in src/db/model.ts.
 */

export type RawMaterialUnit = "g" | "ml" | "piece";

export type TransactionStatus = "COMPLETED" | "VOIDED";

// ==========================================
// DTOs (Safe, Serialized Plain Objects for Frontend)
// ==========================================

export interface RawMaterialDTO {
  _id: string;
  name: string;
  unit: RawMaterialUnit;
  image?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentPrice?: number;
  currentStock?: number;
}

export interface RecipeItemDTO {
  rawMaterial: string | RawMaterialDTO;
  quantity: number;
}

export interface OutputProductDTO {
  _id: string;
  name: string;
  image?: string | null;
  recipe: RecipeItemDTO[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  currentPrice?: number;
  currentStock?: number;
}

export interface ProductPriceDTO {
  _id: string;
  product: string | OutputProductDTO;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialPriceDTO {
  _id: string;
  rawMaterial: string | RawMaterialDTO;
  unitPrice: number;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialStockDTO {
  _id: string;
  rawMaterial: string | RawMaterialDTO;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  valuation?: number;
}

export interface ProductStockDTO {
  _id: string;
  product: string | OutputProductDTO;
  quantity: number;
  createdAt: string;
  updatedAt: string;
  valuation?: number;
}

export interface RawMaterialTransactionItemDTO {
  material: string | RawMaterialDTO;
  quantityBought: number;
  unitPrice: number;
  subtotal?: number;
}

export interface RawMaterialTransactionDTO {
  _id: string;
  materials: RawMaterialTransactionItemDTO[];
  note?: string;
  signedBy: string;
  status: TransactionStatus;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialUsageDTO {
  rawMaterial: string | RawMaterialDTO;
  quantityUsed: number;
  unitCost: number;
  subtotal?: number;
}

export interface ProductionItemDTO {
  product: string | OutputProductDTO;
  quantityProduced: number;
  materialUsage: MaterialUsageDTO[];
  batchCost?: number;
}

export interface ProductionEntryDTO {
  _id: string;
  products: ProductionItemDTO[];
  signedBy: string;
  note?: string;
  status: TransactionStatus;
  totalProductionCost: number;
  totalUnitsProduced: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItemDTO {
  product: string | OutputProductDTO;
  quantity: number;
  unitPrice: number;
  unitCost?: number;
  subtotal?: number;
  profit?: number;
}

export interface SaleTransactionDTO {
  _id: string;
  items: SaleItemDTO[];
  signedBy: string;
  note?: string;
  status: TransactionStatus;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  totalItemsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DailyCarryOverItemDTO {
  product: string | OutputProductDTO;
  quantityRemaining: number;
  unitCost: number;
  valuation: number;
}

export interface DailyCarryOverDTO {
  _id?: string;
  date: string;
  items: DailyCarryOverItemDTO[];
  totalQuantity: number;
  totalValuation: number;
  updatedAt: string;
}

// ==========================================
// Input / Mutation Payloads
// ==========================================

export interface CreateRawMaterialInput {
  name: string;
  unit: RawMaterialUnit;
  image?: string;
  isActive?: boolean;
  initialPrice?: number;
  initialStock?: number;
}

export interface UpdateRawMaterialInput {
  name?: string;
  unit?: RawMaterialUnit;
  image?: string;
  isActive?: boolean;
}

export interface RecipeItemInput {
  rawMaterial: string;
  quantity: number;
}

export interface CreateOutputProductInput {
  name: string;
  image?: string | null;
  recipe: RecipeItemInput[];
  isActive?: boolean;
  initialPrice?: number;
}

export interface UpdateOutputProductInput {
  name?: string;
  image?: string | null;
  recipe?: RecipeItemInput[];
  isActive?: boolean;
}

export interface SetPriceInput {
  targetId: string; // product ID or rawMaterial ID
  unitPrice: number;
}

export interface RawMaterialPurchaseItemInput {
  material: string;
  quantityBought: number;
  unitPrice?: number; // Optional: defaults to RawMaterialPrice
}

export interface CreateRawMaterialTransactionInput {
  materials: RawMaterialPurchaseItemInput[];
  note?: string;
  signedBy?: string; // If omitted, resolved from Clerk auth
}

export interface ProductionMaterialUsageInput {
  rawMaterial: string;
  quantityUsed: number;
  unitCost?: number; // Optional: defaults to RawMaterialPrice
}

export interface ProductionProductInput {
  product: string;
  quantityProduced: number;
  materialUsage?: ProductionMaterialUsageInput[]; // Optional: defaults to product.recipe * quantityProduced
}

export interface CreateProductionEntryInput {
  products: ProductionProductInput[];
  note?: string;
  signedBy?: string; // If omitted, resolved from Clerk auth
}

export interface SaleItemInput {
  product: string;
  quantity: number;
  unitPrice?: number; // Optional: defaults to ProductPrice
  unitCost?: number; // Optional: defaults to calculated product recipe cost
}

export interface CreateSaleTransactionInput {
  items: SaleItemInput[];
  note?: string;
  signedBy?: string; // If omitted, resolved from Clerk auth
}

export interface VoidTransactionInput {
  id: string;
  reason?: string;
  signedBy?: string;
}

// ==========================================
// Filter & Pagination Query Params
// ==========================================

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DateRangeFilter {
  startDate?: string | Date;
  endDate?: string | Date;
}

export interface TransactionFilterParams extends PaginationParams, DateRangeFilter {
  status?: TransactionStatus;
  signedBy?: string;
  search?: string;
  itemId?: string; // product or raw material ID
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// ==========================================
// Dashboard & Analytics
// ==========================================

export interface LowStockAlert {
  id: string;
  name: string;
  type: "raw_material" | "product";
  unit?: RawMaterialUnit;
  currentStock: number;
  threshold: number;
}

export interface DailyRawMaterialUsageItem {
  rawMaterialId: string;
  name: string;
  unit: RawMaterialUnit;
  usedToday: number;
  usageCostToday: number;
  currentStock: number;
  monthlyPurchased: number;
  recommendedDailyLimit: number;
  usageRatio: number;
  isOverDailyBudget: boolean;
  estimatedDaysLeftAtTodayPace: number | null;
}

export interface DashboardSummaryDTO {
  totalRawMaterialsCount: number;
  totalProductsCount: number;
  totalRawMaterialStockValue: number;
  totalProductStockValue: number;
  todaySalesRevenue: number;
  todayProfit: number;
  todayProductionCost: number;
  todaySalesCount: number;
  todayUnitsSold: number;
  todayProductionCount: number;
  todayUnitsProduced: number;
  weeklySalesRevenue: number;
  weeklyProfit: number;
  monthlySalesRevenue: number;
  monthlyProfit: number;
  dailyCarryOver?: DailyCarryOverDTO;
  dailyRawMaterialUsage: DailyRawMaterialUsageItem[];
  dailyChart: Array<{ date: string; revenue: number; cost: number; net: number }>;
  lowStockAlerts: LowStockAlert[];
}

export interface SalesAnalyticsReport {
  period: { startDate?: string; endDate?: string };
  totalRevenue: number;
  totalTransactionsCount: number;
  completedTransactionsCount: number;
  voidedTransactionsCount: number;
  totalItemsSold: number;
  topSellingProducts: Array<{
    productId: string;
    productName: string;
    quantitySold: number;
    totalRevenue: number;
  }>;
}

export interface ProductionAnalyticsReport {
  period: { startDate?: string; endDate?: string };
  totalBatchesCount: number;
  completedBatchesCount: number;
  voidedBatchesCount: number;
  totalUnitsProduced: number;
  totalRawMaterialCost: number;
  productBreakdown: Array<{
    productId: string;
    productName: string;
    quantityProduced: number;
    materialCost: number;
  }>;
}

// ==========================================
// Simplified Human-Readable Reports
// ==========================================

export type SimpleReportType = "PURCHASE" | "SALE" | "PRODUCTION";

export interface SimpleReportItemSummary {
  name: string;
  quantityLabel: string;
}

export interface SimpleReportEventDTO {
  id: string;
  type: SimpleReportType;
  status: TransactionStatus;
  headline: string;
  summary: string;
  items: SimpleReportItemSummary[];
  amount: number;
  note?: string;
  timestamp: string;
  signedBy?: string;
  actorName?: string;
  actorImageUrl?: string;
}

export interface SimpleReportsResult {
  items: SimpleReportEventDTO[];
  counts: {
    all: number;
    purchases: number;
    sales: number;
    productions: number;
  };
}

// ==========================================
// Server Action Result Standard
// ==========================================

export type ActionResult<T = void> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code?: string;
      details?: unknown;
    };
