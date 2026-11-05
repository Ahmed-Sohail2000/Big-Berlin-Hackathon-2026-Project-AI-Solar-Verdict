import { describe, expect, it } from "vitest";
import { authorize } from "../basic-auth";

const CONFIG = { username: "planner", password: "correct horse", production: true };
const header = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`;

describe("authorize", () => {
  it("allows the right credentials", async () => {
    expect(await authorize(header("planner", "correct horse"), CONFIG)).toBe("allow");
  });

  it("keeps colons inside the password", async () => {
    const config = { ...CONFIG, password: "a:b:c:d:e:f:g" };
    expect(await authorize(header("planner", "a:b:c:d:e:f:g"), config)).toBe("allow");
  });

  it("challenges wrong, missing and malformed credentials", async () => {
    expect(await authorize(header("planner", "wrong"), CONFIG)).toBe("challenge");
    expect(await authorize(header("other", "correct horse"), CONFIG)).toBe("challenge");
    expect(await authorize(null, CONFIG)).toBe("challenge");
    expect(await authorize("Bearer token", CONFIG)).toBe("challenge");
    expect(await authorize("Basic not-base64!!", CONFIG)).toBe("challenge");
    expect(await authorize(`Basic ${btoa("no-colon")}`, CONFIG)).toBe("challenge");
  });

  it("fails closed in production when credentials are not configured", async () => {
    expect(await authorize(null, { production: true })).toBe("misconfigured");
    expect(await authorize(null, { username: "planner", production: true })).toBe("misconfigured");
  });

  it("refuses to run production on a short password", async () => {
    const weak = { ...CONFIG, password: "short" };
    expect(await authorize(header("planner", "short"), weak)).toBe("misconfigured");
    expect(await authorize(header("planner", "short"), { ...weak, production: false })).toBe("allow");
  });

  it("opens production only for the exact public demo setting", async () => {
    expect(await authorize(null, { production: true, publicDemo: "true" })).toBe("allow");
    for (const publicDemo of [undefined, "", "false", "TRUE", "True", "1", "yes", " true", "true "]) {
      expect(await authorize(null, { production: true, publicDemo })).toBe("misconfigured");
    }
  });

  it("keeps a configured login locked when the public demo is on", async () => {
    const locked = { ...CONFIG, publicDemo: "true" };
    expect(await authorize(null, locked)).toBe("challenge");
    expect(await authorize(header("planner", "wrong"), locked)).toBe("challenge");
    expect(await authorize(header("planner", "correct horse"), locked)).toBe("allow");
  });

  it("does not open a half-configured login for the public demo", async () => {
    const half = { username: "planner", production: true, publicDemo: "true" };
    expect(await authorize(null, half)).toBe("misconfigured");
    expect(await authorize(null, { password: "correct horse", production: true, publicDemo: "true" })).toBe(
      "misconfigured",
    );
  });

  it("stays open for local development without credentials", async () => {
    expect(await authorize(null, { production: false })).toBe("allow");
  });
});
