import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import type { ApiError, ShipmentStatus, TrackResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const GUIA = /^LG-\d{4}-\d{8}$/;

interface Row {
  guia: string;
  status: ShipmentStatus;
  estimated_delivery: string;
  dest_city: string;
  shipment_events: { status: string; location: string; note: string | null; created_at: string }[];
}

/** Consulta pública por guía. Solo devuelve datos de seguimiento, nunca documentos ni teléfonos. */
export async function GET(
  _req: Request,
  { params }: { params: { guia: string } },
): Promise<NextResponse<TrackResult | ApiError>> {
  const guia = decodeURIComponent(params.guia).trim().toUpperCase();

  // BR-06: si la guía no existe o es inválida, se informa de inmediato
  if (!GUIA.test(guia)) {
    return NextResponse.json(
      { error: "Número de guía inexistente. Revisa que esté completo e intenta con otro." },
      { status: 404 },
    );
  }

  try {
    const { data, error } = await supabaseServer()
      .from("shipments")
      .select("guia, status, estimated_delivery, dest_city, shipment_events(status, location, note, created_at)")
      .eq("guia", guia)
      .order("created_at", { referencedTable: "shipment_events", ascending: true })
      .maybeSingle<Row>();

    if (error) throw error;
    if (!data) {
      return NextResponse.json(
        { error: "Número de guía inexistente. Revisa que esté completo e intenta con otro." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      guia: data.guia,
      status: data.status,
      estimatedDelivery: data.estimated_delivery,
      destCity: data.dest_city,
      events: data.shipment_events.map((e) => ({
        status: e.status, location: e.location, note: e.note, at: e.created_at,
      })),
    });
  } catch (e) {
    console.error("GET /api/track", e);
    return NextResponse.json({ error: "No pudimos consultar el envío. Intenta de nuevo." }, { status: 500 });
  }
}
