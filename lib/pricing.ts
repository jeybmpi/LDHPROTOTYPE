import type { Service } from "./types";

/** Días hábiles de entrega por servicio (supuesto del prototipo; no considera festivos). */
export const SERVICE_DAYS: Record<Service, number> = { "Estándar": 5, "Express": 2 };

/** Tarifa de demostración en COP: base + valor por kilo (redondeado hacia arriba). */
export function calcAmount(weightKg: number, service: Service): number {
  const base = 8000 + 2500 * Math.ceil(weightKg);
  const total = service === "Express" ? base * 1.6 : base;
  return Math.round(total / 100) * 100;
}

/** Fecha de hoy en Bogotá (UTC-5), como fecha a medianoche UTC. */
export function bogotaToday(now: Date = new Date()): Date {
  const b = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
}

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start.getTime());
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) left--;
  }
  return d;
}

/** Devuelve YYYY-MM-DD. */
export function estimateDelivery(service: Service, now: Date = new Date()): string {
  return addBusinessDays(bogotaToday(now), SERVICE_DAYS[service]).toISOString().slice(0, 10);
}

export function formatCOP(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(n);
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Bogota",
  }).format(new Date(iso));
}
