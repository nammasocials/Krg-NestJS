import { describe, expect, it } from "vitest";
import { isActive } from "./is-active";

describe("isActive", () => {
  it("matches the same path", () => {
    expect(isActive("/customer", "/customer")).toBe(true);
  });

  it("matches nested paths for prefix items", () => {
    expect(isActive("/customer/123", "/customer")).toBe(true);
    expect(isActive("/invoice/abc/edit", "/invoice")).toBe(true);
  });

  it("does not match a longer sibling segment", () => {
    expect(isActive("/customers", "/customer")).toBe(false);
    expect(isActive("/product-list", "/product")).toBe(false);
  });

  it("does not match other sections", () => {
    expect(isActive("/product", "/customer")).toBe(false);
  });

  it("exact items match only the same path", () => {
    expect(isActive("/dashboard", "/dashboard", true)).toBe(true);
    expect(isActive("/dashboard/settings", "/dashboard", true)).toBe(false);
  });

  it("ignores a trailing slash", () => {
    expect(isActive("/customer/", "/customer")).toBe(true);
    expect(isActive("/dashboard/", "/dashboard", true)).toBe(true);
  });
});
