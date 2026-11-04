/**
 * PASARELA DE PAGO SIMULADA (solo para la muestra del prototipo).
 * - No cobra nada ni contacta a ningún banco.
 * - Los datos de la tarjeta se quedan en el navegador: nunca se envían ni se guardan.
 * - Para producción, reemplázala por una pasarela real (Wompi, PayU, Mercado Pago, etc.)
 *   que tokenice la tarjeta en su propio formulario.
 */
export interface CardInput { holder: string; number: string; expiry: string; cvv: string }
export interface GatewayResult { approved: boolean; reference?: string; reason?: string }

function luhn(num: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (dbl) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    dbl = !dbl;
  }
  return sum % 10 === 0;
}

export function validateCard(c: CardInput): Partial<Record<keyof CardInput, string>> {
  const e: Partial<Record<keyof CardInput, string>> = {};
  const digits = c.number.replace(/\s/g, "");
  if (!c.holder.trim()) e.holder = "Campo obligatorio";
  if (!/^[0-9]{13,19}$/.test(digits) || !luhn(digits)) e.number = "Número de tarjeta no válido";
  const m = /^(\d{2})\/(\d{2})$/.exec(c.expiry.trim());
  if (!m) e.expiry = "Usa el formato MM/AA";
  else {
    const month = Number(m[1]);
    const end = new Date(2000 + Number(m[2]), month, 1);
    if (month < 1 || month > 12 || end <= new Date()) e.expiry = "Tarjeta vencida o fecha no válida";
  }
  if (!/^[0-9]{3,4}$/.test(c.cvv)) e.cvv = "3 o 4 dígitos";
  return e;
}

function randomRef(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "SIM-";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Tarjetas de prueba: 4242 4242 4242 4242 (aprobada) · terminadas en 0002 (rechazada). */
export async function simulatePayment(c: CardInput): Promise<GatewayResult> {
  await new Promise((r) => setTimeout(r, 1600));
  if (c.number.replace(/\s/g, "").endsWith("0002")) {
    return { approved: false, reason: "El banco rechazó la tarjeta. Prueba con otra." };
  }
  return { approved: true, reference: randomRef() };
}
