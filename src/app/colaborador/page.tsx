import Link from "next/link";
import { api } from "~/trpc/server";

export default async function CollaboratorDashboard() {
  const events = await api.collaborator.myEvents();

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Mis eventos</h1>
        <p className="text-gray-500 text-xs sm:text-sm mt-0.5">
          {events.length === 0
            ? "Todavía no fuiste invitado a ningún evento."
            : `${events.length} evento${events.length !== 1 ? "s" : ""} donde podés subir fotos.`}
        </p>
      </div>

      {events.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm py-16 text-center px-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-blue-50">
            <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM3 3h18M3 21h18M6 3v18M18 3v18" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-1">Sin eventos asignados</p>
          <p className="text-gray-500 text-sm max-w-sm mx-auto">
            Cuando el administrador te invite a un evento, va a aparecer acá.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/colaborador/eventos/${e.id}`}
              className="group rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md hover:border-blue-100 transition-all"
            >
              <div className="aspect-video w-full bg-gray-100 relative overflow-hidden">
                {e.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.coverUrl} alt={e.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-50">
                    <svg className="w-8 h-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                    </svg>
                  </div>
                )}
                {!e.isPublished && (
                  <span
                    className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(255,255,255,0.9)", color: "#64748b" }}
                  >
                    Borrador
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className="font-semibold text-gray-900 group-hover:text-black truncate">{e.title}</p>
                {e.eventDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(e.eventDate).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
