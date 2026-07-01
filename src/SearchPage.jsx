import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const SOURCE_LABEL = {
  coto: "Coto",
  jumbo: "Jumbo",
  disco: "Disco",
  diaonline: "Día",
  vea: "Vea",
  carrefour: "Carrefour",
  masonline: "MasOnline",
  farmacity: "Farmacity",
  mercadolibre: "MercadoLibre",
};

const SOURCE_COLOR = {
  coto: "bg-red-50 text-red-700 border-red-200",
  jumbo: "bg-emerald-50 text-emerald-700 border-emerald-200",
  disco: "bg-blue-50 text-blue-700 border-blue-200",
  diaonline: "bg-orange-50 text-orange-700 border-orange-200",
  vea: "bg-purple-50 text-purple-700 border-purple-200",
  carrefour: "bg-sky-50 text-sky-700 border-sky-200",
  masonline: "bg-lime-50 text-lime-700 border-lime-200",
  farmacity: "bg-pink-50 text-pink-700 border-pink-200",
  mercadolibre: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

function formatARS(precio) {
  if (precio == null || precio === 0) return "—";
  return precio.toLocaleString("es-AR", { style: "currency", currency: "ARS" });
}

function SourceBadge({ source }) {
  return (
    <span className={`px-1.5 py-0.5 rounded border text-[11px] shrink-0 ${SOURCE_COLOR[source] ?? "bg-stone-50 text-stone-600 border-stone-200"}`}>
      {SOURCE_LABEL[source] ?? source}
    </span>
  );
}

// ─── Buscador ────────────────────────────────────────────────────────────────

function Buscador() {
  const [termino, setTermino] = useState("");
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const buscar = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setProductos([]); return; }
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/?q=${encodeURIComponent(q.toLowerCase())}`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setProductos(data.products ?? []);
    } catch (e) {
      setError("No se pudo conectar con la API (" + e.message + ")");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => buscar(termino), 400);
    return () => clearTimeout(id);
  }, [termino, buscar]);

  return (
    <div>
      <input
        type="text"
        value={termino}
        onChange={(e) => setTermino(e.target.value)}
        placeholder="Buscar producto (ej: leche entera, fideos...)"
        className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      />

      <div className="mt-4 space-y-2">
        {cargando && <p className="text-sm text-stone-500 text-center py-6">Buscando...</p>}
        {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

        {!cargando && termino.trim().length >= 2 && productos.length === 0 && !error && (
          <p className="text-sm text-stone-500 text-center py-6">Sin resultados para "{termino}".</p>
        )}

        {productos.map((p, i) => (
          <article key={i} className="bg-white rounded-xl border border-stone-200 p-3 flex gap-3">
            {p.image ? (
              <img src={p.image} alt="" className="w-14 h-14 rounded-lg object-cover bg-stone-100 shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-stone-100 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <a href={p.link} target="_blank" rel="noreferrer" className="text-sm font-medium truncate block hover:underline">
                {p.name}
              </a>
              <div className="mt-1.5 flex items-center gap-2">
                <SourceBadge source={p.source} />
                <span className="font-mono tabular-nums text-emerald-700 font-semibold text-sm">
                  {formatARS(p.price)}
                </span>
                {p.unitPrice > 0 && (
                  <span className="text-xs text-stone-400">{formatARS(p.unitPrice)}/{p.unit}</span>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ─── Lista de Compras ─────────────────────────────────────────────────────────

function ListaCompras() {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const buscarLista = async () => {
    const items = texto
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (items.length === 0) return;

    setCargando(true);
    setError(null);
    setResultado(null);

    try {
      const res = await fetch(`${API_BASE}/lista`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setResultado(data);
    } catch (e) {
      setError("No se pudo conectar con la API (" + e.message + ")");
    } finally {
      setCargando(false);
    }
  };

  const totalOptimo = resultado?.results.reduce((acc, r) => acc + (r.best?.price ?? 0), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div>
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder={"Pegá tu lista (un producto por línea):\nleche entera\naceite girasol\nfideos spaghetti\narroz largo fino\nyogur natural"}
          className="w-full rounded-lg border border-stone-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-mono"
        />
        <button
          onClick={buscarLista}
          disabled={cargando || !texto.trim()}
          className="mt-2 w-full bg-emerald-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-40 transition"
        >
          {cargando ? "Buscando precios..." : "Buscar mejores precios"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {resultado && (
        <div className="space-y-4">
          {/* Resumen total */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-sm font-medium text-emerald-800">Total óptimo estimado</span>
            <span className="font-mono tabular-nums text-emerald-700 font-bold text-lg">{formatARS(totalOptimo)}</span>
          </div>

          {/* Canasta óptima por super */}
          {resultado.canasta && Object.keys(resultado.canasta).length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Canasta óptima por supermercado</h3>
              <div className="space-y-2">
                {Object.entries(resultado.canasta).map(([source, items]) => (
                  <div key={source} className="bg-white rounded-xl border border-stone-200 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <SourceBadge source={source} />
                      <span className="text-xs text-stone-500">{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {items.map((item, i) => {
                        const r = resultado.results.find((r) => r.query === item);
                        return (
                          <li key={i} className="flex justify-between text-xs text-stone-700">
                            <span className="truncate">{item}</span>
                            <span className="font-mono tabular-nums text-stone-600 ml-2 shrink-0">{formatARS(r?.best?.price)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detalle por item */}
          <div>
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Detalle por producto</h3>
            <div className="space-y-2">
              {resultado.results.map((r, i) => (
                <article key={i} className="bg-white rounded-xl border border-stone-200 p-3">
                  <p className="text-xs text-stone-500 mb-1.5">buscado: <span className="font-medium text-stone-700">{r.query}</span></p>

                  {!r.best ? (
                    <p className="text-xs text-stone-400">Sin resultados</p>
                  ) : (
                    <>
                      {/* Mejor opción */}
                      <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg ring-1 ring-emerald-200 mb-2">
                        {r.best.image && (
                          <img src={r.best.image} alt="" className="w-10 h-10 rounded object-cover bg-stone-100 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <a href={r.best.link} target="_blank" rel="noreferrer" className="text-xs font-medium truncate block hover:underline">
                            {r.best.name}
                          </a>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <SourceBadge source={r.best.source} />
                            <span className="font-mono tabular-nums text-emerald-700 font-bold text-sm">{formatARS(r.best.price)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Otras opciones */}
                      {r.options?.length > 1 && (
                        <div className="space-y-1">
                          {r.options.slice(1).map((o, j) => (
                            <div key={j} className="flex items-center justify-between text-xs px-2 py-1 rounded-md">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <SourceBadge source={o.source} />
                                <span className="truncate text-stone-600">{o.name}</span>
                              </div>
                              <span className="font-mono tabular-nums text-stone-500 ml-2 shrink-0">{formatARS(o.price)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [tab, setTab] = useState("buscar");

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur border-b border-stone-200 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight mb-3">Mejor Precio</h1>
        <div className="flex gap-1">
          {[
            { id: "buscar", label: "Buscar" },
            { id: "lista", label: "Lista de compras" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm px-4 py-1.5 rounded-full border transition ${
                tab === t.id
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-600 border-stone-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 max-w-xl mx-auto">
        {tab === "buscar" ? <Buscador /> : <ListaCompras />}
      </main>
    </div>
  );
}
