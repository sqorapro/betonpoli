import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { ATTRIBUTE_TYPE } from "@/lib/admin-labels";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import type { AttributeType } from "@/generated/prisma/enums";

export const metadata = { title: "Характеристики" };

async function saveAttribute(form: FormData) {
  "use server";
  await requireAdmin();
  const id = Number(form.get("id")) || null;
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  const type = String(form.get("type")) as AttributeType;
  const data = {
    name,
    unit: String(form.get("unit") ?? "").trim(),
    type: type in ATTRIBUTE_TYPE ? type : "TEXT",
  };
  if (id) await db.attribute.update({ where: { id }, data });
  else {
    let code = slugify(name).replace(/-/g, "_") || "attr";
    if (await db.attribute.findUnique({ where: { code } })) code = `${code}_${Date.now() % 100000}`;
    await db.attribute.create({ data: { ...data, code } });
  }
  revalidatePath("/", "layout");
}

async function deleteAttribute(form: FormData) {
  "use server";
  await requireAdmin();
  await db.attribute.delete({ where: { id: Number(form.get("id")) } });
  revalidatePath("/", "layout");
}

type AttrRow = { id: number; name: string; unit: string; type: AttributeType; _count: { values: number; categories: number } };

function Row({ a }: { a?: AttrRow }) {
  return (
    <form action={saveAttribute} className="flex flex-wrap items-center gap-2 border-b border-line py-2">
      {a && <input type="hidden" name="id" value={a.id} />}
      <input name="name" defaultValue={a?.name} placeholder="Название, напр. «Плотность»" required className="field h-9 w-64" />
      <input name="unit" defaultValue={a?.unit} placeholder="ед. изм." className="field h-9 w-24" />
      <select name="type" defaultValue={a?.type ?? "SELECT"} className="field h-9 w-64">
        {Object.entries(ATTRIBUTE_TYPE).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <button className="btn h-9">{a ? "Сохранить" : "Добавить"}</button>
      {a && (
        <>
          <span className="text-[12px] text-muted">
            в {a._count.categories} кат., у {a._count.values} тов.
          </span>
          <button formAction={deleteAttribute} className="cursor-pointer text-muted hover:text-danger">
            удалить
          </button>
        </>
      )}
    </form>
  );
}

export default async function AttributesPage() {
  await requireAdmin();
  const attrs = await db.attribute.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { values: true, categories: true } } },
  });

  return (
    <div className="flex max-w-[960px] flex-col gap-6">
      <h1 className="adm-h1">Характеристики</h1>
      <p className="text-muted">
        Общий справочник. Какие характеристики у какой категории и какие из них в фильтре — настраивается в категории.
      </p>
      <div>
        {attrs.map((a) => (
          <Row key={a.id} a={a} />
        ))}
      </div>
      <div>
        <h2 className="adm-section mb-2">Новая характеристика</h2>
        <Row />
      </div>
    </div>
  );
}
