import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";
import { stateCodeOf } from "./gstin";

@Schema({ _id: false, versionKey: false })
export class CustomerAddress {
  @Prop({ required: true, trim: true, maxlength: 200 })
  line!: string;

  @Prop({ required: true, trim: true, maxlength: 60 })
  city!: string;

  @Prop({ required: true, match: /^[0-9]{6}$/ })
  pincode!: string;
}

@Schema({ _id: false, versionKey: false })
export class CustomerLogo {
  @Prop({ type: Types.ObjectId, required: true })
  fileId!: Types.ObjectId;

  @Prop({ required: true })
  mime!: string;

  @Prop({ required: true, min: 1 })
  size!: number;
}

/**
 * A customer we invoice. The service normalises values before they reach this schema (phones to
 * 10 digits, GSTIN upper-case); the schema keeps the two derived fields, `nameLower` and
 * `stateCode`, in step. Deleting is soft (`isDeleted`), so the GSTIN of a deleted customer can be
 * used again: the unique index (see the migration) only covers customers that are not deleted.
 */
@Schema({
  collection: "customers",
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      delete ret.nameLower;
      return ret;
    },
  },
})
export class Customer {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name!: string;

  /** Derived from `name`; used for sorting and searching. */
  @Prop({ required: true })
  nameLower!: string;

  @Prop({ required: true, trim: true, lowercase: true, maxlength: 254 })
  email!: string;

  @Prop({ required: true, match: /^[6-9][0-9]{9}$/ })
  phone!: string;

  @Prop({ match: /^[6-9][0-9]{9}$/ })
  phoneAlt?: string;

  @Prop({ type: CustomerAddress, required: true })
  address!: CustomerAddress;

  /** 15 characters, upper-case; unique among customers that are not deleted. */
  @Prop({ required: true, uppercase: true, trim: true, match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/ })
  gstin!: string;

  /** Derived from the first two digits of `gstin`. */
  @Prop({ required: true, match: /^[0-9]{2}$/ })
  stateCode!: string;

  @Prop({ type: CustomerLogo })
  logo?: CustomerLogo;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;

  /** `CustomerCode` of the old system, kept for the data migration. */
  @Prop()
  legacyId?: string;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  updatedBy?: Types.ObjectId;
}

export type CustomerDocument = HydratedDocument<Customer>;
export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.pre("validate", function () {
  if (this.isModified("name") || !this.nameLower) this.nameLower = this.name?.trim().toLowerCase();
  if (this.isModified("gstin") || !this.stateCode) {
    if (this.gstin) this.stateCode = stateCodeOf(this.gstin);
  }
});
