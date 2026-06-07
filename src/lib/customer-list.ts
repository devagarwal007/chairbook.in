export function sanitizeCustomerSearchForQuery(value: string): string {
  return value.replace(/[,%()*]/g, "").trim();
}

export function buildCustomerSearchFilter(value: string): string | null {
  const sanitized = sanitizeCustomerSearchForQuery(value);
  if (!sanitized) return null;

  const pattern = `%${sanitized}%`;
  return `name.ilike.${pattern},phone.ilike.${pattern}`;
}
