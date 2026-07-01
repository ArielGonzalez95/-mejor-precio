-- ============================================================
-- Esquema para comparador de precios de supermercados (AR)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- Catálogo propio: unifica el mismo producto entre distintas cadenas
create table if not exists productos (
  id            bigint generated always as identity primary key,
  ean           text unique,
  nombre        text not null,
  marca         text,
  categoria     text,               -- ej: "Almacén", "Lácteos", "Limpieza"
  imagen_url    text,
  creado_en     timestamptz not null default now()
);

-- Búsqueda de texto en español (para el buscador)
create index if not exists idx_productos_busqueda
  on productos using gin (to_tsvector('spanish', nombre || ' ' || coalesce(marca, '')));

create index if not exists idx_productos_categoria on productos (categoria);

-- Comercios / sucursales que seguimos
create table if not exists comercios (
  id                bigint generated always as identity primary key,
  cadena            text not null check (cadena in ('coto','jumbo','disco','dia','vea')),
  nombre_sucursal   text,
  id_externo        text,      -- id de sucursal en Precios Claros (para la sync)
  dominio_vtex      text,      -- ej: 'www.jumbo.com.ar' (null si no aplica, ej Coto)
  provincia         text,
  localidad         text,
  lat               numeric,
  lng               numeric
);

-- Precios cacheados: nuestra "base propia" sincronizada + snapshots de VTEX en vivo
create table if not exists precios_cache (
  id              bigint generated always as identity primary key,
  producto_id     bigint not null references productos(id) on delete cascade,
  comercio_id     bigint not null references comercios(id) on delete cascade,
  precio_lista    numeric not null,
  precio_promo    numeric,
  fuente          text not null default 'sepa' check (fuente in ('sepa','vtex_live')),
  actualizado_en  timestamptz not null default now(),
  unique (producto_id, comercio_id, fuente)
);

create index if not exists idx_precios_producto on precios_cache (producto_id);
create index if not exists idx_precios_actualizado on precios_cache (actualizado_en);

-- Vista: mejor precio vigente por producto, entre todas las cadenas y fuentes
create or replace view mejor_precio as
select distinct on (p.producto_id)
  p.producto_id,
  pr.nombre,
  pr.marca,
  pr.categoria,
  pr.imagen_url,
  c.cadena,
  c.nombre_sucursal,
  coalesce(p.precio_promo, p.precio_lista) as precio_final,
  p.fuente,
  p.actualizado_en
from precios_cache p
join productos pr on pr.id = p.producto_id
join comercios  c on c.id = p.comercio_id
order by p.producto_id, coalesce(p.precio_promo, p.precio_lista) asc, p.actualizado_en desc;

-- RLS: lectura pública (es un comparador de precios, no hay datos sensibles)
alter table productos enable row level security;
alter table comercios enable row level security;
alter table precios_cache enable row level security;

create policy "lectura publica productos" on productos for select using (true);
create policy "lectura publica comercios" on comercios for select using (true);
create policy "lectura publica precios" on precios_cache for select using (true);

-- Las escrituras solo las hace la service_role key desde las Edge Functions,
-- así que no hace falta política de insert/update para el cliente anónimo.

-- Semilla mínima de comercios de ejemplo (ajustá a tu zona real)
insert into comercios (cadena, nombre_sucursal, dominio_vtex, provincia, localidad) values
  ('jumbo', 'Jumbo Sucursal Testigo', 'www.jumbo.com.ar', 'CABA', 'CABA'),
  ('disco', 'Disco Sucursal Testigo', 'www.disco.com.ar', 'CABA', 'CABA'),
  ('vea',   'Vea Sucursal Testigo',   'www.vea.com.ar',   'CABA', 'CABA'),
  ('dia',   'Dia Sucursal Testigo',   null,               'CABA', 'CABA'),
  ('coto',  'Coto Sucursal Testigo',  null,               'CABA', 'CABA')
on conflict do nothing;
