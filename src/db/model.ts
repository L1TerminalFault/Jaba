import mongoose from "mongoose";

/// SYSTEM INVARIANTS FOR AGENTS:
/// 1. Stock mutations MUST run inside a `mongoose.startSession()` transaction.
/// 2. Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }` to prevent negative stock.
/// 3. `rawMaterialPrice` supplies default `unitPrice` on purchases & `unitCost` on production; `productPrice` supplies `unitPrice` on sales.
/// 4. Voiding a `COMPLETED` transaction (`status -> "VOIDED"`) MUST reverse its exact stock delta in a session.

/// Catalogues
/// The catalogue raw materials that get registered by the admin only
const rawMaterial = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    unit: { type: String, enum: ["g", "ml", "piece"], required: true },
    image: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/// The catalogue products that get produced with the raw materials
const outputProduct = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    image: { type: String, default: null },
    recipe: [
      {
        rawMaterial: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RawMaterial",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0.0001, "Quantity must be greater than 0"],
        },
      },
    ],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

/// Admin mutable price documents (subject to change)
const productPrice = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutputProduct",
      required: true,
      unique: true,
    },
    unitPrice: { type: mongoose.Schema.Types.Decimal128, required: true },
  },
  { timestamps: true },
);

const rawMaterialPrice = new mongoose.Schema(
  {
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
      unique: true,
    },
    unitPrice: { type: mongoose.Schema.Types.Decimal128, required: true },
  },
  { timestamps: true },
);

/// Inventory
/// Totals of remains of products and raw materials
/// Should always be updated as follows:
///   rawMaterialTransaction => + rawMaterialStock
///   productionEntry        => + productStock && - rawMaterialStock
///   saleTransaction        => - productStock
///
const rawMaterialStock = new mongoose.Schema(
  {
    rawMaterial: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RawMaterial",
      required: true,
      unique: true,
    },
    // Always in the material's canonical unit.
    quantity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

const productStock = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OutputProduct",
      required: true,
      unique: true,
    },
    quantity: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

/// Raw material transaction (when admin imports raw materials)
const rawMaterialTransaction = new mongoose.Schema(
  {
    materials: [
      {
        material: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "RawMaterial",
          required: true,
        },
        quantityBought: {
          type: Number,
          required: true,
          min: [0.0001, "Quantity must be greater than 0"],
        },
        unitPrice: { type: mongoose.Schema.Types.Decimal128, required: true },
      },
    ],

    note: String,
    signedBy: { type: String, required: true },
    status: {
      type: String,
      enum: ["COMPLETED", "VOIDED"],
      default: "COMPLETED",
    },
  },
  {
    timestamps: true,
    capped: {
      size: 5242880,
      max: 500,
    },
  }
);

rawMaterialTransaction.index({ status: 1, createdAt: -1 });
rawMaterialTransaction.index({ signedBy: 1, createdAt: -1 });
rawMaterialTransaction.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

/// Production (when production crew/chefs produce products using the raw materials)
const productionEntry = new mongoose.Schema(
  {
    products: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "OutputProduct",
          required: true,
        },
        quantityProduced: { type: Number, required: true, min: 1 },
        // Snapshot of the recipe used at production time.
        materialUsage: [
          {
            rawMaterial: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "RawMaterial",
              required: true,
            },
            // Total quantity consumed for this batch.
            quantityUsed: {
              type: Number,
              required: true,
              min: [0.0001, "Quantity must be greater than 0"],
            },
            unitCost: {
              type: mongoose.Schema.Types.Decimal128,
              required: true,
            },
          },
        ],
      },
    ],
    // ClerkId
    signedBy: { type: String, required: true },
    note: String,
    status: {
      type: String,
      enum: ["COMPLETED", "VOIDED"],
      default: "COMPLETED",
    },
  },
  {
    timestamps: true,
    capped: {
      size: 5242880,
      max: 500,
    },
  }
);

productionEntry.index({ status: 1, createdAt: -1 });
productionEntry.index({ signedBy: 1, createdAt: -1 });
productionEntry.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

/// Sale transaction (when sales sell products produced by chefs)
const saleTransaction = new mongoose.Schema(
  {
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "OutputProduct",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: [0.0001, "Quantity must be greater than 0"],
        },
        // Price snapshot at the time of sale.
        unitPrice: { type: mongoose.Schema.Types.Decimal128, required: true },
        // Cost snapshot at the time of sale (for accurate daily/weekly COGS & profit calculation)
        unitCost: { type: mongoose.Schema.Types.Decimal128 },
      },
    ],
    signedBy: { type: String, required: true },
    note: String,
    status: {
      type: String,
      enum: ["COMPLETED", "VOIDED"],
      default: "COMPLETED",
    },
  },
  {
    timestamps: true,
    capped: {
      size: 5242880,
      max: 500,
    },
  }
);

saleTransaction.index({ status: 1, createdAt: -1 });
saleTransaction.index({ signedBy: 1, createdAt: -1 });
saleTransaction.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

export const RawMaterial =
  mongoose.models.RawMaterial || mongoose.model("RawMaterial", rawMaterial);

export const OutputProduct =
  mongoose.models.OutputProduct ||
  mongoose.model("OutputProduct", outputProduct);

export const RawMaterialStock =
  mongoose.models.RawMaterialStock ||
  mongoose.model("RawMaterialStock", rawMaterialStock);

export const ProductStock =
  mongoose.models.ProductStock || mongoose.model("ProductStock", productStock);

export const RawMaterialTransaction =
  mongoose.models.RawMaterialTransaction ||
  mongoose.model("RawMaterialTransaction", rawMaterialTransaction);

export const ProductionEntry =
  mongoose.models.ProductionEntry ||
  mongoose.model("ProductionEntry", productionEntry);

export const SaleTransaction =
  mongoose.models.SaleTransaction ||
  mongoose.model("SaleTransaction", saleTransaction);

export const ProductPrice =
  mongoose.models.ProductPrice || mongoose.model("ProductPrice", productPrice);

export const RawMaterialPrice =
  mongoose.models.RawMaterialPrice ||
  mongoose.model("RawMaterialPrice", rawMaterialPrice);
