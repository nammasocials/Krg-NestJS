import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { type ClientSession, type Connection, type Model, type QueryFilter, Types } from "mongoose";
import { changedFields, sanitize, type Snapshot } from "../audit/diff";
import { AuditService } from "../audit/audit.service";
import { Customer, type CustomerDocument } from "./customer.schema";
import { normalizePhone } from "./phone";
import type { CreateCustomerDto } from "./dto/create-customer.dto";
import type { UpdateCustomerDto } from "./dto/update-customer.dto";
import type { CustomerSort, ListCustomersQuery } from "./dto/list-customers.query";

export const GSTIN_EXISTS = "GSTIN_EXISTS";
export const GSTIN_EXISTS_MESSAGE = "gstin is already used by another customer";

/** The same answer whether the clash is found by the check or by the unique index. */
export const gstinExists = () =>
  new ConflictException({
    code: GSTIN_EXISTS,
    message: "A customer with this GSTIN already exists.",
    errors: [GSTIN_EXISTS_MESSAGE],
  });

export const isDuplicateKey = (err: unknown): boolean =>
  typeof err === "object" && err !== null && (err as { code?: number }).code === 11000;

/** What the list shows for one customer (no logo data, only whether there is a logo). */
export interface CustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  phoneAlt?: string;
  address: { line: string; city: string; pincode: string };
  gstin: string;
  stateCode: string;
  hasLogo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerPage {
  items: CustomerListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Name sorts by `nameLower`; `_id` breaks ties in the same direction so pages never overlap or skip. */
function sortSpec(sort: CustomerSort): Record<string, 1 | -1> {
  const dir = sort.startsWith("-") ? -1 : 1;
  const field = sort.replace("-", "") === "name" ? "nameLower" : "createdAt";
  return { [field]: dir, _id: dir };
}

/** Who did it and in which request; recorded on the audit row. */
export interface Actor {
  id: string;
  requestId?: string;
}

const ENTITY = "customer";

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private readonly customers: Model<Customer>,
    @InjectConnection() private readonly connection: Connection,
    private readonly audit: AuditService,
  ) {}

  /** The customer and its audit row are saved in one transaction: both happen or neither does. */
  async create(dto: CreateCustomerDto, actor: Actor): Promise<CustomerDocument> {
    // A friendly early answer; the unique index below is what makes it hold under parallel requests.
    if (await this.customers.exists({ gstin: dto.gstin, isDeleted: false })) throw gstinExists();

    const by = new Types.ObjectId(actor.id);
    try {
      return await this.connection.transaction(async (session) => {
        const [customer] = await this.customers.create([{ ...dto, createdBy: by, updatedBy: by }], { session });
        await this.audit.record(
          { entity: ENTITY, entityId: customer.id, action: "CREATE", after: customer.toJSON(), actorId: actor.id, requestId: actor.requestId },
          session,
        );
        return customer;
      });
    } catch (err) {
      if (isDuplicateKey(err)) throw gstinExists();
      throw err;
    }
  }

  /** Throws 404 for an unknown, malformed or deleted customer. */
  async get(id: string, session?: ClientSession): Promise<CustomerDocument> {
    const customer = await this.customers.findOne({ _id: id, isDeleted: false }).session(session ?? null);
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async update(id: string, dto: UpdateCustomerDto, actor: Actor): Promise<CustomerDocument> {
    const changes = Object.entries(dto).filter(([, v]) => v !== undefined);
    if (changes.length === 0) throw new BadRequestException("Send at least one field to change.");

    try {
      return await this.connection.transaction(async (session) => {
        const customer = await this.get(id, session);
        if (dto.gstin && dto.gstin !== customer.gstin) {
          const clash = await this.customers
            .exists({ gstin: dto.gstin, isDeleted: false, _id: { $ne: customer._id } })
            .session(session);
          if (clash) throw gstinExists();
        }

        const before = customer.toJSON();
        for (const [key, value] of changes) {
          if (key === "phoneAlt" && value === null) customer.set("phoneAlt", undefined);
          else customer.set(key, value);
        }
        await customer.validate(); // fills the derived stateCode/nameLower so the comparison is complete
        const after = customer.toJSON();
        // Saying what is already true is not an edit: no write, no audit row.
        if (changedFields(sanitize(before) as Snapshot, sanitize(after) as Snapshot).length === 0) return customer;

        customer.updatedBy = new Types.ObjectId(actor.id);
        await customer.save({ session });
        await this.audit.record(
          { entity: ENTITY, entityId: customer.id, action: "UPDATE", before, after: customer.toJSON(), actorId: actor.id, requestId: actor.requestId },
          session,
        );
        return customer;
      });
    } catch (err) {
      if (isDuplicateKey(err)) throw gstinExists();
      throw err;
    }
  }

  async remove(id: string, actor: Actor): Promise<void> {
    await this.connection.transaction(async (session) => {
      const customer = await this.get(id, session);
      const before = customer.toJSON();
      // Conditional on isDeleted:false so two parallel deletes cannot both succeed.
      const res = await this.customers.updateOne(
        { _id: customer._id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date(), updatedBy: new Types.ObjectId(actor.id) },
        { session },
      );
      if (res.matchedCount === 0) throw new NotFoundException("Customer not found");
      await this.audit.record(
        { entity: ENTITY, entityId: customer.id, action: "DELETE", before, actorId: actor.id, requestId: actor.requestId },
        session,
      );
    });
  }

  async list(query: ListCustomersQuery): Promise<CustomerPage> {
    const { page, pageSize, q, sort } = query;
    const filter: QueryFilter<Customer> = { isDeleted: false };

    if (q) {
      // The text is matched literally (regex characters escaped), never as a pattern from the client.
      const text = new RegExp(escapeRegex(q), "i");
      const mobile = normalizePhone(q);
      const or: QueryFilter<Customer>[] = [{ name: text }, { email: text }, { gstin: text }, { phone: text }, { phoneAlt: text }];
      // "+91 98765-43210" or "098765 43210" should still find 9876543210.
      if (mobile && mobile !== q) or.push({ phone: mobile }, { phoneAlt: mobile });
      filter.$or = or;
    }

    const [docs, total] = await Promise.all([
      this.customers
        .find(filter)
        .sort(sortSpec(sort))
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.customers.countDocuments(filter),
    ]);

    return {
      items: docs.map((c) => ({
        id: String(c._id),
        name: c.name,
        email: c.email,
        phone: c.phone,
        ...(c.phoneAlt ? { phoneAlt: c.phoneAlt } : {}),
        address: { line: c.address.line, city: c.address.city, pincode: c.address.pincode },
        gstin: c.gstin,
        stateCode: c.stateCode,
        hasLogo: !!c.logo,
        createdAt: (c as unknown as { createdAt: Date }).createdAt,
        updatedAt: (c as unknown as { updatedAt: Date }).updatedAt,
      })),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
