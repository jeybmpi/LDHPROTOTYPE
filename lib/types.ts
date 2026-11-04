export type Service = "Estándar" | "Express";

export type ShipmentStatus =
  | "Pendiente de recolección"
  | "En tránsito"
  | "En reparto"
  | "Entregado"
  | "Con incidencia"
  | "Devuelto";

export interface ShipmentInput {
  senderName: string;
  senderDoc: string;
  senderPhone: string;
  originAddress: string;
  originCity: string;
  recipientName: string;
  recipientDoc: string;
  recipientPhone: string;
  destAddress: string;
  destCity: string;
  weightKg: number;
  service: Service;
}

export interface TrackEvent {
  status: string;
  location: string;
  note: string | null;
  at: string; // ISO
}

export interface TrackResult {
  guia: string;
  status: ShipmentStatus;
  estimatedDelivery: string; // YYYY-MM-DD
  destCity: string;
  events: TrackEvent[];
}

export interface CreateResult {
  guia: string;
  estimatedDelivery: string; // YYYY-MM-DD
  amount: number;
  receiptNoticeAt: string; // ISO
}

export interface ApiError {
  error: string;
  errors?: Record<string, string>;
}
