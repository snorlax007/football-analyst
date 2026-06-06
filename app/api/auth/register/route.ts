import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import sql from "@/lib/db";
import { signToken, COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();

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
