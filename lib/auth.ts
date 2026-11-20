import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "local-development-secret-change-before-deployment-123"
);

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "PASSENGER";
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  const jar = await cookies();
  jar.set("transit_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get("transit_session")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    if (payload.role !== "ADMIN" && payload.role !== "PASSENGER") return null;
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireAdmin() {
  const user = await getSession();
  return user?.role === "ADMIN" ? user : null;
}

export async function requirePassenger() {
  const user = await getSession();
  return user?.role === "PASSENGER" ? user : null;
}
