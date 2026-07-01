import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://ratoneando-go-production-ac65.up.railway.app";

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
  coto:         "bg-red-100 text-red-800 border-red-300",
  jumbo:        "bg-emerald-100 text-emerald-800 border-emerald-300",
  disco:        "bg-blue-100 text-blue-800 border-blue-300",
  diaonline:    "bg-orange-100 text-orange-800 border-orange-300",
  vea:          "bg-purple-100 text-purple-800 border-purple-300",
  carrefour:    "bg-sky-100 text-sky-800 border-sky-300",
  masonline:    "bg-lime-100 text-lime-800 border-lime-300",
  farmacity:    "bg-pink-100 text-pink-800 border-pink-300",
  mercadolibre: "bg-yellow-100 text-yellow-800 border-yellow-300",
};

const SOURCE_BG = {
  coto:         "bg-red-50",
  jumbo:        "bg-emerald-50",
  disco:        "bg-blue-50",
  diaonline:    "bg-orange-50",
  vea:          "bg-purple-50",
  carrefour:    "bg-sky-50",
  masonline:    "bg-lime-50",
  farmacity:    "bg-pink-50",
  mercadolibre: "bg-yellow-50",
};

function formatARS(v) {
  if (!v) return "—";
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function Badge({ source }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${SOURCE_COLOR[source] ?? "bg-stone-100 text-stone-700 border-stone-300"}`}>
      {SOURCE_LABEL[source] ?? source}
    </span>
  );
}

// Agrupa productos por nombre normalizado y consolida precios por cadena
function groupProducts(items) {
  const map = new Map();
  for (const p of items) {
    const key = p.name?.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().slice(0, 45);
    if (!key) continue;
    if (!map.has(key)) {
      map.set(key, { name: p.name, image: p.image, prices: {} });
    }
    const g = map.get(key);
    // Guardar el precio más bajo por cadena
    if (!g.prices[p.source] || p.price < g.prices[p.source].price) {
      g.prices[p.source] = p;
    }
  }
  // Ordenar por precio mínimo entre todas las cadenas
  return Array.from(map.values()).sort((a, b) => {
    const minA = Math.min(...Object.values(a.prices).map(p => p.price));
    const minB = Math.min(...Object.values(b.prices).map(p => p.price));
    return minA - minB;
  });
}

// ─── Carrito ─────────────────────────────────────────────────────────────────
function useCart() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mp-cart") || "[]"); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem("mp-cart", JSON.stringify(cart)); }, [cart]);

  const add = (product) => {
    setCart(prev => {
      const exists = prev.findIndex(i => i.id === product.id && i.source === product.source);
      if (exists >= 0) return prev; // ya está
      return [...prev, product];
    });
  };

  const remove = (id, source) => setCart(prev => prev.filter(i => !(i.id === id && i.source === source)));

  const clear = () => setCart([]);

  // Canasta óptima: por cada nombre único, el más barato
  const optimal = Object.values(
    cart.reduce((acc, item) => {
      const key = item.name?.toLowerCase().trim().slice(0, 45);
      if (!acc[key] || item.price < acc[key].price) acc[key] = item;
      return acc;
    }, {})
  );

  const byStore = optimal.reduce((acc, item) => {
    (acc[item.source] = acc[item.source] || []).push(item);
    return acc;
  }, {});

  return { cart, add, remove, clear, optimal, byStore };
}

// ─── Tabla de comparación ────────────────────────────────────────────────────
function ProductRow({ group, onAdd }) {
  const prices = group.prices;
  const sources = Object.keys(prices);
  const allPrices = sources.map(s => prices[s].price);
  const minPrice = Math.min(...allPrices);
  const bestSource = sources.find(s => prices[s].price === minPrice);

  return (
    <article className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      {/* Header del producto */}
      <div className="flex gap-3 p-3 border-b border-stone-100">
        {group.image ? (
          <img src={group.image} alt="" className="w-12 h-12 rounded-lg object-cover bg-stone-100 shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-stone-100 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight line-clamp-2">{group.name}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            Mejor: <span className="text-emerald-700 font-semibold">{formatARS(minPrice)}</span>
            {" "}en <Badge source={bestSource} />
          </p>
        </div>
      </div>

      {/* Precios por supermercado */}
      <div className="divide-y divide-stone-100">
        {sources
          .sort((a, b) => prices[a].price - prices[b].price)
          .map(source => {
            const p = prices[source];
            const isBest = p.price === minPrice;
            return (
              <div
                key={source}
                className={`flex items-center justify-between px-3 py-2 ${isBest ? SOURCE_BG[source] ?? "bg-emerald-50" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge source={source} />
                  <a href={p.link} target="_blank" rel="noreferrer"
                    className="text-xs text-stone-600 truncate hover:underline max-w-[140px]">
                    {p.name}
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <span className={`font-mono tabular-nums text-sm font-semibold ${isBest ? "text-emerald-700" : "text-stone-700"}`}>
                    {formatARS(p.price)}
                  </span>
                  <button
                    onClick={() => onAdd(p)}
                    className={`text-[10px] px-2 py-0.5 rounded-full border transition ${
                      isBest
                        ? "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
                        : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    + Carrito
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </article>
  );
}

// ─── Carrito Panel ────────────────────────────────────────────────────────────
function CartPanel({ cart, byStore, optimal, onRemove, onClear }) {
  const total = optimal.reduce((s, i) => s + i.price, 0);

  if (cart.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400 text-sm">
        El carrito está vacío.<br />Agregá productos desde la búsqueda.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="flex justify-between items-center bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <div>
          <p className="text-xs text-emerald-700 font-medium">Total óptimo</p>
          <p className="text-xs text-stone-400">{cart.length} ítem{cart.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-lg font-bold text-emerald-700">{formatARS(total)}</span>
          <button onClick={onClear} className="text-xs text-red-500 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50">
            Vaciar
          </button>
        </div>
      </div>

      {/* Por supermercado */}
      {Object.entries(byStore)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([source, items]) => {
          const storeTotal = items.reduce((s, i) => s + i.price, 0);
          return (
            <div key={source} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className={`flex items-center justify-between px-3 py-2 border-b border-stone-100 ${SOURCE_BG[source] ?? ""}`}>
                <div className="flex items-center gap-2">
                  <Badge source={source} />
                  <span className="text-xs text-stone-500">{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
                </div>
                <span className="font-mono text-sm font-semibold text-stone-700">{formatARS(storeTotal)}</span>
              </div>
              <div className="divide-y divide-stone-100">
                {items.map(item => (
                  <div key={`${item.id}-${item.source}`} className="flex items-center gap-2 px-3 py-2">
                    {item.image && (
                      <img src={item.image} alt="" className="w-8 h-8 rounded object-cover bg-stone-100 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <a href={item.link} target="_blank" rel="noreferrer"
                        className="text-xs font-medium truncate block hover:underline">
                        {item.name}
                      </a>
                      <span className="font-mono text-xs text-emerald-700 font-semibold">{formatARS(item.price)}</span>
                    </div>
                    <button onClick={() => onRemove(item.id, item.source)}
                      className="text-stone-300 hover:text-red-400 text-sm shrink-0 ml-1">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {/* Todos los ítems agregados (no solo optimal) */}
      {cart.length > optimal.length && (
        <p className="text-xs text-stone-400 text-center">
          {cart.length - optimal.length} ítem{cart.length - optimal.length !== 1 ? "s" : ""} duplicado{cart.length - optimal.length !== 1 ? "s" : ""} — se muestra el más barato por producto.
        </p>
      )}
    </div>
  );
}

// ─── Buscador ────────────────────────────────────────────────────────────────
function Buscador({ onAdd, cartCount }) {
  const [termino, setTermino] = useState("");
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const buscar = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setGrupos([]); return; }
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/?q=${encodeURIComponent(q.toLowerCase())}`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setGrupos(groupProducts(data.products ?? []));
    } catch (e) {
      setError("No se pudo conectar con la API (" + e.message + ")");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const id = setTimeout(() => buscar(termino), 450);
    return () => clearTimeout(id);
  }, [termino, buscar]);

  return (
    <div>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={termino}
          onChange={e => setTermino(e.target.value)}
          placeholder="Buscar producto (ej: leche entera, fideos 500g...)"
          className="w-full rounded-lg border border-stone-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
        />
        {termino && (
          <button onClick={() => { setTermino(""); setGrupos([]); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">✕</button>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {cargando && <p className="text-sm text-stone-400 text-center py-8">Buscando en todas las cadenas...</p>}
        {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
        {!cargando && termino.trim().length >= 2 && grupos.length === 0 && !error && (
          <p className="text-sm text-stone-400 text-center py-8">Sin resultados para "{termino}".</p>
        )}
        {grupos.map((g, i) => (
          <ProductRow key={i} group={g} onAdd={onAdd} />
        ))}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("buscar");
  const { cart, add, remove, clear, optimal, byStore } = useCart();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="sticky top-0 z-10 bg-stone-50/95 backdrop-blur border-b border-stone-200 px-4 py-3">
        <h1 className="text-base font-semibold tracking-tight mb-2.5">Mejor Precio 🛒</h1>
        <div className="flex gap-1.5">
          {[
            { id: "buscar", label: "Buscar" },
            { id: "carrito", label: `Carrito${cart.length > 0 ? ` (${cart.length})` : ""}` },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-sm px-4 py-1.5 rounded-full border transition ${
                tab === t.id
                  ? "bg-stone-900 text-white border-stone-900"
                  : "bg-white text-stone-600 border-stone-300 hover:bg-stone-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 max-w-xl mx-auto">
        {tab === "buscar"
          ? <Buscador onAdd={add} cartCount={cart.length} />
          : <CartPanel cart={cart} byStore={byStore} optimal={optimal} onRemove={remove} onClear={clear} />
        }
      </main>
    </div>
  );
}
