import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MAX_ADMINS, hashPassword, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendTestNotification } from "@/lib/notify";

export const metadata = { title: "Настройки" };

const FIELDS = [
  { key: "phone", label: "Телефон в шапке и подвале" },
  { key: "email", label: "E-mail для связи" },
  { key: "address", label: "Адрес" },
  { key: "hours", label: "Время работы" },
  { key: "legal", label: "Юрлицо в подвале", hint: "ООО … · ИНН … · ОГРН …" },
  { key: "technologistUrl", label: "Ссылка «Спросить технолога»", hint: "https://t.me/… или tel:+7… Пусто — звонок на телефон" },
  { key: "metrikaId", label: "Номер счётчика Яндекс Метрики" },
  { key: "seoProductTitle", label: "Шаблон title товара", hint: "{name} {sku} {price} {short}" },
  { key: "seoProductDescription", label: "Шаблон description товара", hint: "{name} {sku} {price} {short}" },
  { key: "seoCategoryTitle", label: "Шаблон title категории", hint: "{name} {count}" },
  { key: "seoCategoryDescription", label: "Шаблон description категории", hint: "{name} {count}" },
];

async function saveSettings(form: FormData) {
  "use server";
  await requireAdmin();
  for (const f of FIELDS) {
    const value = String(form.get(f.key) ?? "").trim();
    await db.setting.upsert({ where: { key: f.key }, update: { value }, create: { key: f.key, value } });
  }
  revalidatePath("/", "layout");
  redirect("/admin/settings?saved=1");
}

async function testNotify() {
  "use server";
  await requireAdmin();
  const r = await sendTestNotification();
  redirect(`/admin/settings?tg=${encodeURIComponent(r.telegram)}&mail=${encodeURIComponent(r.email)}`);
}

async function saveAdmin(form: FormData) {
  "use server";
  const me = await requireAdmin();
  const id = Number(form.get("id")) || null;
  const login = String(form.get("login") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!/^[a-z0-9._-]{3,32}$/.test(login)) redirect("/admin/settings?err=login");
  if (password && password.length < 8) redirect("/admin/settings?err=password");
  if (!id) {
    if ((await db.adminUser.count()) >= MAX_ADMINS) redirect("/admin/settings?err=max");
    if (!password) redirect("/admin/settings?err=password");
    if (await db.adminUser.findUnique({ where: { login } })) redirect("/admin/settings?err=exists");
    await db.adminUser.create({ data: { login, name, passwordHash: await hashPassword(password) } });
  } else {
    const clash = await db.adminUser.findFirst({ where: { login, id: { not: id } } });
    if (clash) redirect("/admin/settings?err=exists");
    await db.adminUser.update({
      where: { id },
      data: { login, name, ...(password && { passwordHash: await hashPassword(password) }) },
    });
    // смена пароля другому админу выкидывает его сессии
    if (password && id !== me.id) await db.session.deleteMany({ where: { adminId: id } });
  }
  redirect("/admin/settings?saved=1");
}

async function deleteAdmin(form: FormData) {
  "use server";
  const me = await requireAdmin();
  const id = Number(form.get("id"));
  if (id !== me.id) await db.adminUser.delete({ where: { id } });
  redirect("/admin/settings");
}

const ERRORS: Record<string, string> = {
  login: "Логин: 3–32 символа, латиница, цифры, . _ -",
  password: "Пароль — минимум 8 символов",
  max: `Не больше ${MAX_ADMINS} администраторов`,
  exists: "Такой логин уже есть",
};

export default async function SettingsPage({ searchParams }: PageProps<"/admin/settings">) {
  const me = await requireAdmin();
  const { saved, err, tg, mail } = await searchParams;
  const [rows, admins] = await Promise.all([db.setting.findMany(), db.adminUser.findMany({ orderBy: { id: "asc" } })]);
  const values = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <div className="flex max-w-[760px] flex-col gap-8">
      <h1 className="adm-h1">Настройки</h1>
      {saved === "1" && <p className="text-muted">Сохранено</p>}
      {typeof err === "string" && ERRORS[err] && <p className="text-danger">{ERRORS[err]}</p>}

      <form action={saveSettings} className="adm-card">
        <h2 className="adm-section">Сайт</h2>
        {FIELDS.map((f) => (
          <label key={f.key} className="label">
            {f.label}
            <input name={f.key} defaultValue={values[f.key] ?? ""} className="field" />
            {f.hint && <span className="text-[12px]">{f.hint}</span>}
          </label>
        ))}
        <button className="btn btn-primary self-start">Сохранить</button>
      </form>

      <section className="adm-card">
        <h2 className="adm-section">Уведомления о заявках</h2>
        <p className="text-muted">
          Telegram-бот и почта настраиваются на сервере (файл .env). Кнопка отправит тестовое сообщение в оба канала.
        </p>
        {typeof tg === "string" && <NotifyResult label="Telegram" value={tg} />}
        {typeof mail === "string" && <NotifyResult label="E-mail" value={mail} />}
        <form action={testNotify}>
          <button className="btn">Проверить уведомления</button>
        </form>
      </section>

      <section className="adm-card">
        <h2 className="adm-section">Администраторы (до {MAX_ADMINS})</h2>
        {admins.map((a) => (
          <form key={a.id} action={saveAdmin} className="flex flex-wrap items-end gap-2 border-b border-line pb-3">
            <input type="hidden" name="id" value={a.id} />
            <label className="label">Логин<input name="login" defaultValue={a.login} className="field h-9 w-36" /></label>
            <label className="label">Имя<input name="name" defaultValue={a.name} className="field h-9 w-44" /></label>
            <label className="label">Новый пароль<input name="password" type="password" autoComplete="new-password" placeholder="не менять" className="field h-9 w-40" /></label>
            <button className="btn h-9">Сохранить</button>
            {a.id !== me.id ? (
              <button formAction={deleteAdmin} className="h-9 cursor-pointer text-muted hover:text-danger">удалить</button>
            ) : (
              <span className="h-9 py-2 text-[12px] text-muted">это вы</span>
            )}
          </form>
        ))}
        {admins.length < MAX_ADMINS && (
          <form action={saveAdmin} className="flex flex-wrap items-end gap-2">
            <label className="label">Логин<input name="login" className="field h-9 w-36" /></label>
            <label className="label">Имя<input name="name" className="field h-9 w-44" /></label>
            <label className="label">Пароль<input name="password" type="password" autoComplete="new-password" className="field h-9 w-40" /></label>
            <button className="btn h-9">Добавить</button>
          </form>
        )}
      </section>
    </div>
  );
}

function NotifyResult({ label, value }: { label: string; value: string }) {
  if (value === "ok") return <p>{label}: отправлено ✓</p>;
  if (value === "off") return <p className="text-muted">{label}: не настроено</p>;
  return <p className="text-danger">{label}: ошибка — {value}</p>;
}
