import "server-only";
import nodemailer from "nodemailer";
import { formatPrice } from "@/lib/calc";

export type OrderNotice = {
  id: number;
  type: "ORDER" | "TECH_CHECK";
  name: string;
  phone: string;
  email: string;
  delivery: "PICKUP" | "DELIVERY" | null;
  comment: string;
  total: number;
  items: { sku: string; name: string; packagingLabel: string; qty: number; unitPrice: number }[];
};

const DELIVERY_LABEL = { PICKUP: "Самовывоз", DELIVERY: "Доставка по договорённости" } as const;

export const orderTitle = (o: Pick<OrderNotice, "id" | "type">) =>
  o.type === "TECH_CHECK" ? `Проверка технолога №${o.id}` : `Заявка №${o.id}`;

function orderText(o: OrderNotice) {
  const lines = o.items.map((i) => `• ${i.sku} ${i.name}, ${i.packagingLabel} × ${i.qty} = ${formatPrice(i.unitPrice * i.qty)}`);
  const field = (label: string, value: string | null | undefined) => (value ? [`${label}: ${value}`] : []);
  return [
    `${orderTitle(o)} — ${formatPrice(o.total)}`,
    ...(o.type === "TECH_CHECK" ? ["Клиент просит технолога проверить расчёт и перезвонить."] : []),
    "",
    ...field("Имя", o.name),
    ...field("Телефон", o.phone),
    ...field("E-mail", o.email),
    ...field("Получение", o.delivery && DELIVERY_LABEL[o.delivery]),
    ...field("Комментарий", o.comment),
    "",
    ...lines,
    ...(process.env.SITE_URL ? ["", `${process.env.SITE_URL}/admin/orders/${o.id}`] : []),
  ].join("\n");
}

async function sendTelegram(text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  // TELEGRAM_API_URL — ретранслятор, если сервер не достаёт до api.telegram.org (polexpert)
  const api = (process.env.TELEGRAM_API_URL || "https://api.telegram.org").replace(/\/+$/, "");
  const res = await fetch(`${api}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

async function sendMail(subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, MAIL_TO } = process.env;
  if (!SMTP_HOST || !MAIL_TO) return;
  const port = Number(SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  await transport.sendMail({ from: MAIL_FROM || SMTP_USER, to: MAIL_TO, subject, text });
}

export type ChannelResult = "ok" | "off" | string;

/** Тест из админки: отправить в оба канала и вернуть результат по каждому */
export async function sendTestNotification(): Promise<{ telegram: ChannelResult; email: ChannelResult }> {
  const text = `Проверка уведомлений betonpoli.ru — ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`;
  const run = async (configured: boolean, fn: () => Promise<void>): Promise<ChannelResult> => {
    if (!configured) return "off";
    try {
      await fn();
      return "ok";
    } catch (e) {
      return (e as Error).message.slice(0, 200);
    }
  };
  const [telegram, email] = await Promise.all([
    run(!!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID), () => sendTelegram(text)),
    run(!!(process.env.SMTP_HOST && process.env.MAIL_TO), () => sendMail("Проверка уведомлений betonpoli.ru", text)),
  ]);
  return { telegram, email };
}

/** Отправка не должна ронять оформление: заявка уже сохранена в БД */
export async function notifyNewOrder(o: OrderNotice) {
  const text = orderText(o);
  const results = await Promise.allSettled([sendTelegram(text), sendMail(`${orderTitle(o)} с betonpoli.ru`, text)]);
  for (const r of results) if (r.status === "rejected") console.error("[notify]", r.reason);
}
