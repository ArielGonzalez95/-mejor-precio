# Mejor Precio — comparador de supermercados (AR)

Stack: React + Supabase (Postgres + Edge Functions). Combina una base propia
sincronizada (Precios Claros / SEPA) con búsqueda en vivo contra las tiendas
que corren sobre VTEX (Jumbo, Disco, Vea).

## Setup rápido

### 1. Supabase

1. Creá un proyecto en supabase.com.
2. Pegá y corré `schema.sql` en el SQL Editor.
3. Instalá la CLI: `npm install -g supabase`
4. Login y link: `supabase login` / `supabase link --project-ref TU_REF`
5. Deploy de las funciones:
   ```
   supabase functions deploy sync-precios-claros
   supabase functions deploy live-vtex
   ```

### 2. Frontend

```bash
npm install
cp .env.example .env
# Editá .env con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev
```

### 3. Cron de sincronización

En el SQL Editor, con `pg_cron` habilitado (Database → Extensions):

```sql
select cron.schedule(
  'sync-precios-claros-cada-6h',
  '0 */6 * * *',
  $$
  select net.http_post(
    url := 'https://TU_REF.supabase.co/functions/v1/sync-precios-claros',
    headers := '{"Authorization": "Bearer TU_SERVICE_ROLE_KEY"}'::jsonb
  );
  $$
);
```

### 4. Completar `PRODUCTOS_TRACKEADOS`

Editá `supabase/functions/sync-precios-claros/index.ts` y cargá los productos
que querés trackear. Para cada uno: buscalo en preciosclaros.gob.ar, mirá
el Network tab y copiá el `id_producto` de la respuesta.

## Notas

- **Coto** no está en VTEX. Sus precios solo aparecen vía Precios Claros.
- **Dia**: verificar si corre VTEX antes de habilitarlo en `live-vtex`.
- Ambas APIs (Precios Claros y VTEX) son no oficiales para este uso — pueden
  cambiar sin aviso. Por eso el diseño prioriza la base cacheada propia.
