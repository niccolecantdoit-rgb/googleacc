import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

import prisma from "@/lib/prisma";

const SESSION_COOKIE_NAME = "gav_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;
const BCRYPT_ROUNDS = 12;

type SessionPayload = {
  userId: number;
  issuedAt: number;
};

function getAppSecret() {
  const secret = process.env.APP_SECRET;

  if (!secret) {
    throw new Error("APP_SECRET is required for auth.");
  }

  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getAppSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const nonce = randomBytes(16).toString("base64url");
  const raw = `${payload.userId}.${payload.issuedAt}.${nonce}`;
  const encoded = Buffer.from(raw).toString("base64url");

  return `${encoded}.${sign(encoded)}`;
}

function decodeSession(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = sign(encoded);
  if (signature.length !== expected.length) {
    return null;
  }

  const valid = timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) {
    return null;
  }

  const decoded = Buffer.from(encoded, "base64url").toString("utf8");
  const [userIdRaw, issuedAtRaw] = decoded.split(".");
  const userId = Number(userIdRaw);
  const issuedAt = Number(issuedAtRaw);

  if (!Number.isInteger(userId) || !Number.isInteger(issuedAt)) {
    return null;
  }

  return { userId, issuedAt };
}

export async function isUserInitialized() {
  const count = await prisma.user.count();
  return count > 0;
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function createInitialUser(password: string) {
  const existing = await prisma.user.findFirst({ select: { id: true } });

  if (existing) {
    return null;
  }

  const passwordHash = await hashPassword(password);

  return prisma.user.create({
    data: {
      passwordHash,
    },
  });
}

export async function authenticateWithPassword(password: string) {
  const user = await prisma.user.findFirst();
  if (!user) {
    return null;
  }

  const ok = await verifyPassword(password, user.passwordHash);
  return ok ? user : null;
}

export async function setSession(userId: number) {
  const token = encodeSession({ userId, issuedAt: Date.now() });
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSessionUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodeSession(token);
  if (!payload) {
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  return user ?? null;
}

export async function getAuthState() {
  const initialized = await isUserInitialized();
  if (!initialized) {
    return { initialized: false, loggedIn: false };
  }

  const user = await getSessionUser();
  return { initialized: true, loggedIn: Boolean(user) };
}
