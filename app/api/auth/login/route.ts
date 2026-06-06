import { NextRequest, NextResponse } from "next/server";
import { compare } from "bcryptjs";
import sql from "@/lib/db";
import { signToken, COOKIE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const users = await sql`SELECT * FROM users WHERE email = ${email}`;
  if (users.length === 0) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = users[0];
  const valid = await compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signToken({ userId: user.id, email: user.email, name: user.name });
  const res = NextResponse.json({ ok: true, name: user.name, email: user.email });
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
