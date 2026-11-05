import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "CANCEL"] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** Append-only record of one change. Rows are never updated or deleted by the application. */
@Schema({ collection: "auditLogs", timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class AuditLog {
  /** `customer`, `product`, `invoice`, and so on. */
  @Prop({ required: true })
  entity!: string;

  @Prop({ required: true })
  entityId!: string;

  @Prop({ required: true, enum: AUDIT_ACTIONS })
  action!: AuditAction;

  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  @Prop({ type: [String], default: [] })
  changedFields!: string[];

  @Prop({ type: Types.ObjectId })
  actorId?: Types.ObjectId;

  @Prop()
  requestId?: string;
}

export type AuditLogDocument = HydratedDocument<AuditLog>;
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
