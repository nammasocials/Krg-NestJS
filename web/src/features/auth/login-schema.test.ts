import { describe, expect, it } from "vitest";
import {
  PASSWORD_REQUIRED_MESSAGE,
  USERNAME_MESSAGE,
  loginSchema,
} from "./login-schema";

const parse = (username: string, password = "x") =>
  loginSchema.safeParse({ username, password });

describe("loginSchema username", () => {
  it.each(["Anand", "NSAdmin", "user1", "a1b2c", "A".repeat(20)])(
    "accepts %s",
    (u) => expect(parse(u).success).toBe(true),
  );

  it.each([
    ["empty", ""],
    ["too short (4)", "abcd"],
    ["too long (21)", "a".repeat(21)],
    ["starts with digit", "1abcde"],
    ["contains underscore", "abc_def"],
    ["contains space inside", "abc def"],
    ["contains symbol", "abc$def"],
  ])("rejects %s", (_name, u) => {
    const r = parse(u);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe(USERNAME_MESSAGE);
  });

  it("trims surrounding spaces before validating", () => {
    const r = parse("  Anand  ");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.username).toBe("Anand");
  });
});

describe("loginSchema password", () => {
  it("rejects an empty password with the required message", () => {
    const r = parse("Anand", "");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe(PASSWORD_REQUIRED_MESSAGE);
  });

  it("accepts any non-empty password, including legacy-style ones", () => {
    expect(parse("Anand", "a").success).toBe(true);
    expect(parse("Anand", "PassWord@123$").success).toBe(true);
  });

  it("does not trim the password", () => {
    const r = parse("Anand", "  pw  ");
    expect(r.success && r.data.password).toBe("  pw  ");
  });
});
