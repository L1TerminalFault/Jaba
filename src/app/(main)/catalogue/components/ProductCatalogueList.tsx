"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { OutputProductDTO, RawMaterialDTO, RecipeItemInput } from "@/types";
import {
  createOutputProductAction,
  updateOutputProductAction,
  toggleOutputProductStatusAction,
  setProductPriceAction,
} from "@/actions";
import {
  FiSearch,
  FiPlus,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiEdit2,
} from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  searchPlaceholder: "Search product catalogue...",
  addProductBtn: "Add New Product",
  editBtn: "Edit",
  editTooltip: "Edit product name, recipe, or price",
  productCol: "Product & Recipe",
  priceCol: "Selling Price",
  statusCol: "Status",
  emptyText: "No products configured in catalogue yet.",
  currency: "ETB",
  createModalTitle: "Configure New Product & Recipe",
  editModalTitle: "Modify Product & Recipe",
  nameLabel: "Product Name",
  namePlaceholder: "e.g., Signature Filter Coffee 250g",
  priceLabel: "Standard Selling Price (ETB)",
  recipeTitle: "Recipe Composition Ingredients",
  addIngredientBtn: "Add Ingredient",
  selectMaterial: "Select raw material...",
  qtyPlaceholder: "Quantity",
  saveBtn: "Save Product",
  updateBtn: "Save Changes",
  cancelBtn: "Cancel",
  saving: "Saving...",
  active: "Active",
  inactive: "Inactive",
  recipeBreakdownPrefix: "Recipe Breakdown",
  materialsUnit: "materials",
  nameRequiredError: "Product name is required.",
  recipeRequiredError: "Please add at least one recipe raw material ingredient.",
  createError: "Failed to create product.",
  updateError: "Failed to update product.",
};

interface ProductCatalogueListProps {
  products: OutputProductDTO[];
  rawMaterials: RawMaterialDTO[];
  onRefresh: () => void;
}

export default function ProductCatalogueList({
  products,
  rawMaterials,
  onRefresh,
}: ProductCatalogueListProps) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<OutputProductDTO | null>(
    null
  );

  // Modal form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [recipe, setRecipe] = useState<RecipeItemInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const openCreateModal = () => {
    setEditingProduct(null);
    setName("");
    setPrice("");
    setRecipe(
      rawMaterials.length > 0
        ? [{ rawMaterial: rawMaterials[0]._id, quantity: 10 }]
        : []
    );
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (prod: OutputProductDTO) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(
      prod.currentPrice !== undefined ? String(prod.currentPrice) : ""
    );
    setRecipe(
      prod.recipe.map((ing) => ({
        rawMaterial:
          typeof ing.rawMaterial === "object" && ing.rawMaterial
            ? ing.rawMaterial._id
            : String(ing.rawMaterial),
        quantity: ing.quantity,
      }))
    );
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setError(null);
  };

  const handleAddIngredient = () => {
    if (rawMaterials.length === 0) return;
    setRecipe((prev) => {
      const usedIds = new Set(prev.map((item) => item.rawMaterial));
      const nextAvailable = rawMaterials.find((m) => !usedIds.has(m._id));
      if (!nextAvailable) return prev;
      return [...prev, { rawMaterial: nextAvailable._id, quantity: 10 }];
    });
  };

  const handleRemoveIngredient = (index: number) => {
    setRecipe((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (
    index: number,
    field: "rawMaterial" | "quantity",
    value: string | number
  ) => {
    setRecipe((prev) => {
      const updated = [...prev];
      if (field === "rawMaterial") {
        updated[index] = { ...updated[index], rawMaterial: String(value) };
      } else {
        updated[index] = { ...updated[index], quantity: Number(value) };
      }
      return updated;
    });
  };

  const handleToggleStatus = async (prod: OutputProductDTO) => {
    await toggleOutputProductStatusAction(prod._id, !prod.isActive);
    onRefresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(STRINGS.nameRequiredError);
      return;
    }
    if (recipe.length === 0) {
      setError(STRINGS.recipeRequiredError);
      return;
    }

    setLoading(true);
    setError(null);

    if (editingProduct) {
      const updateRes = await updateOutputProductAction(editingProduct._id, {
        name: name.trim(),
        recipe,
      });

      if (!updateRes.success) {
        setLoading(false);
        setError(updateRes.error || STRINGS.updateError);
        return;
      }

      if (price !== "") {
        const parsedPrice = parseFloat(price);
        if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
          const priceRes = await setProductPriceAction(
            editingProduct._id,
            parsedPrice
          );
          if (!priceRes.success) {
            setLoading(false);
            setError(priceRes.error || STRINGS.updateError);
            return;
          }
        }
      }

      setLoading(false);
      closeModal();
      onRefresh();
      return;
    }

    const initialPrice = price ? parseFloat(price) : undefined;
    const res = await createOutputProductAction({
      name: name.trim(),
      recipe,
      initialPrice,
    });

    setLoading(false);
    if (res.success) {
      setName("");
      setPrice("");
      setRecipe([]);
      closeModal();
      onRefresh();
    } else {
      setError(res.error || STRINGS.createError);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar & Add Button */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 max-w-md w-full rounded-2xl border border-theme-border/50 bg-theme-card/60 px-3.5 py-2.5 backdrop-blur-md focus-within:border-theme-accent transition-colors">
          <FiSearch className="size-4 text-theme-text/50 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={STRINGS.searchPlaceholder}
            className="w-full bg-transparent text-xs sm:text-sm text-theme-text placeholder:text-theme-text/40 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-theme-accent text-xs sm:text-sm font-bold text-black hover:opacity-90 active:scale-95 transition-opacity shadow-md cursor-pointer shrink-0"
        >
          <FiPlus className="size-4" />
          <span>{STRINGS.addProductBtn}</span>
        </button>
      </div>

      {/* Catalogue Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((prod, idx) => (
            <motion.div
              key={prod._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="rounded-3xl border border-theme-border/40 bg-theme-card/75 hover:bg-theme-text/[0.04] hover:border-theme-accent/40 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl border border-theme-border/40 bg-theme-background/60 flex items-center justify-center font-black text-theme-accent text-base shrink-0">
                      {prod.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-theme-text">
                        {prod.name}
                      </h3>
                      <span className="text-xs font-mono font-bold text-theme-accent mt-0.5 block">
                        {STRINGS.currency} {(prod.currentPrice ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Status Toggle */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(prod)}
                      title={STRINGS.editTooltip}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-theme-border/50 bg-theme-background/60 text-theme-text/80 hover:text-theme-accent hover:border-theme-accent/50 cursor-pointer"
                    >
                      <FiEdit2 className="size-3.5" />
                      <span>{STRINGS.editBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(prod)}
                      title="Toggle active status"
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                        prod.isActive
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25"
                      }`}
                    >
                      {prod.isActive ? (
                        <FiToggleRight className="size-4" />
                      ) : (
                        <FiToggleLeft className="size-4" />
                      )}
                      <span>
                        {prod.isActive ? STRINGS.active : STRINGS.inactive}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Recipe Composition */}
                <div className="mt-4 pt-3 border-t border-theme-border/20">
                  <span className="text-[11px] font-semibold text-theme-text/50 uppercase tracking-wider block mb-2">
                    {STRINGS.recipeBreakdownPrefix} ({prod.recipe.length}{" "}
                    {STRINGS.materialsUnit})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {prod.recipe.map((ing, i) => {
                      const mat = ing.rawMaterial as
                        | { name?: string; unit?: string }
                        | string;
                      const matName =
                        typeof mat === "object" && mat?.name
                          ? mat.name
                          : "Material";
                      const matUnit =
                        typeof mat === "object" && mat?.unit ? mat.unit : "";

                      return (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded-xl bg-theme-background/50 border border-theme-border/40 text-[11px] text-theme-text/80 font-medium"
                        >
                          {matName}:{" "}
                          <span className="font-mono font-bold text-theme-accent">
                            {ing.quantity} {matUnit}
                          </span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-theme-border/40 bg-theme-card/60 p-12 text-center text-xs sm:text-sm text-theme-text/45">
          {STRINGS.emptyText}
        </div>
      )}

      {/* Create / Edit Product Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-theme-border/60 bg-theme-background/95 p-6 shadow-2xl backdrop-blur-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-theme-border/40">
                <h3 className="text-base font-bold text-theme-text">
                  {editingProduct
                    ? STRINGS.editModalTitle
                    : STRINGS.createModalTitle}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-xs text-theme-text/50 hover:text-theme-text cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
                    {STRINGS.nameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={STRINGS.namePlaceholder}
                    className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
                    {STRINGS.priceLabel}
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g., 150"
                    className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                  />
                </div>

                {/* Recipe Builder */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-theme-text">
                      {STRINGS.recipeTitle}
                    </label>
                    <button
                      type="button"
                      onClick={handleAddIngredient}
                      disabled={recipe.length >= rawMaterials.length}
                      className="flex items-center gap-1 text-[11px] font-semibold text-theme-accent hover:underline cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:no-underline"
                    >
                      <FiPlus className="size-3" />
                      <span>{STRINGS.addIngredientBtn}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    {recipe.map((ing, idx) => {
                      const otherSelectedIds = new Set(
                        recipe
                          .filter((_, i) => i !== idx)
                          .map((r) => r.rawMaterial)
                      );
                      const availableOptions = rawMaterials.filter(
                        (m) =>
                          m._id === ing.rawMaterial ||
                          !otherSelectedIds.has(m._id)
                      );

                      return (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 rounded-xl border border-theme-border/40 bg-theme-card/40"
                      >
                        <select
                          value={ing.rawMaterial}
                          onChange={(e) =>
                            handleIngredientChange(
                              idx,
                              "rawMaterial",
                              e.target.value
                            )
                          }
                          className="flex-1 rounded-lg border border-theme-border/50 bg-theme-background/60 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                        >
                          {availableOptions.map((m) => (
                            <option
                              key={m._id}
                              value={m._id}
                              className="bg-gray-900 text-white"
                            >
                              {m.name} ({m.unit})
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          required
                          value={ing.quantity}
                          onChange={(e) =>
                            handleIngredientChange(
                              idx,
                              "quantity",
                              e.target.value
                            )
                          }
                          placeholder={STRINGS.qtyPlaceholder}
                          className="w-24 rounded-lg border border-theme-border/50 bg-theme-background/60 p-2 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-2 text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          <FiTrash2 className="size-3.5" />
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl border border-theme-border/50 text-xs font-semibold text-theme-text/70 hover:text-theme-text cursor-pointer transition-colors"
                  >
                    {STRINGS.cancelBtn}
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-theme-accent text-xs font-bold text-black hover:opacity-90 active:scale-95 cursor-pointer transition-opacity shadow-md disabled:opacity-50"
                  >
                    {loading
                      ? STRINGS.saving
                      : editingProduct
                      ? STRINGS.updateBtn
                      : STRINGS.saveBtn}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
