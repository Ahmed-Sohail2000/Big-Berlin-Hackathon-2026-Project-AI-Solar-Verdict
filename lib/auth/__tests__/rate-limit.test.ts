import { describe, expect, it } from "vitest";
import { LoginThrottle, MAX_FAILURES, WINDOW_MS } from "../rate-limit";

function failed(throttle: LoginThrottle, client: string, times: number, now = 0) {
  for (let i = 0; i < times; i++) throttle.recordFailure(client, now);
}

describe("LoginThrottle", () => {
  it("lets a client keep trying below the limit", () => {
    const throttle = new LoginThrottle();
    failed(throttle, "a", MAX_FAILURES - 1);
    expect(throttle.retryAfter("a", 1000)).toBeNull();
  });

  it("blocks at the limit and says how long to wait", () => {
    const throttle = new LoginThrottle();
    failed(throttle, "a", MAX_FAILURES);
    expect(throttle.retryAfter("a", 1000)).toBe(Math.ceil((WINDOW_MS - 1000) / 1000));
  });

  it("does not block other clients", () => {
    const throttle = new LoginThrottle();
    failed(throttle, "a", MAX_FAILURES);
    expect(throttle.retryAfter("b", 1000)).toBeNull();
  });

  it("unblocks once the window has passed", () => {
    const throttle = new LoginThrottle();
    failed(throttle, "a", MAX_FAILURES);
    expect(throttle.retryAfter("a", WINDOW_MS)).toBeNull();
    throttle.recordFailure("a", WINDOW_MS);
    expect(throttle.retryAfter("a", WINDOW_MS + 1)).toBeNull();
  });

  it("forgets failures after a successful login", () => {
    const throttle = new LoginThrottle();
    failed(throttle, "a", MAX_FAILURES - 1);
    throttle.recordSuccess("a");
    failed(throttle, "a", MAX_FAILURES - 1);
    expect(throttle.retryAfter("a", 1000)).toBeNull();
  });
});
