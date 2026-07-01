// supabase/functions/live-vtex/index.ts
//
// Búsqueda en vivo por texto libre contra las tiendas que corren sobre VTEX
// (Jumbo, Disco, Vea / Masonline). Es un endpoint público de VTEX que
// cualquier tienda expone para su propio buscador — no es un contrato
// oficial para terceros, así que: cacheá resultados, no le pegues fuerte
// (agregá delay/backoff si escalás esto), y verificá con devtools si algún
// dominio cambia de plataforma.
//
// Coto y (a confirmar) Dia no corren VTEX, por eso no están acá — esos
// productos salen de precios_cache (sync-precios-claros).

type TiendaVTEX = { cadena: string; dominio: string };

const TIENDAS: TiendaVTEX[] = [
  { cadena: "jumbo", dominio: "www.jumbo.com.ar" },
  { cadena: "disco", dominio: "www.disco.com.ar" },
  { cadena: "vea", dominio: "www.vea.com.ar" },
  // { cadena: "dia", dominio: "diaonline.supermercadosdia.com.ar" }, // verificar antes de habilitar
];

async function buscarEnTienda(tienda: TiendaVTEX, termino: string) {
  const url = `https://${tienda.dominio}/api/catalog_system/pub/products/search/${encodeURIComponent(
    termino
  )}?_from=0&_to=9`;

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const items = await res.json();

    return (items ?? []).map((item: any) => {
      const seller = item.items?.[0]?.sellers?.[0];
      const oferta = seller?.commertOffer;
      return {
        cadena: tienda.cadena,
        nombre: item.productName,
        marca: item.brand,
        imagen_url: item.items?.[0]?.images?.[0]?.imageUrl ?? null,
        precio_lista: oferta?.ListPrice ?? null,
        precio_promo:
          oferta?.Price && oferta?.Price !== oferta?.ListPrice ? oferta.Price : null,
        disponible: (oferta?.AvailableQuantity ?? 0) > 0,
        fuente: "vtex_live",
      };
    });
  } catch {
    return []; // si una tienda falla, seguimos con las demás
  }
}

Deno.serve(async (req) => {
  const { termino } = await req.json().catch(() => ({ termino: "" }));

  if (!termino || termino.trim().length < 2) {
    return new Response(JSON.stringify({ ok: false, error: "termino muy corto" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const resultadosPorTienda = await Promise.all(
    TIENDAS.map((t) => buscarEnTienda(t, termino))
  );

  const resultados = resultadosPorTienda.flat();

  return new Response(JSON.stringify({ ok: true, resultados }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
});
