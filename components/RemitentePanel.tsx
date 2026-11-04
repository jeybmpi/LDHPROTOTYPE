"use client";

import { useState } from "react";
import type { ApiError, CreateResult, Service, ShipmentInput } from "@/lib/types";
import { validateShipment, type Errors } from "@/lib/validation";
import { calcAmount, estimateDelivery, formatCOP, formatDate } from "@/lib/pricing";
import { simulatePayment, validateCard, type CardInput } from "@/lib/gateway";

type Step = "datos" | "pago" | "listo";
type FormState = Record<Exclude<keyof ShipmentInput, "service">, string> & { service: "" | Service };

const EMPTY: FormState = {
  senderName: "", senderDoc: "", senderPhone: "", originAddress: "", originCity: "",
  recipientName: "", recipientDoc: "", recipientPhone: "", destAddress: "", destCity: "",
  weightKg: "", service: "",
};
const EMPTY_CARD: CardInput = { holder: "", number: "", expiry: "", cvv: "" };

export default function RemitentePanel() {
  const [step, setStep] = useState<Step>("datos");
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof CardInput, string>>>({});
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  function field(k: keyof FormState, label: string, opts: { inputMode?: "numeric" | "tel" | "decimal" } = {}) {
    return (
      <div>
        <label htmlFor={k}>{label} *</label>
        <input
          id={k} value={form[k]} inputMode={opts.inputMode}
          className={errors[k] ? "bad" : ""} aria-invalid={!!errors[k]}
          onChange={(e) => set(k, e.target.value)}
        />
        {errors[k] && <div className="ferr">{errors[k]}</div>}
      </div>
    );
  }

  const parsed = validateShipment(form);
  const amount = parsed.ok ? calcAmount(parsed.data.weightKg, parsed.data.service) : 0;
  const estimate = parsed.ok ? estimateDelivery(parsed.data.service) : "";

  function continuar() {
    const v = validateShipment(form);
    if (!v.ok) { setErrors(v.errors); return; }
    setErrors({});
    setStep("pago");
  }

  async function pagar() {
    const ce = validateCard(card);
    setCardErrors(ce);
    if (Object.keys(ce).length > 0 || !parsed.ok) return;

    setPayError(null);
    setPaying(true);
    try {
      const pay = await simulatePayment(card);
      if (!pay.approved || !pay.reference) {
        setPayError(pay.reason ?? "El pago no fue aprobado.");
        return;
      }
      const res = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, paymentRef: pay.reference }), // la tarjeta nunca se envía
      });
      const json = (await res.json()) as CreateResult | ApiError;
      if (!res.ok) {
        const err = json as ApiError;
        setPayError(err.error);
        if (err.errors) { setErrors(err.errors as Errors); setStep("datos"); }
        return;
      }
      setResult(json as CreateResult);
      setCard(EMPTY_CARD);
      setStep("listo");
    } catch {
      setPayError("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
    } finally {
      setPaying(false);
    }
  }

  function nuevo() {
    setForm(EMPTY); setErrors({}); setCard(EMPTY_CARD); setCardErrors({});
    setPayError(null); setResult(null); setCopied(false); setStep("datos");
  }

  async function copiar() {
    if (!result) return;
    try { await navigator.clipboard.writeText(result.guia); setCopied(true); } catch { /* sin permiso */ }
  }

  /* ---------- Paso 3: listo ---------- */
  if (step === "listo" && result) {
    return (
      <section>
        <h1>¡Envío registrado!</h1>
        <p className="lead">Tu pago fue aprobado. Guarda tu número de guía para seguir el paquete.</p>
        <div className="card">
          <div className="msg ok" role="status">Pago aprobado (simulado)</div>
          <p className="muted">Número de guía</p>
          <div className="guia">{result.guia}</div>
          <button className="btn ghost" onClick={() => void copiar()}>{copied ? "Copiado" : "Copiar guía"}</button>
          <dl className="summary">
            <div><dt>Entrega estimada</dt><dd>{formatDate(result.estimatedDelivery)}</dd></div>
            <div><dt>Total pagado</dt><dd>{formatCOP(result.amount)}</dd></div>
          </dl>
          <div className="msg info" role="status">
            Recibirás un mensaje de recibido 2 días después, por cuestiones logísticas.
          </div>
          <p className="hint">Para ver el estado, entra a la pestaña Cliente e ingresa tu número de guía.</p>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={nuevo}>Registrar otro envío</button>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Paso 2: pago ---------- */
  if (step === "pago" && parsed.ok) {
    const d = parsed.data;
    return (
      <section>
        <h1>Pago del envío</h1>
        <p className="lead">Revisa el resumen y paga para recibir tu número de guía.</p>

        <div className="card">
          <h2>Resumen</h2>
          <dl className="summary">
            <div><dt>Servicio</dt><dd>{d.service}</dd></div>
            <div><dt>Peso</dt><dd>{d.weightKg} kg</dd></div>
            <div><dt>Ruta</dt><dd>{d.originCity} → {d.destCity}</dd></div>
            <div><dt>Entrega estimada</dt><dd>{formatDate(estimate)}</dd></div>
            <div className="total"><dt>Total a pagar</dt><dd>{formatCOP(amount)}</dd></div>
          </dl>
        </div>

        <div className="card">
          <h2>Pago con tarjeta</h2>
          <div className="msg info">
            Pago simulado: no se cobra nada. Usa la tarjeta 4242 4242 4242 4242 para que sea aprobada, o una
            terminada en 0002 para ver un rechazo. Cualquier fecha futura y 3 dígitos de CVV.
          </div>
          <div className="grid" style={{ marginTop: 14 }}>
            <div className="full">
              <label htmlFor="holder">Nombre en la tarjeta *</label>
              <input id="holder" value={card.holder} autoComplete="cc-name" className={cardErrors.holder ? "bad" : ""}
                onChange={(e) => setCard({ ...card, holder: e.target.value })} />
              {cardErrors.holder && <div className="ferr">{cardErrors.holder}</div>}
            </div>
            <div className="full">
              <label htmlFor="number">Número de tarjeta *</label>
              <input id="number" value={card.number} inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242"
                className={cardErrors.number ? "bad" : ""} onChange={(e) => setCard({ ...card, number: e.target.value })} />
              {cardErrors.number && <div className="ferr">{cardErrors.number}</div>}
            </div>
            <div>
              <label htmlFor="expiry">Vence (MM/AA) *</label>
              <input id="expiry" value={card.expiry} placeholder="12/29" autoComplete="cc-exp"
                className={cardErrors.expiry ? "bad" : ""} onChange={(e) => setCard({ ...card, expiry: e.target.value })} />
              {cardErrors.expiry && <div className="ferr">{cardErrors.expiry}</div>}
            </div>
            <div>
              <label htmlFor="cvv">CVV *</label>
              <input id="cvv" value={card.cvv} inputMode="numeric" autoComplete="cc-csc" maxLength={4}
                className={cardErrors.cvv ? "bad" : ""} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
              {cardErrors.cvv && <div className="ferr">{cardErrors.cvv}</div>}
            </div>
          </div>
          {payError && <div className="msg err" role="status">{payError}</div>}
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn" onClick={() => void pagar()} disabled={paying}>
              {paying ? "Procesando pago…" : `Pagar ${formatCOP(amount)}`}
            </button>
            <button className="btn ghost" onClick={() => setStep("datos")} disabled={paying}>Volver a los datos</button>
          </div>
        </div>
      </section>
    );
  }

  /* ---------- Paso 1: datos ---------- */
  const hasErrors = Object.keys(errors).length > 0;
  return (
    <section>
      <h1>Envía tu paquete</h1>
      <p className="lead">Completa los datos, paga y recibe tu número de guía al instante.</p>

      <div className="card">
        <h2>Quien envía</h2>
        <div className="grid">
          {field("senderName", "Nombre del remitente")}
          {field("senderDoc", "Documento de identificación", { inputMode: "numeric" })}
          {field("senderPhone", "Teléfono", { inputMode: "tel" })}
          {field("originCity", "Ciudad de origen")}
          <div className="full">{field("originAddress", "Dirección de origen")}</div>
        </div>
      </div>

      <div className="card">
        <h2>Quien recibe</h2>
        <div className="grid">
          {field("recipientName", "Nombre del destinatario")}
          {field("recipientDoc", "Documento de identificación", { inputMode: "numeric" })}
          {field("recipientPhone", "Teléfono", { inputMode: "tel" })}
          {field("destCity", "Ciudad de destino")}
          <div className="full">{field("destAddress", "Dirección de destino")}</div>
        </div>
      </div>

      <div className="card">
        <h2>Paquete y servicio</h2>
        <div className="grid">
          {field("weightKg", "Peso (kg)", { inputMode: "decimal" })}
          <div>
            <label htmlFor="service">Tipo de servicio *</label>
            <select id="service" value={form.service} className={errors.service ? "bad" : ""}
              onChange={(e) => set("service", e.target.value)}>
              <option value="">Selecciona…</option>
              <option value="Estándar">Estándar (5 días hábiles)</option>
              <option value="Express">Express (2 días hábiles)</option>
            </select>
            {errors.service && <div className="ferr">{errors.service}</div>}
          </div>
        </div>
        {parsed.ok && (
          <p className="hint">Total: {formatCOP(amount)} · Entrega estimada: {formatDate(estimate)}</p>
        )}
        {hasErrors && <div className="msg err" role="status">Completa los campos resaltados en rojo.</div>}
        <div className="row" style={{ marginTop: 16 }}>
          <button className="btn" onClick={continuar}>Continuar al pago</button>
        </div>
      </div>
    </section>
  );
}
