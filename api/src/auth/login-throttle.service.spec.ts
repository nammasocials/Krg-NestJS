import { ConfigService } from "@nestjs/config";
import { LoginThrottleService } from "./login-throttle.service";

function make(over: Record<string, number> = {}) {
  const values: Record<string, number> = {
    LOGIN_IP_LIMIT: 3,
    LOGIN_IP_WINDOW_SECONDS: 60,
    LOGIN_FAIL_LIMIT: 2,
    LOGIN_FAIL_WINDOW_SECONDS: 900,
    ...over,
  };
  return new LoginThrottleService({ get: (k: string) => values[k] } as unknown as ConfigService<never, true>);
}

const T0 = 1_000_000;
const sec = (n: number) => n * 1000;

describe("LoginThrottleService", () => {
  let svc: LoginThrottleService;
  beforeEach(() => {
    svc = make();
  });
  afterEach(() => svc.onModuleDestroy());

  describe("per IP", () => {
    it("allows up to the limit and refuses the next request with the time left", () => {
      for (let i = 0; i < 3; i++) expect(svc.hitIp("1.1.1.1", T0 + i).allowed).toBe(true);
      const refused = svc.hitIp("1.1.1.1", T0 + sec(10));
      expect(refused).toEqual({ allowed: false, retryAfterSeconds: 50 });
    });

    it("starts a new window once the old one ends", () => {
      for (let i = 0; i < 4; i++) svc.hitIp("1.1.1.1", T0);
      expect(svc.hitIp("1.1.1.1", T0 + sec(59)).allowed).toBe(false);
      expect(svc.hitIp("1.1.1.1", T0 + sec(60)).allowed).toBe(true);
    });

    it("tracks addresses independently", () => {
      for (let i = 0; i < 5; i++) svc.hitIp("1.1.1.1", T0);
      expect(svc.hitIp("2.2.2.2", T0).allowed).toBe(true);
    });

    it("never reports less than one second", () => {
      for (let i = 0; i < 4; i++) svc.hitIp("1.1.1.1", T0);
      expect(svc.hitIp("1.1.1.1", T0 + 59_999).retryAfterSeconds).toBe(1);
    });
  });

  describe("attempts per username + IP", () => {
    it("allows the limit, then refuses until the window ends", () => {
      expect(svc.tryAttempt("alice", "1.1.1.1", T0).allowed).toBe(true);
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + sec(5)).allowed).toBe(true);
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + sec(6))).toEqual({ allowed: false, retryAfterSeconds: 894 });
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + sec(899)).allowed).toBe(false);
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + sec(900)).allowed).toBe(true);
    });

    it("a refused attempt does not extend the lock", () => {
      svc.tryAttempt("alice", "1.1.1.1", T0);
      svc.tryAttempt("alice", "1.1.1.1", T0);
      for (let i = 0; i < 20; i++) svc.tryAttempt("alice", "1.1.1.1", T0 + sec(100));
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + sec(900)).allowed).toBe(true);
    });

    it("a success gives all attempts back", () => {
      svc.tryAttempt("alice", "1.1.1.1", T0);
      svc.recordSuccess("alice", "1.1.1.1");
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + 1).allowed).toBe(true);
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + 2).allowed).toBe(true);
      expect(svc.tryAttempt("alice", "1.1.1.1", T0 + 3).allowed).toBe(false);
    });

    it("treats the username case-insensitively and ignores surrounding spaces", () => {
      svc.tryAttempt("Alice", "1.1.1.1", T0);
      svc.tryAttempt("  ALICE ", "1.1.1.1", T0);
      expect(svc.tryAttempt("alice", "1.1.1.1", T0).allowed).toBe(false);
    });

    it("does not limit the same username from another address, or another username from the same one", () => {
      svc.tryAttempt("alice", "1.1.1.1", T0);
      svc.tryAttempt("alice", "1.1.1.1", T0);
      expect(svc.tryAttempt("alice", "9.9.9.9", T0).allowed).toBe(true);
      expect(svc.tryAttempt("bob", "1.1.1.1", T0).allowed).toBe(true);
    });
  });

  describe("sweep", () => {
    it("drops expired entries and keeps live ones", () => {
      svc.hitIp("1.1.1.1", T0);
      svc.tryAttempt("alice", "1.1.1.1", T0);
      expect(svc.size()).toBe(2);

      svc.sweep(T0 + sec(61)); // IP window over, failure window not
      expect(svc.size()).toBe(1);
      svc.sweep(T0 + sec(901));
      expect(svc.size()).toBe(0);
    });
  });
});
