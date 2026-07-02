import { useState, useEffect, useCallback, useRef } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "https://ratoneando-go-production-ac65.up.railway.app";

const SOURCE_LABEL = {
  coto: "Coto", jumbo: "Jumbo", disco: "Disco", diaonline: "Día",
  vea: "Vea", carrefour: "Carrefour", masonline: "MasOnline",
  farmacity: "Farmacity", mercadolibre: "MercadoLibre",
};
const SOURCE_COLOR = {
  coto:         "bg-red-100 text-red-800 border-red-300",
  jumbo:        "bg-emerald-100 text-emerald-800 border-emerald-300",
  disco:        "bg-blue-100 text-blue-800 border-blue-300",
  diaonline:    "bg-orange-100 text-orange-800 border-orange-300",
  vea:          "bg-violet-100 text-violet-800 border-violet-300",
  carrefour:    "bg-sky-100 text-sky-800 border-sky-300",
  masonline:    "bg-lime-100 text-lime-800 border-lime-300",
  farmacity:    "bg-pink-100 text-pink-800 border-pink-300",
  mercadolibre: "bg-yellow-100 text-yellow-800 border-yellow-300",
};
const SOURCE_ROW_BG = {
  coto: "bg-red-50/60", jumbo: "bg-emerald-50/60", disco: "bg-blue-50/60",
  diaonline: "bg-orange-50/60", vea: "bg-violet-50/60", carrefour: "bg-sky-50/60",
  masonline: "bg-lime-50/60", farmacity: "bg-pink-50/60", mercadolibre: "bg-yellow-50/60",
};

function formatARS(v) {
  if (!v) return "—";
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function Badge({ source }) {
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border shrink-0 ${SOURCE_COLOR[source] ?? "bg-stone-100 text-stone-600 border-stone-300"}`}>
      {SOURCE_LABEL[source] ?? source}
    </span>
  );
}

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
    </svg>
  );
}

// ─── Agrupador ────────────────────────────────────────────────────────────────
function groupProducts(items) {
  const map = new Map();
  for (const p of items) {
    const key = p.name?.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim().slice(0, 45);
    if (!key) continue;
    if (!map.has(key)) map.set(key, { name: p.name, image: p.image, prices: {} });
    const g = map.get(key);
    if (!g.prices[p.source] || p.price < g.prices[p.source].price) g.prices[p.source] = p;
  }
  return Array.from(map.values()).sort((a, b) => {
    const minA = Math.min(...Object.values(a.prices).map(p => p.price));
    const minB = Math.min(...Object.values(b.prices).map(p => p.price));
    return minA - minB;
  });
}

// ─── Carrito ──────────────────────────────────────────────────────────────────
function useCart() {
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("mp-cart") || "[]"); } catch { return []; }
  });
  useEffect(() => { localStorage.setItem("mp-cart", JSON.stringify(cart)); }, [cart]);

  const add = (product) => setCart(prev => {
    const exists = prev.findIndex(i => i.id === product.id && i.source === product.source);
    return exists >= 0 ? prev : [...prev, product];
  });
  const remove = (id, source) => setCart(prev => prev.filter(i => !(i.id === id && i.source === source)));
  const clear = () => setCart([]);

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

// ─── ProductRow ───────────────────────────────────────────────────────────────
function ProductRow({ group, onAdd }) {
  const prices = group.prices;
  const sources = Object.keys(prices).sort((a, b) => prices[a].price - prices[b].price);
  const minPrice = prices[sources[0]]?.price;

  return (
    <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex gap-3 p-3 bg-slate-50 border-b border-slate-100">
        {group.image
          ? <img src={group.image} alt="" className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0" />
          : <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0 flex items-center justify-center text-slate-300 text-xl">🛍</div>
        }
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-snug line-clamp-2 text-slate-800">{group.name}</p>
          <p className="text-xs text-slate-400 mt-1">
            Mejor precio: <span className="text-emerald-600 font-bold">{formatARS(minPrice)}</span>
          </p>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {sources.map((source, idx) => {
          const p = prices[source];
          const isBest = idx === 0;
          return (
            <div key={source} className={`flex items-center gap-2 px-3 py-2.5 ${isBest ? SOURCE_ROW_BG[source] ?? "bg-emerald-50/60" : ""}`}>
              <Badge source={source} />
              <a href={p.link} target="_blank" rel="noreferrer"
                className="text-xs text-slate-500 truncate flex-1 hover:text-slate-800 hover:underline min-w-0">
                {p.name}
              </a>
              <span className={`font-mono tabular-nums text-sm font-bold shrink-0 ${isBest ? "text-emerald-600" : "text-slate-700"}`}>
                {formatARS(p.price)}
              </span>
              <button
                onClick={() => onAdd(p)}
                className={`text-[10px] px-2 py-1 rounded-lg font-semibold border transition shrink-0 ${
                  isBest
                    ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600"
                    : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                }`}
              >
                + Carrito
              </button>
            </div>
          );
        })}
      </div>
    </article>
  );
}

// ─── Lista del super ──────────────────────────────────────────────────────────
function ListaSuper({ onAdd }) {
  const [texto, setTexto] = useState("");
  const [resultados, setResultados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);

  const buscarLista = async () => {
    const items = texto.split("\n").map(l => l.trim()).filter(l => l.length >= 2);
    if (items.length === 0) return;
    setCargando(true);
    setError(null);
    setResultados([]);
    try {
      const res = await fetch(`${API_BASE}/lista`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setResultados(data.results ?? []);
    } catch (e) {
      setError("No se pudo conectar con la API (" + e.message + ")");
    } finally {
      setCargando(false);
    }
  };

  const agregarMejor = (best) => { if (best) onAdd(best); };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3">
        <label className="block text-sm font-semibold text-slate-700">
          Pegá tu lista de compras
          <span className="text-slate-400 font-normal ml-1">(un producto por línea)</span>
        </label>
        <textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={"leche entera\nfideos 500g\naceite girasol\nqueso cremoso"}
          rows={6}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
        />
        <button
          onClick={buscarLista}
          disabled={cargando || texto.trim().length < 2}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white font-semibold text-sm py-2.5 rounded-xl transition"
        >
          {cargando ? "Buscando..." : <>
            <IconSearch />
            Buscar mejores precios
          </>}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 text-center">{error}</p>}

      {resultados.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{resultados.length} productos encontrados</p>
            <button
              onClick={() => resultados.forEach(r => r.best && onAdd(r.best))}
              className="text-xs px-3 py-1.5 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition"
            >
              Agregar todos al carrito
            </button>
          </div>

          {resultados.map((r, i) => {
            const options = (r.options ?? []).sort((a, b) => a.price - b.price);
            const best = r.best ?? options[0];
            return (
              <article key={i} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">"{r.query}"</p>
                  <button
                    onClick={() => agregarMejor(best)}
                    className="text-[10px] px-2.5 py-1 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition"
                  >
                    + Mejor al carrito
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {options.slice(0, 5).map((p, j) => {
                    const isBest = j === 0;
                    return (
                      <div key={j} className={`flex items-center gap-2 px-3 py-2.5 ${isBest ? SOURCE_ROW_BG[p.source] ?? "bg-emerald-50/60" : ""}`}>
                        {p.image && <img src={p.image} alt="" className="w-8 h-8 rounded-lg object-cover bg-slate-100 shrink-0" />}
                        <Badge source={p.source} />
                        <a href={p.link} target="_blank" rel="noreferrer"
                          className="text-xs text-slate-500 truncate flex-1 hover:underline">
                          {p.name}
                        </a>
                        <span className={`font-mono tabular-nums text-sm font-bold shrink-0 ${isBest ? "text-emerald-600" : "text-slate-600"}`}>
                          {formatARS(p.price)}
                        </span>
                        <button onClick={() => onAdd(p)}
                          className="text-[10px] px-2 py-1 rounded-lg border bg-white text-slate-500 border-slate-200 hover:bg-slate-50 font-semibold transition shrink-0">
                          +
                        </button>
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Buscador ─────────────────────────────────────────────────────────────────
function Buscador({ onAdd }) {
  const [termino, setTermino] = useState("");
  const [query, setQuery] = useState("");
  const [grupos, setGrupos] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  const buscar = useCallback(async (q) => {
    if (!q || q.trim().length < 2) { setGrupos([]); return; }
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/?q=${encodeURIComponent(q.trim().toLowerCase())}`);
      if (!res.ok) throw new Error(res.status);
      const data = await res.json();
      setGrupos(groupProducts(data.products ?? []));
    } catch (e) {
      setError("No se pudo conectar con la API (" + e.message + ")");
    } finally {
      setCargando(false);
    }
  }, []);

  // debounce automático
  useEffect(() => {
    const id = setTimeout(() => buscar(termino), 450);
    return () => clearTimeout(id);
  }, [termino, buscar]);

  const handleSubmit = (e) => {
    e.preventDefault();
    buscar(termino);
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={termino}
            onChange={e => setTermino(e.target.value)}
            placeholder="Buscar producto (ej: leche entera, fideos...)"
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 shadow-sm pr-9"
          />
          {termino && (
            <button type="button"
              onClick={() => { setTermino(""); setGrupos([]); inputRef.current?.focus(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 text-sm">
              ✕
            </button>
          )}
        </div>
        <button type="submit"
          className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl shadow-sm transition">
          <IconSearch />
          <span className="hidden sm:inline">Buscar</span>
        </button>
      </form>

      {cargando && <p className="text-sm text-slate-400 text-center py-10">Buscando en todas las cadenas...</p>}
      {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}
      {!cargando && termino.trim().length >= 2 && grupos.length === 0 && !error && (
        <p className="text-sm text-slate-400 text-center py-10">Sin resultados para "{termino}".</p>
      )}
      {!cargando && termino.trim().length < 2 && grupos.length === 0 && (
        <div className="text-center py-12 text-slate-300 select-none">
          <div className="text-5xl mb-3">🔍</div>
          <p className="text-sm">Escribí un producto para comparar precios<br />en todas las cadenas</p>
        </div>
      )}

      <div className="space-y-3">
        {grupos.map((g, i) => <ProductRow key={i} group={g} onAdd={onAdd} />)}
      </div>
    </div>
  );
}

// ─── Carrito Panel ────────────────────────────────────────────────────────────
function CartPanel({ cart, byStore, optimal, onRemove, onClear }) {
  const total = optimal.reduce((s, i) => s + i.price, 0);

  if (cart.length === 0) {
    return (
      <div className="text-center py-16 text-slate-300 select-none">
        <div className="text-5xl mb-3">🛒</div>
        <p className="text-sm">El carrito está vacío.<br />Agregá productos desde Buscar o Lista.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
        <div>
          <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Total óptimo</p>
          <p className="text-xs text-slate-400 mt-0.5">{optimal.length} producto{optimal.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xl font-extrabold text-emerald-600">{formatARS(total)}</span>
          <button onClick={onClear} className="text-xs text-red-400 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 font-medium transition">
            Vaciar
          </button>
        </div>
      </div>

      {Object.entries(byStore)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([source, items]) => {
          const storeTotal = items.reduce((s, i) => s + i.price, 0);
          return (
            <div key={source} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className={`flex items-center justify-between px-3 py-2.5 border-b border-slate-100 ${SOURCE_ROW_BG[source] ?? "bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <Badge source={source} />
                  <span className="text-xs text-slate-500">{items.length} ítem{items.length !== 1 ? "s" : ""}</span>
                </div>
                <span className="font-mono text-sm font-bold text-slate-700">{formatARS(storeTotal)}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {items.map(item => (
                  <div key={`${item.id}-${item.source}`} className="flex items-center gap-2.5 px-3 py-2.5">
                    {item.image
                      ? <img src={item.image} alt="" className="w-9 h-9 rounded-lg object-cover bg-slate-100 shrink-0" />
                      : <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <a href={item.link} target="_blank" rel="noreferrer"
                        className="text-xs font-semibold text-slate-700 truncate block hover:underline">
                        {item.name}
                      </a>
                      <span className="font-mono text-xs text-emerald-600 font-bold">{formatARS(item.price)}</span>
                    </div>
                    <button onClick={() => onRemove(item.id, item.source)}
                      className="text-slate-300 hover:text-red-400 transition text-base shrink-0">
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {cart.length > optimal.length && (
        <p className="text-xs text-slate-400 text-center">
          Se muestra el más barato por cada producto duplicado.
        </p>
      )}
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "buscar", label: "Buscar" },
  { id: "lista", label: "Lista" },
  { id: "carrito", label: "Carrito" },
];

export default function App() {
  const [tab, setTab] = useState("buscar");
  const { cart, add, remove, clear, optimal, byStore } = useCart();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-800">Mejor Precio</h1>
              <p className="text-[10px] text-slate-400 font-medium">Comparador de supermercados AR</p>
            </div>
            {cart.length > 0 && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {cart.length}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {TABS.map(t => {
              const label = t.id === "carrito" && cart.length > 0
                ? `Carrito (${cart.length})`
                : t.label;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 text-xs py-2 rounded-lg font-semibold transition ${
                    tab === t.id
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-4 pb-8">
        {tab === "buscar" && <Buscador onAdd={add} />}
        {tab === "lista" && <ListaSuper onAdd={add} />}
        {tab === "carrito" && <CartPanel cart={cart} byStore={byStore} optimal={optimal} onRemove={remove} onClear={clear} />}
      </main>
    </div>
  );
}
