/** Shared date helpers for consistent formatting across the app. */

/** Parse many backend date shapes into a JS Date, or null on failure. */
export function parseLooseDate(input: string | Date | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date && !Number.isNaN(input.getTime())) return input;
  const raw = String(input).trim();
  if (!raw) return null;

  // ISO or timestamp-like
  const ts = Date.parse(raw);
  if (!Number.isNaN(ts)) return new Date(ts);

  // yyyy-mm-dd
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    const dt = new Date(y, m - 1, d);
    if (
      dt.getFullYear() === y &&
      dt.getMonth() === m - 1 &&
      dt.getDate() === d
    ) {
      return dt;
    }
  }

  return null;
}

/** Format a date-like value as `dd/mm/yyyy` (e.g. 03/04/2026). */
export function formatDateDdMmYyyy(
  input: string | Date | null | undefined,
): string {
  const d = parseLooseDate(input);
  if (!d) return typeof input === "string" ? input : "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear());
  return `${day}/${month}/${year}`;
}

