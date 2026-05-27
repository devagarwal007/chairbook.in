import type { DbServiceRaw, Service } from "@/types";
import { formatServiceCode } from "@/lib/service-codes";

export const SERVICE_SELECT_WITH_BUNDLES = `
  id,
  name,
  category,
  duration_min,
  price,
  code,
  kind,
  bundle_note,
  active,
  deleted_at,
  bundle_components!bundle_components_bundle_service_id_fkey (
    position,
    component_service_id,
    component:services!bundle_components_component_service_id_fkey (
      id,
      name,
      category,
      duration_min,
      price,
      code,
      active
    )
  )
`;

export const BOOKING_SERVICE_SELECT_WITH_BUNDLE_DETAILS = `
  qty,
  price_at_booking,
  service:services (
    ${SERVICE_SELECT_WITH_BUNDLES}
  )
`;

export function getServiceDuration(service: Pick<Service, "duration" | "duration_min">): number {
  return Number(service.duration ?? service.duration_min ?? 0);
}

export function mapServiceWithBundleDetails(row: DbServiceRaw): Service {
  const kind = row.kind || "service";
  const components = (row.bundle_components || [])
    .slice()
    .sort((a, b) => Number(a.position || 0) - Number(b.position || 0));

  const includedServices = components.flatMap((item) => {
    const component = item.component;
    if (!component || component.active === false) return [];

    return [{
      id: component.id,
      name: component.name,
      cat: component.category || "General",
      category: component.category || "General",
      duration: Number(component.duration_min || 0),
      duration_min: Number(component.duration_min || 0),
      price: Number(component.price || 0),
      code: component.code ?? null,
      kind: "service" as const,
      active: true,
    }];
  });

  const price = Number(row.price || 0);
  const originalPrice = includedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);

  return {
    id: row.id,
    name: row.name,
    cat: row.category || (kind === "bundle" ? "Bundles" : "General"),
    category: row.category || (kind === "bundle" ? "Bundles" : "General"),
    duration: Number(row.duration_min || 0),
    duration_min: Number(row.duration_min || 0),
    price,
    code: row.code ?? null,
    kind,
    bundle_note: row.bundle_note || "",
    componentIds: components
      .map((item) => item.component_service_id || item.component?.id)
      .filter((id): id is string | number => Boolean(id)),
    includedServices,
    originalPrice: originalPrice || undefined,
    savings: originalPrice > price ? originalPrice - price : undefined,
    active: row.active !== false,
  };
}

export function getBundleOriginalPrice(service: Service): number {
  if (service.originalPrice) return Number(service.originalPrice);
  return (service.includedServices || []).reduce((sum, item) => sum + Number(item.price || 0), 0);
}

export function getBundleSavings(service: Service): number {
  if (service.savings) return Number(service.savings);
  return Math.max(0, getBundleOriginalPrice(service) - Number(service.price || 0));
}

export function getBundleSavingsPct(service: Service): number {
  const originalPrice = getBundleOriginalPrice(service);
  if (originalPrice <= 0) return 0;
  return Math.round((getBundleSavings(service) / originalPrice) * 100);
}

export function serviceMatchesBundleSearch(service: Service, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const includedNames = (service.includedServices || []).map((item) => item.name).join(" ");
  const searchable = [
    service.name,
    service.cat || service.category || "",
    service.kind || "",
    service.bundle_note || "",
    includedNames,
    String(service.code || ""),
    formatServiceCode(service),
  ].join(" ").toLowerCase();

  return searchable.includes(q);
}
