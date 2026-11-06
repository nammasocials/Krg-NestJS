import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";
import { GST_RATES } from "./gst-rates";
import { HSN_PATTERN } from "./hsn";
import { UNIT_CODES } from "./units";

@Schema({ _id: false, versionKey: false })
export class ProductStock {
  /** Only ever changed by the stock service (E05), never by editing a product. */
  @Prop({
    required: true,
    default: 0,
    min: 0,
    validate: { validator: Number.isInteger, message: "qtyOnHand must be a whole number" },
  })
  qtyOnHand!: number;
}

@Schema({ _id: false, versionKey: false })
export class ProductImage {
  @Prop({ type: Types.ObjectId, required: true })
  fileId!: Types.ObjectId;

  @Prop({ required: true })
  mime!: string;

  @Prop({ required: true, min: 1 })
  size!: number;
}

/**
 * A product we sell. `unitPrice` is whole paise; `gstRate` is one slab (the intra-state split into
 * CGST and SGST is worked out at invoice time). Deleting is soft, so the name of a deleted product can
 * be used again: the unique index (see the migration) only covers products that are not deleted.
 * `isActive: false` keeps a product but stops it being offered for new invoices.
 */
@Schema({
  collection: "products",
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
export class Product {
  @Prop({ required: true, trim: true, minlength: 2, maxlength: 100 })
  name!: string;

  /** Derived from `name`; used for uniqueness, sorting and searching. */
  @Prop({ required: true })
  nameLower!: string;

  @Prop({ type: String, required: true, enum: UNIT_CODES })
  unit!: (typeof UNIT_CODES)[number];

  /** Price per unit in paise (₹12.50 is 1250). */
  @Prop({
    required: true,
    min: 0,
    validate: { validator: Number.isSafeInteger, message: "unitPrice must be a whole number of paise" },
  })
  unitPrice!: number;

  @Prop({ required: true, trim: true, match: HSN_PATTERN })
  hsnCode!: string;

  /** GST in percent, one of the allowed slabs. */
  @Prop({ type: Number, required: true, enum: GST_RATES })
  gstRate!: (typeof GST_RATES)[number];

  @Prop({ type: ProductStock, default: () => ({ qtyOnHand: 0 }) })
  stock!: ProductStock;

  @Prop({ type: ProductImage })
  image?: ProductImage;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isDeleted!: boolean;

  @Prop()
  deletedAt?: Date;

  /** `ProductCode` of the old system, kept for the data migration. */
  @Prop()
  legacyId?: string;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId })
  updatedBy?: Types.ObjectId;
}

export type ProductDocument = HydratedDocument<Product>;
export const ProductSchema = SchemaFactory.createForClass(Product);

ProductSchema.pre("validate", function () {
  if (this.isModified("name") || !this.nameLower) this.nameLower = this.name?.trim().toLowerCase();
});
