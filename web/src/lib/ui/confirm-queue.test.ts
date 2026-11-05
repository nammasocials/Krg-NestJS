import { describe, expect, it, vi } from "vitest";
import { createConfirmController } from "./confirm-queue";

const opts = { title: "Delete?", message: "This cannot be undone." };

describe("confirm controller", () => {
  it("resolves true when confirmed and false when cancelled", async () => {
    const c = createConfirmController();
    const yes = c.ask(opts);
    c.settle(true);
    await expect(yes).resolves.toBe(true);
    const no = c.ask(opts);
    c.settle(false);
    await expect(no).resolves.toBe(false);
  });

  it("fills in default labels and the non-destructive default", () => {
    const c = createConfirmController();
    void c.ask(opts);
    expect(c.current()).toEqual({ ...opts, confirmLabel: "Confirm", cancelLabel: "Cancel", destructive: false });
  });

  it("keeps custom labels and the destructive flag", () => {
    const c = createConfirmController();
    void c.ask({ ...opts, confirmLabel: "Delete", cancelLabel: "Keep", destructive: true });
    expect(c.current()).toMatchObject({ confirmLabel: "Delete", cancelLabel: "Keep", destructive: true });
  });

  it("answers false at once to a second question while one is open, and leaves the first open", async () => {
    const c = createConfirmController();
    const first = c.ask({ ...opts, title: "First" });
    await expect(c.ask({ ...opts, title: "Second" })).resolves.toBe(false);
    expect(c.current()?.title).toBe("First");
    c.settle(true);
    await expect(first).resolves.toBe(true);
  });

  it("can be used again after an answer and ignores settle when nothing is open", async () => {
    const c = createConfirmController();
    c.settle(true); // no-op
    const a = c.ask(opts);
    c.settle(true);
    await a;
    expect(c.current()).toBeNull();
    const b = c.ask(opts);
    c.settle(false);
    await expect(b).resolves.toBe(false);
  });

  it("tells subscribers when a question opens and closes, until they unsubscribe", () => {
    const c = createConfirmController();
    const listener = vi.fn();
    const off = c.subscribe(listener);
    void c.ask(opts);
    c.settle(true);
    expect(listener).toHaveBeenCalledTimes(2);
    off();
    void c.ask(opts);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
