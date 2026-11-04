import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { validateShipment } from "@/lib/validation";
import { calcAmount, estimateDelivery } from "@/lib/pricing";
import type { ApiError, CreateResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const PAYMENT_REF = /^SIM-[A-Z0-9]{8}$/;

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === "object") {
    const o = e as { message?: string; details?: string; hint?: string; code?: string };
    return [o.code, o.message, o.details, o.hint].filter(Boolean).join(" | ") || JSON.stringify(e);
  }
  return String(e);
}

/** Crea un envío después de un pago simulado aprobado y devuelve la guía. */
export async function POST(req: Request): Promise<NextResponse<CreateResult | ApiError>> {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Solicitud no válida" }, { status: 400 });
  }

  const v = validateShipment(body);
  if (!v.ok) {
    return NextResponse.json(
      { error: "Revisa los campos resaltados", errors: v.errors as Record<string, string> },
      { status: 400 },
    );
  }

  const paymentRef = typeof body.paymentRef === "string" ? body.paymentRef : "";
  if (!PAYMENT_REF.test(paymentRef)) {
    return NextResponse.json({ error: "El pago no fue aprobado" }, { status: 402 });
  }

  const d = v.data;
  const amount = calcAmount(d.weightKg, d.service); // el precio se calcula siempre en el servidor
  const estimatedDelivery = estimateDelivery(d.service);
  const receiptNoticeAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

  try {
    const db = supabaseServer();
    const { data: shipment, error } = await db
      .from("shipments")
      .insert({
        sender_name: d.senderName, sender_doc: d.senderDoc, sender_phone: d.senderPhone,
        origin_address: d.originAddress, origin_city: d.originCity,
        recipient_name: d.recipientName, recipient_doc: d.recipientDoc, recipient_phone: d.recipientPhone,
        dest_address: d.destAddress, dest_city: d.destCity,
        weight_kg: d.weightKg, service: d.service, amount,
        payment_ref: paymentRef,
        estimated_delivery: estimatedDelivery,
        receipt_notice_at: receiptNoticeAt,
      })
      .select("id, guia")
      .single();

    if (error || !shipment) throw error ?? new Error("No se pudo crear el envío");

    const { error: evError } = await db.from("shipment_events").insert({
      shipment_id: shipment.id,
      status: "Pendiente de recolección",
      location: d.originCity,
      note: "Envío registrado",
    });
    if (evError) {
      await db.from("shipments").delete().eq("id", shipment.id);
      throw evError;
    }

    return NextResponse.json({ guia: shipment.guia as string, estimatedDelivery, amount, receiptNoticeAt });
  } catch (e) {
    const detail = describe(e);
    console.error("POST /api/shipments FALLÓ:", detail);
    // Con DEBUG_API=1 en Vercel, el error real se muestra en pantalla (quítalo después de depurar).
    return NextResponse.json(
      { error: "No pudimos registrar el envío. Intenta de nuevo.", detail: process.env.DEBUG_API === "1" ? detail : undefined },
      { status: 500 },
    );
  }
}
