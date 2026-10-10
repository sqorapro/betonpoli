import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  const newOrders = await db.order.count({ where: { status: "NEW" } });
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminNav adminName={admin.name || admin.login} newOrders={newOrders} />
      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
