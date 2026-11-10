import { Controller, Delete, Get, Headers, HttpCode, Param, Put, Res, StreamableFile, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnsupportedMediaTypeResponse,
} from "@nestjs/swagger";
import type { Response } from "express";
import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/decorators";
import { ParseObjectIdPipe } from "../common/parse-object-id.pipe";
import { RequestId } from "../common/request-id.middleware";
import { ProductImageService } from "./product-image.service";

/** Images are only reachable here, behind sign-in; nothing serves the upload folder directly. */
@ApiTags("products")
@ApiBearerAuth()
@Controller("products/:id/image")
export class ProductImageController {
  constructor(private readonly images: ProductImageService) {}

  @Put()
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({ schema: { type: "object", properties: { file: { type: "string", format: "binary" } }, required: ["file"] } })
  @ApiOkResponse({ description: "The product with its new image." })
  @ApiUnsupportedMediaTypeResponse({ description: "Not a JPEG, PNG or WebP image (decided by content)." })
  @ApiPayloadTooLargeResponse({ description: "Larger than MAX_UPLOAD_MB." })
  put(
    @Param("id", ParseObjectIdPipe) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ) {
    return this.images.put(id, file, { id: user.id, requestId });
  }

  @Get()
  @ApiOkResponse({ description: "The image bytes." })
  @ApiNotFoundResponse({ description: "Unknown product, or the product has no image." })
  async get(
    @Param("id", ParseObjectIdPipe) id: string,
    @Headers("if-none-match") ifNoneMatch: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const image = await this.images.read(id);
    const etag = `"${image.sha256}"`;
    res.set({
      "Content-Type": image.mime,
      "Cache-Control": "private, no-cache", // may be kept by this browser, but must be re-checked each time
      "X-Content-Type-Options": "nosniff",
      ETag: etag,
    });
    if (ifNoneMatch === etag) {
      image.stream.destroy();
      res.status(304);
      return undefined;
    }
    res.set("Content-Length", String(image.size));
    return new StreamableFile(image.stream);
  }

  @Delete()
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Image removed from the product." })
  @ApiNotFoundResponse({ description: "Unknown product, or the product has no image." })
  async remove(
    @Param("id", ParseObjectIdPipe) id: string,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ): Promise<void> {
    await this.images.remove(id, { id: user.id, requestId });
  }
}
