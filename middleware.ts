import { NextResponse, type NextRequest } from "next/server";
import { authorize } from "@/lib/auth/basic-auth";

/** Every page sits behind the password gate. See lib/auth/basic-auth.ts. */
export async function middleware(request: NextRequest) {
  const decision = await authorize(request.headers.get("authorization"), {
    username: process.env.APP_USERNAME,
    password: process.env.APP_PASSWORD,
    production: process.env.NODE_ENV === "production",
  });

  if (decision === "allow") return NextResponse.next();
  if (decision === "misconfigured") {
    return new NextResponse("Login is not configured.", { status: 503 });
  }
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="HelioSense", charset="UTF-8"' },
  });
}

export const config = {
  matcher: "/((?!_next/static|favicon.ico).*)",
};
