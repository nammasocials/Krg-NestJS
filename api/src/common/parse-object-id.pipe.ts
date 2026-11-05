import { Injectable, NotFoundException, type PipeTransform } from "@nestjs/common";
import { isValidObjectId } from "mongoose";

/** A malformed id can never match anything, so it is "not found" (404), not a server error. */
@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (typeof value !== "string" || !/^[0-9a-fA-F]{24}$/.test(value) || !isValidObjectId(value)) {
      throw new NotFoundException("Not found");
    }
    return value;
  }
}
