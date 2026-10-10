import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { DELIVERY, ORDER_STATUS, fmtDate } from "@/lib/admin-labels";
import { formatPrice } from "@/lib/calc";
import { db } from "@/lib/db";
import { updateOrder } from "../actions";

export const metadata = { title: "Заявка" };

export default async function OrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const id = Number((await params).id);
  const order = Number.isInteger(id)
    ? await db.order.findUnique({ where: { id }, include: { items: { include: { product: { select: { slug: true } } } } } })
    : null;
  if (!order) notFound();

  return (
    <div className="flex max-w-[900px] flex-col gap-6">
      <Link href="/admin/orders" className="text-muted">
        ← Заявки
      </Link>
      <h1 className="adm-h1">
        {order.type === "TECH_CHECK" ? "Проверка технолога" : "Заявка"} №{order.id} <span className="font-normal text-muted">от {fmtDate(order.createdAt)}</span>
      </h1>

      <dl className="grid grid-cols-[140px_1fr] gap-x-4 gap-y-2">
        <dt className="text-muted">Имя</dt>
        <dd>{order.name || "—"}</dd>
        <dt className="text-muted">Телефон</dt>
        <dd>
          <a href={`tel:${order.phone.replace(/[^\d+]/g, "")}`} className="underline underline-offset-2">
            {order.phone}
          </a>
        </dd>
        <dt className="text-muted">E-mail</dt>
        <dd>
          {order.email ? (
            <a href={`mailto:${order.email}`} className="underline underline-offset-2">
              {order.email}
            </a>
          ) : (
            "—"
          )}
        </dd>
        <dt className="text-muted">Получение</dt>
        <dd>{order.delivery ? DELIVERY[order.delivery] : "— (клиент просит проверить расчёт)"}</dd>
        <dt className="text-muted">Комментарий</dt>
        <dd className="whitespace-pre-wrap">{order.comment || "—"}</dd>
        <dt className="text-muted">Согласие на ПД</dt>
        <dd>{order.consent ? "Да" : "Нет"}</dd>
      </dl>

      <div className="overflow-x-auto">
        <table className="adm-table min-w-[600px]">
          <thead>
            <tr>
              <th>Артикул</th>
              <th>Товар</th>
              <th>Фасовка</th>
              <th className="text-right">Цена</th>
              <th className="text-right">Кол-во</th>
              <th className="text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id}>
                <td className="whitespace-nowrap">{i.sku}</td>
                <td>
                  {i.product ? (
                    <Link href={`/product/${i.product.slug}`} target="_blank" className="underline underline-offset-2">
                      {i.name}
                    </Link>
                  ) : (
                    i.name
                  )}
                </td>
                <td>{i.packagingLabel}</td>
                <td className="text-right whitespace-nowrap">{formatPrice(Number(i.unitPrice))}</td>
                <td className="text-right">{i.qty}</td>
                <td className="text-right whitespace-nowrap">{formatPrice(Number(i.unitPrice) * i.qty)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={5} className="text-right font-semibold">
                Итого
              </td>
              <td className="text-right font-semibold whitespace-nowrap">{formatPrice(Number(order.total))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <form action={updateOrder} className="adm-card max-w-[560px]">
        <input type="hidden" name="id" value={order.id} />
        <label className="label">
          Статус
          <select name="status" defaultValue={order.status} className="field">
            {Object.entries(ORDER_STATUS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="label">
          Заметка менеджера
          <textarea name="adminNote" defaultValue={order.adminNote} rows={3} className="field h-auto py-2" />
        </label>
        <button type="submit" className="btn btn-primary self-start">
          Сохранить
        </button>
      </form>
    </div>
  );
}
