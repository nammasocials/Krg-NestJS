import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type Model, Types } from "mongoose";
import { Product } from "../products/product.schema";
import { User } from "../users/user.schema";
import type { ListMovementsQuery } from "./dto/list-movements.query";
import type { MovementType } from "./movement-rules";
import { StockMovement } from "./stock-movement.schema";

export interface MovementItem {
  id: string;
  type: MovementType;
  quantity: number;
  balanceAfter: number;
  invoiceId?: string;
  note?: string;
  createdAt: Date;
  createdBy?: { id: string; name: string };
}

export interface MovementPage {
  items: MovementItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Read side of the stock history for one product. */
@Injectable()
export class StockHistoryService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(StockMovement.name) private readonly movements: Model<StockMovement>,
    @InjectModel(User.name) private readonly users: Model<User>,
  ) {}

  /** Newest first; `_id` breaks ties in the same direction, so pages never overlap or skip. */
  async list(productId: string, query: ListMovementsQuery): Promise<MovementPage> {
    if (!(await this.products.exists({ _id: productId, isDeleted: false }))) throw new NotFoundException("Product not found");

    const { page, pageSize } = query;
    const filter = { productId: new Types.ObjectId(productId) };
    const [docs, total] = await Promise.all([
      this.movements
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.movements.countDocuments(filter),
    ]);

    const ids = [...new Set(docs.map((d) => (d.createdBy ? String(d.createdBy) : "")).filter(Boolean))];
    const people = ids.length ? await this.users.find({ _id: { $in: ids } }, { fullName: 1, username: 1 }).lean() : [];
    const nameOf = new Map(people.map((u) => [String(u._id), u.fullName || u.username]));

    return {
      items: docs.map((d) => ({
        id: String(d._id),
        type: d.type,
        quantity: d.quantity,
        balanceAfter: d.balanceAfter,
        ...(d.invoiceId ? { invoiceId: String(d.invoiceId) } : {}),
        ...(d.note ? { note: d.note } : {}),
        createdAt: (d as unknown as { createdAt: Date }).createdAt,
        ...(d.createdBy ? { createdBy: { id: String(d.createdBy), name: nameOf.get(String(d.createdBy)) ?? "Unknown user" } } : {}),
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
