import Link from "next/link";

export type EventCardCol = {
  title: string;
  description?: string | null;
  slug?: string;
  coverUrl?: string | null;
  bannerUrl?: string | null;
  bannerFocalY?: number | null;
  logoUrl?: string | null;
  eventDate?: Date | string | null;
  _count?: { photos: number };
};

export function EventCard({ col, preview }: { col: EventCardCol; preview?: boolean }) {
  const dateStr = col.eventDate
    ? new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric" })
        .format(new Date(col.eventDate))
    : null;

  const focalY = col.bannerFocalY ?? 0.5;
  const objectPosition = `center ${Math.round(focalY * 100)}%`;

  const cardBody = (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all duration-200 group flex flex-col card-hover">
      {/* Cover */}
      <div className="relative h-44">
        <div className="h-44 rounded-t-2xl overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100">
          {(col.bannerUrl ?? col.coverUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(col.bannerUrl ?? col.coverUrl)!}
              alt={col.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent rounded-t-2xl" />
        </div>

      </div>

      {/* Content */}
      <div className="pt-5 pb-5 px-5 flex flex-col flex-1 text-center">
        <h3 className="font-display font-700 uppercase text-gray-900 text-xl leading-tight mb-1">
          {col.title || <span className="text-gray-300">Nombre del evento</span>}
        </h3>
        {dateStr && <p className="text-xs font-semibold mb-1" style={{ color: "#F97316" }}>{dateStr}</p>}
        {col.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{col.description}</p>}
        {col._count && (
          <p className="text-xs font-semibold mb-5" style={{ color: "#F97316" }}>{col._count.photos} foto{col._count.photos !== 1 ? "s" : ""}</p>
        )}
        <div className="mt-auto">
          {preview ? (
            <div
              className="block w-full py-3 rounded-xl font-display font-700 uppercase tracking-wider text-white text-sm text-center"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
            >
              Explorar fotos →
            </div>
          ) : (
            <Link
              href={`/colecciones/${col.slug}`}
              className="block w-full py-3 rounded-xl font-display font-700 uppercase tracking-wider text-white text-sm transition-all hover:scale-105 text-center"
              style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
            >
              Explorar fotos →
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return cardBody;
}
