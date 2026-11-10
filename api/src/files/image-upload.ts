import { BadRequestException, UnsupportedMediaTypeException } from "@nestjs/common";
import { sniffImage } from "./image-sniff";

/** Checks an uploaded file (present, not empty, a JPEG/PNG/WebP by its bytes) and returns its real type. */
export function checkImageUpload(file: Express.Multer.File | undefined) {
  if (!file) throw new BadRequestException('Send the image as multipart form data in the field "file".');
  if (file.size === 0 || file.buffer.length === 0) throw new BadRequestException("The file is empty.");
  const kind = sniffImage(file.buffer);
  if (!kind) throw new UnsupportedMediaTypeException("Only JPEG, PNG and WebP images are accepted.");
  return { kind, buffer: file.buffer };
}
