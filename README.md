# LDH Tracking (Next.js + TypeScript + Supabase)

Pestañas:
- **Cliente:** consulta por número de guía (igual que antes).
- **Remitente:** formulario de envío → pago simulado → número de guía, fecha estimada de entrega y aviso de mensaje de recibido a los 2 días.

## 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. Abre **SQL Editor → New query**, pega el contenido de `supabase/schema.sql` y ejecútalo.
   Crea las tablas, activa RLS y carga la guía de demo `LG-2026-00000001`.
3. En **Project Settings → API** copia la **Project URL** y la clave **service_role**.

## 2. Local
```bash
npm install
cp .env.example .env.local   # pega tus dos valores
npm run dev                  # http://localhost:3000
```

## 3. Vercel
1. Sube la carpeta a un repositorio de GitHub (el `.gitignore` ya excluye `.env.local`).
2. En Vercel: **Add New → Project** e importa el repositorio (detecta Next.js solo).
3. En **Settings → Environment Variables** agrega `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
4. Despliega.

## Cómo probar el flujo
- Remitente: llena el formulario → Continuar al pago → tarjeta `4242 4242 4242 4242`, vence `12/29`, CVV `123`.
- Tarjeta terminada en `0002`: muestra un rechazo.
- Cliente: ingresa la guía recibida, o `LG-2026-00000001`. Una guía que no existe muestra el mensaje de error.

## Importante
- La **service_role key** solo se usa en el servidor (`lib/supabaseServer.ts`). No le pongas el prefijo `NEXT_PUBLIC_`.
- Las tablas tienen RLS activado sin políticas: el navegador no puede leerlas directamente, solo las rutas `/api`.
- La pasarela es una **simulación** (`lib/gateway.ts`). Los datos de tarjeta no se envían ni se guardan. Para producción usa una pasarela real (Wompi, PayU, Mercado Pago…) con su formulario tokenizado.
- El precio y la fecha estimada se calculan en el servidor (`lib/pricing.ts`), no se confía en lo que envíe el navegador.
- El "mensaje de recibido" solo guarda la fecha (`receipt_notice_at`) y muestra el aviso. No envía nada todavía.
- La consulta pública no expone documentos ni teléfonos. Falta limitar peticiones por IP antes de abrirla al público.
- La fecha estimada usa días hábiles y no considera festivos de Colombia.

## Estructura
```
app/api/shipments/route.ts      POST: valida, crea envío y evento inicial
app/api/track/[guia]/route.ts   GET: consulta por guía
components/RemitentePanel.tsx   datos → pago → guía
components/ClientePanel.tsx     consulta
lib/                            tipos, validación, precios, pasarela simulada, Supabase
supabase/schema.sql             tablas, RLS y datos de demo
```
