import { expect, test } from "@playwright/test";

/** The browser and server promises from docs/SECURITY.md. */
test.describe("security", () => {
  test("every page carries the security headers", async ({ request }) => {
    for (const path of ["/", "/tool", "/guide"]) {
      const { status, headers } = await request.get(path).then((r) => ({ status: r.status(), headers: r.headers() }));
      expect(status).toBe(200);
      const csp = headers["content-security-policy"];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("connect-src 'self' blob:");
      expect(csp).toContain("form-action 'none'");
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");
      expect(csp).not.toContain("connect-src *");
      expect(headers["x-content-type-options"]).toBe("nosniff");
      expect(headers["x-frame-options"]).toBe("DENY");
      expect(headers["referrer-policy"]).toBe("no-referrer");
      expect(headers["cross-origin-opener-policy"]).toBe("same-origin");
      expect(headers["strict-transport-security"]).toContain("max-age");
      expect(headers["x-powered-by"]).toBeUndefined();
    }
  });

  test("there is no server route that accepts a file", async ({ request }) => {
    for (const path of ["/", "/tool", "/api/upload", "/api/photos"]) {
      const response = await request.post(path, { multipart: { photo: "x" } });
      expect([404, 405]).toContain(response.status());
    }
  });

  test("a guesser is locked out, and only that client", async ({ playwright, baseURL }) => {
    test.skip(!process.env.APP_USERNAME, "needs a production server with a password");
    const client = (address: string, password: string) =>
      playwright.request.newContext({
        baseURL,
        extraHTTPHeaders: {
          "x-forwarded-for": address,
          authorization: `Basic ${btoa(`${process.env.APP_USERNAME}:${password}`)}`,
        },
      });

    const guesser = await client("203.0.113.7", "wrong-password");
    for (let i = 0; i < 10; i++) expect((await guesser.get("/")).status()).toBe(401);
    const blocked = await guesser.get("/");
    expect(blocked.status()).toBe(429);
    expect(Number(blocked.headers()["retry-after"])).toBeGreaterThan(0);

    const colleague = await client("203.0.113.8", process.env.APP_PASSWORD!);
    expect((await colleague.get("/")).status()).toBe(200);
  });
});
