/* global React, Icon, Badge */
// ============================================================================
// App shell — Sidebar (desktop), PageHeader, Topbar (mobile)
// ============================================================================
const { useState: useStateShell } = React;

const NAV = [
  { id: "hjem", label: "Hjem", icon: "home-alt-2" },
  { id: "investeringer", label: "Investeringer", icon: "pie-chart-alt-2" },
  { id: "pensjon", label: "Pensjon", icon: "wallet" },
  { id: "dokumenter", label: "Dokumenter", icon: "file" },
  { id: "radgiver", label: "Rådgiver", icon: "conversation" },
];

function NavItem({ item, active, onClick }) {
  const [hover, setHover] = useStateShell(false);
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", gap: 12, height: 44, width: "100%",
        borderRadius: "var(--radius-md)", padding: "0 12px", boxSizing: "border-box", border: "none",
        cursor: "pointer", fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 500, textAlign: "left",
        color: "var(--sp-navy)", transition: "background .15s",
        background: active ? "var(--blue-100)" : hover ? "var(--gray-50)" : "transparent" }}>
      <Icon name={item.icon} style={{ fontSize: 20, color: active ? "var(--blue-main)" : "var(--sp-navy)" }} />
      {item.label}
    </button>
  );
}

function Sidebar({ active, onNavigate, onLogout }) {
  return (
    <aside style={{ width: 280, flex: "none", background: "#fff", height: "100%", boxSizing: "border-box",
      padding: "32px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <img src="../../assets/spwm-logo.svg" alt="Söderberg & Partners Wealth Management"
          style={{ height: 34, marginBottom: 40, marginLeft: 4 }} />
        <nav style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {NAV.map(n => <NavItem key={n.id} item={n} active={active === n.id} onClick={() => onNavigate(n.id)} />)}
        </nav>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <div style={{ fontSize: 14, color: "var(--gray-500)", marginBottom: 4 }}>Klientvelger</div>
          <ClientSelector />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <NavItem item={{ label: "Min side", icon: "user" }} onClick={() => onNavigate("hjem")} />
          <NavItem item={{ label: "Logg ut", icon: "log-out" }} onClick={onLogout} />
        </div>
      </div>
    </aside>
  );
}

function ClientSelector({ mobile }) {
  const clients = ["Isak Design Test AS", "Familien Berg Holding", "Privat — Isak Berg"];
  const [open, setOpen] = useStateShell(false);
  const [sel, setSel] = useStateShell(0);
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", gap: 10, width: mobile ? "auto" : "100%",
          height: 40, borderRadius: "var(--radius-md)", padding: "0 12px", boxSizing: "border-box",
          border: "1px solid var(--gray-300)", background: "#fff", cursor: "pointer",
          fontFamily: "var(--font-sans)", fontSize: 16, fontWeight: 500, color: "var(--sp-navy)" }}>
        <Icon name="group" style={{ fontSize: 20 }} />
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clients[sel]}</span>
        <Icon name="chevron-down" style={{ fontSize: 18, marginLeft: "auto", color: "var(--gray-500)" }} />
      </button>
      {open && (
        <div style={{ position: "absolute", bottom: mobile ? "auto" : 48, top: mobile ? 48 : "auto", left: 0,
          width: 232, background: "#fff", borderRadius: "var(--radius-md)", border: "1px solid var(--gray-200)",
          boxShadow: "var(--shadow-lg)", padding: 6, zIndex: 40 }}>
          {clients.map((c, i) => (
            <button key={c} onClick={() => { setSel(i); setOpen(false); }}
              style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", border: "none",
                background: i === sel ? "var(--blue-100)" : "transparent", cursor: "pointer", textAlign: "left",
                padding: "8px 10px", borderRadius: 6, fontFamily: "var(--font-sans)", fontSize: 14,
                color: "var(--sp-navy)", fontWeight: i === sel ? 600 : 400 }}>
              <Icon name="group" style={{ fontSize: 16, color: "var(--gray-500)" }} />{c}
              {i === sel && <Icon name="check" style={{ marginLeft: "auto", color: "var(--blue-main)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PageHeader({ title, date = "02.06.2024" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
      <h1 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 30, lineHeight: "38px", color: "var(--sp-navy)" }}>{title}</h1>
      <Badge tone="brand" icon="info-circle">Rapporteringsdato: {date}</Badge>
    </div>
  );
}

function MobileTopbar({ onMenu }) {
  return (
    <div style={{ height: 64, background: "#fff", borderBottom: "1px solid var(--gray-200)",
      display: "flex", alignItems: "center", gap: 12, padding: "0 16px" }}>
      <img src="../../assets/spwm-mark.svg" alt="" style={{ height: 30, flex: "none" }} onError={(e)=>{e.target.style.display='none';}} />
      <div style={{ flex: 1, minWidth: 0 }}><ClientSelector mobile /></div>
      <button onClick={onMenu} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--sp-navy)" }}>
        <Icon name="menu-alt-right" style={{ fontSize: 26 }} />
      </button>
    </div>
  );
}

Object.assign(window, { Sidebar, PageHeader, MobileTopbar, ClientSelector, NAV });
