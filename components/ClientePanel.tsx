"use client";

import { useState } from "react";
import type { ApiError, TrackResult } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/pricing";

export default function ClientePanel() {
  const [guia, setGuia] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  async function consultar() {
    setResult(null);
    if (!guia.trim()) {
      setError("Escribe un número de guía para consultar.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/track/${encodeURIComponent(guia.trim())}`);
      const json = (await res.json()) as TrackResult | ApiError;
      if (!res.ok) setError((json as ApiError).error);
      else setResult(json as TrackResult);
    } catch {
      setError("No pudimos conectar. Revisa tu internet e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  const open = result && result.status !== "Entregado" && result.status !== "Devuelto";

  return (
    <section>
      <h1>¿Dónde está tu paquete?</h1>
      <p className="lead">Escribe tu número de guía y mira el estado actual y todo el recorrido, sin llamar a nadie.</p>
      <div className="card">
        <label htmlFor="guia">Número de guía</label>
        <div className="row">
          <input
            id="guia" value={guia} placeholder="LG-2026-00000001" autoComplete="off"
            onChange={(e) => setGuia(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void consultar(); }}
          />
          <button className="btn" onClick={() => void consultar()} disabled={loading}>
            {loading ? "Consultando…" : "Consultar envío"}
          </button>
        </div>

        <div aria-live="polite">
          {error && <div className="msg err" role="status">{error}</div>}
          {result && (
            <>
              <div className="msg ok" role="status">Guía encontrada</div>
              <p style={{ margin: "16px 0 0" }}>
                Estado actual: <span className="badge">{result.status}</span>
              </p>
              <ul className="tl">
                {[...result.events].reverse().map((ev, i) => (
                  <li key={i} className={ev.status === "Con incidencia" ? "inc" : ""}>
                    <span className="dot" aria-hidden="true">✓</span>
                    <div className="t">{ev.status}{ev.note ? ` – ${ev.note}` : ""}</div>
                    <div className="d">{formatDateTime(ev.at)} · {ev.location}</div>
                  </li>
                ))}
                {open && (
                  <li className="est">
                    <span className="dot" aria-hidden="true">·</span>
                    <div className="t">Paquete entregado</div>
                    <div className="d">Estimado: {formatDate(result.estimatedDelivery)}</div>
                  </li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
