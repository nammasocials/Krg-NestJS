import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import type { ReadStream } from "node:fs";
import { type Connection, type Model, Types } from "mongoose";
import { AuditService } from "../audit/audit.service";
import type { Actor } from "../customers/customers.service";
import { FileAsset } from "../files/file-asset.schema";
import { checkImageUpload } from "../files/image-upload";
import { StorageService } from "../files/storage.service";
import { Product } from "./product.schema";
import { ProductsService } from "./products.service";

export interface ImageFile {
  stream: ReadStream;
  mime: string;
  size: number;
  sha256: string;
}

const ENTITY = "product";
const FOLDER = "products";

/** Upload, download and removal of a product's image (same storage and rules as customer logos). */
@Injectable()
export class ProductImageService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(FileAsset.name) private readonly assets: Model<FileAsset>,
    @InjectConnection() private readonly connection: Connection,
    private readonly productService: ProductsService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  /** Stores the image, attaches it and retires the previous one, all audited. Returns the product. */
  async put(id: string, file: Express.Multer.File | undefined, actor: Actor) {
    await this.productService.get(id); // 404 before anything is written to disk
    const { kind, buffer } = checkImageUpload(file);

    const stored = await this.storage.save(FOLDER, buffer, kind.ext);
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
      const product = await this.productService.get(id, session);
      const before = product.toJSON();
      const previous = product.image?.fileId;

      product.image = { fileId: asset._id, mime: kind.mime, size: stored.size };
      product.updatedBy = new Types.ObjectId(actor.id);
      await product.save({ session });

      await this.assets.updateOne({ _id: asset._id }, { status: "ATTACHED" }, { session });
      if (previous) await this.assets.updateOne({ _id: previous }, { status: "ORPHANED" }, { session });
      await this.audit.record(
        { entity: ENTITY, entityId: product.id, action: "UPDATE", before, after: product.toJSON(), actorId: actor.id, requestId: actor.requestId },
        session,
      );
      return product.toJSON();
    });
  }

  async read(id: string): Promise<ImageFile> {
    const product = await this.productService.get(id);
    if (!product.image) throw new NotFoundException("Product has no image");
    const asset = await this.assets.findById(product.image.fileId).lean();
    if (!asset || !(await this.storage.exists(asset.storageKey))) throw new NotFoundException("Image file not found");
    return { stream: this.storage.read(asset.storageKey), mime: asset.mime, size: asset.size, sha256: asset.sha256 };
  }

  /** Detaches the image. The file stays on disk until a clean-up job removes unused files. */
  async remove(id: string, actor: Actor): Promise<void> {
    await this.connection.transaction(async (session) => {
      const product = await this.productService.get(id, session);
      const previous = product.image?.fileId;
      if (!previous) throw new NotFoundException("Product has no image");

      const before = product.toJSON();
      product.image = undefined;
      product.updatedBy = new Types.ObjectId(actor.id);
      await product.save({ session });

      await this.assets.updateOne({ _id: previous }, { status: "ORPHANED" }, { session });
      await this.audit.record(
        { entity: ENTITY, entityId: product.id, action: "UPDATE", before, after: product.toJSON(), actorId: actor.id, requestId: actor.requestId },
        session,
      );
    });
  }
}
