import { describe, expect, it } from "vitest";
import { homeTarget } from "./status-page-target";

describe("homeTarget", () => {
  it("sends a signed-in user to the dashboard", () => {
    expect(homeTarget("authenticated")).toEqual({ href: "/dashboard", label: "Go to dashboard" });
  });
  it("sends everyone else (including while the session is still being checked) to sign in", () => {
    expect(homeTarget("anonymous").href).toBe("/login");
    expect(homeTarget("loading").href).toBe("/login");
  });
});
