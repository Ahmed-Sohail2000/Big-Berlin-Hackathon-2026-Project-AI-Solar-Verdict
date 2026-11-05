import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth/basic-auth";
import { LoginThrottle } from "@/lib/auth/rate-limit";

const throttle = new LoginThrottle();

/** The host's proxy must overwrite this header, or a guesser could rotate it. See docs/SECURITY.md. */
function clientKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "direct";
}

/** Every page sits behind the password gate. See lib/auth/basic-auth.ts. */
export async function middleware(request: NextRequest) {
  const client = clientKey(request);
  const now = Date.now();

  const wait = throttle.retryAfter(client, now);
  if (wait !== null) {
    return new NextResponse("Too many failed logins. Try again later.", {
      status: 429,
      headers: { "Retry-After": String(wait) },
    });
  }

  const header = request.headers.get("authorization");
  const decision = await authorize(header, {
    username: process.env.APP_USERNAME,
    password: process.env.APP_PASSWORD,
    production: process.env.NODE_ENV === "production",
  });

  if (decision === "allow") {
    throttle.recordSuccess(client);
    return NextResponse.next();
  }
  if (decision === "misconfigured") {
    return new NextResponse("Login is not configured.", { status: 503 });
  }
  // A first visit has no credentials yet. Only a wrong password counts as a failure.
  if (header) {
    throttle.recordFailure(client, now);
    // No address or username: logs must stay free of personal data (briefing §7).
    console.warn(JSON.stringify({ event: "login_failed" }));
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="HelioSense", charset="UTF-8"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|favicon.ico).*)",
};
