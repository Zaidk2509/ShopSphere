import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:5001";

const fetcher = async (url, opts = {}) => {
  const res = await fetch(`${API}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  const map = {
    AVAILABLE: { bg: "bg-emerald-900/60", text: "text-emerald-300", border: "border-emerald-700", dot: "bg-emerald-400" },
    "LOW STOCK": { bg: "bg-amber-900/60", text: "text-amber-300", border: "border-amber-700", dot: "bg-amber-400" },
    "OUT OF STOCK": { bg: "bg-red-900/60", text: "text-red-300", border: "border-red-700", dot: "bg-red-400" },
  };
  const s = map[status] || map["OUT OF STOCK"];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-semibold border ${s.bg} ${s.text} ${s.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} animate-pulse`} />
      {status}
    </span>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center py-16">
    <div className="w-8 h-8 border-2 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
  </div>
);

const ErrorMsg = ({ msg, onRetry }) => (
  <div className="flex flex-col items-center gap-3 py-12 text-red-400">
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
    <p className="font-mono text-sm">{msg}</p>
    {onRetry && <button onClick={onRetry} className="text-xs border border-red-700 px-3 py-1 rounded hover:bg-red-900/40 transition-colors">Retry</button>}
  </div>
);

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={e => e.target === e.currentTarget && onClose()}>
    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl animate-in">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h3 className="font-mono font-bold text-amber-400 text-sm tracking-widest uppercase">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const Input = ({ label, ...props }) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">{label}</span>
    <input className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors" {...props} />
  </label>
);

const Btn = ({ variant = "primary", children, className = "", ...props }) => {
  const styles = {
    primary: "bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold",
    secondary: "bg-slate-700 hover:bg-slate-600 text-slate-100",
    danger: "bg-red-900/60 hover:bg-red-800 text-red-300 border border-red-700",
    ghost: "hover:bg-slate-700 text-slate-300",
  };
  return (
    <button className={`px-4 py-2 rounded-lg text-sm transition-all duration-150 flex items-center gap-2 font-mono ${styles[variant]} ${className} disabled:opacity-40 disabled:cursor-not-allowed`} {...props}>
      {children}
    </button>
  );
};

// ── Stat Card ────────────────────────────────────────────────────────────────

const StatCard = ({ label, value, sub, accent = false, icon }) => (
  <div className={`relative overflow-hidden rounded-xl border p-5 flex flex-col gap-3 ${accent ? "border-amber-600/60 bg-amber-950/30" : "border-slate-700 bg-slate-800/50"}`}>
    <div className="flex items-start justify-between">
      <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-xl ${accent ? "text-amber-400" : "text-slate-500"}`}>{icon}</span>
    </div>
    <p className={`text-3xl font-mono font-black ${accent ? "text-amber-300" : "text-slate-100"}`}>{value}</p>
    {sub && <p className="text-xs font-mono text-slate-500">{sub}</p>}
    <div className={`absolute bottom-0 left-0 h-0.5 w-full ${accent ? "bg-gradient-to-r from-amber-500 to-transparent" : "bg-gradient-to-r from-slate-600 to-transparent"}`} />
  </div>
);

// ── DASHBOARD ────────────────────────────────────────────────────────────────

const Dashboard = ({ setActiveTab }) => {
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [inv, ords, notifs] = await Promise.all([
        fetcher("/inventory"), fetcher("/orders"), fetcher("/notifications"),
      ]);
      setInventory(inv); setOrders(ords); setNotifications(notifs);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Spinner />;
  if (error) return <ErrorMsg msg={error} onRetry={load} />;

  const lowStock = inventory.filter(p => p.stock <= p.reorder_level && p.stock > 0);
  const outOfStock = inventory.filter(p => p.stock === 0);
  const unread = notifications.filter(n => !n.is_read);
  const totalValue = inventory.reduce((s, p) => s + p.stock * (p.price || 0), 0);

  return (
    <div className="space-y-8">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={inventory.length} icon="📦" sub={`${outOfStock.length} out of stock`} />
        <StatCard label="Low Stock Alerts" value={lowStock.length} icon="⚠️" accent={lowStock.length > 0} sub="Below reorder level" />
        <StatCard label="Total Orders" value={orders.length} icon="🛒" sub="All time" />
        <StatCard label="Inventory Value" value={`₹${totalValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`} icon="💰" sub="Stock × price" />
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || outOfStock.length > 0) && (
        <div className="rounded-xl border border-amber-700/50 bg-amber-950/20 p-5">
          <h3 className="text-amber-400 font-mono font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" /> Stock Alerts
          </h3>
          <div className="grid sm:grid-cols-2 gap-2">
            {[...outOfStock, ...lowStock].slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between bg-slate-800/60 rounded-lg px-4 py-2.5 border border-slate-700">
                <span className="font-mono text-sm text-slate-200 truncate max-w-[60%]">{p.name}</span>
                <StatusBadge status={p.stock === 0 ? "OUT OF STOCK" : "LOW STOCK"} />
              </div>
            ))}
          </div>
          <button onClick={() => setActiveTab("inventory")} className="mt-4 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors">
            View all in Inventory →
          </button>
        </div>
      )}

      {/* Unread Notifications preview */}
      {unread.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-5">
          <h3 className="text-slate-300 font-mono font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
            Unread Notifications
            <span className="bg-amber-500 text-slate-900 text-xs font-black rounded-full w-5 h-5 flex items-center justify-center">{unread.length}</span>
          </h3>
          <div className="space-y-2">
            {unread.slice(0, 3).map(n => (
              <div key={n.id} className="font-mono text-sm text-slate-400 border-l-2 border-amber-500 pl-3 py-1">{n.message}</div>
            ))}
          </div>
          <button onClick={() => setActiveTab("notifications")} className="mt-4 text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors">
            View all notifications →
          </button>
        </div>
      )}

      {/* Recent Orders */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-mono font-bold text-xs text-slate-300 uppercase tracking-widest">Recent Orders</h3>
          <button onClick={() => setActiveTab("orders")} className="text-xs font-mono text-amber-400 hover:text-amber-300 transition-colors">View all →</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono">
            <thead><tr className="border-b border-slate-700/60 text-xs text-slate-500 uppercase tracking-wider">
              <th className="px-5 py-3 text-left">Order ID</th>
              <th className="px-5 py-3 text-left">Customer</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-right">Amount</th>
            </tr></thead>
            <tbody>{orders.slice(0, 5).map((o, i) => (
              <tr key={o.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                <td className="px-5 py-3 text-amber-400">#{o.id}</td>
                <td className="px-5 py-3 text-slate-300">{o.customer_id}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs ${o.payment_status === "PAID" ? "bg-emerald-900/50 text-emerald-300" : o.payment_status === "CANCELLED" ? "bg-red-900/50 text-red-300" : "bg-slate-700 text-slate-400"}`}>{o.payment_status}</span>
                </td>
                <td className="px-5 py-3 text-right text-slate-200">₹{(o.total_amount || 0).toLocaleString()}</td>
              </tr>
            ))}</tbody>
          </table>
          {orders.length === 0 && <p className="text-center font-mono text-slate-500 text-sm py-8">No orders yet</p>}
        </div>
      </div>
    </div>
  );
};

// ── INVENTORY ────────────────────────────────────────────────────────────────

const RestockModal = ({ product, onClose, onDone }) => {
  const [qty, setQty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!qty || isNaN(qty) || +qty <= 0) return setError("Enter a valid quantity");
    setLoading(true); setError(null);
    try {
      await fetcher("/restock", { method: "POST", body: JSON.stringify({ product_id: product.id, added_stock: +qty }) });
      onDone();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`Restock — ${product.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="flex justify-between font-mono text-sm">
          <span className="text-slate-400">Current Stock</span>
          <span className="text-slate-100">{product.stock} units</span>
        </div>
        <div className="flex justify-between font-mono text-sm">
          <span className="text-slate-400">Reorder Level</span>
          <span className="text-slate-100">{product.reorder_level} units</span>
        </div>
        <Input label="Add Quantity" type="number" min="1" placeholder="e.g. 50" value={qty} onChange={e => setQty(e.target.value)} />
        {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
          <Btn onClick={submit} disabled={loading} className="flex-1">{loading ? "Restocking…" : "Confirm Restock"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

const UpdateInventoryModal = ({ product, onClose, onDone }) => {
  const [stock, setStock] = useState(product.stock ?? "");
  const [reorder, setReorder] = useState(product.reorder_level ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      await fetcher(`/inventory/${product.id}`, { method: "PUT", body: JSON.stringify({ stock: +stock, reorder_level: +reorder }) });
      onDone();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title={`Edit — ${product.name}`} onClose={onClose}>
      <div className="space-y-4">
        <Input label="Stock Quantity" type="number" min="0" value={stock} onChange={e => setStock(e.target.value)} />
        <Input label="Reorder Level" type="number" min="0" value={reorder} onChange={e => setReorder(e.target.value)} />
        {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
          <Btn onClick={submit} disabled={loading} className="flex-1">{loading ? "Saving…" : "Save Changes"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

const AddProductModal = ({ onClose, onDone }) => {
  const [form, setForm] = useState({ name: "", sku: "", price: "", stock: "", reorder_level: "", category: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      await fetcher("/inventory", { method: "POST", body: JSON.stringify({ ...form, price: +form.price, stock: +form.stock, reorder_level: +form.reorder_level }) });
      onDone();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Add New Product" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Product Name" value={form.name} onChange={set("name")} placeholder="Widget X" />
          <Input label="SKU" value={form.sku} onChange={set("sku")} placeholder="WGT-001" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Price (₹)" type="number" value={form.price} onChange={set("price")} placeholder="999" />
          <Input label="Category" value={form.category} onChange={set("category")} placeholder="Electronics" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Initial Stock" type="number" value={form.stock} onChange={set("stock")} placeholder="100" />
          <Input label="Reorder Level" type="number" value={form.reorder_level} onChange={set("reorder_level")} placeholder="20" />
        </div>
        {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
          <Btn onClick={submit} disabled={loading} className="flex-1">{loading ? "Adding…" : "Add Product"}</Btn>
        </div>
      </div>
    </Modal>
  );
};

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restock, setRestock] = useState(null);
  const [edit, setEdit] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setProducts(await fetcher("/inventory")); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatus = (p) => p.stock === 0 ? "OUT OF STOCK" : p.stock <= p.reorder_level ? "LOW STOCK" : "AVAILABLE";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <input
          className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-sm text-slate-100 font-mono placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors w-full sm:w-72"
          placeholder="Search by name or SKU…"
          value={search} onChange={e => setSearch(e.target.value)}
        />
        <Btn onClick={() => setAddOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Product
        </Btn>
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} onRetry={load} /> : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">Product</th>
                  <th className="px-5 py-3.5 text-left">SKU</th>
                  <th className="px-5 py-3.5 text-left">Category</th>
                  <th className="px-5 py-3.5 text-right">Price</th>
                  <th className="px-5 py-3.5 text-right">Stock</th>
                  <th className="px-5 py-3.5 text-right">Reorder At</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5 text-slate-100 font-semibold">{p.name}</td>
                    <td className="px-5 py-3.5 text-amber-400/80">{p.sku || "—"}</td>
                    <td className="px-5 py-3.5 text-slate-400">{p.category || "—"}</td>
                    <td className="px-5 py-3.5 text-right text-slate-200">₹{(p.price || 0).toLocaleString()}</td>
                    <td className={`px-5 py-3.5 text-right font-bold ${p.stock === 0 ? "text-red-400" : p.stock <= p.reorder_level ? "text-amber-400" : "text-emerald-400"}`}>{p.stock}</td>
                    <td className="px-5 py-3.5 text-right text-slate-500">{p.reorder_level}</td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={getStatus(p)} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <Btn variant="secondary" onClick={() => setRestock(p)} className="py-1.5 px-3 text-xs">Restock</Btn>
                        <Btn variant="ghost" onClick={() => setEdit(p)} className="py-1.5 px-3 text-xs">Edit</Btn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && <p className="text-center font-mono text-slate-500 text-sm py-12">No products found</p>}
          </div>
        </div>
      )}

      {restock && <RestockModal product={restock} onClose={() => setRestock(null)} onDone={() => { setRestock(null); load(); }} />}
      {edit && <UpdateInventoryModal product={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); load(); }} />}
      {addOpen && <AddProductModal onClose={() => setAddOpen(false)} onDone={() => { setAddOpen(false); load(); }} />}
    </div>
  );
};

// ── ORDERS ───────────────────────────────────────────────────────────────────

const OrderDetailModal = ({ orderId, onClose }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetcher(`/orders/${orderId}`)
      .then(setOrder).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, [orderId]);

  return (
    <Modal title={`Order #${orderId}`} onClose={onClose}>
      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} /> : (
        <div className="space-y-4 font-mono">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-slate-400">Customer</span><span className="text-slate-100">{order.customer_id}</span>
            <span className="text-slate-400">Payment</span><span className="text-emerald-300">{order.payment_status}</span>
            <span className="text-slate-400">Method</span><span className="text-slate-100">{order.payment_method}</span>
            <span className="text-slate-400">Ref</span><span className="text-amber-400">{order.transaction_ref || "—"}</span>
            <span className="text-slate-400">Ship To</span><span className="text-slate-100 text-xs">{order.shipping_address}</span>
          </div>
          {order.items?.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Items</p>
              <div className="space-y-1.5">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm bg-slate-800 rounded-lg px-3 py-2">
                    <span className="text-slate-300">{item.product_name || `Product #${item.product_id}`} × {item.quantity}</span>
                    <span className="text-amber-400">₹{(item.unit_price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between pt-2 border-t border-slate-700 text-sm font-bold">
            <span className="text-slate-300">Total</span>
            <span className="text-amber-400">₹{(order.total_amount || 0).toLocaleString()}</span>
          </div>
        </div>
      )}
    </Modal>
  );
};

const PlaceOrderModal = ({ onClose, onDone }) => {
  const [inventory, setInventory] = useState([]);
  const [form, setForm] = useState({ customer_id: "", shipping_address: "", payment_method: "UPI", payment_status: "PENDING", transaction_ref: "" });
  const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: 0 }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { fetcher("/inventory").then(setInventory).catch(() => { }); }, []);

  const setF = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const updateItem = (i, k, v) => {
    const next = [...items];
    next[i] = { ...next[i], [k]: v };
    if (k === "product_id") {
      const prod = inventory.find(p => p.id === +v);
      if (prod) next[i].unit_price = prod.price || 0;
    }
    setItems(next);
  };

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      await fetcher("/orders", {
        method: "POST",
        body: JSON.stringify({ ...form, items: items.map(i => ({ ...i, product_id: +i.product_id, quantity: +i.quantity })) }),
      });
      onDone();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Place New Order" onClose={onClose}>
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Customer ID" value={form.customer_id} onChange={setF("customer_id")} placeholder="CUST001" />
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Payment Method</span>
            <select className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500" value={form.payment_method} onChange={setF("payment_method")}>
              {["UPI", "CARD", "CASH", "NETBANKING"].map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <Input label="Shipping Address" value={form.shipping_address} onChange={setF("shipping_address")} placeholder="123 Main St, Bengaluru" />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Payment Status</span>
            <select className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-amber-500" value={form.payment_status} onChange={setF("payment_status")}>
              {["PENDING", "PAID", "FAILED"].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Transaction Ref" value={form.transaction_ref} onChange={setF("transaction_ref")} placeholder="TXN123" />
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider">Items</span>
            <button onClick={() => setItems([...items, { product_id: "", quantity: 1, unit_price: 0 }])} className="text-xs text-amber-400 hover:text-amber-300 font-mono">+ Add Item</button>
          </div>
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex gap-2 items-end">
                <div className="flex-1">
                  <select className="w-full bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-amber-500" value={item.product_id} onChange={e => updateItem(i, "product_id", e.target.value)}>
                    <option value="">Select product…</option>
                    {inventory.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.price})</option>)}
                  </select>
                </div>
                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, "quantity", e.target.value)} className="w-16 bg-slate-800 border border-slate-600 rounded-lg px-2 py-2 text-xs text-slate-100 font-mono text-center focus:outline-none focus:border-amber-500" />
                {items.length > 1 && <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 pb-1.5">✕</button>}
              </div>
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 font-mono text-xs">{error}</p>}
      </div>
      <div className="flex gap-3 pt-4 mt-2 border-t border-slate-700">
        <Btn variant="secondary" onClick={onClose} className="flex-1">Cancel</Btn>
        <Btn onClick={submit} disabled={loading} className="flex-1">{loading ? "Placing…" : "Place Order"}</Btn>
      </div>
    </Modal>
  );
};

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [detail, setDetail] = useState(null);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [cancelling, setCancelling] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setOrders(await fetcher("/orders")); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const cancel = async (id) => {
    setCancelling(id);
    try { await fetcher(`/orders/${id}/cancel`, { method: "DELETE" }); load(); }
    catch (e) { alert(e.message); }
    finally { setCancelling(null); }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Btn onClick={() => setPlaceOpen(true)}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          New Order
        </Btn>
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} onRetry={load} /> : (
        <div className="rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5 text-left">Order ID</th>
                  <th className="px-5 py-3.5 text-left">Customer</th>
                  <th className="px-5 py-3.5 text-left">Payment</th>
                  <th className="px-5 py-3.5 text-left">Method</th>
                  <th className="px-5 py-3.5 text-right">Total</th>
                  <th className="px-5 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b border-slate-700/40 hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-3.5 text-amber-400">#{o.id}</td>
                    <td className="px-5 py-3.5 text-slate-200">{o.customer_id}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-xs ${o.payment_status === "PAID" ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700" : o.payment_status === "CANCELLED" ? "bg-red-900/50 text-red-300 border border-red-700" : "bg-slate-700 text-slate-400 border border-slate-600"}`}>{o.payment_status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{o.payment_method}</td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-100">₹{(o.total_amount || 0).toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <Btn variant="secondary" onClick={() => setDetail(o.id)} className="py-1.5 px-3 text-xs">Details</Btn>
                        {o.payment_status !== "CANCELLED" && (
                          <Btn variant="danger" onClick={() => cancel(o.id)} disabled={cancelling === o.id} className="py-1.5 px-3 text-xs">
                            {cancelling === o.id ? "…" : "Cancel"}
                          </Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && <p className="text-center font-mono text-slate-500 text-sm py-12">No orders found</p>}
          </div>
        </div>
      )}

      {detail && <OrderDetailModal orderId={detail} onClose={() => setDetail(null)} />}
      {placeOpen && <PlaceOrderModal onClose={() => setPlaceOpen(false)} onDone={() => { setPlaceOpen(false); load(); }} />}
    </div>
  );
};

// ── NOTIFICATIONS ────────────────────────────────────────────────────────────

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setNotifications(await fetcher("/notifications")); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await fetcher(`/notifications/${id}/read`, { method: "PUT" });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (e) { alert(e.message); }
  };

  const displayed = filter === "unread" ? notifications.filter(n => !n.is_read) : notifications;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {["all", "unread"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-xs font-mono uppercase tracking-wider transition-colors ${filter === f ? "bg-amber-500 text-slate-900 font-bold" : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"}`}>
            {f} {f === "unread" && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : error ? <ErrorMsg msg={error} onRetry={load} /> : (
        <div className="space-y-2">
          {displayed.map(n => (
            <div key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`group flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${n.is_read ? "border-slate-700/50 bg-slate-800/20 opacity-60" : "border-amber-700/40 bg-amber-950/20 hover:bg-amber-950/30 hover:border-amber-600/60"}`}>
              <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${n.is_read ? "bg-slate-600" : "bg-amber-400 animate-pulse"}`} />
              <div className="flex-1 min-w-0">
                <p className={`font-mono text-sm ${n.is_read ? "text-slate-500" : "text-slate-200"}`}>{n.message}</p>
                {n.created_at && <p className="text-xs font-mono text-slate-600 mt-1">{new Date(n.created_at).toLocaleString()}</p>}
              </div>
              {!n.is_read && (
                <span className="text-xs font-mono text-amber-500 group-hover:text-amber-400 flex-shrink-0 self-center">Click to mark read</span>
              )}
            </div>
          ))}
          {displayed.length === 0 && <p className="text-center font-mono text-slate-500 text-sm py-12">No notifications</p>}
        </div>
      )}
    </div>
  );
};

// ── APP SHELL ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "inventory", label: "Inventory", icon: "⊟" },
  { id: "orders", label: "Orders", icon: "⊞" },
  { id: "notifications", label: "Notifications", icon: "◎" },
];

export default function App() {
  const [active, setActive] = useState("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const poll = async () => {
      try {
        const notifs = await fetcher("/notifications/unread");
        setUnreadCount(Array.isArray(notifs) ? notifs.length : 0);
      } catch { }
    };
    poll();
    const t = setInterval(poll, 30000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100" style={{ fontFamily: "'Courier New', 'Lucida Console', monospace" }}>
      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-black text-sm">S</span>
            </div>
            <div>
              <span className="font-black text-slate-100 text-sm tracking-widest uppercase">ShopSphere</span>
              <span className="ml-2 text-xs text-slate-500 font-mono">Inventory OS</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-mono text-slate-500">Live</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <nav className="lg:w-52 flex-shrink-0">
          <ul className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {TABS.map(tab => (
              <li key={tab.id} className="flex-shrink-0">
                <button
                  onClick={() => setActive(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-mono transition-all ${active === tab.id ? "bg-amber-500 text-slate-900 font-bold shadow-lg shadow-amber-900/40" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"}`}>
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.label}</span>
                  {tab.id === "notifications" && unreadCount > 0 && (
                    <span className={`ml-auto text-xs font-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 ${active === tab.id ? "bg-slate-900 text-amber-400" : "bg-amber-500 text-slate-900"}`}>
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="mb-6 pb-4 border-b border-slate-800">
            <h1 className="text-xl font-black uppercase tracking-widest text-slate-100">
              {TABS.find(t => t.id === active)?.label}
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              {active === "dashboard" && "Overview of your inventory ecosystem"}
              {active === "inventory" && "Manage products, stock levels, and reorder thresholds"}
              {active === "orders" && "Track and manage customer orders"}
              {active === "notifications" && "System alerts and stock notifications"}
            </p>
          </div>

          {active === "dashboard" && <Dashboard setActiveTab={setActive} />}
          {active === "inventory" && <Inventory />}
          {active === "orders" && <Orders />}
          {active === "notifications" && <Notifications />}
        </main>
      </div>

      <style>{`
        @keyframes animate-in {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-in { animation: animate-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}