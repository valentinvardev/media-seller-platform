import { api } from "~/trpc/server";
import { QrPrintPage } from "~/app/_components/admin/QrPrintPage";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://altafoto.com.ar";

export default async function AdminQrPage() {
  const collections = await api.collection.adminList();

  const events = collections.map((col) => ({
    id: col.id,
    title: col.title,
    slug: col.slug,
    url: `${BASE_URL}/colecciones/${col.slug}`,
    isPublished: col.isPublished,
  }));

  return <QrPrintPage events={events} />;
}
