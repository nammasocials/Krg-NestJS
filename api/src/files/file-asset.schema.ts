import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";

export const FILE_STATUSES = ["PENDING", "ATTACHED", "ORPHANED"] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

/**
 * One uploaded file. PENDING = saved on disk but not yet attached to anything; ATTACHED = in use;
 * ORPHANED = replaced or detached. Several rows can point at the same bytes (the key is the content
 * hash), so a file on disk is only removable when no ATTACHED row uses its key.
 */
@Schema({ collection: "fileAssets", timestamps: true, versionKey: false })
export class FileAsset {
  /** Relative to UPLOAD_DIR: `<entity>/<2-char prefix>/<sha256>.<ext>`. */
  @Prop({ required: true })
  storageKey!: string;

  @Prop({ required: true })
  mime!: string;

  @Prop({ required: true, min: 1 })
  size!: number;

  @Prop({ required: true, match: /^[0-9a-f]{64}$/ })
  sha256!: string;

  @Prop({ required: true, enum: FILE_STATUSES, default: "PENDING" })
  status!: FileStatus;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;
}

export type FileAssetDocument = HydratedDocument<FileAsset>;
export const FileAssetSchema = SchemaFactory.createForClass(FileAsset);
