import { describe, expect, it } from "vitest";
import { leavingHref } from "./unsaved-guard";

const plain = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
const here = { origin: "http://localhost:4000", href: "http://localhost:4000/customer/new" };

describe("leavingHref", () => {
  it("returns the path of an ordinary link to another page", () => {
    expect(leavingHref({ href: "http://localhost:4000/customer?page=2" }, plain, here)).toBe("/customer?page=2");
  });

  it("leaves other sites, new tabs, downloads and modified clicks alone", () => {
    expect(leavingHref({ href: "https://example.com/" }, plain, here)).toBeNull();
    expect(leavingHref({ href: "/customer", target: "_blank" }, plain, here)).toBeNull();
    expect(leavingHref({ href: "/customer", download: true }, plain, here)).toBeNull();
    expect(leavingHref({ href: "/customer" }, { ...plain, ctrlKey: true }, here)).toBeNull();
    expect(leavingHref({ href: "/customer" }, { ...plain, button: 1 }, here)).toBeNull();
  });

  it("ignores links to the same page", () => {
    expect(leavingHref({ href: "/customer/new#top" }, plain, here)).toBeNull();
  });

  it("ignores an address that cannot be read", () => {
    expect(leavingHref({ href: "http://" }, plain, here)).toBeNull();
  });
});
