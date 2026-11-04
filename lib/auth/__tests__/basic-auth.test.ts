import { describe, expect, it } from "vitest";
import { authorize } from "../basic-auth";

const CONFIG = { username: "planner", password: "correct horse", production: true };
const header = (user: string, password: string) => `Basic ${btoa(`${user}:${password}`)}`;

describe("authorize", () => {
  it("allows the right credentials", async () => {
    expect(await authorize(header("planner", "correct horse"), CONFIG)).toBe("allow");
  });

  it("keeps colons inside the password", async () => {
    const config = { ...CONFIG, password: "a:b:c" };
    expect(await authorize(header("planner", "a:b:c"), config)).toBe("allow");
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

  it("stays open for local development without credentials", async () => {
    expect(await authorize(null, { production: false })).toBe("allow");
  });
});
