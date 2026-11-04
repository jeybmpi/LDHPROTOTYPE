-- LDH Tracking · esquema para Supabase (SQL Editor → New query → Run)
create sequence if not exists guia_seq start 1;

create table if not exists public.shipments (
  id                uuid primary key default gen_random_uuid(),
  guia              text not null unique default (
                      'LG-' || to_char(now() at time zone 'America/Bogota', 'YYYY') ||
                      '-'   || lpad(nextval('guia_seq')::text, 8, '0')),
  sender_name       text not null,
  sender_doc        text not null,
  sender_phone      text not null,
  origin_address    text not null,
  origin_city       text not null,
  recipient_name    text not null,
  recipient_doc     text not null,
  recipient_phone   text not null,
  dest_address      text not null,
  dest_city         text not null,
  weight_kg         numeric(6,2) not null check (weight_kg > 0 and weight_kg <= 50),
  service           text not null check (service in ('Estándar','Express')),
  amount            integer not null check (amount > 0),
  payment_ref       text not null,
  payment_status    text not null default 'simulado',
  status            text not null default 'Pendiente de recolección'
                    check (status in ('Pendiente de recolección','En tránsito','En reparto',
                                      'Entregado','Con incidencia','Devuelto')),
  estimated_delivery date not null,
  receipt_notice_at  timestamptz not null,
  created_at         timestamptz not null default now()
);

create table if not exists public.shipment_events (
  id          uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  status      text not null,
  location    text not null,
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists shipment_events_idx on public.shipment_events (shipment_id, created_at);

-- RLS activado y SIN políticas: solo la service_role key (rutas /api) puede acceder.
alter table public.shipments       enable row level security;
alter table public.shipment_events enable row level security;

-- Datos de demostración: guía LG-2026-00000001
with s as (
  insert into public.shipments
    (guia, sender_name, sender_doc, sender_phone, origin_address, origin_city,
     recipient_name, recipient_doc, recipient_phone, dest_address, dest_city,
     weight_kg, service, amount, payment_ref, status, estimated_delivery, receipt_notice_at, created_at)
  values
    ('LG-2026-00000001','Laura Restrepo','1020304050','3001234567','Calle 10 # 20-30','Medellín',
     'Andrés Gómez','80123456','3109876543','Carrera 7 # 45-10','Bogotá',
     2.5,'Estándar',14300,'SIM-DEMO0001','En reparto','2026-09-03','2026-09-03 10:41-05','2026-09-01 10:41-05')
  on conflict (guia) do nothing
  returning id
)
insert into public.shipment_events (shipment_id, status, location, note, created_at)
select id, v.status, v.location, v.note, v.at::timestamptz
from s, (values
  ('Pendiente de recolección','Punto de atención Medellín','El paquete entró a las instalaciones','2026-09-01 10:41-05'),
  ('En tránsito','Centro de acopio Medellín','Salió a ciudad destino','2026-09-01 15:20-05'),
  ('En reparto','Bodega Bogotá','Salió a entregar','2026-09-03 12:15-05')
) as v(status, location, note, at);

select setval('guia_seq', greatest((select last_value from guia_seq), 1));
