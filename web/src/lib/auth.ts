import "server-only";
import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

export const SESSION_COOKIE = "bp_admin";
const SESSION_DAYS = 30;
export const MAX_ADMINS = 3;

// хэш случайной строки: bcrypt.compare без пользователя тратит то же время
const DUMMY_HASH = "$2b$10$FPTSKJdswnG/TlX29goL9eSBtQX6R9HUSLN4Ilt01Rw3MRo3KaiUK";

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function verifyPassword(login: string, password: string) {
  const admin = await db.adminUser.findUnique({ where: { login: login.trim().toLowerCase() } });
  // сравниваем даже без пользователя — одинаковое время ответа
  const ok = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_HASH);
  return ok && admin ? admin : null;
}

export const hashPassword = (p: string) => bcrypt.hash(p, 10);

export async function createSession(adminId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { id: hashToken(token), adminId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export const getAdmin = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: hashToken(token) }, include: { admin: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.admin;
});

/** Для страниц и server actions админки */
export async function requireAdmin() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
