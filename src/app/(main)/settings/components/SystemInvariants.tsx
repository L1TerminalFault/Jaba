"use client";

import { MdOutlineSecurity } from "react-icons/md";

// ============================================================================
// STRINGS CONSTANTS (Refactored to top of file for Amharic translation)
// ============================================================================
const STRINGS = {
  invariantsTitle: "System Invariants & Business Logic",
  invariantsSubtitle: "Strict ACID guarantees enforced on all transactions and stock mutations",
  rule1: "1. Atomic Transactions: All purchases, production batches, and sales execute in MongoDB transactions.",
  rule2: "2. Negative Stock Protection: Decrement operations enforce { quantity: { $gte: requiredQty } }.",
  rule3: "3. Dynamic COGS Snapshots: Material unit costs are snapshotted at time of production and sale.",
  rule4: "4. Exact Delta Reversals: Voiding transactions reverses stock mutations with inventory validation.",
  rule5: "5. Serverless Carryover: Unsold finished products roll over daily on-the-fly without crons.",
};

export default function SystemInvariants() {
  return (
    <div className="rounded-3xl border border-theme-border/40 bg-theme-card/75 p-6 backdrop-blur-xl shadow-xl flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 pb-4 border-b border-theme-border/40">
          <MdOutlineSecurity className="size-5 text-emerald-400" />
          <div>
            <h2 className="text-base font-bold text-theme-text">
              {STRINGS.invariantsTitle}
            </h2>
            <p className="text-xs text-theme-text/50">
              {STRINGS.invariantsSubtitle}
            </p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-xs text-theme-text/80">
          <li className="p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30">
            {STRINGS.rule1}
          </li>
          <li className="p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30">
            {STRINGS.rule2}
          </li>
          <li className="p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30">
            {STRINGS.rule3}
          </li>
          <li className="p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30">
            {STRINGS.rule4}
          </li>
          <li className="p-2.5 rounded-xl bg-theme-background/40 border border-theme-border/30">
            {STRINGS.rule5}
          </li>
        </ul>
      </div>
    </div>
  );
}
