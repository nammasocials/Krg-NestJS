import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { type Connection, type Model, Types } from "mongoose";
import { AuditService } from "../audit/audit.service";
import { FileAsset } from "../files/file-asset.schema";
import { sniffImage } from "../files/image-sniff";
import { StorageService } from "../files/storage.service";
import type { ReadStream } from "node:fs";
import { Customer } from "./customer.schema";
import { type Actor, CustomersService } from "./customers.service";

export interface LogoFile {
  stream: ReadStream;
  mime: string;
  size: number;
  sha256: string;
}

const ENTITY = "customer";
const FOLDER = "customers";

/** Upload, download and removal of a customer's logo. */
@Injectable()
export class CustomerLogoService {
  constructor(
    @InjectModel(Customer.name) private readonly customers: Model<Customer>,
    @InjectModel(FileAsset.name) private readonly assets: Model<FileAsset>,
    @InjectConnection() private readonly connection: Connection,
    private readonly customerService: CustomersService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Stores the image, attaches it and retires the previous logo, all audited. Returns the customer. */
  async put(id: string, file: Express.Multer.File | undefined, actor: Actor) {
    await this.customerService.get(id); // 404 before anything is written to disk
    if (!file) throw new BadRequestException('Send the image as multipart form data in the field "file".');
    if (file.size === 0 || file.buffer.length === 0) throw new BadRequestException("The file is empty.");
    const kind = sniffImage(file.buffer);
    if (!kind) throw new UnsupportedMediaTypeException("Only JPEG, PNG and WebP images are accepted.");

    const stored = await this.storage.save(FOLDER, file.buffer, kind.ext);
    // Saved on disk but not attached yet: PENDING until the transaction below succeeds.
    const asset = await this.assets.create({
      storageKey: stored.storageKey,
      mime: kind.mime,
      size: stored.size,
      sha256: stored.sha256,
      status: "PENDING",
      createdBy: new Types.ObjectId(actor.id),
    });

    return this.connection.transaction(async (session) => {
      const customer = await this.customerService.get(id, session);
      const before = customer.toJSON();
      const previous = customer.logo?.fileId;

      customer.logo = { fileId: asset._id, mime: kind.mime, size: stored.size };
      customer.updatedBy = new Types.ObjectId(actor.id);
      await customer.save({ session });

      await this.assets.updateOne({ _id: asset._id }, { status: "ATTACHED" }, { session });
      if (previous) await this.assets.updateOne({ _id: previous }, { status: "ORPHANED" }, { session });
      await this.audit.record(
        { entity: ENTITY, entityId: customer.id, action: "UPDATE", before, after: customer.toJSON(), actorId: actor.id, requestId: actor.requestId },
        session,
      );
      return customer.toJSON();
    });
  }

  async read(id: string): Promise<LogoFile> {
    const customer = await this.customerService.get(id);
    if (!customer.logo) throw new NotFoundException("Customer has no logo");
    const asset = await this.assets.findById(customer.logo.fileId).lean();
    if (!asset || !(await this.storage.exists(asset.storageKey))) throw new NotFoundException("Logo file not found");
    return { stream: this.storage.read(asset.storageKey), mime: asset.mime, size: asset.size, sha256: asset.sha256 };
  }

  /** Detaches the logo. The file stays on disk until a clean-up job removes unused files. */
  async remove(id: string, actor: Actor): Promise<void> {
    await this.connection.transaction(async (session) => {
      const customer = await this.customerService.get(id, session);
      const previous = customer.logo?.fileId;
      if (!previous) throw new NotFoundException("Customer has no logo");

      const before = customer.toJSON();
      customer.logo = undefined;
      customer.updatedBy = new Types.ObjectId(actor.id);
      await customer.save({ session });

      await this.assets.updateOne({ _id: previous }, { status: "ORPHANED" }, { session });
      await this.audit.record(
        { entity: ENTITY, entityId: customer.id, action: "UPDATE", before, after: customer.toJSON(), actorId: actor.id, requestId: actor.requestId },
        session,
      );
    });
  }
}
