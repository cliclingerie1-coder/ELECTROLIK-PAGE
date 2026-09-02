import React, { useState, useEffect, useMemo } from "react";
import { ShoppingCart, X, Plus, Minus, Check, Phone, MapPin, User, Zap, Truck, ShieldCheck, ChevronRight, Star, ChevronLeft, TrendingUp } from "lucide-react";

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

async function fetchReviews(productId) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/product_reviews?select=*&product_id=eq.${productId}&order=created_at.desc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (e) {
    console.error("Erreur chargement avis", e);
    return [];
  }
}

async function submitReview(review) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/product_reviews`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: JSON.stringify(review),
  });
  return res.ok;
}

// ---- Design tokens (thème clair : blanc + or) ----
const C = {
  bg: "#FFFFFF",
  section: "#FAF9F6",
  card: "#FFFFFF",
  imgBg: "#F2F1EC",
  ink: "#17181C",
  inkSoft: "#6B7280",
  border: "#E7E5DE",
  gold: "#C99700",
  goldSoft: "#FBF1D6",
  dark: "#17181C",
  danger: "#E5484D",
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
function ProductCard({ p, onAdd, onOpenDetail }) {
  const [hover, setHover] = useState(false);
  const cover = (p.images && p.images[0]) || p.image_url;
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative rounded-lg overflow-hidden group"
      style={{ background: C.card, border: `1px solid ${hover ? C.gold : C.border}`, transition: "border-color .25s ease, box-shadow .25s ease", boxShadow: hover ? "0 8px 24px rgba(0,0,0,0.08)" : "none" }}
    >
      <button onClick={() => onOpenDetail(p)} className="w-full aspect-square flex items-center justify-center" style={{ background: C.imgBg }}>
        {cover ? (
          <img src={cover} alt={p.name} className="w-full h-full object-cover" />
        ) : (
          <Zap size={36} color={C.border} />
        )}
      </button>
      <div className="p-4">
        {p.category && (
          <div style={{ ...mono, fontSize: 10, color: C.gold }} className="uppercase tracking-widest mb-1">{p.category}</div>
        )}
        <button onClick={() => onOpenDetail(p)} className="text-left w-full">
          <div style={{ color: C.ink }} className="text-sm mb-2 leading-snug">{p.name}</div>
        </button>
        <div className="flex items-center justify-between">
          <span style={{ ...display, color: C.ink }} className="text-lg">{fmt(p.price)} <span className="text-xs" style={{ color: C.inkSoft }}>DHS</span></span>
          <button
            onClick={() => onAdd(p)}
            className="px-3 py-1.5 rounded-md text-xs font-medium"
            style={{ background: C.dark, color: "#fff" }}
          >
            Ajouter
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Étoiles (affichage note + sélecteur) ----
function Stars({ value, size = 14, onChange }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange && onChange(n)}
          style={{ cursor: onChange ? "pointer" : "default", lineHeight: 0 }}
        >
          <Star size={size} fill={n <= value ? C.gold : "none"} color={n <= value ? C.gold : C.border} />
        </button>
      ))}
    </div>
  );
}

// ---- Fiche produit détaillée (galerie + avis clients) ----
function ProductDetailModal({ p, onClose, onAdd }) {
  const images = p.images && p.images.length > 0 ? p.images : p.image_url ? [p.image_url] : [];
  const [activeImg, setActiveImg] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSent, setReviewSent] = useState(false);

  useEffect(() => {
    fetchReviews(p.id).then((r) => {
      setReviews(r);
      setLoadingReviews(false);
    });
  }, [p.id]);

  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async () => {
    if (!reviewForm.name.trim()) return;
    setSubmittingReview(true);
    const ok = await submitReview({
      product_id: p.id,
      client_name: reviewForm.name,
      rating: reviewForm.rating,
      comment: reviewForm.comment,
    });
    setSubmittingReview(false);
    if (ok) {
      setReviewSent(true);
      setReviews((r) => [{ id: "tmp", client_name: reviewForm.name, rating: reviewForm.rating, comment: reviewForm.comment, created_at: new Date().toISOString() }, ...r]);
      setReviewForm({ name: "", rating: 5, comment: "" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end p-3">
          <button onClick={onClose}><X size={20} color={C.inkSoft} /></button>
        </div>
        <div className="grid md:grid-cols-2 gap-6 px-6 pb-6">
          {/* Galerie */}
          <div>
            <div className="aspect-square rounded-md overflow-hidden flex items-center justify-center relative" style={{ background: C.imgBg }}>
              {images.length > 0 ? (
                <img src={images[activeImg]} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <Zap size={48} color={C.border} />
              )}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setActiveImg((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.5)" }}
                  >
                    <ChevronLeft size={16} color="#fff" />
                  </button>
                  <button
                    onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.5)" }}
                  >
                    <ChevronRight size={16} color="#fff" />
                  </button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 mt-2">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImg(idx)}
                    className="w-14 h-14 rounded-md overflow-hidden shrink-0"
                    style={{ border: `2px solid ${activeImg === idx ? C.gold : C.border}` }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Infos + avis */}
          <div>
            {p.category && (
              <div style={{ ...mono, fontSize: 10, color: C.gold }} className="uppercase tracking-widest mb-1">{p.category}</div>
            )}
            <div style={{ ...display, color: C.ink }} className="text-2xl mb-2">{p.name}</div>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <Stars value={Math.round(avgRating)} />
                <span className="text-xs" style={{ color: C.inkSoft }}>{avgRating.toFixed(1)} ({reviews.length} avis)</span>
              </div>
            )}
            <div style={{ ...display, color: C.ink }} className="text-2xl mb-4">{fmt(p.price)} DHS</div>
            <button
              onClick={() => { onAdd(p); onClose(); }}
              className="w-full py-3 rounded-md text-sm font-semibold mb-6"
              style={{ background: C.dark, color: "#fff" }}
            >
              Ajouter au panier
            </button>

            <div className="border-t pt-4" style={{ borderColor: C.border }}>
              <div style={{ ...display, color: C.ink }} className="text-sm mb-3">Avis clients</div>
              {loadingReviews ? (
                <p className="text-xs" style={{ color: C.inkSoft }}>Chargement…</p>
              ) : reviews.length === 0 ? (
                <p className="text-xs mb-4" style={{ color: C.inkSoft }}>Aucun avis pour l'instant — sois le premier à donner ton avis !</p>
              ) : (
                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                  {reviews.map((r) => (
                    <div key={r.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: C.ink }}>{r.client_name}</span>
                        <Stars value={r.rating} size={11} />
                      </div>
                      {r.comment && <p className="text-xs mt-0.5" style={{ color: C.inkSoft }}>{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )}

              {reviewSent ? (
                <p className="text-xs" style={{ color: C.gold }}>Merci pour ton avis ! 🙏</p>
              ) : (
                <div className="space-y-2">
                  <input
                    placeholder="Ton nom"
                    value={reviewForm.name}
                    onChange={(e) => setReviewForm({ ...reviewForm, name: e.target.value })}
                    className="w-full rounded-md px-3 py-2 text-xs bg-transparent outline-none"
                    style={{ border: `1px solid ${C.border}`, color: C.ink }}
                  />
                  <Stars value={reviewForm.rating} onChange={(n) => setReviewForm({ ...reviewForm, rating: n })} />
                  <textarea
                    placeholder="Ton commentaire (optionnel)"
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    rows={2}
                    className="w-full rounded-md px-3 py-2 text-xs bg-transparent outline-none resize-none"
                    style={{ border: `1px solid ${C.border}`, color: C.ink }}
                  />
                  <button
                    onClick={submit}
                    disabled={submittingReview || !reviewForm.name.trim()}
                    className="text-xs px-4 py-2 rounded-md disabled:opacity-40"
                    style={{ background: C.goldSoft, color: C.ink }}
                  >
                    {submittingReview ? "Envoi…" : "Publier l'avis"}
                  </button>
                </div>
              )}
            </div>
          </div>
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
                <div className="w-16 h-16 rounded-md shrink-0 flex items-center justify-center" style={{ background: C.imgBg }}>
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
            <button onClick={onCheckout} className="w-full py-3 rounded-md text-sm font-semibold" style={{ background: C.dark, color: "#fff" }}>
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
          style={{ background: C.dark, color: "#fff" }}
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
  const [detailProduct, setDetailProduct] = useState(null);

  useEffect(() => {
    fetchProducts().then((p) => { setProducts(p); setLoading(false); });
  }, []);

  useEffect(() => {
    try { localStorage.setItem("ek-boutique-cart", JSON.stringify(cart)); } catch (e) {}
  }, [cart]);

  const addToCart = (p) => {
    const cover = (p.images && p.images[0]) || p.image_url;
    setCart((c) => {
      const existing = c.find((i) => i.id === p.id);
      if (existing) return c.map((i) => (i.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...c, { id: p.id, name: p.name, price: p.price, image_url: cover, qty: 1 }];
    });
    setCartOpen(true);
  };
  const changeQty = (id, delta) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i)));
  const removeFromCart = (id) => setCart((c) => c.filter((i) => i.id !== id));
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const filtered = useMemo(() => products.filter((p) => matchCategory(p.category, category)), [products, category]);
  const bestSellers = useMemo(
    () => [...products].filter((p) => (p.sales_count || 0) > 0).sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 8),
    [products]
  );
  // Rayons par catégorie (affichés uniquement en vue "Tout")
  const rails = useMemo(() => {
    if (category !== "Tout") return [];
    return CATEGORIES.filter((c) => c !== "Tout")
      .map((c) => ({ label: c, items: products.filter((p) => matchCategory(p.category, c)) }))
      .filter((r) => r.items.length > 0);
  }, [products, category]);

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      {/* Bandeau promo */}
      <div className="text-center py-2 text-xs" style={{ background: C.dark, color: C.gold }}>
        🚚 Livraison partout au Maroc · 💰 Paiement à la livraison — aucune carte requise
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur" style={{ background: "rgba(255,255,255,0.9)", borderBottom: `1px solid ${C.border}` }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <img src="/logo.png" alt="Electrolik" style={{ width: 130, height: "auto" }} />
          <button onClick={() => setCartOpen(true)} className="relative p-2">
            <ShoppingCart size={22} color={C.ink} />
            {cartCount > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px]"
                style={{ background: C.danger, color: "#fff", ...mono }}
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
        style={{ background: `radial-gradient(circle at 50% 0%, ${C.goldSoft}, transparent 60%)` }}
      >
        <div style={{ ...mono, fontSize: 11, color: C.gold }} className="uppercase tracking-[0.3em] mb-4">Be Sm@rt</div>
        <h1 style={{ ...display, color: C.ink }} className="text-4xl md:text-6xl leading-tight mb-4">
          ÉQUIPE-TOI<br />
          <span style={{ color: C.gold }}>COMME UN PRO.</span>
        </h1>
        <p className="max-w-md mx-auto text-sm md:text-base mb-8" style={{ color: C.inkSoft }}>
          Accessoires gaming, téléphone & PC — livrés partout au Maroc, paiement à la réception.
        </p>
        <div className="flex items-center justify-center gap-6 text-xs" style={{ color: C.inkSoft }}>
          <span className="flex items-center gap-1.5"><Truck size={14} color={C.gold} /> Livraison rapide</span>
          <span className="flex items-center gap-1.5"><ShieldCheck size={14} color={C.gold} /> Paiement à la livraison</span>
        </div>
      </section>

      {/* Badges de confiance */}
      <div className="max-w-6xl mx-auto px-5 mb-12 grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: ShieldCheck, label: "Garantie sur nos produits" },
          { icon: Check, label: "Remboursement si défectueux" },
          { icon: Truck, label: "Livraison partout au Maroc" },
          { icon: Phone, label: "Paiement à la livraison" },
        ].map((b, idx) => (
          <div key={idx} className="flex flex-col items-center text-center gap-2 p-4 rounded-lg" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <b.icon size={20} color={C.gold} />
            <span className="text-xs" style={{ color: C.inkSoft }}>{b.label}</span>
          </div>
        ))}
      </div>

      {/* Meilleures ventes */}
      {!loading && bestSellers.length > 0 && (
        <div className="max-w-6xl mx-auto px-5 mb-12">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} color={C.gold} />
            <span style={{ ...display, color: C.ink }} className="text-lg">Meilleures ventes</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin" }}>
            {bestSellers.map((p) => (
              <div key={p.id} className="w-40 shrink-0">
                <ProductCard p={p} onAdd={addToCart} onOpenDetail={setDetailProduct} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtres catégories */}
      <div className="max-w-6xl mx-auto px-5 mb-8 flex gap-2 flex-wrap">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className="px-4 py-2 rounded-full text-sm"
            style={{
              background: category === c ? C.dark : "transparent",
              color: category === c ? "#fff" : C.inkSoft,
              border: `1px solid ${category === c ? C.dark : C.border}`,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Rayons par catégorie ou grille filtrée */}
      <main className="max-w-6xl mx-auto px-5 pb-24">
        {loading ? (
          <p className="text-center text-sm py-16" style={{ color: C.inkSoft }}>Chargement du catalogue…</p>
        ) : category === "Tout" ? (
          rails.length === 0 ? (
            <p className="text-center text-sm py-16" style={{ color: C.inkSoft }}>Aucun produit disponible pour l'instant.</p>
          ) : (
            rails.map((rail) => (
              <div key={rail.label} className="mb-12">
                <div style={{ ...display, color: C.ink }} className="text-lg mb-4">{rail.label}</div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rail.items.map((p) => <ProductCard key={p.id} p={p} onAdd={addToCart} onOpenDetail={setDetailProduct} />)}
                </div>
              </div>
            ))
          )
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm py-16" style={{ color: C.inkSoft }}>Aucun produit disponible dans cette catégorie pour l'instant.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p) => <ProductCard key={p.id} p={p} onAdd={addToCart} onOpenDetail={setDetailProduct} />)}
          </div>
        )}
      </main>

      <footer className="text-center py-8 text-xs" style={{ color: C.inkSoft, borderTop: `1px solid ${C.border}` }}>
        © {new Date().getFullYear()} Electrolik — Be Sm@rt
      </footer>

      {detailProduct && (
        <ProductDetailModal p={detailProduct} onClose={() => setDetailProduct(null)} onAdd={addToCart} />
      )}
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
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: C.goldSoft }}>
              <Check size={26} color={C.gold} />
            </div>
            <div style={{ ...display, color: C.ink }} className="text-xl mb-2">Commande reçue !</div>
            <p className="text-sm mb-6" style={{ color: C.inkSoft }}>
              On te contacte très vite pour confirmer la livraison. Paiement à la réception.
            </p>
            <button onClick={() => setConfirmed(false)} className="px-5 py-2.5 rounded-md text-sm" style={{ background: C.dark, color: "#fff" }}>
              Continuer mes achats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
