# LDH Tracking (Next.js + TypeScript + Supabase)

Pestañas:
- **Cliente:** consulta por número de guía.
- **Remitente:** formulario de envío → pago simulado → número de guía, fecha estimada y aviso de mensaje de recibido a los 2 días.

## 1. Supabase
1. Crea un proyecto en https://supabase.com.
2. **SQL Editor → New query**: pega `supabase/schema.sql` y ejecútalo (tablas, RLS y la guía demo `LG-2026-00000001`).
3. **Project Settings → API**: copia la **Project URL** y la clave **service_role** (no la anon).

## 2. Local
```bash
npm install
cp .env.example .env.local   # pega tus valores
npm run dev                  # http://localhost:3000
```

## 3. Vercel
1. Sube la carpeta a GitHub (el `.gitignore` excluye `.env.local`).
2. Vercel → **Add New → Project** e importa el repositorio.
3. **Settings → Environment Variables**: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
4. **Despliega de nuevo** si agregaste las variables después del primer despliegue.

## Si aparece «No pudimos registrar el envío»
1. Agrega la variable `DEBUG_API` con valor `1`, vuelve a desplegar y repite el pago: el error real saldrá entre paréntesis. Quítala después.
2. O revisa Vercel → Logs → `POST /api/shipments FALLÓ`.
3. Causas típicas:
   - `Faltan SUPABASE_URL…` → variables sin cargar o sin redesplegar.
   - `row-level security` / `permission denied` → usaste la clave anon en vez de la service_role.
   - `relation "shipments" does not exist` → falta ejecutar `schema.sql`.
   - `fetch failed` / `Invalid URL` → `SUPABASE_URL` mal copiada (debe ser solo `https://xxxx.supabase.co`).

## Cómo probar
- Remitente: llena el formulario → Continuar al pago → tarjeta `4242 4242 4242 4242`, `12/29`, CVV `123`.
- Tarjeta terminada en `0002`: rechazo simulado.
- Cliente: ingresa la guía recibida o `LG-2026-00000001`.

## Importante
- La service_role key solo se usa en el servidor. Sin prefijo `NEXT_PUBLIC_`.
- RLS activado sin políticas: el navegador no lee las tablas, solo `/api`.
- La pasarela es **simulada**; no se envían ni guardan datos de tarjeta. En producción usa Wompi, PayU o Mercado Pago.
- Precio y fecha estimada se calculan en el servidor (`lib/pricing.ts`). Tarifas y plazos son de demostración.
- El «mensaje de recibido» solo guarda la fecha (`receipt_notice_at`); no envía nada.
- Falta limitar peticiones por IP antes de abrir la consulta al público.
