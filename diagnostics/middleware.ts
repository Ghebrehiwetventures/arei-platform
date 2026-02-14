/**
 * Vercel Edge Middleware: Basic Auth for admin dashboard.
 * Set ADMIN_PASSWORD in Vercel project env; if unset, no protection (e.g. local dev).
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const config = {
  matcher: ["/(.*)"],
};

export default function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pwd = decoded.split(":")[1];
      if (pwd === expected) {
        return NextResponse.next();
      }
    } catch {
      // ignore
    }
  }

  return new NextResponse("Auth required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Africa Property Index Admin"',
    },
  });
}
