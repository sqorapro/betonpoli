import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { DELIVERY, ORDER_STATUS, fmtDate } from "@/lib/admin-labels";
import { formatPrice } from "@/lib/calc";
import { db } from "@/lib/db";
import type { OrderStatus } from "@/generated/prisma/enums";

export const metadata = { title: "Заявки" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const { status } = await searchParams;
  const current = typeof status === "string" && status in ORDER_STATUS ? (status as OrderStatus) : undefined;
  const [orders, counts] = await Promise.all([
    db.order.findMany({
      where: current ? { status: current } : {},
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { _count: { select: { items: true } } },
    }),
    db.order.groupBy({ by: ["status"], _count: true }),
  ]);
  const countOf = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="adm-h1">Заявки</h1>
      <nav className="flex flex-wrap gap-4">
        <Link href="/admin/orders" className={!current ? "font-semibold" : "text-muted"}>
          Все
        </Link>
        {Object.entries(ORDER_STATUS).map(([k, label]) => (
          <Link key={k} href={`/admin/orders?status=${k}`} className={current === k ? "font-semibold" : "text-muted"}>
            {label} <span className="text-muted">{countOf(k)}</span>
          </Link>
        ))}
      </nav>
      {orders.length ? (
        <div className="overflow-x-auto">
          <table className="adm-table min-w-[720px]">
            <thead>
              <tr>
                <th>№</th>
                <th>Дата</th>
                <th>Клиент</th>
                <th>Телефон</th>
                <th>Получение</th>
                <th className="text-right">Сумма</th>
                <th>Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/admin/orders/${o.id}`} className="font-semibold underline underline-offset-2">
                      {o.id}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap">{fmtDate(o.createdAt)}</td>
                  <td>
                    {o.type === "TECH_CHECK" && <span className="badge mr-2 bg-accent">Проверка технолога</span>}
                    {o.name || "—"}
                  </td>
                  <td className="whitespace-nowrap">{o.phone}</td>
                  <td>{o.delivery ? DELIVERY[o.delivery] : "—"}</td>
                  <td className="text-right whitespace-nowrap">
                    {formatPrice(Number(o.total))} <span className="text-muted">· {o._count.items} поз.</span>
                  </td>
                  <td>
                    <span className={`badge ${o.status === "NEW" ? "bg-accent" : ""}`}>{ORDER_STATUS[o.status]}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-muted">Заявок нет</p>
      )}
    </div>
  );
}
