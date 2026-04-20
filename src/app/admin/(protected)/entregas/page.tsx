import { api } from "~/trpc/server";
import { ManualDelivery } from "~/app/_components/admin/ManualDelivery";

export default async function EntregasPage() {
  const collections = await api.collection.adminList();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Entrega manual</h1>
        <p className="text-gray-500 text-sm mt-0.5">Enviá fotos directamente a un comprador por email</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <ManualDelivery
          collections={collections.map((c) => ({
            id: c.id,
            title: c.title,
            _count: c._count,
          }))}
        />
      </div>
    </div>
  );
}
