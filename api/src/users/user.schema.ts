import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import type { HydratedDocument } from "mongoose";
import { ROLES, type Role, USERNAME_PATTERN } from "./roles";

@Schema({
  collection: "users",
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.passwordHash; // never leaves the API, even by accident
      return ret;
    },
  },
})
export class User {
  /** Unique case-insensitively: the unique index (migration) uses collation strength 2. */
  @Prop({ required: true, trim: true, match: USERNAME_PATTERN })
  username!: string;

  /** argon2id, or `sha512$<hex>` for a legacy hash that is upgraded at the next login. */
  @Prop({ required: true, select: false })
  passwordHash!: string;

  @Prop({ required: true, trim: true })
  fullName!: string;

  @Prop({ required: true, enum: ROLES })
  role!: Role;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop()
  lastLoginAt?: Date;

  /** `UserCode` of the old system, kept for the data migration. */
  @Prop()
  legacyId?: string;
}

export type UserDocument = HydratedDocument<User>;
export const UserSchema = SchemaFactory.createForClass(User);
