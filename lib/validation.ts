import type { Service, ShipmentInput } from "./types";

export type Errors = Partial<Record<keyof ShipmentInput, string>>;
export type ValidationResult = { ok: true; data: ShipmentInput } | { ok: false; errors: Errors };

const PHONE = /^[0-9+\s-]{7,15}$/;
const DOC = /^[0-9]{5,12}$/;
export const SERVICES: Service[] = ["Estándar", "Express"];

/** Se usa en el navegador (feedback inmediato) y en el servidor (la validación que de verdad cuenta). */
export function validateShipment(raw: unknown): ValidationResult {
  const r = (raw ?? {}) as Record<string, unknown>;
  const str = (k: string): string => (typeof r[k] === "string" ? (r[k] as string).trim() : "");
  const errors: Errors = {};

  const text = (k: keyof ShipmentInput): string => {
    const v = str(k);
    if (!v) errors[k] = "Campo obligatorio";
    return v;
  };
  const doc = (k: keyof ShipmentInput): string => {
    const v = text(k);
    if (v && !DOC.test(v)) errors[k] = "Solo números (5 a 12 dígitos)";
    return v;
  };
  const phone = (k: keyof ShipmentInput): string => {
    const v = text(k);
    if (v && !PHONE.test(v)) errors[k] = "Teléfono no válido";
    return v;
  };

  const senderName = text("senderName");
  const senderDoc = doc("senderDoc");
  const senderPhone = phone("senderPhone");
  const originAddress = text("originAddress");
  const originCity = text("originCity");
  const recipientName = text("recipientName");
  const recipientDoc = doc("recipientDoc");
  const recipientPhone = phone("recipientPhone");
  const destAddress = text("destAddress");
  const destCity = text("destCity");

  const weightRaw = String(r.weightKg ?? "").trim().replace(",", ".");
  const weightKg = Number(weightRaw);
  if (!weightRaw) errors.weightKg = "Campo obligatorio";
  else if (!Number.isFinite(weightKg) || weightKg < 0.1 || weightKg > 50) errors.weightKg = "Entre 0,1 y 50 kg";

  const service = str("service") as Service;
  if (!service) errors.service = "Elige un servicio";
  else if (!SERVICES.includes(service)) errors.service = "Servicio no válido";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      senderName, senderDoc, senderPhone, originAddress, originCity,
      recipientName, recipientDoc, recipientPhone, destAddress, destCity,
      weightKg: Math.round(weightKg * 100) / 100, service,
    },
  };
}
