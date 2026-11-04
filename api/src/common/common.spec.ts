import { BadRequestException, Logger, NotFoundException, StreamableFile, UnauthorizedException } from "@nestjs/common";
import { of, lastValueFrom } from "rxjs";
import { HttpExceptionFilter } from "./http-exception.filter";
import { ResponseInterceptor } from "./response.interceptor";

function run(exception: unknown) {
  jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
  const json = jest.fn();
  const res = { status: jest.fn().mockReturnValue({ json }) };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as never;
  new HttpExceptionFilter().catch(exception, host);
  return { status: res.status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe("HttpExceptionFilter", () => {
  it("maps 404", () => {
    const r = run(new NotFoundException("Cannot GET /x"));
    expect(r.status).toBe(404);
    expect(r.body).toEqual({ code: "NOT_FOUND", message: "Cannot GET /x", data: null });
  });

  it("keeps a custom message for 401", () => {
    const r = run(new UnauthorizedException("Invalid username or password"));
    expect(r.body.code).toBe("UNAUTHORIZED");
    expect(r.body.message).toBe("Invalid username or password");
  });

  it("returns validation errors as data", () => {
    const r = run(new BadRequestException(["username must be a string", "password should not be empty"]));
    expect(r.status).toBe(400);
    expect(r.body.code).toBe("VALIDATION_FAILED");
    expect(r.body.data.errors).toHaveLength(2);
  });

  it("hides unexpected errors", () => {
    const r = run(new Error("db password is hunter2"));
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("hunter2");
    expect(r.body.code).toBe("INTERNAL_ERROR");
  });
});

describe("ResponseInterceptor", () => {
  const i = new ResponseInterceptor();
  it("wraps data", async () => {
    const out = await lastValueFrom(i.intercept({} as never, { handle: () => of({ a: 1 }) }));
    expect(out).toEqual({ code: "OK", message: "Success", data: { a: 1 } });
  });
  it("wraps empty as null", async () => {
    const out = await lastValueFrom(i.intercept({} as never, { handle: () => of(undefined) }));
    expect(out).toEqual({ code: "OK", message: "Success", data: null });
  });
  it("passes streams through", async () => {
    const f = new StreamableFile(Buffer.from("x"));
    const out = await lastValueFrom(i.intercept({} as never, { handle: () => of(f) }));
    expect(out).toBe(f);
  });
});
