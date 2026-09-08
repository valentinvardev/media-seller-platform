import type { Prisma } from "../../generated/prisma";

/**
 * `Photo.bibNumber` denormalizes every bib OCR found in one photo into a CSV
 * ("103" for the common case, "103,1042" when two runners share the frame).
 *
 * A plain `contains` treats that CSV as free text, so it matches any substring:
 * searching "1" returns 13, 103 and 1042, and — worse — a purchase of bib "1"
 * used to *deliver* those photos to the buyer.
 *
 * The helpers below match whole CSV elements instead. They assume the stored
 * value has no spaces around the commas; `normalizeBibNumber` enforces that on
 * every write, and `scripts/normalize-bib-numbers.mjs` backfilled the rows that
 * predate it.
 *
 * `mode: "insensitive"` stays on because bibs are not always numeric — some
 * race series use a letter prefix ("C1722"), stored uppercased, and a buyer
 * typing "c1722" has to find it.
 */

/** Below this length a query is too ambiguous to prefix-match. See `bibSearchWhere`. */
export const BIB_PREFIX_MIN_LENGTH = 3;

/**
 * Collapse a raw bib string into the canonical `"a,b,c"` form. Call before
 * every write so the matchers below can rely on the delimiter.
 */
export function normalizeBibNumber(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(",") : null;
}

/**
 * Whole-element equality: "103" matches "103" and "103,1042", never "1031".
 * This is the only correct matcher for delivery and billing — a buyer gets the
 * bib they paid for and nothing else.
 */
export function bibEqualsWhere(bib: string): Prisma.PhotoWhereInput {
  const q = bib.trim();
  return {
    OR: [
      { bibNumber: { equals: q, mode: "insensitive" } },        // sole value
      { bibNumber: { startsWith: `${q},`, mode: "insensitive" } }, // first
      { bibNumber: { endsWith: `,${q}`, mode: "insensitive" } },   // last
      { bibNumber: { contains: `,${q},`, mode: "insensitive" } },  // middle
    ],
  };
}

/**
 * Element-anchored prefix: "103" matches "103", "1030" and "103,1042", but not
 * "2103" — the match has to start at a bib boundary, not mid-number.
 */
export function bibStartsWithWhere(prefix: string): Prisma.PhotoWhereInput {
  const q = prefix.trim();
  return {
    OR: [
      { bibNumber: { startsWith: q, mode: "insensitive" } },   // first element
      { bibNumber: { contains: `,${q}`, mode: "insensitive" } }, // any later element
    ],
  };
}

/**
 * Search semantics, deliberately different from delivery: one or two characters
 * are too ambiguous to prefix-match (typing "1" would surface every bib in the
 * 100s and 1000s before the actual bib 1), so short queries require an exact
 * bib. From three characters on, prefix matching is useful again — it lets
 * someone who misread the last digit still find their photos.
 */
export function bibSearchWhere(query: string): Prisma.PhotoWhereInput {
  const q = query.trim();
  return q.length < BIB_PREFIX_MIN_LENGTH ? bibEqualsWhere(q) : bibStartsWithWhere(q);
}
