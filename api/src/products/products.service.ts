import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { type ClientSession, type Connection, type Model, type QueryFilter, Types } from "mongoose";
import { AuditService } from "../audit/audit.service";
import { changedFields, sanitize, type Snapshot } from "../audit/diff";
import { type Actor, isDuplicateKey } from "../customers/customers.service";
import { StockService } from "../stock/stock.service";
import type { CreateProductDto } from "./dto/create-product.dto";
import type { UpdateProductDto } from "./dto/update-product.dto";
import type { ListProductsQuery, ProductSort } from "./dto/list-products.query";
import { Product, type ProductDocument } from "./product.schema";

export const PRODUCT_NAME_EXISTS = "PRODUCT_NAME_EXISTS";
export const PRODUCT_NAME_EXISTS_MESSAGE = "name is already used by another product";

/** The same answer whether the clash is found by the check or by the unique index. */
export const productNameExists = () =>
  new ConflictException({
    code: PRODUCT_NAME_EXISTS,
    message: "A product with this name already exists.",
    errors: [PRODUCT_NAME_EXISTS_MESSAGE],
  });

const ENTITY = "product";

/** What the list shows for one product (no image data, only whether there is an image). */
export interface ProductListItem {
  id: string;
  name: string;
  unit: string;
  unitPrice: number;
  hsnCode: string;
  gstRate: number;
  stock: { qtyOnHand: number };
  isActive: boolean;
  hasImage: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductPage {
  items: ProductListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_FIELDS: Record<string, string> = { name: "nameLower", unitPrice: "unitPrice", createdAt: "createdAt" };

/** Name sorts by `nameLower`; `_id` breaks ties in the same direction so pages never overlap or skip. */
function sortSpec(sort: ProductSort): Record<string, 1 | -1> {
  const dir = sort.startsWith("-") ? -1 : 1;
  return { [SORT_FIELDS[sort.replace("-", "")]]: dir, _id: dir };
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectConnection() private readonly connection: Connection,
    private readonly audit: AuditService,
    private readonly stock: StockService,
  ) {}

  async list(query: ListProductsQuery): Promise<ProductPage> {
    const { page, pageSize, q, sort, active } = query;
    const filter: QueryFilter<Product> = { isDeleted: false };
    if (active !== "all") filter.isActive = active === "true";

    if (q) {
      // The text is matched literally (regex characters escaped), never as a pattern from the client.
      const text = new RegExp(escapeRegex(q), "i");
      filter.$or = [{ name: text }, { hsnCode: text }];
    }

    const [docs, total] = await Promise.all([
      this.products
        .find(filter)
        .sort(sortSpec(sort))
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.products.countDocuments(filter),
    ]);

    return {
      items: docs.map((p) => ({
        id: String(p._id),
        name: p.name,
        unit: p.unit,
        unitPrice: p.unitPrice,
        hsnCode: p.hsnCode,
        gstRate: p.gstRate,
        stock: { qtyOnHand: p.stock?.qtyOnHand ?? 0 },
        isActive: p.isActive,
        hasImage: !!p.image,
        createdAt: (p as unknown as { createdAt: Date }).createdAt,
        updatedAt: (p as unknown as { updatedAt: Date }).updatedAt,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /** The product and its audit row are saved in one transaction: both happen or neither does. */
  async create(dto: CreateProductDto, actor: Actor): Promise<ProductDocument> {
    // A friendly early answer; the unique index below is what makes it hold under parallel requests.
    if (await this.products.exists({ nameLower: dto.name.toLowerCase(), isDeleted: false })) throw productNameExists();

    const by = new Types.ObjectId(actor.id);
    try {
      return await this.connection.transaction(async (session) => {
        // Stock and active state are not taken from the caller: the schema defaults apply (0 on hand, active).
        const { openingStock = 0, ...fields } = dto;
        const [created] = await this.products.create([{ ...fields, createdBy: by, updatedBy: by }], { session });
        let product = created;
        if (openingStock > 0) {
          // The only way stock changes: through the stock service, in this same transaction.
          await this.stock.apply(session, { productId: created._id, delta: openingStock, type: "OPENING", actorId: actor.id });
          product = (await this.products.findById(created._id).session(session)) ?? created;
        }
        await this.audit.record(
          { entity: ENTITY, entityId: product.id, action: "CREATE", after: product.toJSON(), actorId: actor.id, requestId: actor.requestId },
          session,
        );
        return product;
      });
    } catch (err) {
      if (isDuplicateKey(err)) throw productNameExists();
      throw err;
    }
  }

  /** Throws 404 for an unknown, malformed or deleted product. */
  async get(id: string, session?: ClientSession): Promise<ProductDocument> {
    const product = await this.products.findOne({ _id: id, isDeleted: false }).session(session ?? null);
    if (!product) throw new NotFoundException("Product not found");
    return product;
  }

  async update(id: string, dto: UpdateProductDto, actor: Actor): Promise<ProductDocument> {
    const changes = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (changes.length === 0) throw new BadRequestException("Send at least one field to change.");

    try {
      return await this.connection.transaction(async (session) => {
        const product = await this.get(id, session);
        if (dto.name && dto.name.toLowerCase() !== product.nameLower) {
          const clash = await this.products
            .exists({ nameLower: dto.name.toLowerCase(), isDeleted: false, _id: { $ne: product._id } })
            .session(session);
          if (clash) throw productNameExists();
        }

        const before = product.toJSON();
        for (const [key, value] of changes) product.set(key, value);
        await product.validate(); // refreshes the derived nameLower so the comparison is complete
        const after = product.toJSON();
        // Saying what is already true is not an edit: no write, no audit row.
        if (changedFields(sanitize(before) as Snapshot, sanitize(after) as Snapshot).length === 0) return product;

        product.updatedBy = new Types.ObjectId(actor.id);
        await product.save({ session });
        await this.audit.record(
          { entity: ENTITY, entityId: product.id, action: "UPDATE", before, after: product.toJSON(), actorId: actor.id, requestId: actor.requestId },
          session,
        );
        return product;
      });
    } catch (err) {
      if (isDuplicateKey(err)) throw productNameExists();
      throw err;
    }
  }

  async remove(id: string, actor: Actor): Promise<void> {
    await this.connection.transaction(async (session) => {
      const product = await this.get(id, session);
      const before = product.toJSON();
      // Conditional on isDeleted:false so two parallel deletes cannot both succeed.
      const res = await this.products.updateOne(
        { _id: product._id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date(), updatedBy: new Types.ObjectId(actor.id) },
        { session },
      );
      if (res.matchedCount === 0) throw new NotFoundException("Product not found");
      await this.audit.record(
        { entity: ENTITY, entityId: product.id, action: "DELETE", before, actorId: actor.id, requestId: actor.requestId },
        session,
      );
    });
  }
}
