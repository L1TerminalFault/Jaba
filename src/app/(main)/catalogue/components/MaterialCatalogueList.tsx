"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { RawMaterialDTO, RawMaterialUnit } from "@/types";
import {
  createRawMaterialAction,
  updateRawMaterialAction,
  toggleRawMaterialStatusAction,
  setRawMaterialPriceAction,
} from "@/actions";
import {
  FiSearch,
  FiPlus,
  FiToggleLeft,
  FiToggleRight,
  FiEdit2,
} from "react-icons/fi";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  searchPlaceholder: "Search raw materials catalogue...",
  addMaterialBtn: "Add New Material",
  editBtn: "Edit",
  editTooltip: "Edit material name, unit, or default price",
  materialCol: "Raw Material",
  unitCol: "Base Unit",
  priceCol: "Default Purchase Cost",
  statusCol: "Status",
  emptyText: "No raw materials registered in catalogue yet.",
  currency: "ETB",
  createModalTitle: "Register New Raw Material",
  editModalTitle: "Modify Raw Material",
  nameLabel: "Material Name",
  namePlaceholder: "e.g., Raw Organic Coffee Beans",
  unitLabel: "Base Measurement Unit",
  priceLabel: "Default Unit Purchase Price (ETB)",
  initialStockLabel: "Initial Opening Stock (optional)",
  saveBtn: "Save Material",
  updateBtn: "Save Changes",
  cancelBtn: "Cancel",
  saving: "Saving...",
  active: "Active",
  inactive: "Inactive",
  unitGram: "Grams (g)",
  unitMilli: "Millilitres (ml)",
  unitPiece: "Piece / Unit (piece)",
  nameRequiredError: "Material name is required.",
  createError: "Failed to create raw material.",
  updateError: "Failed to update raw material.",
};

interface MaterialCatalogueListProps {
  materials: RawMaterialDTO[];
  onRefresh: () => void;
}

export default function MaterialCatalogueList({
  materials,
  onRefresh,
}: MaterialCatalogueListProps) {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingMaterial, setEditingMaterial] =
    useState<RawMaterialDTO | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [unit, setUnit] = useState<RawMaterialUnit>("g");
  const [price, setPrice] = useState("");
  const [initialStock, setInitialStock] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = materials.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  const openCreateModal = () => {
    setEditingMaterial(null);
    setName("");
    setUnit("g");
    setPrice("");
    setInitialStock("");
    setError(null);
    setShowModal(true);
  };

  const openEditModal = (mat: RawMaterialDTO) => {
    setEditingMaterial(mat);
    setName(mat.name);
    setUnit(mat.unit);
    setPrice(mat.currentPrice !== undefined ? String(mat.currentPrice) : "");
    setInitialStock("");
    setError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingMaterial(null);
    setError(null);
  };

  const handleToggleStatus = async (mat: RawMaterialDTO) => {
    await toggleRawMaterialStatusAction(mat._id, !mat.isActive);
    onRefresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(STRINGS.nameRequiredError);
      return;
    }

    setLoading(true);
    setError(null);

    if (editingMaterial) {
      const updateRes = await updateRawMaterialAction(editingMaterial._id, {
        name: name.trim(),
        unit,
      });

      if (!updateRes.success) {
        setLoading(false);
        setError(updateRes.error || STRINGS.updateError);
        return;
      }

      if (price !== "") {
        const parsedPrice = parseFloat(price);
        if (!Number.isNaN(parsedPrice) && parsedPrice >= 0) {
          const priceRes = await setRawMaterialPriceAction(
            editingMaterial._id,
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
    const stockVal = initialStock ? parseFloat(initialStock) : undefined;

    const res = await createRawMaterialAction({
      name: name.trim(),
      unit,
      initialPrice,
      initialStock: stockVal,
    });

    setLoading(false);
    if (res.success) {
      setName("");
      setPrice("");
      setInitialStock("");
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
          <span>{STRINGS.addMaterialBtn}</span>
        </button>
      </div>

      {/* Catalogue Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((mat, idx) => (
            <motion.div
              key={mat._id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.03 }}
              className="rounded-3xl border border-theme-border/40 bg-theme-card/75 hover:bg-theme-text/[0.04] hover:border-theme-accent/40 p-5 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-2xl border border-theme-border/40 bg-theme-background/60 flex items-center justify-center font-black text-theme-accent text-base shrink-0">
                      {mat.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-theme-text">
                        {mat.name}
                      </h3>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-theme-background/50 border border-theme-border/40 text-theme-text/70 mt-1 inline-block">
                        Unit: {mat.unit}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Edit & Status Toggle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(mat)}
                      title={STRINGS.editTooltip}
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold border border-theme-border/50 bg-theme-background/60 text-theme-text/80 hover:text-theme-accent hover:border-theme-accent/50 cursor-pointer"
                    >
                      <FiEdit2 className="size-3" />
                      <span>{STRINGS.editBtn}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(mat)}
                      title="Toggle active status"
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border cursor-pointer ${
                        mat.isActive
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-gray-500/15 text-gray-400 border-gray-500/30 hover:bg-gray-500/25"
                      }`}
                    >
                      {mat.isActive ? (
                        <FiToggleRight className="size-4" />
                      ) : (
                        <FiToggleLeft className="size-4" />
                      )}
                      <span className="text-[10px]">
                        {mat.isActive ? STRINGS.active : STRINGS.inactive}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-theme-border/20 flex items-center justify-between">
                  <span className="text-xs text-theme-text/50">
                    {STRINGS.priceCol}
                  </span>
                  <span className="text-xs font-mono font-bold text-theme-accent">
                    {STRINGS.currency} {(mat.currentPrice ?? 0).toFixed(4)} /{" "}
                    {mat.unit}
                  </span>
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

      {/* Create / Edit Material Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-3xl border border-theme-border/60 bg-theme-background/95 p-6 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-theme-border/40">
                <h3 className="text-base font-bold text-theme-text">
                  {editingMaterial
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
                    {STRINGS.unitLabel}
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as RawMaterialUnit)}
                    className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none cursor-pointer"
                  >
                    <option value="g" className="bg-gray-900 text-white">
                      {STRINGS.unitGram}
                    </option>
                    <option value="ml" className="bg-gray-900 text-white">
                      {STRINGS.unitMilli}
                    </option>
                    <option value="piece" className="bg-gray-900 text-white">
                      {STRINGS.unitPiece}
                    </option>
                  </select>
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
                    placeholder="e.g., 0.25"
                    className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                  />
                </div>

                {!editingMaterial && (
                  <div>
                    <label className="text-[11px] font-semibold text-theme-text/70 block mb-1">
                      {STRINGS.initialStockLabel}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={initialStock}
                      onChange={(e) => setInitialStock(e.target.value)}
                      placeholder="e.g., 5000"
                      className="w-full rounded-xl border border-theme-border/50 bg-theme-card/60 p-2.5 text-xs text-theme-text focus:border-theme-accent focus:outline-none"
                    />
                  </div>
                )}

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
                      : editingMaterial
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
