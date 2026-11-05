import { registerDecorator, type ValidationOptions } from "class-validator";
import { isValidGstin } from "./gstin";
import { normalizePhone } from "./phone";

/** Passes for a GSTIN with a valid pattern, state code and check character. */
export function IsGstin(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: "isGstin",
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} must be a valid GSTIN: check the number`, ...options },
      validator: { validate: (value: unknown) => typeof value === "string" && isValidGstin(value) },
    });
}

/** Passes for an Indian mobile number (see normalizePhone). */
export function IsIndianMobile(options?: ValidationOptions) {
  return (target: object, propertyName: string) =>
    registerDecorator({
      name: "isIndianMobile",
      target: target.constructor,
      propertyName,
      options: { message: `${propertyName} must be a 10-digit mobile number starting with 6, 7, 8 or 9`, ...options },
      validator: { validate: (value: unknown) => typeof value === "string" && normalizePhone(value) !== null },
    });
}
