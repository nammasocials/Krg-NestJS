import { dbNameFromUri, maskUri } from "./db-uri";

describe("dbNameFromUri", () => {
  it("reads the path", () => {
    expect(dbNameFromUri("mongodb://u:p@h1:27017,h2:27017/invoices?replicaSet=rs0")).toBe("invoices");
    expect(dbNameFromUri("mongodb+srv://h/krg_prod")).toBe("krg_prod");
  });
  it("falls back to krg", () => {
    expect(dbNameFromUri("mongodb://localhost:27017")).toBe("krg");
    expect(dbNameFromUri("mongodb://localhost:27017/?replicaSet=rs0")).toBe("krg");
  });
});

describe("maskUri", () => {
  it("hides credentials", () => {
    expect(maskUri("mongodb://app:s3cret@host:27017/krg")).toBe("mongodb://***@host:27017/krg");
  });
  it("leaves a URI without credentials alone", () => {
    expect(maskUri("mongodb://host:27017/krg")).toBe("mongodb://host:27017/krg");
  });
});
