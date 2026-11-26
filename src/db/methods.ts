import mongoose from "mongoose";
import { dbConnect } from "./connection";
import {
  RawMaterial,
  OutputProduct,
  ProductPrice,
  RawMaterialPrice,
  RawMaterialStock,
  ProductStock,
  RawMaterialTransaction,
  ProductionEntry,
  SaleTransaction,
} from "./model";
import {
  withTransaction,
  InsufficientStockError,
  NotFoundError,
  ValidationError,
} from "@/lib/transactions";
import { toPlainObject, decimalToNumber } from "@/lib/serialize";
import { formatWithAutoUnit } from "@/lib/units";
import { logger } from "@/lib/logger";
import type {
  RawMaterialDTO,
  OutputProductDTO,
  ProductPriceDTO,
  MaterialUsageDTO,
  RawMaterialPriceDTO,
  RawMaterialStockDTO,
  ProductStockDTO,
  RawMaterialTransactionDTO,
  ProductionEntryDTO,
  SaleTransactionDTO,
  CreateRawMaterialInput,
  UpdateRawMaterialInput,
  CreateOutputProductInput,
  UpdateOutputProductInput,
  CreateRawMaterialTransactionInput,
  CreateProductionEntryInput,
  CreateSaleTransactionInput,
  VoidTransactionInput,
  TransactionFilterParams,
  PaginatedResult,
  DashboardSummaryDTO,
  DailyCarryOverDTO,
  DailyRawMaterialUsageItem,
  LowStockAlert,
  SalesAnalyticsReport,
  ProductionAnalyticsReport,
  SimpleReportEventDTO,
  SimpleReportsResult,
} from "@/types";

// ============================================================================
// 1. RAW MATERIALS CATALOGUE
// ============================================================================

export async function createRawMaterial(
  input: CreateRawMaterialInput,
): Promise<RawMaterialDTO> {
  await dbConnect();

  if (!input.name || !input.name.trim()) {
    throw new ValidationError("Raw material name is required.");
  }
  if (!input.unit || !["g", "ml", "piece"].includes(input.unit)) {
    throw new ValidationError(
      "Valid unit ('g', 'ml', or 'piece') is required.",
    );
  }

  const existing = await RawMaterial.findOne({
    name: { $regex: new RegExp(`^${input.name.trim()}$`, "i") },
  });
  if (existing) {
    throw new ValidationError(
      `Raw material with name "${input.name.trim()}" already exists.`,
    );
  }

  const material = await RawMaterial.create({
    name: input.name.trim(),
    unit: input.unit,
    image: input.image,
    isActive: input.isActive ?? true,
  });

  // If initial price provided, register default in RawMaterialPrice
  let currentPrice: number | undefined;
  if (input.initialPrice !== undefined && input.initialPrice >= 0) {
    await RawMaterialPrice.create({
      rawMaterial: material._id,
      unitPrice: mongoose.Types.Decimal128.fromString(
        input.initialPrice.toString(),
      ),
    });
    currentPrice = input.initialPrice;
  }

  // If initial stock provided, seed RawMaterialStock
  let currentStock = 0;
  if (input.initialStock !== undefined && input.initialStock > 0) {
    await RawMaterialStock.create({
      rawMaterial: material._id,
      quantity: input.initialStock,
    });
    currentStock = input.initialStock;
  } else {
    await RawMaterialStock.create({
      rawMaterial: material._id,
      quantity: 0,
    });
  }

  const plain = toPlainObject<RawMaterialDTO>(material);
  plain.currentPrice = currentPrice;
  plain.currentStock = currentStock;
  return plain;
}

export async function updateRawMaterial(
  id: string,
  input: UpdateRawMaterialInput,
): Promise<RawMaterialDTO> {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid raw material ID.");
  }

  const updateFields: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new ValidationError("Raw material name cannot be empty.");
    }
    const duplicate = await RawMaterial.findOne({
      name: { $regex: new RegExp(`^${input.name.trim()}$`, "i") },
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new ValidationError(
        `Another raw material with name "${input.name.trim()}" already exists.`,
      );
    }
    updateFields.name = input.name.trim();
  }

  if (input.unit !== undefined) {
    if (!["g", "ml", "piece"].includes(input.unit)) {
      throw new ValidationError(
        "Valid unit ('g', 'ml', or 'piece') is required.",
      );
    }
    updateFields.unit = input.unit;
  }

  if (input.image !== undefined) updateFields.image = input.image;
  if (input.isActive !== undefined) updateFields.isActive = input.isActive;

  const updated = await RawMaterial.findByIdAndUpdate(id, updateFields, {
    new: true,
  });
  if (!updated) {
    throw new NotFoundError(`Raw material with ID "${id}" was not found.`);
  }

  return await getRawMaterialById(id);
}

export async function toggleRawMaterialStatus(
  id: string,
  isActive?: boolean,
): Promise<RawMaterialDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid raw material ID.");
  }

  const material = await RawMaterial.findById(id);
  if (!material) {
    throw new NotFoundError(`Raw material with ID "${id}" was not found.`);
  }

  material.isActive = isActive !== undefined ? isActive : !material.isActive;
  await material.save();

  return await getRawMaterialById(id);
}

export async function getRawMaterialById(id: string): Promise<RawMaterialDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid raw material ID.");
  }

  const material = await RawMaterial.findById(id).lean();
  if (!material) {
    throw new NotFoundError(`Raw material with ID "${id}" was not found.`);
  }

  const [priceDoc, stockDoc] = await Promise.all([
    RawMaterialPrice.findOne({ rawMaterial: id }).lean(),
    RawMaterialStock.findOne({ rawMaterial: id }).lean(),
  ]);

  const plain = toPlainObject<RawMaterialDTO>(material);
  plain.currentPrice = priceDoc
    ? decimalToNumber(priceDoc.unitPrice)
    : undefined;
  plain.currentStock = stockDoc ? stockDoc.quantity : 0;
  return plain;
}

export async function listRawMaterials(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<RawMaterialDTO>> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params?.isActive !== undefined) {
    filter.isActive = params.isActive;
  }
  if (params?.search && params.search.trim()) {
    filter.name = { $regex: params.search.trim(), $options: "i" };
  }

  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 50));
  const skip = (page - 1) * limit;

  const [total, materials] = await Promise.all([
    RawMaterial.countDocuments(filter),
    RawMaterial.find(filter).sort({ name: 1 }).skip(skip).limit(limit).lean(),
  ]);

  const materialIds = materials.map((m) => m._id);

  const [prices, stocks] = await Promise.all([
    RawMaterialPrice.find({ rawMaterial: { $in: materialIds } }).lean(),
    RawMaterialStock.find({ rawMaterial: { $in: materialIds } }).lean(),
  ]);

  const priceMap = new Map(
    prices.map((p) => [p.rawMaterial.toString(), decimalToNumber(p.unitPrice)]),
  );
  const stockMap = new Map(
    stocks.map((s) => [s.rawMaterial.toString(), s.quantity]),
  );

  const items: RawMaterialDTO[] = materials.map((m) => {
    const plain = toPlainObject<RawMaterialDTO>(m);
    plain.currentPrice = priceMap.get(m._id.toString());
    plain.currentStock = stockMap.get(m._id.toString()) ?? 0;
    return plain;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================================
// 2. OUTPUT PRODUCTS CATALOGUE & RECIPES
// ============================================================================

export async function createOutputProduct(
  input: CreateOutputProductInput,
): Promise<OutputProductDTO> {
  await dbConnect();

  if (!input.name || !input.name.trim()) {
    throw new ValidationError("Product name is required.");
  }
  if (
    !input.recipe ||
    !Array.isArray(input.recipe) ||
    input.recipe.length === 0
  ) {
    throw new ValidationError(
      "A product recipe with at least one ingredient is required.",
    );
  }

  const existing = await OutputProduct.findOne({
    name: { $regex: new RegExp(`^${input.name.trim()}$`, "i") },
  });
  if (existing) {
    throw new ValidationError(
      `Product with name "${input.name.trim()}" already exists.`,
    );
  }

  // Validate each ingredient in the recipe
  const rawMaterialIds = input.recipe.map((r) => r.rawMaterial);
  const materials = await RawMaterial.find({ _id: { $in: rawMaterialIds } });
  if (materials.length !== rawMaterialIds.length) {
    throw new ValidationError(
      "One or more raw materials specified in recipe do not exist.",
    );
  }

  const formattedRecipe = input.recipe.map((item) => {
    if (!item.quantity || item.quantity < 0.0001) {
      throw new ValidationError(
        `Quantity for raw material must be greater than 0.`,
      );
    }
    return {
      rawMaterial: new mongoose.Types.ObjectId(item.rawMaterial),
      quantity: Number(item.quantity),
    };
  });

  const product = await OutputProduct.create({
    name: input.name.trim(),
    image: input.image || null,
    recipe: formattedRecipe,
    isActive: input.isActive ?? true,
  });

  // If initial price supplied, create ProductPrice document
  let currentPrice: number | undefined;
  if (input.initialPrice !== undefined && input.initialPrice >= 0) {
    await ProductPrice.create({
      product: product._id,
      unitPrice: mongoose.Types.Decimal128.fromString(
        input.initialPrice.toString(),
      ),
    });
    currentPrice = input.initialPrice;
  }

  // Initialize ProductStock to 0
  await ProductStock.findOneAndUpdate(
    { product: product._id },
    { $setOnInsert: { quantity: 0 } },
    { upsert: true },
  );

  return await getOutputProductById(product._id.toString());
}

export async function updateOutputProduct(
  id: string,
  input: UpdateOutputProductInput,
): Promise<OutputProductDTO> {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid product ID.");
  }

  const updateFields: Record<string, unknown> = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) {
      throw new ValidationError("Product name cannot be empty.");
    }
    const duplicate = await OutputProduct.findOne({
      name: { $regex: new RegExp(`^${input.name.trim()}$`, "i") },
      _id: { $ne: id },
    });
    if (duplicate) {
      throw new ValidationError(
        `Another product with name "${input.name.trim()}" already exists.`,
      );
    }
    updateFields.name = input.name.trim();
  }

  if (input.image !== undefined) updateFields.image = input.image;
  if (input.isActive !== undefined) updateFields.isActive = input.isActive;

  if (input.recipe !== undefined) {
    if (!Array.isArray(input.recipe) || input.recipe.length === 0) {
      throw new ValidationError(
        "Product recipe must have at least one ingredient.",
      );
    }
    const rawMaterialIds = input.recipe.map((r) => r.rawMaterial);
    const materials = await RawMaterial.find({ _id: { $in: rawMaterialIds } });
    if (materials.length !== rawMaterialIds.length) {
      throw new ValidationError(
        "One or more raw materials specified in recipe do not exist.",
      );
    }
    updateFields.recipe = input.recipe.map((item) => {
      if (!item.quantity || item.quantity < 0.0001) {
        throw new ValidationError("Quantity in recipe must be greater than 0.");
      }
      return {
        rawMaterial: new mongoose.Types.ObjectId(item.rawMaterial),
        quantity: Number(item.quantity),
      };
    });
  }

  const updated = await OutputProduct.findByIdAndUpdate(id, updateFields, {
    new: true,
  });
  if (!updated) {
    throw new NotFoundError(`Product with ID "${id}" was not found.`);
  }

  return await getOutputProductById(id);
}

export async function toggleOutputProductStatus(
  id: string,
  isActive?: boolean,
): Promise<OutputProductDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid product ID.");
  }

  const product = await OutputProduct.findById(id);
  if (!product) {
    throw new NotFoundError(`Product with ID "${id}" was not found.`);
  }

  product.isActive = isActive !== undefined ? isActive : !product.isActive;
  await product.save();

  return await getOutputProductById(id);
}

export async function getOutputProductById(
  id: string,
): Promise<OutputProductDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid product ID.");
  }

  const product = await OutputProduct.findById(id)
    .populate("recipe.rawMaterial")
    .lean();
  if (!product) {
    throw new NotFoundError(`Product with ID "${id}" was not found.`);
  }

  const [priceDoc, stockDoc] = await Promise.all([
    ProductPrice.findOne({ product: id }).lean(),
    ProductStock.findOne({ product: id }).lean(),
  ]);

  const plain = toPlainObject<OutputProductDTO>(product);
  plain.currentPrice = priceDoc
    ? decimalToNumber(priceDoc.unitPrice)
    : undefined;
  plain.currentStock = stockDoc ? stockDoc.quantity : 0;
  return plain;
}

export async function listOutputProducts(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}): Promise<PaginatedResult<OutputProductDTO>> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params?.isActive !== undefined) {
    filter.isActive = params.isActive;
  }
  if (params?.search && params.search.trim()) {
    filter.name = { $regex: params.search.trim(), $options: "i" };
  }

  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 50));
  const skip = (page - 1) * limit;

  const [total, products] = await Promise.all([
    OutputProduct.countDocuments(filter),
    OutputProduct.find(filter)
      .populate("recipe.rawMaterial")
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const productIds = products.map((p) => p._id);

  const [prices, stocks] = await Promise.all([
    ProductPrice.find({ product: { $in: productIds } }).lean(),
    ProductStock.find({ product: { $in: productIds } }).lean(),
  ]);

  const priceMap = new Map(
    prices.map((p) => [p.product.toString(), decimalToNumber(p.unitPrice)]),
  );
  const stockMap = new Map(
    stocks.map((s) => [s.product.toString(), s.quantity]),
  );

  const items: OutputProductDTO[] = products.map((p) => {
    const plain = toPlainObject<OutputProductDTO>(p);
    plain.currentPrice = priceMap.get(p._id.toString());
    plain.currentStock = stockMap.get(p._id.toString()) ?? 0;
    return plain;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================================
// 3. ADMIN MUTABLE PRICE DOCUMENTS
// ============================================================================

export async function setProductPrice(
  productId: string,
  unitPrice: number,
): Promise<ProductPriceDTO> {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ValidationError("Invalid product ID.");
  }
  if (unitPrice === undefined || unitPrice < 0) {
    throw new ValidationError("Unit price must be a non-negative number.");
  }

  const productExists = await OutputProduct.exists({ _id: productId });
  if (!productExists) {
    throw new NotFoundError(`Product with ID "${productId}" was not found.`);
  }

  const doc = await ProductPrice.findOneAndUpdate(
    { product: productId },
    {
      unitPrice: mongoose.Types.Decimal128.fromString(unitPrice.toString()),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return toPlainObject<ProductPriceDTO>(doc);
}

export async function setRawMaterialPrice(
  rawMaterialId: string,
  unitPrice: number,
): Promise<RawMaterialPriceDTO> {
  await dbConnect();

  if (!mongoose.Types.ObjectId.isValid(rawMaterialId)) {
    throw new ValidationError("Invalid raw material ID.");
  }
  if (unitPrice === undefined || unitPrice < 0) {
    throw new ValidationError("Unit price must be a non-negative number.");
  }

  const materialExists = await RawMaterial.exists({ _id: rawMaterialId });
  if (!materialExists) {
    throw new NotFoundError(
      `Raw material with ID "${rawMaterialId}" was not found.`,
    );
  }

  const doc = await RawMaterialPrice.findOneAndUpdate(
    { rawMaterial: rawMaterialId },
    {
      unitPrice: mongoose.Types.Decimal128.fromString(unitPrice.toString()),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return toPlainObject<RawMaterialPriceDTO>(doc);
}

export async function getProductPrice(
  productId: string,
): Promise<number | null> {
  await dbConnect();
  const doc = await ProductPrice.findOne({ product: productId }).lean();
  return doc ? decimalToNumber(doc.unitPrice) : null;
}

export async function getRawMaterialPrice(
  rawMaterialId: string,
): Promise<number | null> {
  await dbConnect();
  const doc = await RawMaterialPrice.findOne({
    rawMaterial: rawMaterialId,
  }).lean();
  return doc ? decimalToNumber(doc.unitPrice) : null;
}

// ============================================================================
// 4. INVENTORY / STOCKS
// ============================================================================

export async function getRawMaterialStock(
  rawMaterialId: string,
): Promise<RawMaterialStockDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(rawMaterialId)) {
    throw new ValidationError("Invalid raw material ID.");
  }

  let stockDoc = await RawMaterialStock.findOne({ rawMaterial: rawMaterialId })
    .populate("rawMaterial")
    .lean();

  if (!stockDoc) {
    const material = await RawMaterial.findById(rawMaterialId);
    if (!material) {
      throw new NotFoundError(
        `Raw material with ID "${rawMaterialId}" not found.`,
      );
    }
    const created = await RawMaterialStock.create({
      rawMaterial: rawMaterialId,
      quantity: 0,
    });
    stockDoc = await RawMaterialStock.findById(created._id)
      .populate("rawMaterial")
      .lean();
  }

  const priceDoc = await RawMaterialPrice.findOne({
    rawMaterial: rawMaterialId,
  }).lean();
  const price = priceDoc ? decimalToNumber(priceDoc.unitPrice) : 0;

  const plain = toPlainObject<RawMaterialStockDTO>(stockDoc);
  plain.valuation = plain.quantity * price;
  return plain;
}

export async function getProductStock(
  productId: string,
): Promise<ProductStockDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new ValidationError("Invalid product ID.");
  }

  let stockDoc = await ProductStock.findOne({ product: productId })
    .populate("product")
    .lean();

  if (!stockDoc) {
    const product = await OutputProduct.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product with ID "${productId}" not found.`);
    }
    const created = await ProductStock.create({
      product: productId,
      quantity: 0,
    });
    stockDoc = await ProductStock.findById(created._id)
      .populate("product")
      .lean();
  }

  const priceDoc = await ProductPrice.findOne({ product: productId }).lean();
  const price = priceDoc ? decimalToNumber(priceDoc.unitPrice) : 0;

  const plain = toPlainObject<ProductStockDTO>(stockDoc);
  plain.valuation = plain.quantity * price;
  return plain;
}

export async function listAllStocks(): Promise<{
  rawMaterials: RawMaterialStockDTO[];
  products: ProductStockDTO[];
}> {
  await dbConnect();

  const [rawStocks, prodStocks, rawPrices, prodPrices] = await Promise.all([
    RawMaterialStock.find().populate("rawMaterial").lean(),
    ProductStock.find().populate("product").lean(),
    RawMaterialPrice.find().lean(),
    ProductPrice.find().lean(),
  ]);

  const rawPriceMap = new Map(
    rawPrices.map((p) => [
      p.rawMaterial.toString(),
      decimalToNumber(p.unitPrice),
    ]),
  );
  const prodPriceMap = new Map(
    prodPrices.map((p) => [p.product.toString(), decimalToNumber(p.unitPrice)]),
  );

  const rawMaterials: RawMaterialStockDTO[] = rawStocks.map((s) => {
    const plain = toPlainObject<RawMaterialStockDTO>(s);
    const matId =
      typeof s.rawMaterial === "object" &&
      s.rawMaterial !== null &&
      "_id" in s.rawMaterial
        ? (s.rawMaterial as { _id: { toString: () => string } })._id.toString()
        : s.rawMaterial?.toString() || "";
    const price = rawPriceMap.get(matId) || 0;
    plain.valuation = plain.quantity * price;
    return plain;
  });

  const products: ProductStockDTO[] = prodStocks.map((s) => {
    const plain = toPlainObject<ProductStockDTO>(s);
    const prodId =
      typeof s.product === "object" && s.product !== null && "_id" in s.product
        ? (s.product as { _id: { toString: () => string } })._id.toString()
        : s.product?.toString() || "";
    const price = prodPriceMap.get(prodId) || 0;
    plain.valuation = plain.quantity * price;
    return plain;
  });

  return { rawMaterials, products };
}

// ============================================================================
// 5. RAW MATERIAL TRANSACTION (PURCHASES / IMPORTS)
//
// SYSTEM INVARIANTS:
// 1. Stock mutations MUST run inside a `mongoose.startSession()` transaction.
// 2. Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }`.
// 3. `rawMaterialPrice` supplies default `unitPrice` on purchases.
// 4. Voiding a `COMPLETED` transaction MUST reverse its exact stock delta.
// Inventory rule: rawMaterialTransaction => + rawMaterialStock
// ============================================================================

export async function createRawMaterialTransaction(
  input: CreateRawMaterialTransactionInput,
): Promise<RawMaterialTransactionDTO> {
  if (
    !input.materials ||
    !Array.isArray(input.materials) ||
    input.materials.length === 0
  ) {
    throw new ValidationError("At least one raw material item is required.");
  }
  if (!input.signedBy || !input.signedBy.trim()) {
    throw new ValidationError(
      "Transaction must be signed by an authorized user (signedBy).",
    );
  }

  return await withTransaction(async (session) => {
    const itemsSnapshot: Array<{
      material: mongoose.Types.ObjectId;
      quantityBought: number;
      unitPrice: mongoose.Types.Decimal128;
    }> = [];

    let totalCost = 0;

    for (const item of input.materials) {
      if (!mongoose.Types.ObjectId.isValid(item.material)) {
        throw new ValidationError(
          `Invalid raw material ID: "${item.material}".`,
        );
      }
      if (!item.quantityBought || item.quantityBought < 0.0001) {
        throw new ValidationError("Quantity bought must be greater than 0.");
      }

      const materialDoc = await RawMaterial.findById(item.material).session(
        session,
      );
      if (!materialDoc) {
        throw new NotFoundError(
          `Raw material with ID "${item.material}" not found.`,
        );
      }

      // Invariant 3: rawMaterialPrice supplies default unitPrice on purchases if omitted
      let priceNum = item.unitPrice;
      if (priceNum === undefined || priceNum === null) {
        const defaultPriceDoc = await RawMaterialPrice.findOne({
          rawMaterial: item.material,
        }).session(session);

        if (!defaultPriceDoc) {
          throw new ValidationError(
            `No unitPrice provided and no default price configured in RawMaterialPrice for "${materialDoc.name}".`,
          );
        }
        priceNum = decimalToNumber(defaultPriceDoc.unitPrice);
      }

      if (priceNum < 0) {
        throw new ValidationError("Unit price cannot be negative.");
      }

      itemsSnapshot.push({
        material: new mongoose.Types.ObjectId(item.material),
        quantityBought: Number(item.quantityBought),
        unitPrice: mongoose.Types.Decimal128.fromString(priceNum.toString()),
      });

      totalCost += Number(item.quantityBought) * priceNum;

      // Invariant 1: Stock mutations run inside session
      // Inventory: rawMaterialTransaction => + rawMaterialStock
      await RawMaterialStock.findOneAndUpdate(
        { rawMaterial: item.material },
        { $inc: { quantity: Number(item.quantityBought) } },
        { upsert: true, session, new: true, setDefaultsOnInsert: true },
      );
    }

    const [txDoc] = await RawMaterialTransaction.create(
      [
        {
          materials: itemsSnapshot,
          note: input.note?.trim(),
          signedBy: input.signedBy?.trim() || "",
          status: "COMPLETED",
        },
      ],
      { session },
    );

    const populated = await RawMaterialTransaction.findById(txDoc._id)
      .populate("materials.material")
      .session(session)
      .lean();

    const plain = toPlainObject<RawMaterialTransactionDTO>(populated);
    plain.totalCost = totalCost;
    return plain;
  });
}

export async function voidRawMaterialTransaction(
  input: VoidTransactionInput,
): Promise<RawMaterialTransactionDTO> {
  if (!mongoose.Types.ObjectId.isValid(input.id)) {
    throw new ValidationError("Invalid transaction ID.");
  }

  return await withTransaction(async (session) => {
    const tx = await RawMaterialTransaction.findById(input.id).session(session);
    if (!tx) {
      throw new NotFoundError(
        `Raw material transaction "${input.id}" not found.`,
      );
    }

    if (tx.status === "VOIDED") {
      throw new ValidationError("This transaction has already been voided.");
    }
    if (tx.status !== "COMPLETED") {
      throw new ValidationError(
        `Cannot void transaction with status "${tx.status}".`,
      );
    }

    // Invariant 4: Reverse its exact stock delta in a session.
    // Invariant 2: Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }` to prevent negative stock.
    for (const item of tx.materials) {
      const qtyToRevert = item.quantityBought;
      const matId = item.material;

      const updatedStock = await RawMaterialStock.findOneAndUpdate(
        { rawMaterial: matId, quantity: { $gte: qtyToRevert } },
        { $inc: { quantity: -qtyToRevert } },
        { session, new: true },
      );

      if (!updatedStock) {
        const currentStockDoc = await RawMaterialStock.findOne({
          rawMaterial: matId,
        }).session(session);
        const currentQty = currentStockDoc ? currentStockDoc.quantity : 0;
        const matDoc = await RawMaterial.findById(matId).session(session);
        const matName = matDoc ? matDoc.name : matId.toString();
        const matUnit = matDoc ? matDoc.unit : "";

        throw new InsufficientStockError(
          `Cannot void transaction: cannot deduct ${qtyToRevert} ${matUnit} of "${matName}". Current stock is only ${currentQty} ${matUnit} (stock has already been consumed in production).`,
        );
      }
    }

    tx.status = "VOIDED";
    if (input.reason && input.reason.trim()) {
      tx.note = tx.note
        ? `${tx.note} [VOIDED by ${input.signedBy || "admin"}: ${input.reason.trim()}]`
        : `[VOIDED by ${input.signedBy || "admin"}: ${input.reason.trim()}]`;
    }
    await tx.save({ session });

    const populated = await RawMaterialTransaction.findById(tx._id)
      .populate("materials.material")
      .session(session)
      .lean();

    const plain = toPlainObject<RawMaterialTransactionDTO>(populated);
    plain.totalCost = plain.materials.reduce(
      (sum, m) => sum + m.quantityBought * m.unitPrice,
      0,
    );
    return plain;
  });
}

export async function getRawMaterialTransactionById(
  id: string,
): Promise<RawMaterialTransactionDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid transaction ID.");
  }

  const tx = await RawMaterialTransaction.findById(id)
    .populate("materials.material")
    .lean();
  if (!tx) {
    throw new NotFoundError(`Raw material transaction "${id}" not found.`);
  }

  const plain = toPlainObject<RawMaterialTransactionDTO>(tx);
  plain.totalCost = plain.materials.reduce(
    (sum, m) => sum + m.quantityBought * m.unitPrice,
    0,
  );
  return plain;
}

export async function listRawMaterialTransactions(
  params?: TransactionFilterParams,
): Promise<PaginatedResult<RawMaterialTransactionDTO>> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params?.status) filter.status = params.status;
  if (params?.signedBy) filter.signedBy = params.signedBy;
  if (params?.itemId) {
    filter["materials.material"] = new mongoose.Types.ObjectId(params.itemId);
  }
  if (params?.startDate || params?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.$gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }

  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));
  const skip = (page - 1) * limit;

  const [total, transactions] = await Promise.all([
    RawMaterialTransaction.countDocuments(filter),
    RawMaterialTransaction.find(filter)
      .populate("materials.material")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const items = transactions.map((t) => {
    const plain = toPlainObject<RawMaterialTransactionDTO>(t);
    plain.totalCost = plain.materials.reduce(
      (sum, m) => sum + m.quantityBought * m.unitPrice,
      0,
    );
    return plain;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================================
// 6. PRODUCTION ENTRY
//
// SYSTEM INVARIANTS:
// 1. Stock mutations MUST run inside a `mongoose.startSession()` transaction.
// 2. Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }`.
// 3. `rawMaterialPrice` supplies default `unitCost` on production.
// 4. Voiding a `COMPLETED` transaction MUST reverse its exact stock delta in a session.
// Inventory rule: productionEntry => + productStock && - rawMaterialStock
// ============================================================================

export async function createProductionEntry(
  input: CreateProductionEntryInput,
): Promise<ProductionEntryDTO> {
  if (
    !input.products ||
    !Array.isArray(input.products) ||
    input.products.length === 0
  ) {
    throw new ValidationError(
      "At least one product item is required for production.",
    );
  }
  if (!input.signedBy || !input.signedBy.trim()) {
    throw new ValidationError(
      "Production entry must be signed by an authorized crew member (signedBy).",
    );
  }

  return await withTransaction(async (session) => {
    const productsSnapshot: Array<{
      product: mongoose.Types.ObjectId;
      quantityProduced: number;
      materialUsage: Array<{
        rawMaterial: mongoose.Types.ObjectId;
        quantityUsed: number;
        unitCost: mongoose.Types.Decimal128;
      }>;
    }> = [];

    // Map to aggregate total raw material consumption across all products in this entry
    // rawMaterialId -> { requiredQty: number, name: string, unit: string }
    const totalMaterialsNeeded = new Map<
      string,
      { requiredQty: number; name: string; unit: string }
    >();

    let totalProductionCost = 0;
    let totalUnitsProduced = 0;

    for (const prodItem of input.products) {
      if (!mongoose.Types.ObjectId.isValid(prodItem.product)) {
        throw new ValidationError(`Invalid product ID: "${prodItem.product}".`);
      }
      if (!prodItem.quantityProduced || prodItem.quantityProduced < 1) {
        throw new ValidationError("Quantity produced must be an integer >= 1.");
      }

      const productDoc = await OutputProduct.findById(prodItem.product)
        .populate("recipe.rawMaterial")
        .session(session);

      if (!productDoc) {
        throw new NotFoundError(
          `Output product with ID "${prodItem.product}" not found.`,
        );
      }
      if (!productDoc.isActive) {
        throw new ValidationError(
          `Product "${productDoc.name}" is marked inactive and cannot be produced.`,
        );
      }

      totalUnitsProduced += prodItem.quantityProduced;

      // Determine material usage:
      // If custom materialUsage provided by caller, use that; otherwise snapshot from product recipe * quantityProduced
      const usageList: Array<{
        rawMaterial: mongoose.Types.ObjectId;
        quantityUsed: number;
        unitCost: mongoose.Types.Decimal128;
      }> = [];

      if (prodItem.materialUsage && prodItem.materialUsage.length > 0) {
        for (const customUsage of prodItem.materialUsage) {
          if (!mongoose.Types.ObjectId.isValid(customUsage.rawMaterial)) {
            throw new ValidationError(
              "Invalid raw material ID in custom usage.",
            );
          }
          if (!customUsage.quantityUsed || customUsage.quantityUsed < 0.0001) {
            throw new ValidationError("Quantity used must be greater than 0.");
          }

          const matDoc = await RawMaterial.findById(
            customUsage.rawMaterial,
          ).session(session);
          if (!matDoc) {
            throw new NotFoundError(
              `Raw material "${customUsage.rawMaterial}" in usage list was not found.`,
            );
          }

          // Invariant 3: rawMaterialPrice supplies unitCost on production if omitted
          let costNum = customUsage.unitCost;
          if (costNum === undefined || costNum === null) {
            const priceDoc = await RawMaterialPrice.findOne({
              rawMaterial: customUsage.rawMaterial,
            }).session(session);
            if (!priceDoc) {
              throw new ValidationError(
                `No default price configured in RawMaterialPrice for "${matDoc.name}".`,
              );
            }
            costNum = decimalToNumber(priceDoc.unitPrice);
          }

          usageList.push({
            rawMaterial: new mongoose.Types.ObjectId(customUsage.rawMaterial),
            quantityUsed: customUsage.quantityUsed,
            unitCost: mongoose.Types.Decimal128.fromString(costNum.toString()),
          });

          totalProductionCost += customUsage.quantityUsed * costNum;

          const currentAgg = totalMaterialsNeeded.get(
            matDoc._id.toString(),
          ) || {
            requiredQty: 0,
            name: matDoc.name,
            unit: matDoc.unit,
          };
          currentAgg.requiredQty += customUsage.quantityUsed;
          totalMaterialsNeeded.set(matDoc._id.toString(), currentAgg);
        }
      } else {
        // Snapshot from product recipe * quantityProduced
        if (!productDoc.recipe || productDoc.recipe.length === 0) {
          throw new ValidationError(
            `Product "${productDoc.name}" has an empty recipe and cannot be produced without custom material usage.`,
          );
        }

        for (const recipeItem of productDoc.recipe) {
          const rawMat = recipeItem.rawMaterial as unknown as {
            _id: mongoose.Types.ObjectId;
            name: string;
            unit: string;
          };
          const matId = rawMat._id;
          const requiredQtyForBatch =
            recipeItem.quantity * prodItem.quantityProduced;

          // Invariant 3: snapshot unitCost from RawMaterialPrice
          const priceDoc = await RawMaterialPrice.findOne({
            rawMaterial: matId,
          }).session(session);

          if (!priceDoc) {
            throw new ValidationError(
              `Cannot produce "${productDoc.name}": no default price set in RawMaterialPrice for ingredient "${rawMat.name}".`,
            );
          }

          const costNum = decimalToNumber(priceDoc.unitPrice);

          usageList.push({
            rawMaterial: matId,
            quantityUsed: requiredQtyForBatch,
            unitCost: mongoose.Types.Decimal128.fromString(costNum.toString()),
          });

          totalProductionCost += requiredQtyForBatch * costNum;

          const currentAgg = totalMaterialsNeeded.get(matId.toString()) || {
            requiredQty: 0,
            name: rawMat.name,
            unit: rawMat.unit,
          };
          currentAgg.requiredQty += requiredQtyForBatch;
          totalMaterialsNeeded.set(matId.toString(), currentAgg);
        }
      }

      productsSnapshot.push({
        product: new mongoose.Types.ObjectId(prodItem.product),
        quantityProduced: prodItem.quantityProduced,
        materialUsage: usageList,
      });
    }

    // Invariant 1: Inside session
    // Invariant 2: Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }` to prevent negative stock.
    // Inventory rule: - rawMaterialStock
    for (const [materialId, agg] of totalMaterialsNeeded.entries()) {
      const stockUpdate = await RawMaterialStock.findOneAndUpdate(
        {
          rawMaterial: new mongoose.Types.ObjectId(materialId),
          quantity: { $gte: agg.requiredQty },
        },
        { $inc: { quantity: -agg.requiredQty } },
        { session, new: true },
      );

      if (!stockUpdate) {
        const currentStockDoc = await RawMaterialStock.findOne({
          rawMaterial: new mongoose.Types.ObjectId(materialId),
        }).session(session);
        const availableQty = currentStockDoc ? currentStockDoc.quantity : 0;

        throw new InsufficientStockError(
          `Insufficient stock for raw material "${agg.name}". Required: ${agg.requiredQty} ${agg.unit}, Available in stock: ${availableQty} ${agg.unit}. Production cannot proceed.`,
        );
      }
    }

    // Inventory rule: + productStock
    for (const prodItem of input.products) {
      await ProductStock.findOneAndUpdate(
        { product: new mongoose.Types.ObjectId(prodItem.product) },
        { $inc: { quantity: prodItem.quantityProduced } },
        { upsert: true, session, new: true, setDefaultsOnInsert: true },
      );
    }

    const [createdEntry] = await ProductionEntry.create(
      [
        {
          products: productsSnapshot,
          signedBy: input.signedBy?.trim() || "",
          note: input.note?.trim(),
          status: "COMPLETED",
        },
      ],
      { session },
    );

    const populated = await ProductionEntry.findById(createdEntry._id)
      .populate("products.product")
      .populate("products.materialUsage.rawMaterial")
      .session(session)
      .lean();

    const plain = toPlainObject<ProductionEntryDTO>(populated);
    plain.totalProductionCost = totalProductionCost;
    plain.totalUnitsProduced = totalUnitsProduced;
    return plain;
  });
}

export async function voidProductionEntry(
  input: VoidTransactionInput,
): Promise<ProductionEntryDTO> {
  if (!mongoose.Types.ObjectId.isValid(input.id)) {
    throw new ValidationError("Invalid production entry ID.");
  }

  return await withTransaction(async (session) => {
    const entry = await ProductionEntry.findById(input.id).session(session);
    if (!entry) {
      throw new NotFoundError(`Production entry "${input.id}" not found.`);
    }

    if (entry.status === "VOIDED") {
      throw new ValidationError(
        "This production entry has already been voided.",
      );
    }
    if (entry.status !== "COMPLETED") {
      throw new ValidationError(
        `Cannot void production entry with status "${entry.status}".`,
      );
    }

    // Invariant 4: Reverse exact stock delta in a session.
    // 1. Decrement product stock that was produced.
    // Invariant 2: Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }`.
    for (const p of entry.products) {
      const prodId = p.product;
      const qtyProduced = p.quantityProduced;

      const stockUpdate = await ProductStock.findOneAndUpdate(
        { product: prodId, quantity: { $gte: qtyProduced } },
        { $inc: { quantity: -qtyProduced } },
        { session, new: true },
      );

      if (!stockUpdate) {
        const currentStockDoc = await ProductStock.findOne({
          product: prodId,
        }).session(session);
        const currentQty = currentStockDoc ? currentStockDoc.quantity : 0;
        const prodDoc = await OutputProduct.findById(prodId).session(session);
        const prodName = prodDoc ? prodDoc.name : prodId.toString();

        throw new InsufficientStockError(
          `Cannot void production entry: cannot deduct ${qtyProduced} units of "${prodName}". Current stock is only ${currentQty} (items produced in this batch have already been sold).`,
        );
      }
    }

    // 2. Restore raw materials that were consumed in this production batch.
    for (const p of entry.products) {
      for (const usage of p.materialUsage) {
        await RawMaterialStock.findOneAndUpdate(
          { rawMaterial: usage.rawMaterial },
          { $inc: { quantity: usage.quantityUsed } },
          { upsert: true, session, new: true, setDefaultsOnInsert: true },
        );
      }
    }

    entry.status = "VOIDED";
    if (input.reason && input.reason.trim()) {
      entry.note = entry.note
        ? `${entry.note} [VOIDED by ${input.signedBy || "admin"}: ${input.reason.trim()}]`
        : `[VOIDED by ${input.signedBy || "admin"}: ${input.reason.trim()}]`;
    }
    await entry.save({ session });

    const populated = await ProductionEntry.findById(entry._id)
      .populate("products.product")
      .populate("products.materialUsage.rawMaterial")
      .session(session)
      .lean();

    const plain = toPlainObject<ProductionEntryDTO>(populated);
    plain.totalProductionCost = plain.products.reduce((acc, p) => {
      const usageCost = p.materialUsage.reduce(
        (uAcc, u) => uAcc + u.quantityUsed * u.unitCost,
        0,
      );
      return acc + usageCost;
    }, 0);
    plain.totalUnitsProduced = plain.products.reduce(
      (acc, p) => acc + p.quantityProduced,
      0,
    );
    return plain;
  });
}

export async function getProductionEntryById(
  id: string,
): Promise<ProductionEntryDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid production entry ID.");
  }

  const entry = await ProductionEntry.findById(id)
    .populate("products.product")
    .populate("products.materialUsage.rawMaterial")
    .lean();

  if (!entry) {
    throw new NotFoundError(`Production entry "${id}" not found.`);
  }

  const plain = toPlainObject<ProductionEntryDTO>(entry);
  plain.totalProductionCost = plain.products.reduce((acc, p) => {
    const usageCost = p.materialUsage.reduce(
      (uAcc, u) => uAcc + u.quantityUsed * u.unitCost,
      0,
    );
    return acc + usageCost;
  }, 0);
  plain.totalUnitsProduced = plain.products.reduce(
    (acc, p) => acc + p.quantityProduced,
    0,
  );
  return plain;
}

export async function listProductionEntries(
  params?: TransactionFilterParams,
): Promise<PaginatedResult<ProductionEntryDTO>> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params?.status) filter.status = params.status;
  if (params?.signedBy) filter.signedBy = params.signedBy;
  if (params?.itemId) {
    filter["products.product"] = new mongoose.Types.ObjectId(params.itemId);
  }
  if (params?.startDate || params?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.$gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }

  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));
  const skip = (page - 1) * limit;

  const [total, entries] = await Promise.all([
    ProductionEntry.countDocuments(filter),
    ProductionEntry.find(filter)
      .populate("products.product")
      .populate("products.materialUsage.rawMaterial")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const items = entries.map((e) => {
    const plain = toPlainObject<ProductionEntryDTO>(e);
    plain.totalProductionCost = plain.products.reduce((acc, p) => {
      const usageCost = p.materialUsage.reduce(
        (uAcc, u) => uAcc + u.quantityUsed * u.unitCost,
        0,
      );
      return acc + usageCost;
    }, 0);
    plain.totalUnitsProduced = plain.products.reduce(
      (acc, p) => acc + p.quantityProduced,
      0,
    );
    return plain;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================================
// 7. SALE TRANSACTION
//
// SYSTEM INVARIANTS:
// 1. Stock mutations MUST run inside a `mongoose.startSession()` transaction.
// 2. Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }`.
// 3. `productPrice` supplies default `unitPrice` on sales.
// 4. Voiding a `COMPLETED` transaction MUST reverse its exact stock delta in a session.
// Inventory rule: saleTransaction => - productStock
// ============================================================================

export async function createSaleTransaction(
  input: CreateSaleTransactionInput,
): Promise<SaleTransactionDTO> {
  if (!input.items || !Array.isArray(input.items) || input.items.length === 0) {
    throw new ValidationError("At least one sale item is required.");
  }
  if (!input.signedBy || !input.signedBy.trim()) {
    throw new ValidationError(
      "Sale transaction must be signed by an authorized seller (signedBy).",
    );
  }

  return await withTransaction(async (session) => {
    const itemsSnapshot: Array<{
      product: mongoose.Types.ObjectId;
      quantity: number;
      unitPrice: mongoose.Types.Decimal128;
      unitCost: mongoose.Types.Decimal128;
    }> = [];

    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsCount = 0;

    for (const item of input.items) {
      if (!mongoose.Types.ObjectId.isValid(item.product)) {
        throw new ValidationError(`Invalid product ID: "${item.product}".`);
      }
      if (!item.quantity || item.quantity < 0.0001) {
        throw new ValidationError("Sale quantity must be greater than 0.");
      }

      const productDoc = await OutputProduct.findById(item.product).session(
        session,
      );
      if (!productDoc) {
        throw new NotFoundError(`Product with ID "${item.product}" not found.`);
      }
      if (!productDoc.isActive) {
        throw new ValidationError(
          `Product "${productDoc.name}" is marked inactive and cannot be sold.`,
        );
      }

      // Invariant 3: productPrice supplies default unitPrice on sales if omitted
      let priceNum = item.unitPrice;
      if (priceNum === undefined || priceNum === null) {
        const defaultPriceDoc = await ProductPrice.findOne({
          product: item.product,
        }).session(session);

        if (!defaultPriceDoc) {
          throw new ValidationError(
            `No unitPrice specified and no default price found in ProductPrice catalog for "${productDoc.name}".`,
          );
        }
        priceNum = decimalToNumber(defaultPriceDoc.unitPrice);
      }

      if (priceNum < 0) {
        throw new ValidationError("Unit price cannot be negative.");
      }

      // Determine unitCost (COGS): snapshot from product's recipe raw material costs if not provided
      let costNum = item.unitCost;
      if (costNum === undefined || costNum === null) {
        let recipeCost = 0;
        if (productDoc.recipe && productDoc.recipe.length > 0) {
          for (const ing of productDoc.recipe) {
            const rawPrice = await RawMaterialPrice.findOne({
              rawMaterial: ing.rawMaterial,
            }).session(session);
            if (rawPrice) {
              recipeCost += ing.quantity * decimalToNumber(rawPrice.unitPrice);
            }
          }
        }
        costNum = recipeCost;
      }

      itemsSnapshot.push({
        product: new mongoose.Types.ObjectId(item.product),
        quantity: Number(item.quantity),
        unitPrice: mongoose.Types.Decimal128.fromString(priceNum.toString()),
        unitCost: mongoose.Types.Decimal128.fromString(costNum.toString()),
      });

      totalRevenue += Number(item.quantity) * priceNum;
      totalCost += Number(item.quantity) * costNum;
      totalItemsCount += Number(item.quantity);

      // Invariant 1: Inside session
      // Invariant 2: Stock decrements MUST filter `{ quantity: { $gte: requiredQty } }` to prevent negative stock.
      // Inventory rule: saleTransaction => - productStock
      const stockUpdate = await ProductStock.findOneAndUpdate(
        {
          product: new mongoose.Types.ObjectId(item.product),
          quantity: { $gte: Number(item.quantity) },
        },
        { $inc: { quantity: -Number(item.quantity) } },
        { session, new: true },
      );

      if (!stockUpdate) {
        const currentStockDoc = await ProductStock.findOne({
          product: new mongoose.Types.ObjectId(item.product),
        }).session(session);
        const currentQty = currentStockDoc ? currentStockDoc.quantity : 0;

        throw new InsufficientStockError(
          `Insufficient stock for product "${productDoc.name}". Requested: ${item.quantity}, Available: ${currentQty}. Sale aborted.`,
        );
      }
    }

    const [txDoc] = await SaleTransaction.create(
      [
        {
          items: itemsSnapshot,
          signedBy: input.signedBy?.trim() || "",
          note: input.note?.trim(),
          status: "COMPLETED",
        },
      ],
      { session },
    );

    const populated = await SaleTransaction.findById(txDoc._id)
      .populate("items.product")
      .session(session)
      .lean();

    const plain = toPlainObject<SaleTransactionDTO>(populated);
    plain.totalRevenue = totalRevenue;
    plain.totalCost = totalCost;
    plain.netProfit = totalRevenue - totalCost;
    plain.totalItemsCount = totalItemsCount;
    return plain;
  });
}

export async function voidSaleTransaction(
  input: VoidTransactionInput,
): Promise<SaleTransactionDTO> {
  if (!mongoose.Types.ObjectId.isValid(input.id)) {
    throw new ValidationError("Invalid sale transaction ID.");
  }

  return await withTransaction(async (session) => {
    const sale = await SaleTransaction.findById(input.id).session(session);
    if (!sale) {
      throw new NotFoundError(`Sale transaction "${input.id}" not found.`);
    }

    if (sale.status === "VOIDED") {
      throw new ValidationError(
        "This sale transaction has already been voided.",
      );
    }
    if (sale.status !== "COMPLETED") {
      throw new ValidationError(
        `Cannot void sale transaction with status "${sale.status}".`,
      );
    }

    // Invariant 4: Reverse exact stock delta in a session.
    // Reversal of sale means products are returned to productStock (+ productStock)
    for (const item of sale.items) {
      await ProductStock.findOneAndUpdate(
        { product: item.product },
        { $inc: { quantity: item.quantity } },
        { upsert: true, session, new: true, setDefaultsOnInsert: true },
      );
    }

    sale.status = "VOIDED";
    if (input.reason && input.reason.trim()) {
      sale.note = sale.note
        ? `${sale.note} [VOIDED by ${input.signedBy || "admin"}: ${input.reason.trim()}]`
        : `[VOIDED by ${input.signedBy || "admin"}: ${input.reason.trim()}]`;
    }
    await sale.save({ session });

    const populated = await SaleTransaction.findById(sale._id)
      .populate("items.product")
      .session(session)
      .lean();

    const plain = toPlainObject<SaleTransactionDTO>(populated);
    plain.totalRevenue = plain.items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    plain.totalCost = plain.items.reduce(
      (sum, i) => sum + i.quantity * (i.unitCost || 0),
      0,
    );
    plain.netProfit = plain.totalRevenue - plain.totalCost;
    plain.totalItemsCount = plain.items.reduce((sum, i) => sum + i.quantity, 0);
    return plain;
  });
}

export async function getSaleTransactionById(
  id: string,
): Promise<SaleTransactionDTO> {
  await dbConnect();
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError("Invalid sale transaction ID.");
  }

  const sale = await SaleTransaction.findById(id)
    .populate("items.product")
    .lean();

  if (!sale) {
    throw new NotFoundError(`Sale transaction "${id}" not found.`);
  }

  const plain = toPlainObject<SaleTransactionDTO>(sale);
  plain.totalRevenue = plain.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  );
  plain.totalCost = plain.items.reduce(
    (sum, i) => sum + i.quantity * (i.unitCost || 0),
    0,
  );
  plain.netProfit = plain.totalRevenue - plain.totalCost;
  plain.totalItemsCount = plain.items.reduce((sum, i) => sum + i.quantity, 0);
  return plain;
}

export async function listSaleTransactions(
  params?: TransactionFilterParams,
): Promise<PaginatedResult<SaleTransactionDTO>> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params?.status) filter.status = params.status;
  if (params?.signedBy) filter.signedBy = params.signedBy;
  if (params?.itemId) {
    filter["items.product"] = new mongoose.Types.ObjectId(params.itemId);
  }
  if (params?.startDate || params?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.$gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }

  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));
  const skip = (page - 1) * limit;

  const [total, sales] = await Promise.all([
    SaleTransaction.countDocuments(filter),
    SaleTransaction.find(filter)
      .populate("items.product")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const items = sales.map((s) => {
    const plain = toPlainObject<SaleTransactionDTO>(s);
    plain.totalRevenue = plain.items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );
    plain.totalCost = plain.items.reduce(
      (sum, i) => sum + i.quantity * (i.unitCost || 0),
      0,
    );
    plain.netProfit = plain.totalRevenue - plain.totalCost;
    plain.totalItemsCount = plain.items.reduce((sum, i) => sum + i.quantity, 0);
    return plain;
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    items,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

// ============================================================================
// 8. DYNAMIC SERVERLESS DAILY CARRYOVER CALCULATION
// ============================================================================

/**
 * Calculates end-of-day product carryover dynamically on the fly.
 * Serverless-Native: requires NO midnight cron jobs or static carryover entries.
 *
 * How it works:
 * 1. Queries live ProductStock for all products.
 * 2. Calculates units produced today from completed ProductionEntry documents.
 * 3. Any unit in current stock exceeding today's production is proven to be from
 *    prior days (carried over from previous days).
 * 4. Units produced today that are not yet sold are today's unsold batch (which rolls over into tomorrow).
 * 5. Multiplies by recipe material cost to get precise carried-over asset valuation.
 */
function parseLocalTargetDate(targetDate?: Date | string): Date {
  if (!targetDate) return new Date();
  if (typeof targetDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
    const [year, month, day] = targetDate.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(targetDate);
}

function formatLocalDateKey(dateObj: Date): string {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function calculateDailyCarryOver(
  targetDate?: Date | string
): Promise<DailyCarryOverDTO> {
  await dbConnect();
  const dateObj = parseLocalTargetDate(targetDate);
  const dateKey = formatLocalDateKey(dateObj);

  const startOfDay = new Date(dateObj);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateObj);
  endOfDay.setHours(23, 59, 59, 999);

  const now = new Date();
  const isHistorical = endOfDay.getTime() < now.getTime();

  // 1. Fetch live product stock, target day production entries, raw material prices,
  // and if historical, future adjustments after endOfDay to reconstruct historical stock.
  const [stocks, todayProduction, rawPrices, futureProd, futureSales] = await Promise.all([
    ProductStock.find().populate("product").lean(),
    ProductionEntry.find({
      status: "COMPLETED",
      createdAt: { $gte: startOfDay, $lte: endOfDay },
    }).lean(),
    RawMaterialPrice.find().lean(),
    isHistorical
      ? ProductionEntry.find({
          status: "COMPLETED",
          createdAt: { $gt: endOfDay },
        }).lean()
      : Promise.resolve([]),
    isHistorical
      ? SaleTransaction.find({
          status: "COMPLETED",
          createdAt: { $gt: endOfDay },
        }).lean()
      : Promise.resolve([]),
  ]);

  const rawPriceMap = new Map(
    rawPrices.map((p) => [p.rawMaterial.toString(), decimalToNumber(p.unitPrice)])
  );

  // Map of total units produced on target day per productId
  const producedTargetDayMap = new Map<string, number>();
  for (const entry of todayProduction) {
    for (const p of entry.products) {
      const pid = p.product.toString();
      producedTargetDayMap.set(pid, (producedTargetDayMap.get(pid) || 0) + p.quantityProduced);
    }
  }

  // If historical, calculate net changes since endOfDay per product
  // Stock at endOfDay = CurrentStock - (FutureProduction) + (FutureSales)
  const futureNetAdjustmentMap = new Map<string, number>();
  if (isHistorical) {
    for (const entry of futureProd) {
      for (const p of entry.products) {
        const pid = p.product.toString();
        futureNetAdjustmentMap.set(
          pid,
          (futureNetAdjustmentMap.get(pid) || 0) - p.quantityProduced
        );
      }
    }
    for (const sale of futureSales) {
      for (const item of sale.items) {
        const pid = item.product.toString();
        futureNetAdjustmentMap.set(
          pid,
          (futureNetAdjustmentMap.get(pid) || 0) + item.quantity
        );
      }
    }
  }

  const items: Array<{
    product: OutputProductDTO;
    quantityRemaining: number;
    carriedFromPastDays: number;
    producedTodayRemaining: number;
    unitCost: number;
    valuation: number;
  }> = [];

  let totalQuantity = 0;
  let totalValuation = 0;

  for (const s of stocks) {
    if (!s.product) continue;
    const prodDoc = s.product as unknown as {
      _id: { toString: () => string };
      name: string;
      recipe?: Array<{ rawMaterial: { toString: () => string }; quantity: number }>;
    };
    const pid = prodDoc._id.toString();

    // Reconstruct stock at target date end
    const adjustment = futureNetAdjustmentMap.get(pid) || 0;
    const stockAtDate = Math.max(0, s.quantity + adjustment);

    if (stockAtDate <= 0) {
      continue;
    }

    // Units produced on target date for this product
    const producedOnDate = producedTargetDayMap.get(pid) || 0;

    // Units from previous days = stockAtDate - producedOnDate (clamped at >= 0)
    const carriedFromPastDays = Math.max(0, stockAtDate - producedOnDate);
    // Unsold portion of target date's production
    const producedTodayRemaining = Math.min(stockAtDate, producedOnDate);

    // Calculate recipe unit cost
    let unitCost = 0;
    if (prodDoc.recipe && prodDoc.recipe.length > 0) {
      for (const ing of prodDoc.recipe) {
        const matId = ing.rawMaterial?.toString();
        const price = rawPriceMap.get(matId) || 0;
        unitCost += ing.quantity * price;
      }
    }

    const valuation = stockAtDate * unitCost;

    items.push({
      product: toPlainObject<OutputProductDTO>(s.product),
      quantityRemaining: stockAtDate,
      carriedFromPastDays,
      producedTodayRemaining,
      unitCost,
      valuation,
    });

    totalQuantity += stockAtDate;
    totalValuation += valuation;
  }

  logger.info("DB:CARRYOVER", `Calculated dynamic carryover for ${dateKey}`, {
    dateKey,
    productsCount: items.length,
    totalQuantity,
    totalValuation,
    isHistorical,
  });

  return {
    date: dateKey,
    items,
    totalQuantity,
    totalValuation,
    updatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 9. DASHBOARD & ANALYTICS
// ============================================================================

export async function getDashboardSummary(options?: {
  carryOverDate?: string;
}): Promise<DashboardSummaryDTO> {
  await dbConnect();

  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 7);
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now);
  startOfMonth.setDate(now.getDate() - 30);
  startOfMonth.setHours(0, 0, 0, 0);

  // Determine carryover date when omitted:
  // Show today's carryover when day is ended (22:00 - 05:59), else yesterday's carryover.
  let effectiveCarryOverDate: Date | string | undefined = options?.carryOverDate;
  if (!effectiveCarryOverDate) {
    const hour = now.getHours();
    const isDayEndedWindow = hour >= 22 || hour < 6;
    if (!isDayEndedWindow) {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      effectiveCarryOverDate = yesterday;
    } else {
      effectiveCarryOverDate = now;
    }
  }

  const [
    rawMaterialsCount,
    productsCount,
    rawStocks,
    prodStocks,
    rawPrices,
    prodPrices,
    todaySales,
    todayProduction,
    weekSales,
    monthSales,
    monthPurchases,
    monthProduction,
    dailyCarryOver,
  ] = await Promise.all([
    RawMaterial.countDocuments({ isActive: true }),
    OutputProduct.countDocuments({ isActive: true }),
    RawMaterialStock.find().populate("rawMaterial").lean(),
    ProductStock.find().populate("product").lean(),
    RawMaterialPrice.find().lean(),
    ProductPrice.find().lean(),
    SaleTransaction.find({
      status: "COMPLETED",
      createdAt: { $gte: startOfToday },
    }).lean(),
    ProductionEntry.find({
      status: "COMPLETED",
      createdAt: { $gte: startOfToday },
    }).lean(),
    SaleTransaction.find({
      status: "COMPLETED",
      createdAt: { $gte: startOfWeek },
    }).lean(),
    SaleTransaction.find({
      status: "COMPLETED",
      createdAt: { $gte: startOfMonth },
    }).lean(),
    RawMaterialTransaction.find({
      status: "COMPLETED",
      createdAt: { $gte: startOfMonth },
    }).lean(),
    ProductionEntry.find({
      status: "COMPLETED",
      createdAt: { $gte: startOfMonth },
    }).lean(),
    calculateDailyCarryOver(effectiveCarryOverDate),
  ]);

  const rawPriceMap = new Map(
    rawPrices.map((p) => [
      p.rawMaterial.toString(),
      decimalToNumber(p.unitPrice),
    ]),
  );
  const prodPriceMap = new Map(
    prodPrices.map((p) => [p.product.toString(), decimalToNumber(p.unitPrice)]),
  );

  let totalRawMaterialStockValue = 0;
  const lowStockAlerts: LowStockAlert[] = [];

  for (const s of rawStocks) {
    if (!s.rawMaterial) continue;
    const mat = s.rawMaterial as unknown as {
      _id: { toString: () => string };
      name: string;
      unit: "g" | "ml" | "piece";
    };
    const matId = mat._id.toString();
    const price = rawPriceMap.get(matId) || 0;
    totalRawMaterialStockValue += s.quantity * price;

    const threshold = mat.unit === "piece" ? 10 : 500;
    if (s.quantity <= threshold) {
      lowStockAlerts.push({
        id: matId,
        name: mat.name,
        type: "raw_material",
        unit: mat.unit,
        currentStock: s.quantity,
        threshold,
      });
    }
  }

  let totalProductStockValue = 0;
  for (const s of prodStocks) {
    if (!s.product) continue;
    const prod = s.product as unknown as {
      _id: { toString: () => string };
      name: string;
    };
    const prodId = prod._id.toString();
    const price = prodPriceMap.get(prodId) || 0;
    totalProductStockValue += s.quantity * price;

    const threshold = 10;
    if (s.quantity <= threshold) {
      lowStockAlerts.push({
        id: prodId,
        name: prod.name,
        type: "product",
        currentStock: s.quantity,
        threshold,
      });
    }
  }

  // Today calculations
  let todaySalesRevenue = 0;
  let todaySalesCost = 0;
  let todayUnitsSold = 0;
  for (const sale of todaySales) {
    for (const item of sale.items) {
      const rev = item.quantity * decimalToNumber(item.unitPrice);
      const cost = item.quantity * decimalToNumber(item.unitCost);
      todaySalesRevenue += rev;
      todaySalesCost += cost;
      todayUnitsSold += item.quantity;
    }
  }
  const todayProfit = todaySalesRevenue - todaySalesCost;

  let todayProductionCount = todayProduction.length;
  let todayUnitsProduced = 0;
  let todayProductionCost = 0;
  const todayRawUsedMap = new Map<string, number>();
  const todayRawCostMap = new Map<string, number>();
  for (const entry of todayProduction) {
    for (const p of entry.products) {
      todayUnitsProduced += p.quantityProduced;
      for (const u of p.materialUsage) {
        const matId = u.rawMaterial.toString();
        const cost = u.quantityUsed * decimalToNumber(u.unitCost);
        todayProductionCost += cost;
        todayRawUsedMap.set(matId, (todayRawUsedMap.get(matId) || 0) + u.quantityUsed);
        todayRawCostMap.set(matId, (todayRawCostMap.get(matId) || 0) + cost);
      }
    }
  }

  // Monthly raw material purchase & consumption totals (30-day cycle)
  const monthPurchasedMap = new Map<string, number>();
  for (const tx of monthPurchases) {
    for (const m of tx.materials) {
      const matId = m.material.toString();
      monthPurchasedMap.set(matId, (monthPurchasedMap.get(matId) || 0) + m.quantityBought);
    }
  }

  const monthRawUsedMap = new Map<string, number>();
  for (const entry of monthProduction) {
    for (const p of entry.products) {
      for (const u of p.materialUsage) {
        const matId = u.rawMaterial.toString();
        monthRawUsedMap.set(matId, (monthRawUsedMap.get(matId) || 0) + u.quantityUsed);
      }
    }
  }

  const dailyRawMaterialUsage: DailyRawMaterialUsageItem[] = [];
  for (const s of rawStocks) {
    if (!s.rawMaterial) continue;
    const mat = s.rawMaterial as unknown as {
      _id: { toString: () => string };
      name: string;
      unit: "g" | "ml" | "piece";
      isActive?: boolean;
    };
    const matId = mat._id.toString();
    const usedToday = todayRawUsedMap.get(matId) || 0;
    if (mat.isActive === false && usedToday === 0) continue;

    const usageCostToday = todayRawCostMap.get(matId) || 0;
    const monthlyPurchased = monthPurchasedMap.get(matId) || 0;
    const usedLast30Days = monthRawUsedMap.get(matId) || 0;

    // Daily allowance is based on monthly purchase cycle (or 30-day available pool if unpurchased this month)
    const monthlyPool =
      monthlyPurchased > 0 ? monthlyPurchased : s.quantity + usedLast30Days;
    const recommendedDailyLimit = monthlyPool > 0 ? monthlyPool / 30 : 0;
    const usageRatio =
      recommendedDailyLimit > 0 ? usedToday / recommendedDailyLimit : 0;
    const isOverDailyBudget =
      usedToday > 0 &&
      (recommendedDailyLimit > 0
        ? usedToday > recommendedDailyLimit
        : s.quantity <= 0);
    const estimatedDaysLeftAtTodayPace =
      usedToday > 0 ? s.quantity / usedToday : null;

    dailyRawMaterialUsage.push({
      rawMaterialId: matId,
      name: mat.name,
      unit: mat.unit,
      usedToday,
      usageCostToday,
      currentStock: s.quantity,
      monthlyPurchased,
      recommendedDailyLimit,
      usageRatio,
      isOverDailyBudget,
      estimatedDaysLeftAtTodayPace,
    });
  }

  dailyRawMaterialUsage.sort((a, b) => {
    if (a.isOverDailyBudget !== b.isOverDailyBudget) {
      return a.isOverDailyBudget ? -1 : 1;
    }
    if (b.usageRatio !== a.usageRatio) {
      return b.usageRatio - a.usageRatio;
    }
    if (b.usedToday !== a.usedToday) {
      return b.usedToday - a.usedToday;
    }
    return a.name.localeCompare(b.name);
  });

  // Weekly calculations
  let weeklySalesRevenue = 0;
  let weeklySalesCost = 0;
  for (const sale of weekSales) {
    for (const item of sale.items) {
      weeklySalesRevenue += item.quantity * decimalToNumber(item.unitPrice);
      weeklySalesCost += item.quantity * decimalToNumber(item.unitCost);
    }
  }
  const weeklyProfit = weeklySalesRevenue - weeklySalesCost;

  // Monthly calculations
  let monthlySalesRevenue = 0;
  let monthlySalesCost = 0;
  for (const sale of monthSales) {
    for (const item of sale.items) {
      monthlySalesRevenue += item.quantity * decimalToNumber(item.unitPrice);
      monthlySalesCost += item.quantity * decimalToNumber(item.unitCost);
    }
  }
  const monthlyProfit = monthlySalesRevenue - monthlySalesCost;

  // 7-day daily chart aggregation
  const dailyChartMap = new Map<string, { revenue: number; cost: number; net: number }>();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    dailyChartMap.set(dateStr, { revenue: 0, cost: 0, net: 0 });
  }

  for (const sale of weekSales) {
    const dateStr = new Date(sale.createdAt).toISOString().split("T")[0];
    const existing = dailyChartMap.get(dateStr);
    if (existing) {
      let rev = 0;
      let cost = 0;
      for (const item of sale.items) {
        rev += item.quantity * decimalToNumber(item.unitPrice);
        cost += item.quantity * decimalToNumber(item.unitCost);
      }
      existing.revenue += rev;
      existing.cost += cost;
      existing.net += rev - cost;
    }
  }

  const dailyChart = Array.from(dailyChartMap.entries()).map(([date, vals]) => ({
    date,
    revenue: vals.revenue,
    cost: vals.cost,
    net: vals.net,
  }));

  return {
    totalRawMaterialsCount: rawMaterialsCount,
    totalProductsCount: productsCount,
    totalRawMaterialStockValue,
    totalProductStockValue,
    todaySalesRevenue,
    todayProfit,
    todayProductionCost,
    todaySalesCount: todaySales.length,
    todayUnitsSold,
    todayProductionCount,
    todayUnitsProduced,
    weeklySalesRevenue,
    weeklyProfit,
    monthlySalesRevenue,
    monthlyProfit,
    dailyCarryOver,
    dailyRawMaterialUsage,
    dailyChart,
    lowStockAlerts,
  };
}

export async function getSalesAnalytics(params?: {
  startDate?: string | Date;
  endDate?: string | Date;
}): Promise<SalesAnalyticsReport> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params?.startDate || params?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.$gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }

  const [completedSales, voidedCount] = await Promise.all([
    SaleTransaction.find({ ...filter, status: "COMPLETED" })
      .populate("items.product")
      .lean(),
    SaleTransaction.countDocuments({ ...filter, status: "VOIDED" }),
  ]);

  let totalRevenue = 0;
  let totalItemsSold = 0;
  const productAgg = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantitySold: number;
      totalRevenue: number;
    }
  >();

  for (const sale of completedSales) {
    for (const item of sale.items) {
      const price = decimalToNumber(item.unitPrice);
      const subtotal = item.quantity * price;
      totalRevenue += subtotal;
      totalItemsSold += item.quantity;

      const prod = item.product as unknown as {
        _id: { toString: () => string };
        name: string;
      } | null;
      const prodId = prod?._id ? prod._id.toString() : item.product.toString();
      const prodName = prod?.name || "Unknown Product";

      const existing = productAgg.get(prodId) || {
        productId: prodId,
        productName: prodName,
        quantitySold: 0,
        totalRevenue: 0,
      };

      existing.quantitySold += item.quantity;
      existing.totalRevenue += subtotal;
      productAgg.set(prodId, existing);
    }
  }

  const topSellingProducts = Array.from(productAgg.values()).sort(
    (a, b) => b.totalRevenue - a.totalRevenue,
  );

  return {
    period: {
      startDate: params?.startDate
        ? new Date(params.startDate).toISOString()
        : undefined,
      endDate: params?.endDate
        ? new Date(params.endDate).toISOString()
        : undefined,
    },
    totalRevenue,
    totalTransactionsCount: completedSales.length + voidedCount,
    completedTransactionsCount: completedSales.length,
    voidedTransactionsCount: voidedCount,
    totalItemsSold,
    topSellingProducts,
  };
}

export async function getProductionAnalytics(params?: {
  startDate?: string | Date;
  endDate?: string | Date;
}): Promise<ProductionAnalyticsReport> {
  await dbConnect();

  const filter: Record<string, unknown> = {};
  if (params?.startDate || params?.endDate) {
    const dateFilter: Record<string, Date> = {};
    if (params.startDate) dateFilter.$gte = new Date(params.startDate);
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.$lte = end;
    }
    filter.createdAt = dateFilter;
  }

  const [completedEntries, voidedCount] = await Promise.all([
    ProductionEntry.find({ ...filter, status: "COMPLETED" })
      .populate("products.product")
      .lean(),
    ProductionEntry.countDocuments({ ...filter, status: "VOIDED" }),
  ]);

  let totalUnitsProduced = 0;
  let totalRawMaterialCost = 0;
  const productAgg = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantityProduced: number;
      materialCost: number;
    }
  >();

  for (const entry of completedEntries) {
    for (const p of entry.products) {
      totalUnitsProduced += p.quantityProduced;

      const batchCost = p.materialUsage.reduce(
        (acc: number, u: MaterialUsageDTO) =>
          acc + u.quantityUsed * decimalToNumber(u.unitCost),
        0,
      );
      totalRawMaterialCost += batchCost;

      const prod = p.product as unknown as {
        _id: { toString: () => string };
        name: string;
      } | null;
      const prodId = prod?._id ? prod._id.toString() : p.product.toString();
      const prodName = prod?.name || "Unknown Product";

      const existing = productAgg.get(prodId) || {
        productId: prodId,
        productName: prodName,
        quantityProduced: 0,
        materialCost: 0,
      };

      existing.quantityProduced += p.quantityProduced;
      existing.materialCost += batchCost;
      productAgg.set(prodId, existing);
    }
  }

  return {
    period: {
      startDate: params?.startDate
        ? new Date(params.startDate).toISOString()
        : undefined,
      endDate: params?.endDate
        ? new Date(params.endDate).toISOString()
        : undefined,
    },
    totalBatchesCount: completedEntries.length + voidedCount,
    completedBatchesCount: completedEntries.length,
    voidedBatchesCount: voidedCount,
    totalUnitsProduced,
    totalRawMaterialCost,
    productBreakdown: Array.from(productAgg.values()).sort(
      (a, b) => b.quantityProduced - a.quantityProduced,
    ),
  };
}

export async function getSimpleActivityReports(params?: {
  limit?: number;
}): Promise<SimpleReportsResult> {
  await dbConnect();
  const limit = Math.min(Math.max(params?.limit || 100, 10), 250);

  const [purchases, productions, sales] = await Promise.all([
    RawMaterialTransaction.find()
      .populate("materials.material")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    ProductionEntry.find()
      .populate("products.product")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    SaleTransaction.find()
      .populate("items.product")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
  ]);

  const events: SimpleReportEventDTO[] = [];

  for (const tx of purchases) {
    let totalCost = 0;
    const itemSummaries: Array<{ name: string; quantityLabel: string }> = [];

    for (const m of tx.materials) {
      const mat = m.material as unknown as {
        name?: string;
        unit?: "g" | "ml" | "piece";
      } | null;
      const matName = mat?.name || "Raw Material";
      const qtyLabel = mat?.unit
        ? formatWithAutoUnit(m.quantityBought, mat.unit)
        : String(m.quantityBought);
      totalCost += m.quantityBought * decimalToNumber(m.unitPrice);
      itemSummaries.push({ name: matName, quantityLabel: qtyLabel });
    }

    const preview = itemSummaries
      .map((i) => `${i.name} (${i.quantityLabel})`)
      .join(", ");

    events.push({
      id: tx._id.toString(),
      type: "PURCHASE",
      status: tx.status as "COMPLETED" | "VOIDED",
      headline: preview ? `Bought ${preview}` : "Raw Material Purchase",
      summary: `Total cost: ETB ${totalCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      items: itemSummaries,
      amount: totalCost,
      note: tx.note || undefined,
      timestamp: new Date(tx.createdAt).toISOString(),
      signedBy: tx.signedBy,
    });
  }

  for (const entry of productions) {
    let batchCost = 0;
    const itemSummaries: Array<{ name: string; quantityLabel: string }> = [];

    for (const p of entry.products) {
      const prod = p.product as unknown as { name?: string } | null;
      const prodName = prod?.name || "Product";
      itemSummaries.push({
        name: prodName,
        quantityLabel: `${p.quantityProduced} pcs`,
      });
      for (const u of p.materialUsage) {
        batchCost += u.quantityUsed * decimalToNumber(u.unitCost);
      }
    }

    const preview = itemSummaries
      .map((i) => `${i.name} (${i.quantityLabel})`)
      .join(", ");

    events.push({
      id: entry._id.toString(),
      type: "PRODUCTION",
      status: entry.status as "COMPLETED" | "VOIDED",
      headline: preview ? `Produced ${preview}` : "Production Batch",
      summary: `Material cost: ETB ${batchCost.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      items: itemSummaries,
      amount: batchCost,
      note: entry.note || undefined,
      timestamp: new Date(entry.createdAt).toISOString(),
      signedBy: entry.signedBy,
    });
  }

  for (const sale of sales) {
    let totalRevenue = 0;
    let totalCost = 0;
    const itemSummaries: Array<{ name: string; quantityLabel: string }> = [];

    for (const item of sale.items) {
      const prod = item.product as unknown as { name?: string } | null;
      const prodName = prod?.name || "Product";
      itemSummaries.push({
        name: prodName,
        quantityLabel: `${item.quantity} pcs`,
      });
      totalRevenue += item.quantity * decimalToNumber(item.unitPrice);
      totalCost += item.quantity * decimalToNumber(item.unitCost);
    }

    const profit = totalRevenue - totalCost;
    const preview = itemSummaries
      .map((i) => `${i.name} (${i.quantityLabel})`)
      .join(", ");

    events.push({
      id: sale._id.toString(),
      type: "SALE",
      status: sale.status as "COMPLETED" | "VOIDED",
      headline: preview ? `Sold ${preview}` : "Customer Sale",
      summary: `Revenue: ETB ${totalRevenue.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} • Profit: ETB ${profit.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      items: itemSummaries,
      amount: totalRevenue,
      note: sale.note || undefined,
      timestamp: new Date(sale.createdAt).toISOString(),
      signedBy: sale.signedBy,
    });
  }

  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    items: events,
    counts: {
      all: events.length,
      purchases: purchases.length,
      sales: sales.length,
      productions: productions.length,
    },
  };
}
