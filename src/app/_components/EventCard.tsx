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
      {/* Cover — title + date overlaid at bottom */}
      <div className="relative h-56 bg-gradient-to-br from-blue-50 to-blue-100 flex-shrink-0">
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
        {/* Gradient + text overlay */}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.15) 55%, transparent 100%)" }} />
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4">
          <h3 className="font-display font-700 uppercase text-white leading-tight text-lg drop-shadow">
            {col.title || <span className="text-white/40">Nombre del evento</span>}
          </h3>
          {dateStr && (
            <p className="text-xs font-semibold mt-0.5 drop-shadow" style={{ color: "#F97316" }}>{dateStr}</p>
          )}
        </div>
      </div>

      {/* Content — photo count + button */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        {col._count ? (
          <p className="text-xs font-semibold" style={{ color: "#F97316" }}>
            {col._count.photos} foto{col._count.photos !== 1 ? "s" : ""}
          </p>
        ) : <span />}
        {preview ? (
          <div
            className="px-4 py-2 rounded-xl font-display font-700 uppercase tracking-wider text-white text-xs text-center shrink-0"
            style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
          >
            Explorar →
          </div>
        ) : (
          <Link
            href={`/colecciones/${col.slug}`}
            className="px-4 py-2 rounded-xl font-display font-700 uppercase tracking-wider text-white text-xs transition-all hover:scale-105 text-center shrink-0"
            style={{ background: "linear-gradient(135deg, #0057A8, #003D7A)" }}
          >
            Explorar →
          </Link>
        )}
      </div>
    </div>
  );

  return cardBody;
}
