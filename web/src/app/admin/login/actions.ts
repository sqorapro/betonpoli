"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, verifyPassword } from "@/lib/auth";

const attempts = new Map<string, number[]>();

export async function login(_: { error?: string }, form: FormData): Promise<{ error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
  if (recent.length >= 10) return { error: "Слишком много попыток. Подождите 15 минут." };

  const admin = await verifyPassword(String(form.get("login") ?? ""), String(form.get("password") ?? ""));
  if (!admin) {
    attempts.set(ip, [...recent, now]);
    return { error: "Неверный логин или пароль" };
  }
  attempts.delete(ip);
  await createSession(admin.id);
  redirect("/admin");
}
