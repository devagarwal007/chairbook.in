type ServiceCodeItem = {
  id?: string | number;
  code?: number | null;
  name?: string;
};

export function parseServiceCode(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;
  if (!/^\d+$/.test(normalized)) return null;

  const parsed = Number.parseInt(normalized, 10);
  return parsed > 0 ? parsed : null;
}

export function formatServiceCode(value?: number | null | ServiceCodeItem, fallback = "#---"): string {
  const code = typeof value === "object" ? value?.code : value;
  if (!code || code <= 0) return fallback;
  return `#${String(code).padStart(3, "0")}`;
}

export function findNextServiceCode(items: ServiceCodeItem[], excludeId?: string | number): number {
  const excluded = excludeId === undefined ? null : String(excludeId);
  const maxCode = items.reduce((max, item) => {
    if (excluded !== null && String(item.id) === excluded) return max;
    return Math.max(max, Number(item.code || 0));
  }, 0);

  return maxCode + 1;
}

export function findDuplicateServiceCode(
  items: ServiceCodeItem[],
  code: number,
  excludeId?: string | number
): ServiceCodeItem | null {
  const excluded = excludeId === undefined ? null : String(excludeId);

  return items.find((item) => {
    if (excluded !== null && String(item.id) === excluded) return false;
    return Number(item.code || 0) === code;
  }) || null;
}
