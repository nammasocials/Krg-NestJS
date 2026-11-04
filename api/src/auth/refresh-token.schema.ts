import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";

/**
 * One row per issued refresh token. Only the SHA-256 of the opaque token is stored.
 * Rotation: using a token revokes it and issues a successor in the same family.
 * Using an already-revoked token revokes the whole family (theft signal).
 */
@Schema({ collection: "refreshTokens", timestamps: { createdAt: true, updatedAt: false }, versionKey: false })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  userId!: Types.ObjectId;

  @Prop({ required: true })
  tokenHash!: string;

  @Prop({ required: true })
  familyId!: string;

  /** TTL index (migration) deletes the row shortly after this moment. */
  @Prop({ required: true })
  expiresAt!: Date;

  @Prop()
  revokedAt?: Date;

  @Prop({ type: Types.ObjectId })
  replacedBy?: Types.ObjectId;

  @Prop()
  userAgent?: string;

  @Prop()
  ip?: string;
}

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;
export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
