import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type ClientSession, type Model, Types } from "mongoose";
import { type AuditAction, AuditLog } from "./audit-log.schema";
import { changedFields, sanitize, type Snapshot } from "./diff";

export interface AuditEntry {
  entity: string;
  entityId: string;
  action: AuditAction;
  /** Absent for CREATE. */
  before?: unknown;
  /** Absent for DELETE. */
  after?: unknown;
  actorId?: string;
  requestId?: string;
}

/**
 * Writes audit rows. There is deliberately no update or delete here: the trail only grows.
 * Pass the `session` of the surrounding transaction so the row commits (or rolls back) with the change.
 */
@Injectable()
export class AuditService {
  constructor(@InjectModel(AuditLog.name) private readonly logs: Model<AuditLog>) {}

  async record(entry: AuditEntry, session?: ClientSession): Promise<void> {
    const before = entry.before === undefined ? undefined : (sanitize(entry.before) as Snapshot);
    const after = entry.after === undefined ? undefined : (sanitize(entry.after) as Snapshot);
    await this.logs.create(
      [
        {
          entity: entry.entity,
          entityId: entry.entityId,
          action: entry.action,
          before,
          after,
          // A delete has no "after" to compare with; the full "before" is the record.
          changedFields: entry.action === "DELETE" ? [] : changedFields(before, after),
          actorId: entry.actorId ? new Types.ObjectId(entry.actorId) : undefined,
          requestId: entry.requestId,
        },
      ],
      { session },
    );
  }
}
