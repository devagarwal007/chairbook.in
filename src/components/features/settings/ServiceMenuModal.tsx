"use client";

import { useMemo, useState } from "react";
import { Icons as I, Modal } from "@/components/ui";
import { findNextServiceCode, formatServiceCode, parseServiceCode } from "@/lib/service-codes";
import type { Service, ServiceKind } from "@/types";

type ServiceModalState = {
  mode: "add" | "edit";
  target?: Service | null;
  startKind?: ServiceKind;
};

interface ServiceMenuModalProps {
  modal: ServiceModalState;
  allServices: Service[];
  onClose: () => void;
  onSave: (kind: ServiceKind, service: Service) => void;
  onDelete: (service: Service) => void;
}

const SERVICE_CATEGORIES = ["Hair", "Skin", "Hands", "Nails", "General"];
const inr = (value: number) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const getServiceKind = (service: Service): ServiceKind => service.kind || "service";
const getComponentIds = (service: Service) => service.componentIds || service.items || [];

export default function ServiceMenuModal({
  modal,
  allServices,
  onClose,
  onSave,
  onDelete,
}: ServiceMenuModalProps) {
  const initial = modal.target || null;
  const isEdit = modal.mode === "edit";
  const startKind = initial ? getServiceKind(initial) : modal.startKind || "service";
  const nextAvailableCode = useMemo(() => findNextServiceCode(allServices), [allServices]);
  const [kind, setKind] = useState<ServiceKind>(startKind);
  const [name, setName] = useState(initial?.name || "");
  const [codeInput, setCodeInput] = useState(initial?.code ? formatServiceCode(initial.code) : formatServiceCode(nextAvailableCode));
  const [cat, setCat] = useState(initial?.cat || initial?.category || "Hair");
  const [duration, setDuration] = useState(initial?.duration || initial?.duration_min || 30);
  const [price, setPrice] = useState(initial?.price || 0);
  const [active, setActive] = useState(initial?.active !== false);
  const [componentIds, setComponentIds] = useState<Array<string | number>>(getComponentIds(initial || ({} as Service)));
  const [note, setNote] = useState(initial?.bundle_note || "");
  const [pickerQuery, setPickerQuery] = useState("");

  const normalServices = useMemo(() => allServices.filter((service) => getServiceKind(service) === "service"), [allServices]);
  const selectedServices = useMemo(
    () => componentIds.map((id) => normalServices.find((service) => service.id === id)).filter(Boolean) as Service[],
    [componentIds, normalServices]
  );
  const originalSum = selectedServices.reduce((sum, service) => sum + Number(service.price || 0), 0);
  const totalMin = selectedServices.reduce((sum, service) => sum + Number(service.duration || service.duration_min || 0), 0);
  const savings = Math.max(0, originalSum - Number(price || 0));
  const savingsPct = originalSum > 0 ? Math.round((savings / originalSum) * 100) : 0;
  const q = pickerQuery.trim().toLowerCase();
  const parsedCode = parseServiceCode(codeInput);
  const hasInvalidCode = codeInput.trim().length > 0 && parsedCode === null;

  const toggleComponent = (id: string | number) => {
    setComponentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const canSubmit = !hasInvalidCode && (kind === "service"
    ? name.trim().length > 0 && Number(duration) > 0 && Number(price) >= 0
    : name.trim().length > 0 && componentIds.length >= 2 && Number(price) > 0);

  const submit = () => {
    if (!canSubmit) return;
    if (kind === "service") {
      onSave("service", {
        ...(initial || {}),
        id: initial?.id ?? "__draft_service__",
        name: name.trim(),
        cat,
        category: cat,
        duration: Number(duration),
        duration_min: Number(duration),
        price: Number(price),
        code: parsedCode,
        active,
        kind: "service",
        componentIds: [],
      });
      return;
    }

    onSave("bundle", {
      ...(initial || {}),
      id: initial?.id ?? "__draft_bundle__",
      name: name.trim(),
      cat: "Bundles",
      category: "Bundles",
      duration: totalMin,
      duration_min: totalMin,
      price: Number(price),
      code: parsedCode,
      active,
      kind: "bundle",
      componentIds,
      bundle_note: note.trim(),
    });
  };

  const matchesPicker = (service: Service) => {
    if (!q) return true;
    return service.name.toLowerCase().includes(q)
      || (service.cat || service.category || "").toLowerCase().includes(q)
      || String(service.code || "").includes(q)
      || formatServiceCode(service).toLowerCase().includes(q);
  };

  const groupedPicker = SERVICE_CATEGORIES
    .map((category) => ({
      category,
      services: normalServices.filter((service) => (service.cat || service.category || "General") === category && matchesPicker(service)),
    }))
    .filter((group) => group.services.length > 0);

  return (
    <Modal
      title={isEdit ? (kind === "bundle" ? "Edit combo" : "Edit service") : "Add to menu"}
      onClose={onClose}
      width="min(560px, calc(100vw - 24px))"
      className="svc-modal"
      subtitle={!isEdit ? "A single service or a combo of two or more." : undefined}
      beforeBody={!isEdit && (
        <div className="svc-kind">
          <button className={`svc-kind-btn ${kind === "service" ? "on" : ""}`} onClick={() => setKind("service")}>
            <I.scissors />
            <div>
              <div className="svc-kind-name">Service</div>
              <div className="svc-kind-sub">A single offering</div>
            </div>
          </button>
          <button className={`svc-kind-btn ${kind === "bundle" ? "on" : ""}`} onClick={() => setKind("bundle")}>
            <span className="svc-kind-combo-ic">
              <span></span><span></span><span></span>
            </span>
            <div>
              <div className="svc-kind-name">Combo <span className="svc-kind-tag">save %</span></div>
              <div className="svc-kind-sub">2+ services, one price</div>
            </div>
          </button>
        </div>
      )}
      footer={
        <div className={`svc-modal-actions ${isEdit ? "edit" : ""}`}>
          {isEdit && initial && (
            <button className="btn btn-ghost svc-delete-btn" onClick={() => onDelete(initial)}>
              <I.trash style={{ width: 14, height: 14 }} /> Delete
            </button>
          )}
          <div className="svc-modal-action-buttons">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
              {isEdit ? "Save changes" : kind === "bundle" ? "Create combo" : "Add service"}
            </button>
          </div>
        </div>
      }
    >
      <div className="field">
        <label>{kind === "bundle" ? "Combo name" : "Service name"}</label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={kind === "bundle" ? "e.g. Bridal Glow" : "e.g. Haircut"}
          autoFocus
        />
      </div>

      <div className="field">
        <label>{kind === "bundle" ? "Combo code" : "Service code"}</label>
        <input
          value={codeInput}
          onChange={(event) => setCodeInput(event.target.value)}
          placeholder={formatServiceCode(nextAvailableCode)}
          inputMode="numeric"
        />
        {hasInvalidCode && (
          <div className="text-xs text-danger mt-1">Use a number like #008, 008, or 8.</div>
        )}
      </div>

      {kind === "service" ? (
        <>
          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select
                value={cat}
                onChange={(event) => setCat(event.target.value)}
              >
                {SERVICE_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Duration</label>
              <div className="svc-input-suffix">
                <input type="number" min="5" step="5" value={duration} onChange={(event) => setDuration(parseInt(event.target.value, 10) || 0)} />
                <span>min</span>
              </div>
            </div>
          </div>
          <div className="field">
            <label>Price</label>
            <div className="svc-input-prefix">
              <span>₹</span>
              <input type="number" min="0" step="50" value={price} onChange={(event) => setPrice(parseInt(event.target.value, 10) || 0)} />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="field">
            <label>
              Include services
              <span className="svc-label-count">{componentIds.length} selected</span>
            </label>
            <div className="svc-picker-search">
              <I.search />
              <input
                value={pickerQuery}
                onChange={(event) => setPickerQuery(event.target.value)}
                placeholder="Search by name or code (e.g. #003)..."
              />
              {pickerQuery && (
                <button className="svc-search-clear" onClick={() => setPickerQuery("")} aria-label="Clear">
                  <I.x />
                </button>
              )}
            </div>
            <div className="svc-picker">
              {groupedPicker.length === 0 ? (
                <div className="svc-picker-empty">No services match &ldquo;{pickerQuery}&rdquo;</div>
              ) : groupedPicker.map((group) => (
                <div key={group.category} className="svc-picker-group">
                  <div className="svc-picker-cat">{group.category}</div>
                  {group.services.map((service) => {
                    const checked = componentIds.includes(service.id);
                    return (
                      <label key={service.id} className={`svc-picker-row ${checked ? "on" : ""}`}>
                        <input type="checkbox" checked={checked} onChange={() => toggleComponent(service.id)} />
                        <span className="svc-picker-code">{service.code ? formatServiceCode(service) : "#---"}</span>
                        <div className="svc-picker-name">{service.name}</div>
                        <div className="svc-picker-meta mono">{service.duration}m · {inr(service.price)}</div>
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
            {componentIds.length === 1 && <div className="svc-hint">Pick at least one more to make a combo.</div>}
          </div>

          <div className="field">
            <label>Combo price</label>
            <div className="svc-input-prefix">
              <span>₹</span>
              <input type="number" min="0" step="50" value={price} onChange={(event) => setPrice(parseInt(event.target.value, 10) || 0)} placeholder="0" />
            </div>
          </div>

          <div className={`svc-summary ${savings > 0 && price > 0 ? "good" : ""}`}>
            <div className="svc-sum-row"><span className="svc-sum-lbl">If sold separately</span><span className="svc-sum-val mono">{inr(originalSum)}</span></div>
            <div className="svc-sum-row"><span className="svc-sum-lbl">Combo price</span><span className="svc-sum-val mono">{inr(Number(price || 0))}</span></div>
            <div className="svc-sum-row svc-sum-save"><span className="svc-sum-lbl">Customer saves</span><span className="svc-sum-val mono">{savings > 0 ? `${inr(savings)} · ${savingsPct}% off` : "-"}</span></div>
            <div className="svc-sum-row"><span className="svc-sum-lbl">Total time</span><span className="svc-sum-val mono">{totalMin} min</span></div>
          </div>

          <div className="field">
            <label>Internal note <span className="svc-optional">(optional)</span></label>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="e.g. Promote for wedding season"
            />
          </div>
        </>
      )}

      <div className="svc-active-row">
        <div>
          <div className="svc-active-name">Show on booking page</div>
          <div className="svc-active-hint">Customers can pick it when booking online.</div>
        </div>
        <label className="set-toggle">
          <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />
          <span className="set-toggle-track"></span>
        </label>
      </div>
    </Modal>
  );
}
