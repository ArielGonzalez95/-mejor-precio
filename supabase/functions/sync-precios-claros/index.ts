// supabase/functions/sync-precios-claros/index.ts
//
// Sincroniza precios desde la API en vivo de Precios Claros (SEPA) hacia
// nuestra tabla precios_cache. Pensado para correr por cron (ver README).
//
// ⚠️ IMPORTANTE: esta es una API NO documentada oficialmente (la usa el propio
// sitio preciosclaros.gob.ar). Antes de confiar en esto en producción, abrí
// el sitio, pestaña Network, y confirmá que las rutas/parámetros de abajo
// siguen siendo así — puede cambiar sin aviso. Como alternativa 100% oficial
// existe el dataset masivo diario en datos.produccion.gob.ar (más pesado,
// pero estable), útil si este endpoint deja de funcionar.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PC_BASE = "https://d3e6htiiul5ek9.cloudfront.net/prod";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // service role: necesita poder escribir
);

// Lista curada de productos a trackear: id_producto de Precios Claros + a qué
// fila de tu tabla `productos` corresponde. Armá esta lista buscando cada
// producto una vez en preciosclaros.gob.ar y copiando el id de la respuesta
// de red (no hay buscador de texto libre documentado en esta API).
type ProductoTrackeado = { id_producto_pc: string; producto_id: number };

const PRODUCTOS_TRACKEADOS: ProductoTrackeado[] = [
  // { id_producto_pc: "7790895000123", producto_id: 1 },
];

async function getSucursales(lat: number, lng: number) {
  const url = `${PC_BASE}/sucursales?lat=${lat}&lng=${lng}&limit=3000`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`sucursales ${res.status}`);
  return res.json();
}

async function getPrecioProducto(idProducto: string, sucursales: string[]) {
  const url = `${PC_BASE}/producto?limit=30&id_producto=${idProducto}&array_sucursales=${sucursales.join(",")}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`producto ${res.status}`);
  return res.json();
}

Deno.serve(async (_req) => {
  try {
    const { data: comercios, error: errComercios } = await supabase
      .from("comercios")
      .select("id, cadena, lat, lng, id_externo");
    if (errComercios) throw errComercios;

    const centroCABA = { lat: -34.6037, lng: -58.3816 }; // ajustá a tu zona
    const sucursalesCercanas = await getSucursales(centroCABA.lat, centroCABA.lng);
    const idsSucursales: string[] = (sucursalesCercanas?.sucursales ?? [])
      .map((s: any) => s.id)
      .slice(0, 30);

    let filasEscritas = 0;

    for (const prod of PRODUCTOS_TRACKEADOS) {
      const data = await getPrecioProducto(prod.id_producto_pc, idsSucursales);
      const preciosPorSucursal = data?.productos ?? [];

      for (const p of preciosPorSucursal) {
        const comercio = comercios?.find((c) => c.id_externo === String(p.id_comercio));
        if (!comercio) continue;

        const { error: errUpsert } = await supabase.from("precios_cache").upsert(
          {
            producto_id: prod.producto_id,
            comercio_id: comercio.id,
            precio_lista: p.precio,
            precio_promo: p.precio_oferta ?? null,
            fuente: "sepa",
            actualizado_en: new Date().toISOString(),
          },
          { onConflict: "producto_id,comercio_id,fuente" }
        );
        if (!errUpsert) filasEscritas++;
      }
    }

    return new Response(
      JSON.stringify({ ok: true, filasEscritas, sucursalesConsultadas: idsSucursales.length }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
