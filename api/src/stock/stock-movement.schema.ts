import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { type HydratedDocument, Types } from "mongoose";
import { MOVEMENT_TYPES, movementProblem, type MovementType } from "./movement-rules";

/**
 * One line of a product's stock history. Append-only: a movement is never changed or removed
 * (a mistake is corrected with a new `ADJUSTMENT`). `quantity` is signed; `balanceAfter` is the
 * product's balance right after this movement, as returned by the atomic update in `StockService`.
 */
@Schema({
  collection: "stockMovements",
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
  toJSON: {
    transform: (_doc, ret: Record<string, unknown>) => {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  },
})
export class StockMovement {
  @Prop({ type: Types.ObjectId, required: true })
  productId!: Types.ObjectId;

  @Prop({ type: String, required: true, enum: MOVEMENT_TYPES })
  type!: MovementType;

  /** Signed: positive adds stock, negative removes it. Never 0. */
  @Prop({
    type: Number,
    required: true,
    validate: {
      validator(this: { type?: MovementType }, value: number) {
        return !this.type || movementProblem(this.type, value) === null;
      },
      message: (props: { value: number }) => `quantity ${props.value} is not valid for this type of movement`,
    },
  })
  quantity!: number;

  @Prop({ required: true, min: 0, validate: { validator: Number.isSafeInteger, message: "balanceAfter must be a whole number" } })
  balanceAfter!: number;

  /** Set for `SALE` and `SALE_CANCEL`: the invoice that caused the movement. */
  @Prop({ type: Types.ObjectId })
  invoiceId?: Types.ObjectId;

  @Prop({ trim: true, maxlength: 200 })
  note?: string;

  @Prop({ type: Types.ObjectId })
  createdBy?: Types.ObjectId;
}

export type StockMovementDocument = HydratedDocument<StockMovement>;
export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

const IMMUTABLE = "Stock movements are append-only and cannot be changed or removed.";

// Nothing in the application may rewrite history: only inserts go through the model.
// (Test clean-up uses the raw collection.)
StockMovementSchema.pre("save", function () {
  if (!this.isNew) throw new Error(IMMUTABLE);
});
StockMovementSchema.pre(
  ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne", "findOneAndReplace", "deleteOne", "deleteMany", "findOneAndDelete"],
  function () {
    throw new Error(IMMUTABLE);
  },
);
StockMovementSchema.pre("deleteOne", { document: true, query: false }, function () {
  throw new Error(IMMUTABLE);
});
