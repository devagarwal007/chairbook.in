"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Icons as I, Avatar, PhoneInput, ComboSaveBadge, ComboServiceChip } from "@/components/ui";
import { generateBookingDateOptions } from "@/lib/booking-window";
import { formatServiceCode } from "@/lib/service-codes";
import { getSupabaseBrowserClient, getSupabaseEnvError } from "@/lib/supabase";
import { PUBLIC_SALON_SELECT } from "@/lib/supabase-selects";
import { formatDateKey, formatPhone } from "@/lib/utils";
import { BookingRow, DbServiceRaw, Salon, Service, Stylist } from "@/types";

type Step = 1 | 2 | 3 | 4;
type ServiceFilter = "all" | "combos" | `category:${string}`;

interface BookingState {
  salon: Salon | null;
  services: Service[];
  stylists: Stylist[];
  bookings: BookingRow[];
}

const SERVICE_SELECT_WITH_BUNDLES = `
  id,
  name,
  category,
  duration_min,
  price,
  code,
  kind,
  bundle_note,
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

const STEP_LABELS = ["Service", "When & who", "Your details"];
const inr = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const durationOf = (service: Service) => Number(service.duration_min || service.duration || 0);
const thinScrollRail =
  "scrollbar-thin [scrollbar-color:var(--line-2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line-2";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function toMinutes(time: string) {
  const [h, m] = time.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function toTime(mins: number) {
  return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
}

function getSlotsForDate(salon: Salon | null, dateKey: string, dates: ReturnType<typeof generateBookingDateOptions>, duration: number) {
  const date = dates.find((d) => d.key === dateKey);
  const hours = date && salon?.hours?.[date.dayKey];
  const from = hours?.from || "10:00";
  const to = hours?.to || "20:00";

  if (hours && !hours.open) {
    return [];
  }

  const now = new Date();
  const isToday = dateKey === formatDateKey(now);
  const start = toMinutes(from);
  const end = toMinutes(to);
  const firstAvailable = isToday ? now.getHours() * 60 + now.getMinutes() + 45 : start;

  const slots = [];
  for (let mins = start; mins + duration <= end; mins += 30) {
    if (mins >= firstAvailable) {
      slots.push(toTime(mins));
    }
  }

  return slots;
}

function overlaps(slot: string, duration: number, booking: BookingRow) {
  const slotStart = toMinutes(slot);
  const slotEnd = slotStart + duration;
  const bookingStart = toMinutes(booking.start_time);
  const bookingEnd = bookingStart + booking.duration;

  return slotStart < bookingEnd && slotEnd > bookingStart;
}

function getAvailableStylistId(stylists: Stylist[], bookings: BookingRow[], date: string, time: string, duration: number, selected: string | number) {
  const activeBookings = bookings.filter((booking) => booking.date === date && !["Cancelled", "No-show"].includes(booking.status));

  if (selected !== "any") {
    return activeBookings.some((booking) => booking.stylist_id === selected && overlaps(time, duration, booking)) ? null : selected;
  }

  return stylists.find((stylist) => !activeBookings.some((booking) => booking.stylist_id === stylist.id && overlaps(time, duration, booking)))?.id ?? null;
}

function mapPublicBookingService(row: DbServiceRaw): Service {
  const kind = row.kind || "service";
  const components = (row.bundle_components || []).slice().sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
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
    cat: row.category || (kind === "bundle" ? "Combos" : "General"),
    category: row.category || (kind === "bundle" ? "Combos" : "General"),
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
  };
}

function highlightText(text: string, query: string) {
  if (!query) return text;
  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-[3px] bg-amber-soft px-0.5 text-amber-ink">{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function serviceMatchesQuery(service: Service, query: string) {
  if (!query) return true;

  const includedNames = (service.includedServices || []).map((item) => item.name).join(" ");
  const searchable = [
    service.name,
    service.cat || service.category || "",
    service.bundle_note || "",
    includedNames,
    String(service.code || ""),
    formatServiceCode(service),
  ].join(" ").toLowerCase();

  return searchable.includes(query.toLowerCase());
}

function serviceMatchesFilter(service: Service, filter: ServiceFilter) {
  if (filter === "all") return true;
  if (filter === "combos") return service.kind === "bundle";
  return service.kind !== "bundle" && (service.cat || service.category || "General") === filter.replace("category:", "");
}

function SectionTitle({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3 first:mt-0">
      <span>{title}</span>
      {children}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="px-5 py-[22px]">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-11 w-11 animate-pulse rounded-xl bg-bg-2" />
        <div className="flex-1">
          <div className="h-[18px] w-[120px] animate-pulse rounded bg-bg-2" />
          <div className="mt-1.5 h-3 w-40 animate-pulse rounded bg-bg-2" />
        </div>
      </div>

      <div className="mb-2 h-6 w-[220px] animate-pulse rounded bg-bg-2" />
      <div className="mb-6 h-3.5 w-[300px] max-w-full animate-pulse rounded bg-bg-2" />
      <div className="mb-3 h-4 w-20 animate-pulse rounded bg-bg-2" />
      <div className="flex flex-col gap-2.5">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-[78px] animate-pulse rounded-xl bg-bg-2" />
        ))}
      </div>
    </div>
  );
}

function PublicStepBar({ step }: { step: Step }) {
  return (
    <div className="flex items-center border-b border-line bg-bg px-5 py-3">
      {STEP_LABELS.map((label, index) => {
        const number = index + 1;
        const done = step > number;
        const active = step === number;

        return (
          <React.Fragment key={label}>
            <div className={cx("flex min-w-0 items-center gap-1.5", (active || done) && "text-teal")}>
              <div
                className={cx(
                  "grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full border text-[11px] font-semibold",
                  done && "border-teal-soft-2 bg-teal-soft text-teal",
                  active && "border-teal bg-teal text-white",
                  !active && !done && "border-line-2 bg-white text-ink-3"
                )}
              >
                {done ? <I.check width={12} height={12} /> : number}
              </div>
              <div className={cx("truncate text-[11px] font-medium", active ? "text-ink" : done ? "text-teal" : "text-ink-3")}>{label}</div>
            </div>
            {index < STEP_LABELS.length - 1 && <div className={cx("mx-2 h-px flex-1 bg-line-2", done && "bg-teal")} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ServiceCard({
  service,
  selected,
  query,
  onToggle,
}: {
  service: Service;
  selected: boolean;
  query: string;
  onToggle: (service: Service) => void;
}) {
  const isBundle = service.kind === "bundle";
  const included = service.includedServices || [];
  const originalPrice = service.originalPrice || included.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const savings = service.savings || Math.max(0, originalPrice - Number(service.price || 0));
  const savingsPct = originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;
  const price = Number(service.price || 0);

  if (isBundle) {
    return (
      <button
        type="button"
        onClick={() => onToggle(service)}
        className={cx(
          "w-full text-left font-sans transition-all relative block rounded-[12px] border p-3 mb-3.5 max-w-[620px] select-none",
          selected
            ? "border-teal bg-teal-soft shadow-[0_3px_10px_rgba(15,110,86,0.06)]"
            : "border-[#0f6e56]/22 bg-gradient-to-b from-[#e6f1ed] to-white hover:border-teal/40 hover:shadow-[0_2px_6px_rgba(15,110,86,0.03)]"
        )}
      >
        <div className="flex justify-between gap-2.5 items-start relative mb-1.5">
          <div>
            <h3 className="m-0 text-[14px] font-semibold tracking-tight text-[#101820] leading-snug">
              {highlightText(service.name, query)}
            </h3>
            {service.bundle_note && (
              <p className="m-0 mt-0.5 text-[11px] font-normal leading-[1.35] text-[#7b848d]">
                {highlightText(service.bundle_note, query)}
              </p>
            )}
          </div>

          <ComboSaveBadge savings={savings} className="shrink-0" />
        </div>

        {included.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap mb-3 mt-2">
            {included.map((item, index) => (
              <React.Fragment key={item.id}>
                <ComboServiceChip name={item.name} />
                {index < included.length - 1 && <span className="text-[#9da5aa] text-[10px] font-normal px-0.5">+</span>}
              </React.Fragment>
            ))}
          </div>
        )}

        <div className="my-2.5 border-t border-dashed border-[#d7dddd]" />

        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-1.5 flex-wrap font-mono">
            {originalPrice > price && (
              <span className="text-[12px] text-[#9da5aa] line-through font-normal mr-0.5">
                {inr(originalPrice)}
              </span>
            )}
            <strong className="text-[14.5px] text-[#050505] font-bold">
              {inr(price)}
            </strong>
            {savingsPct > 0 && (
              <span className="bg-[#d9f0ed] text-[#006b5c] text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] ml-0.5">
                -{savingsPct}%
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 text-[#6e777c] text-[12px] font-medium font-mono">
            <span className="flex items-center gap-1">
              <I.clock width={12} height={12} className="text-ink-3" />
              {durationOf(service)} min
            </span>
            <div
              className={cx(
                "grid h-[20px] w-[20px] place-items-center rounded-[6px] border transition-colors shrink-0",
                selected ? "border-teal bg-teal text-white" : "border-line-2 bg-white text-transparent"
              )}
            >
              {selected && <I.check width={12} height={12} />}
            </div>
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      className={cx(
        "flex w-full items-center gap-3 rounded-[12px] border p-3 text-left font-sans transition-colors select-none",
        selected ? "border-teal bg-teal-soft" : "border-line bg-white hover:border-line-2"
      )}
      onClick={() => onToggle(service)}
    >
      <div className="w-11 h-11 shrink-0 rounded-xl bg-teal-soft flex items-center justify-center font-mono text-[12px] font-bold text-teal">
        {formatServiceCode(service)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold leading-snug text-ink truncate">
          {highlightText(service.name, query)}
        </div>
        <div className={cx("mt-0.5 flex items-center gap-1 font-mono text-[12px]", selected ? "text-teal-ink" : "text-ink-3")}>
          <I.clock width={12} height={12} className={selected ? "text-teal-ink" : "text-ink-3"} />
          <span>{durationOf(service)} min</span>
        </div>
      </div>

      <div className="shrink-0 flex items-center gap-3">
        <span className={cx("font-mono text-[15px] font-semibold", selected ? "text-teal-ink" : "text-ink")}>
          {inr(Number(service.price || 0))}
        </span>
        <div
          className={cx(
            "grid h-[22px] w-[22px] place-items-center rounded-[7px] border transition-colors shrink-0",
            selected ? "border-teal bg-teal text-white" : "border-line-2 bg-white text-transparent"
          )}
        >
          {selected && <I.check width={14} height={14} />}
        </div>
      </div>
    </button>
  );
}

function BundleSummaryDetails({ service }: { service: Service }) {
  if (service.kind !== "bundle") return null;

  const included = service.includedServices || [];
  if (included.length === 0 && !service.bundle_note) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {included.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {included.map((item) => (
            <span key={item.id} className="rounded-full border border-line bg-bg-2 px-2 py-0.5 text-[11px] leading-tight text-ink-2">
              {item.name}
            </span>
          ))}
        </div>
      )}
      {service.bundle_note && <div className="text-[11px] leading-snug text-ink-3">{service.bundle_note}</div>}
    </div>
  );
}

function FilterControl({
  options,
  active,
  isOpen,
  onToggleOpen,
  onSelect,
}: {
  options: Array<{ id: ServiceFilter; label: string; count: number }>;
  active: ServiceFilter;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelect: (id: ServiceFilter) => void;
}) {
  const selectedLabel = options.find((option) => option.id === active)?.label || "All";

  return (
    <>
      <div className="hidden flex-wrap gap-1.5 sm:flex">
        {options.map((option) => (
          <button
            type="button"
            key={option.id}
            className={cx(
              "inline-flex h-8 items-center gap-2 rounded-full border px-3 text-[12px] transition-colors",
              active === option.id ? "border-ink bg-ink text-white" : "border-line bg-white text-ink-2 hover:border-line-2"
            )}
            onClick={() => onSelect(option.id)}
          >
            {option.label}
            <span className={cx("font-mono text-[10px]", active === option.id ? "text-white/65" : "text-ink-4")}>{option.count}</span>
          </button>
        ))}
      </div>

      <div className="relative sm:hidden">
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-[10px] border border-line bg-white px-3 text-[12px] font-medium text-ink-2"
          aria-expanded={isOpen}
          onClick={onToggleOpen}
        >
          <I.sort width={15} height={15} />
          {selectedLabel}
          <I.chev width={14} height={14} />
        </button>
        {isOpen && (
          <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-[190px] rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_36px_-16px_rgba(14,21,18,0.18)]">
            {options.map((option) => (
              <button
                type="button"
                key={option.id}
                className={cx(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px]",
                  active === option.id ? "bg-teal-soft text-teal-ink" : "text-ink-2 hover:bg-bg-2 hover:text-ink"
                )}
                onClick={() => onSelect(option.id)}
              >
                <span>{option.label}</span>
                <span className="font-mono text-[11px] text-ink-4">{option.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function PublicBookingPage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params.slug;
  const stylistParam = searchParams.get("stylist");

  const [state, setState] = useState<BookingState>({ salon: null, services: [], stylists: [], bookings: [] });
  const dates = useMemo(() => generateBookingDateOptions(new Date(), state.salon?.booking_window_days), [state.salon?.booking_window_days]);
  const [step, setStep] = useState<Step>(1);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string | number>("any");
  const [selectedDate, setSelectedDate] = useState(() => generateBookingDateOptions()[0]?.key || "");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const [activeServiceFilter, setActiveServiceFilter] = useState<ServiceFilter>("all");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [confirmationStatus, setConfirmationStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const totalDuration = selectedServices.reduce((sum, service) => sum + durationOf(service), 0);
  const totalPrice = selectedServices.reduce((sum, service) => sum + Number(service.price), 0);
  const totalSavings = selectedServices.reduce((sum, service) => {
    if (service.kind === "bundle") {
      const included = service.includedServices || [];
      const originalPrice = service.originalPrice || included.reduce((s, item) => s + Number(item.price || 0), 0);
      const price = Number(service.price || 0);
      return sum + Math.max(0, originalPrice - price);
    }
    return sum;
  }, 0);

  useEffect(() => {
    const controller = new AbortController();

    const loadSalon = async () => {
      const envError = getSupabaseEnvError();
      if (envError) {
        setMessage(envError);
        setIsLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setMessage("Supabase is not configured.");
        setIsLoading(false);
        return;
      }

      const { data: salon, error: salonError } = await supabase
        .from("salons")
        .select(PUBLIC_SALON_SELECT)
        .eq("slug", slug)
        .abortSignal(controller.signal)
        .single();
      if (controller.signal.aborted) return;
      if (salonError || !salon) {
        setMessage("We could not find this salon booking page.");
        setIsLoading(false);
        return;
      }

      const bookingDates = generateBookingDateOptions(new Date(), salon.booking_window_days);
      const startDate = bookingDates[0]?.key || formatDateKey(new Date());
      const endDate = bookingDates[bookingDates.length - 1]?.key || startDate;
      const [{ data: services, error: serviceError }, { data: stylists, error: stylistError }, { data: bookings, error: bookingError }] =
        await Promise.all([
          supabase
            .from("services")
            .select(SERVICE_SELECT_WITH_BUNDLES)
            .eq("salon_id", salon.id)
            .eq("active", true)
            .is("deleted_at", null)
            .order("category")
            .order("name")
            .abortSignal(controller.signal),
          supabase.from("stylists").select("id,name,role_label,tone,booking_slug").eq("salon_id", salon.id).eq("active", true).order("name").abortSignal(controller.signal),
          supabase.from("bookings").select("id,stylist_id,date,start_time,duration,status").eq("salon_id", salon.id).gte("date", startDate).lte("date", endDate).abortSignal(controller.signal),
        ]);

      if (controller.signal.aborted) return;
      const error = serviceError || stylistError || bookingError;
      if (error) {
        setMessage(error.message);
        setIsLoading(false);
        return;
      }

      const loadedStylists = stylists ?? [];
      setState({
        salon,
        services: ((services ?? []) as unknown as DbServiceRaw[]).map(mapPublicBookingService),
        stylists: loadedStylists,
        bookings: bookings ?? [],
      });

      if (stylistParam) {
        const matchedStylist = loadedStylists.find((stylist) => stylist.booking_slug === stylistParam || stylist.id === stylistParam);
        if (matchedStylist) {
          setSelectedStylist(matchedStylist.id);
        }
      }

      setIsLoading(false);
    };

    void loadSalon();
    return () => controller.abort();
  }, [slug, stylistParam]);

  useEffect(() => {
    if (dates.length > 0 && !dates.some((date) => date.key === selectedDate)) {
      queueMicrotask(() => {
        setSelectedDate(dates[0].key);
        setSelectedTime(null);
      });
    }
  }, [dates, selectedDate]);

  const serviceCategories = useMemo(() => {
    const seen = new Set<string>();
    state.services.forEach((service) => {
      if (service.kind === "bundle") return;
      seen.add(service.cat || service.category || "General");
    });
    return Array.from(seen);
  }, [state.services]);

  const filterOptions = useMemo(() => {
    const comboCount = state.services.filter((service) => service.kind === "bundle").length;
    const options: Array<{ id: ServiceFilter; label: string; count: number }> = [
      { id: "all", label: "All", count: state.services.length },
    ];

    if (comboCount > 0) {
      options.push({ id: "combos", label: "Combos", count: comboCount });
    }

    serviceCategories.forEach((category) => {
      options.push({
        id: `category:${category}` as ServiceFilter,
        label: category,
        count: state.services.filter((service) => service.kind !== "bundle" && (service.cat || service.category || "General") === category).length,
      });
    });

    return options;
  }, [serviceCategories, state.services]);

  const normalizedServiceSearch = serviceSearch.trim().toLowerCase();
  const filteredServices = useMemo(() => {
    return state.services.filter((service) => serviceMatchesFilter(service, activeServiceFilter) && serviceMatchesQuery(service, normalizedServiceSearch));
  }, [activeServiceFilter, normalizedServiceSearch, state.services]);

  const serviceGroups = useMemo(() => {
    const groups: Array<{ label: string; services: Service[] }> = [];
    const combos = filteredServices.filter((service) => service.kind === "bundle");
    if (combos.length > 0) {
      groups.push({ label: "Combos", services: combos });
    }

    serviceCategories.forEach((category) => {
      const services = filteredServices.filter((service) => service.kind !== "bundle" && (service.cat || service.category || "General") === category);
      if (services.length > 0) {
        groups.push({ label: category, services });
      }
    });

    return groups;
  }, [filteredServices, serviceCategories]);

  const slots = useMemo(() => {
    if (!totalDuration) {
      return [];
    }

    return getSlotsForDate(state.salon, selectedDate, dates, totalDuration).map((time) => ({
      time,
      available: !!getAvailableStylistId(state.stylists, state.bookings, selectedDate, time, totalDuration, selectedStylist),
    }));
  }, [dates, selectedDate, selectedStylist, state.bookings, state.salon, state.stylists, totalDuration]);

  const selectedDateLabel = dates.find((date) => date.key === selectedDate);
  const selectedStylistName = selectedStylist === "any" ? "First available" : state.stylists.find((stylist) => stylist.id === selectedStylist)?.name ?? "Stylist";
  const canAdvance =
    (step === 1 && selectedServices.length > 0) ||
    (step === 2 && Boolean(selectedTime)) ||
    (step === 3 && customerName.trim().length > 1 && phone.replace(/\D/g, "").length === 10);

  const toggleService = (service: Service) => {
    setSelectedServices((current) => (current.some((item) => item.id === service.id) ? current.filter((item) => item.id !== service.id) : [...current, service]));
  };

  const submitBooking = async () => {
    if (!state.salon || !selectedTime || isSubmitting) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setMessage("Supabase is not configured.");
      return;
    }

    const stylistId = getAvailableStylistId(state.stylists, state.bookings, selectedDate, selectedTime, totalDuration, selectedStylist);
    if (!stylistId) {
      setMessage("That slot just got booked. Please pick another time.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { data: bookingRows, error: bookingError } = await supabase.rpc("create_public_booking", {
      p_salon_id: state.salon.id,
      p_customer_name: customerName.trim(),
      p_phone: formatPhone(phone),
      p_stylist_id: stylistId,
      p_date: selectedDate,
      p_start_time: selectedTime,
      p_duration: totalDuration,
      p_service_ids: selectedServices.map((service) => service.id),
    });

    const booking = Array.isArray(bookingRows) ? bookingRows[0] : null;

    if (bookingError || !booking) {
      setMessage(bookingError?.message ?? "Could not create booking.");
      setIsSubmitting(false);
      return;
    }

    setState((current) => ({
      ...current,
      bookings: [
        ...current.bookings,
        {
          id: booking.booking_id,
          stylist_id: stylistId,
          date: selectedDate,
          start_time: selectedTime,
          duration: totalDuration,
          status: "Confirmed",
        },
      ],
    }));
    setStep(4);
    setIsSubmitting(false);
    setConfirmationStatus("sending");

    void fetch("/api/whatsapp/public-booking-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salonId: state.salon.id,
        bookingId: booking.booking_id,
      }),
    }).then(async (response) => {
      const body = await response.json().catch(() => null);
      setConfirmationStatus(response.ok && body?.ok ? "sent" : "failed");
    }).catch(() => {
      setConfirmationStatus("failed");
    });
  };

  const reset = () => {
    setSelectedServices([]);
    setSelectedStylist("any");
    setSelectedDate(dates[0].key);
    setSelectedTime(null);
    setCustomerName("");
    setPhone("");
    setMessage(null);
    setConfirmationStatus("idle");
    setServiceSearch("");
    setActiveServiceFilter("all");
    setIsFilterOpen(false);
    setStep(1);
  };

  const advance = () => {
    if (!canAdvance) {
      return;
    }

    if (step === 3) {
      submitBooking();
      return;
    }

    setStep((current) => (current + 1) as Step);
  };

  return (
    <div className="grid min-h-screen items-start justify-items-center bg-bg-2 p-0 sm:px-6">
      <div className="relative flex min-h-screen w-full max-w-[430px] flex-col overflow-hidden bg-bg sm:border-x sm:border-line">
        {step < 4 && (
          <header className="grid grid-cols-[36px_1fr_auto] items-center gap-3 border-b border-line bg-white px-[18px] pb-3.5 pt-[18px]">
            {step > 1 ? (
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-[10px] bg-bg-2 text-ink transition-colors hover:bg-line"
                onClick={() => setStep((step - 1) as Step)}
                aria-label="Back"
              >
                <I.back width={18} height={18} />
              </button>
            ) : (
              <div className="grid h-9 w-9 place-items-center rounded-[10px] border border-teal-soft-2 bg-teal-soft text-base font-bold text-teal">
                {state.salon?.name?.[0] ?? "C"}
              </div>
            )}
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{state.salon?.name ?? "ChairBook"}</div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-xs text-ink-3">
                <I.pin width={14} height={14} />
                <span className="truncate">{state.salon?.area || state.salon?.city || "Public booking"}</span>
              </div>
            </div>
            <div className="inline-flex h-7 items-center gap-1.5 rounded-full bg-bg-2 px-2.5 font-mono text-xs font-semibold text-ink-2">
              <I.star width={13} height={13} className="text-amber" />
              <span>4.8</span>
            </div>
          </header>
        )}

        {step < 4 && <PublicStepBar step={step} />}

        <main className="flex-1 overflow-y-auto">
          {isLoading && <Skeleton />}

          {!isLoading && message && step !== 3 && <div className="m-5 rounded-xl border border-line bg-white p-5 text-sm text-ink-3">{message}</div>}

          {!isLoading && state.salon && step === 1 && (
            <div className="px-5 py-[22px]">
              <h1 className="m-0 text-[22px] font-semibold leading-tight text-ink">What can we do for you?</h1>
              <p className="mb-4 mt-1.5 text-[15px] leading-relaxed text-ink-3">Search across {state.services.length} services and combos from {state.salon.name}.</p>

              <div className="mb-3 flex h-[46px] items-center gap-2.5 rounded-xl border border-line-2 bg-white px-3.5 transition-colors focus-within:border-teal">
                <I.search width={16} height={16} className="shrink-0 text-ink-3" />
                <input
                  className="h-full min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-4"
                  placeholder='Search service, combo, or code "#003"'
                  value={serviceSearch}
                  onChange={(event) => setServiceSearch(event.target.value)}
                />
                {serviceSearch && (
                  <button
                    type="button"
                    className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-bg-2 text-ink-2"
                    onClick={() => setServiceSearch("")}
                    aria-label="Clear search"
                  >
                    <I.x width={14} height={14} />
                  </button>
                )}
              </div>

              <div className="mb-[18px]">
                <FilterControl
                  options={filterOptions}
                  active={activeServiceFilter}
                  isOpen={isFilterOpen}
                  onToggleOpen={() => setIsFilterOpen((current) => !current)}
                  onSelect={(id) => {
                    setActiveServiceFilter(id);
                    setIsFilterOpen(false);
                  }}
                />
              </div>

              {serviceGroups.length === 0 ? (
                <div className="my-5 flex items-start gap-3.5 rounded-xl bg-bg-2 p-5">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink-3">
                    <I.search width={24} height={24} />
                  </div>
                  <div>
                    <strong className="block text-sm font-semibold text-ink">No matching services</strong>
                    <div className="mt-1 text-[13px] leading-relaxed text-ink-3">Try a shorter search, another code, or clear the filter.</div>
                  </div>
                </div>
              ) : (
                serviceGroups.map((group) => (
                  <div key={group.label} className="mb-[18px]">
                    <SectionTitle title={group.label === "Combos" ? "✳ COMBOS · SAVE MORE WHEN YOU BOOK TOGETHER" : group.label}>
                      <span className="ml-2 font-mono text-ink-4">{group.services.length}</span>
                    </SectionTitle>
                    <div className="flex flex-col gap-2">
                      {group.services.map((service) => (
                        <ServiceCard
                          key={service.id}
                          service={service}
                          selected={selectedServices.some((item) => item.id === service.id)}
                          query={normalizedServiceSearch}
                          onToggle={toggleService}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {!isLoading && state.salon && step === 2 && (
            <div className="px-5 py-[22px]">
              <h1 className="m-0 text-[22px] font-semibold leading-tight text-ink">When would you like to come in?</h1>
              <p className="mb-5 mt-1.5 text-[15px] leading-relaxed text-ink-3">
                {selectedServices.length} service{selectedServices.length === 1 ? "" : "s"} · {totalDuration} min total · {inr(totalPrice)}
              </p>

              <SectionTitle title="Choose a stylist" />
              <div className={cx("-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1", thinScrollRail)}>
                <button
                  type="button"
                  className={cx(
                    "w-[118px] shrink-0 rounded-xl border bg-white p-3 text-center transition-colors",
                    selectedStylist === "any" ? "border-teal bg-teal-soft" : "border-line hover:border-line-2"
                  )}
                  onClick={() => {
                    setSelectedStylist("any");
                    setSelectedTime(null);
                  }}
                >
                  <Avatar initials="?" tone="a" size="lg" className="mx-auto mb-2" />
                  <div className="truncate text-sm font-semibold text-ink">No preference</div>
                  <div className="mt-0.5 truncate text-xs text-ink-3">First available</div>
                </button>
                {state.stylists.map((stylist) => (
                  <button
                    type="button"
                    key={stylist.id}
                    className={cx(
                      "w-[118px] shrink-0 rounded-xl border bg-white p-3 text-center transition-colors",
                      selectedStylist === stylist.id ? "border-teal bg-teal-soft" : "border-line hover:border-line-2"
                    )}
                    onClick={() => {
                      setSelectedStylist(stylist.id);
                      setSelectedTime(null);
                    }}
                  >
                    <Avatar initials={stylist.name[0]} tone={stylist.tone ?? "b"} size="lg" className="mx-auto mb-2" />
                    <div className="truncate text-sm font-semibold text-ink">{stylist.name}</div>
                    <div className="mt-0.5 truncate text-xs text-ink-3">{stylist.role_label || "Stylist"}</div>
                  </button>
                ))}
              </div>

              <SectionTitle title="Pick a date" />
              <div className={cx("-mx-5 flex gap-2.5 overflow-x-auto px-5 pb-1", thinScrollRail)}>
                {dates.map((date) => (
                  <button
                    type="button"
                    key={date.key}
                    className={cx(
                      "min-w-[72px] rounded-xl border bg-white p-2 text-center transition-colors",
                      selectedDate === date.key ? "border-teal bg-teal-soft" : "border-line hover:border-line-2"
                    )}
                    onClick={() => {
                      setSelectedDate(date.key);
                      setSelectedTime(null);
                    }}
                  >
                    <span className="block whitespace-nowrap font-mono text-[9px] font-semibold uppercase tracking-normal text-ink-3">{date.dow} {date.monthShort}</span>
                    <span className="mt-0.5 block text-xl font-semibold text-ink">{date.dom}</span>
                    {date.label && <span className="mt-0.5 block rounded-full bg-teal-soft px-1.5 py-0.5 text-[10px] font-medium text-teal">{date.label}</span>}
                  </button>
                ))}
              </div>

              <div className="mb-3 mt-6 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">
                <span>Available times</span>
                <span className="font-mono font-normal normal-case tracking-normal text-teal">{slots.filter((slot) => slot.available).length} open</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => (
                  <button
                    type="button"
                    key={slot.time}
                    disabled={!slot.available}
                    className={cx(
                      "h-11 rounded-[10px] border font-mono text-sm font-medium transition-colors",
                      selectedTime === slot.time && "border-teal bg-teal text-white",
                      slot.available && selectedTime !== slot.time && "border-line bg-white text-ink hover:border-line-2",
                      !slot.available && "cursor-not-allowed border-line bg-bg-2 text-ink-4 line-through"
                    )}
                    onClick={() => setSelectedTime(slot.time)}
                  >
                    {slot.time}
                  </button>
                ))}
                {slots.length === 0 && <div className="col-span-3 rounded-xl border border-line bg-white p-4 text-center text-sm text-ink-3">No slots open on this day.</div>}
              </div>
            </div>
          )}

          {!isLoading && state.salon && step === 3 && (
            <div className="px-5 py-[22px]">
              <h1 className="m-0 text-[22px] font-semibold leading-tight text-ink">Just one last thing.</h1>
              <p className="mb-5 mt-1.5 text-[15px] leading-relaxed text-ink-3">We will send your confirmation and reminder on WhatsApp.</p>

              <div className="rounded-xl border border-line bg-bg-2 p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">SERVICES ({selectedServices.length})</span>
                  <button type="button" className="text-xs font-semibold text-teal hover:underline" onClick={() => setStep(1)}>Edit</button>
                </div>
                {selectedServices.map((service) => {
                  const isCombo = service.kind === "bundle";
                  const included = service.includedServices || [];
                  const originalPrice = service.originalPrice || included.reduce((sum, item) => sum + Number(item.price || 0), 0);
                  const price = Number(service.price || 0);

                  return (
                    <div key={service.id} className="flex items-start justify-between gap-3 py-1">
                      <div className="min-w-0">
                        {isCombo ? (
                          <>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-ink">{service.name}</span>
                              <span className="bg-[#0f6e56] text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider leading-none">
                                COMBO
                              </span>
                            </div>
                            <div className="mt-0.5 font-mono text-[12px] text-ink-3">
                              {durationOf(service)} min · {included.map((item) => item.name).join(" + ")}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-sm font-semibold text-ink">{service.name}</div>
                            <div className="mt-0.5 font-mono text-[12px] text-ink-3">
                              {durationOf(service)} min
                            </div>
                          </>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        {isCombo && originalPrice > price ? (
                          <>
                            <div className="font-mono text-[11px] text-ink-4 line-through leading-none mb-0.5">{inr(originalPrice)}</div>
                            <div className="font-mono text-sm font-semibold text-ink-2 leading-none">{inr(price)}</div>
                          </>
                        ) : (
                          <div className="font-mono text-sm font-semibold text-ink-2 leading-none">{inr(price)}</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="my-2.5 border-t border-dashed border-[#d7dddd]" />

                <div className="flex justify-between gap-3 py-0.5 text-sm text-ink-2">
                  <span>Stylist</span>
                  <strong className="font-semibold text-ink">{selectedStylistName}</strong>
                </div>

                <div className="flex justify-between gap-3 py-0.5 text-sm text-ink-2">
                  <span>When</span>
                  <strong className="font-semibold text-ink">
                    {selectedDateLabel?.full} · {selectedTime}
                  </strong>
                </div>

                <div className="flex justify-between gap-3 py-0.5 text-sm text-ink-2">
                  <span>Duration</span>
                  <strong className="font-semibold text-ink font-mono">{totalDuration} min</strong>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between gap-3 py-0.5 text-sm text-ink-2">
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <svg
                        className="w-3.5 h-3.5 stroke-current fill-none shrink-0 text-ink-3"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        viewBox="0 0 24 24"
                      >
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                        <circle cx="7" cy="7" r="1" fill="currentColor" />
                      </svg>
                      You saved
                    </span>
                    <strong className="font-semibold text-ink font-mono">{inr(totalSavings)}</strong>
                  </div>
                )}

                <div className="mt-2 flex justify-between gap-3 border-t border-line pt-2.5 text-base text-ink items-center">
                  <span>Total</span>
                  <strong className="font-mono text-xl font-bold text-teal">{inr(totalPrice)}</strong>
                </div>
              </div>

              {message && <div className="mt-4 rounded-lg bg-rose-soft p-3 text-[13px] text-rose">{message}</div>}

              <div className="mt-5 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-3">Your name</label>
                <input
                  className="h-[42px] rounded-[10px] border border-line-2 bg-white px-3.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-4 focus:border-teal"
                  placeholder="e.g. Priya Sharma"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  autoFocus
                />
              </div>

              <div className="mt-3.5 flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink-3">Phone number</label>
                <PhoneInput value={phone} onChange={setPhone} />
              </div>

              <div className="mt-4 flex gap-2.5 rounded-xl bg-wa-soft p-3 text-[13px] leading-relaxed text-ink-2">
                <I.wa width={18} height={18} className="shrink-0 text-wa" />
                <div>You will get a WhatsApp confirmation after booking. We will only use this number for appointment updates.</div>
              </div>
            </div>
          )}

          {step === 4 && state.salon && (
            <div className="px-5 py-8">
              <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-teal-soft text-teal">
                <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden>
                  <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <path d="M22 41 35 54 58 28" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-6 text-center text-[22px] font-semibold leading-tight text-ink">You are booked, {customerName.split(" ")[0]}.</h1>
              <p className="mt-1.5 text-center text-[15px] leading-relaxed text-ink-3">We have blocked your slot. See you soon.</p>

              <div className="mt-6 rounded-xl border border-line bg-white p-[18px]">
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Services ({selectedServices.length})</div>
                  {selectedServices.map((service) => (
                    <div key={service.id} className="py-1.5 text-sm">
                      <div className="flex justify-between gap-3">
                        <span className="min-w-0 truncate text-ink">{service.name}</span>
                        <span className="shrink-0 font-mono text-xs text-ink-3">{inr(Number(service.price || 0))}</span>
                      </div>
                      <BundleSummaryDetails service={service} />
                    </div>
                  ))}
                </div>
                <div className="my-4 h-px bg-line" />
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">When</div>
                  <div className="text-[15px] font-semibold text-ink">{selectedDateLabel?.full}</div>
                  <div className="mt-0.5 text-xs text-ink-3">{selectedTime} · with {selectedStylistName} · {totalDuration} min</div>
                </div>
                <div className="my-4 h-px bg-line" />
                <div>
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-ink-3">Where</div>
                  <div className="text-[15px] font-semibold text-ink">{state.salon.name}</div>
                  <div className="mt-0.5 text-xs text-ink-3">{state.salon.area || state.salon.city || "Salon location"}</div>
                </div>
              </div>

              <div className="mt-4 flex items-start gap-3 rounded-xl bg-wa-soft p-3.5 text-sm text-ink-2">
                <I.wa width={22} height={22} className="shrink-0 text-wa" />
                <div>
                  <strong className="block text-ink">
                    {confirmationStatus === "sent"
                      ? "WhatsApp confirmation sent"
                      : confirmationStatus === "failed"
                        ? "Booking confirmed"
                        : "Sending WhatsApp confirmation"}
                  </strong>
                  <div className="mt-0.5 text-[13px] text-ink-3">
                    {confirmationStatus === "sent"
                      ? "Your appointment details were sent to the number you entered."
                      : confirmationStatus === "failed"
                        ? "The salon has your booking and will follow up if WhatsApp is not available."
                        : "This usually takes a few seconds."}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-xl border border-line-2 bg-white px-5 text-[15px] font-medium text-ink transition-colors hover:border-ink-3 hover:bg-bg-2"
                onClick={reset}
              >
                Book another appointment
              </button>
            </div>
          )}
        </main>

        {step < 4 && (
          <footer className="sticky bottom-0 z-10 border-t border-line bg-bg px-5 py-3">
            <button
              type="button"
              className="mx-auto flex h-12 w-full max-w-[320px] items-center justify-center gap-2 rounded-xl bg-teal px-5 text-[15px] font-medium text-white transition-colors hover:bg-teal-ink disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!canAdvance || isSubmitting}
              onClick={advance}
            >
              {step === 3
                ? `${isSubmitting ? "Confirming" : "Confirm booking"} · ${inr(totalPrice)}`
                : step === 1
                  ? `Continue · ${selectedServices.length || "select"} service${selectedServices.length === 1 ? "" : "s"}`
                  : selectedTime
                    ? "Continue"
                    : "Pick a time"}
              {canAdvance && !isSubmitting && <span aria-hidden>→</span>}
            </button>
            <div className="mx-auto mt-2 max-w-[300px] text-center text-[11px] leading-snug text-ink-3">By booking, you agree to the salon cancellation policy.</div>
          </footer>
        )}
      </div>
    </div>
  );
}
