import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { CollaboratorEventTabs } from "~/app/_components/collaborator/CollaboratorEventTabs";

export default async function CollaboratorEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;

  let event;
  try {
    event = await api.collaborator.eventDetail({ collectionId: id });
  } catch {
    notFound();
  }
  if (!event) notFound();

  return (
    <div>
      <Link
        href="/colaborador"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Mis eventos
      </Link>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-4">
        <div className="flex items-center gap-4 min-w-0">
          {event.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={event.coverUrl} alt={event.title} className="w-14 h-14 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{event.title}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {event.myPhotoCount} foto{event.myPhotoCount !== 1 ? "s" : ""} tuya{event.myPhotoCount !== 1 ? "s" : ""} en este evento
              {event.pricePerBib > 0 && ` · $${event.pricePerBib.toLocaleString("es-AR")} por dorsal`}
            </p>
          </div>
        </div>
      </div>

      <CollaboratorEventTabs
        collectionId={event.id}
        initialTab={tab === "ventas" ? "ventas" : "fotos"}
      />
    </div>
  );
}
