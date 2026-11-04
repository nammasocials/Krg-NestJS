import { parseTrustProxy } from "./trust-proxy";

describe("parseTrustProxy", () => {
  it.each([
    ["false", false],
    ["FALSE", false],
    ["", false],
    ["true", true],
    ["1", 1],
    ["2", 2],
    ["loopback", "loopback"],
    ["10.0.0.0/8", "10.0.0.0/8"],
    ["loopback, 10.0.0.0/8", ["loopback", "10.0.0.0/8"]],
  ])("%j → %j", (raw, expected) => expect(parseTrustProxy(raw)).toEqual(expected));
});
