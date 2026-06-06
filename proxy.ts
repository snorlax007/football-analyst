import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production-32chars"
);

export async function proxy(request: NextRequest) {
  const token = request.cookies.get("fa_token")?.value;

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    await jwtVerify(token, KEY);
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
