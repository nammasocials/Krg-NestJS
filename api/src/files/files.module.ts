import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { MulterModule } from "@nestjs/platform-express";
import type { Env } from "../config/env.schema";
import { FileAsset, FileAssetSchema } from "./file-asset.schema";
import { StorageService } from "./storage.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FileAsset.name, schema: FileAssetSchema }]),
    // No dest/storage given, so multer keeps the upload in memory (at most MAX_UPLOAD_MB): its type is checked before anything is written.
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({
        limits: {
          fileSize: Math.floor(config.get("MAX_UPLOAD_MB", { infer: true }) * 1024 * 1024),
          files: 1,
          fields: 0,
        },
      }),
    }),
  ],
  providers: [StorageService],
  exports: [StorageService, MongooseModule, MulterModule],
})
export class FilesModule {}
