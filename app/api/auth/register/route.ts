import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import sql from "@/lib/db";
import { signToken, COOKIE } from "@/lib/auth";
import { checkRateLimit, LIMITS } from "@/lib/rateLimit";
import { stripHtml } from "@/lib/sanitize";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = checkRateLimit(`register:${ip}`, LIMITS.auth);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many registration attempts. Please wait 15 minutes." },
      { status: 429, headers: { "Retry-After": "900" } }
    );
  }

  const body = await req.json();
  const name = stripHtml(String(body.name ?? "")).slice(0, 100);
  const email = String(body.email ?? "").toLowerCase().trim().slice(0, 254);
  const password = String(body.password ?? "");

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email}`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const passwordHash = await hash(password, 12);
  const id = crypto.randomUUID();

  await sql`
    INSERT INTO users (id, name, email, password_hash)
    VALUES (${id}, ${name}, ${email}, ${passwordHash})
  `;

  const token = await signToken({ userId: id, email, name });
  const res = NextResponse.json({ ok: true, name, email }, { status: 201 });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
