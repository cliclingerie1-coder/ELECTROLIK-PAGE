import React, { useState, useEffect, useMemo } from "react";
import { ShoppingCart, X, Plus, Minus, Check, Phone, MapPin, User, Zap, Truck, ShieldCheck, ChevronRight } from "lucide-react";

// ---- Connexion Supabase (lecture publique du catalogue + création de commandes) ----
const SUPABASE_URL = "https://pycghxwqkdpgjkbjmesb.supabase.co";
const SUPABASE_KEY = "sb_publishable_kJzdc12bH0H3MmCn2H0guw_pPO_1Wgp";

async function fetchProducts() {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/public_products?select=*&in_stock=eq.true&order=name.asc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Erreur chargement produits", e);
    return [];
  }
}

async function submitOrder(order) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/online_orders`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(order),
  });
  return res.ok;
}

// ---- Design tokens ----
const C = {
  bg: "#0A0A0E",
  card: "#14151B",
  cardHover: "#181923",
  ink: "#F4F5F7",
  inkSoft: "#8A8D98",
  border: "#24252E",
  violet: "#7C5CFF",
  magenta: "#FF3D81",
  gold: "#F2B705",
};
const display = { fontFamily: "'Chakra Petch', sans-serif" };
const mono = { fontFamily: "'JetBrains Mono', monospace" };
const fmt = (n) => Number(n || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const CATEGORIES = ["Tout", "Gaming", "Téléphone", "PC"];

function matchCategory(productCategory, filter) {
  if (filter === "Tout") return true;
  return (productCategory || "").toLowerCase().includes(filter.toLowerCase());
}

// ---- Carte produit avec effet de balayage au survol (signature) ----
function ProductCard({ p, onAdd }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-lg overflow-hidden group"
      style={{ background: C.card, border: `1px solid ${hover ? C.violet : C.border}`, transition: "border-color .25s ease" }}
    >
      {hover && (
        <div
          className="absolute inset-x-0 h-24 pointer-events-none"
          style={{
            background: `linear-gradient(180deg, transparent, ${C.violet}22, transparent)`,
            animation: "scanline 1.1s linear infinite",
          }}
        />
      )}
      <div className="aspect-square flex items-center justify-center" style={{ background: "#1B1C24" }}>
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <Zap size={36} color={C.border} />
        )}
      </div>
      <div className="p-4">
        {p.category && (
          <div style={{ ...mono, fontSize: 10, color: C.violet }} className="uppercase tracking-widest mb-1">{p.category}</div>
        )}
        <div style={{ color: C.ink }} className="text-sm mb-3 leading-snug">{p.name}</div>
        <div className="flex items-center justify-between">
          <span style={{ ...display, color: C.ink }} className="text-lg">{fmt(p.price)} <span className="text-xs" style={{ color: C.inkSoft }}>DHS</span></span>
          <button
            onClick={() => onAdd(p)}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ background: C.violet, color: "#fff" }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Panier (tiroir latéral) ----
function CartDrawer({ cart, onClose, onChangeQty, onRemove, onCheckout }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div className="w-full max-w-md h-full flex flex-col" style={{ background: C.bg, borderLeft: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: C.border }}>
          <div style={{ ...display, color: C.ink }} className="text-lg">Ton panier</div>
          <button onClick={onClose}><X size={20} color={C.inkSoft} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <p className="text-sm" style={{ color: C.inkSoft }}>Ton panier est vide pour l'instant.</p>
          ) : (
            cart.map((i) => (
              <div key={i.id} className="flex gap-3">
                <div className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center" style={{ background: "#1B1C24" }}>
                  {i.image_url ? <img src={i.image_url} alt="" className="w-full h-full object-cover rounded-md" /> : <Zap size={18} color={C.border} />}
                </div>
                <div className="flex-1">
                  <div style={{ color: C.ink }} className="text-sm mb-1">{i.name}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onChangeQty(i.id, -1)} className="w-6 h-6 rounded border flex items-center justify-center" style={{ borderColor: C.border }}><Minus size={10} color={C.inkSoft} /></button>
                    <span style={{ ...mono, color: C.ink }} className="text-sm">{i.qty}</span>
                    <button onClick={() => onChangeQty(i.id, 1)} className="w-6 h-6 rounded border flex items-center justify-center" style={{ borderColor: C.border }}><Plus size={10} color={C.inkSoft} /></button>
                    <span style={{ ...mono, color: C.inkSoft }} className="text-xs ml-auto">{fmt(i.price * i.qty)} DHS</span>
                  </div>
                </div>
                <button onClick={() => onRemove(i.id)}><X size={14} color={C.inkSoft} /></button>
              </div>
            ))
          )}
        </div>
        {cart.length > 0 && (
          <div className="p-5 border-t" style={{ borderColor: C.border }}>
            <div className="flex justify-between mb-4">
              <span style={{ color: C.inkSoft }}>Total</span>
              <span style={{ ...display, color: C.ink }} className="text-xl">{fmt(total)} DHS</span>
            </div>
            <button onClick={onCheckout} className="w-full py-3 rounded-md text-sm font-semibold" style={{ background: C.magenta, color: "#fff" }}>
              Passer la commande
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Formulaire de commande (paiement à la livraison) ----
function CheckoutModal({ cart, onClose, onConfirmed }) {
  const [form, setForm] = useState({ name: "", phone: "", address: "", city: "" });
  const [submitting, setSubmitting] = useState(false);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const submit = async () => {
    if (!form.name || !form.phone || !form.address || !form.city) return;
    setSubmitting(true);
    const ok = await submitOrder({
      client_name: form.name,
      client_phone: form.phone,
      client_address: form.address,
      client_city: form.city,
      items: cart.map((i) => ({ product_id: i.id, name: i.name, qty: i.qty, price: i.price })),
      total,
      status: "nouvelle",
    });
    setSubmitting(false);
    if (ok) onConfirmed();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-lg p-6" style={{ background: C.card, border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...display, color: C.ink }} className="text-xl mb-1">Finaliser la commande</div>
        <div className="flex items-center gap-2 mb-5 text-xs" style={{ color: C.inkSoft }}>
          <Truck size={13} /> Paiement à la livraison — aucune carte requise
        </div>
        <div className="space-y-3 mb-5">
          <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <User size={14} color={C.inkSoft} />
            <input placeholder="Nom complet" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full bg-transparent outline-none text-sm" style={{ color: C.ink }} />
          </div>
          <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <Phone size={14} color={C.inkSoft} />
            <input placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-transparent outline-none text-sm" style={{ color: C.ink }} />
          </div>
          <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <MapPin size={14} color={C.inkSoft} />
            <input placeholder="Adresse complète" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="w-full bg-transparent outline-none text-sm" style={{ color: C.ink }} />
          </div>
          <div className="flex items-center gap-2 rounded-md px-3 py-2" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
            <MapPin size={14} color={C.inkSoft} />
            <input placeholder="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full bg-transparent outline-none text-sm" style={{ color: C.ink }} />
          </div>
        </div>
        <div className="flex justify-between mb-5 text-sm">
          <span style={{ color: C.inkSoft }}>Total à payer à la livraison</span>
          <span style={{ ...mono, color: C.ink }}>{fmt(total)} DHS</span>
        </div>
        <button
          onClick={submit}
          disabled={submitting || !form.name || !form.phone || !form.address || !form.city}
          className="w-full py-3 rounded-md text-sm font-semibold disabled:opacity-40"
          style={{ background: C.violet, color: "#fff" }}
        >
          {submitting ? "Envoi en cours…" : "Confirmer la commande"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("Tout");
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ek-boutique-cart") || "[]"); } catch (e) { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    fetchProducts().then((p) => { setProducts(p); setLoading(false); });
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ek-boutique-cart", JSON.stringify(cart)); } catch (e) {}
  }, [cart]);

  const addToCart = (p) => {
    setCart((c) => {
      const existing = c.find((i) => i.id === p.id);
      if (existing) return c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id: p.id, name: p.name, price: p.price, image_url: p.image_url, qty: 1 }];
    });
    setCartOpen(true);
  };
  const changeQty = (id, delta) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = useMemo(() => products.filter((p) => matchCategory(p.category, category)), [products, category]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur" style={{ background: "rgba(10,10,14,0.85)", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <img src="/logo.png" alt="Electrolik" style={{ width: 130, height: "auto" }} />
          <button onClick={() => setCartOpen(true)} className="relative p-2">
            <ShoppingCart size={22} color={C.ink} />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: C.magenta, color: "#fff", ...mono }}
              >
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden px-5 py-20 md:py-28 text-center"
        style={{ background: `radial-gradient(circle at 50% 0%, ${C.violet}22, transparent 60%)` }}
      >
        <div style={{ ...mono, fontSize: 11, color: C.violet }} className="uppercase tracking-[0.3em] mb-4">Be Sm@rt</div>
        <h1 style={{ ...display, color: C.ink }} className="text-4xl md:text-6xl leading-tight mb-4">
          ÉQUIPE-TOI<br />
          <span style={{ color: C.magenta }}>COMME UN PRO.</span>
        </h1>
        <p className="max-w-md mx-auto text-sm md:text-base mb-8" style={{ color: C.inkSoft }}>
          Accessoires gaming, téléphone & PC — livrés partout au Maroc, paiement à la réception.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs" style={{ color: C.inkSoft }}>
          <span className="flex items-center gap-1.5"><Truck size={14} color={C.gold} /> Livraison rapide</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} color={C.gold} /> Paiement à la livraison</span>
        </div>
      </section>

      {/* Filtres catégories */}
      <div className="max-w-6xl mx-auto px-5 mb-8 flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="px-4 py-2 rounded-full text-sm"
            style={{
              background: category === c ? C.violet : "transparent",
              color: category === c ? "#fff" : C.inkSoft,
              border: `1px solid ${category === c ? C.violet : C.border}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Grille produits */}
      <main className="max-w-6xl mx-auto px-5 pb-24">
        {loading ? (
          <p className="text-center text-sm py-16" style={{ color: C.inkSoft }}>Chargement du catalogue…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm py-16" style={{ color: C.inkSoft }}>Aucun produit disponible dans cette catégorie pour l'instant.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => <ProductCard key={p.id} p={p} onAdd={addToCart} />)}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs" style={{ color: C.inkSoft, borderTop: `1px solid ${C.border}` }}>
        © {new Date().getFullYear()} Electrolik — Be Sm@rt
      </footer>

      {cartOpen && (
        <CartDrawer
          cart={cart}
          onClose={() => setCartOpen(false)}
          onChangeQty={changeQty}
          onRemove={removeFromCart}
          onCheckout={() => { setCartOpen(false); setCheckoutOpen(true); }}
        />
      )}
      {checkoutOpen && (
        <CheckoutModal
          cart={cart}
          onClose={() => setCheckoutOpen(false)}
          onConfirmed={() => { setCheckoutOpen(false); setCart([]); setConfirmed(true); }}
        />
      )}
      {confirmed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={() => setConfirmed(false)}>
          <div className="w-full max-w-sm rounded-lg p-8 text-center" style={{ background: C.card, border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.violet + "22" }}>
              <Check size={26} color={C.violet} />
            </div>
            <div style={{ ...display, color: C.ink }} className="text-xl mb-2">Commande reçue !</div>
            <p className="text-sm mb-6" style={{ color: C.inkSoft }}>
              On te contacte très vite pour confirmer la livraison. Paiement à la réception.
            </p>
            <button onClick={() => setConfirmed(false)} className="px-5 py-2.5 rounded-md text-sm" style={{ background: C.violet, color: "#fff" }}>
              Continuer mes achats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
