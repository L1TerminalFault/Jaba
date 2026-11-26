import mongoose, { Schema, Document, Model } from "mongoose";

export type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

export interface ISystemLog {
  timestamp: Date;
  level: LogLevel;
  tag: string;
  action?: string;
  message: string;
  durationMs?: number;
  data?: Record<string, unknown> | unknown[];
  error?: Record<string, unknown> | string;
  signedBy?: string;
}

export interface ISystemLogDocument extends ISystemLog, Document {
  createdAt: Date;
  updatedAt: Date;
}

const SystemLogSchema = new Schema<ISystemLogDocument>(
  {
    timestamp: { type: Date, default: Date.now, index: true },
    level: {
      type: String,
      enum: ["INFO", "WARN", "ERROR", "DEBUG"],
      default: "INFO",
      index: true,
    },
    tag: { type: String, required: true, index: true },
    action: { type: String, index: true },
    message: { type: String, required: true },
    durationMs: { type: Number },
    data: { type: Schema.Types.Mixed },
    error: { type: Schema.Types.Mixed },
    signedBy: { type: String, default: "system" },
  },
  {
    timestamps: true,
    capped: {
      size: 5242880,
      max: 500,
    },
  }
);

// Compound index for fast timeline queries
SystemLogSchema.index({ timestamp: -1, level: 1 });
SystemLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 }); // 24 hours

export const SystemLog: Model<ISystemLogDocument> =
  mongoose.models.SystemLog ||
  mongoose.model<ISystemLogDocument>("SystemLog", SystemLogSchema);
