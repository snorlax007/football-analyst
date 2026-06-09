import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const KEY = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "dev-secret-change-in-production-32chars"
);

export const COOKIE = "fa_token";
export const FREE_LIMIT = 5;
export const ORG_QUOTA = 20;

export interface Session {
  userId: string;
  email: string;
  name: string;
}

export async function signToken(session: Session): Promise<string> {
  return new SignJWT({ userId: session.userId, email: session.email, name: session.name })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(KEY);
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, KEY);
    return payload as unknown as Session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
