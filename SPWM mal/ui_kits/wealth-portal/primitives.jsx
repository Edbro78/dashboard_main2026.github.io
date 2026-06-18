/* global React */
// ============================================================================
// Söderberg & Partners WM — UI Kit primitives
// Button, Badge, Avatar, Input, Money/Return formatters
// ============================================================================
const { useState } = React;

// --- formatting helpers (Norwegian) ---
function nok(n) {
  const sign = n < 0 ? "−" : "";
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return sign + s + " kr";
}
function pct(n) {
  const sign = n < 0 ? "−" : "+";
  return sign + Math.abs(n).toFixed(2).replace(".", ",") + " %";
}

// --- Icon (Boxicons) ---
function Icon({ name, solid, style }) {
  return <i className={(solid ? "bxs-" : "bx bx-") + name} style={style}></i>;
}

// --- Button ---
function Button({ children, variant = "primary", size = "md", icon, iconRight, onClick, full, style }) {
  const [hover, setHover] = useState(false);
  const base = {
    fontFamily: "var(--font-sans)", fontWeight: 600, cursor: "pointer",
    borderRadius: "var(--radius-md)", border: "1px solid transparent",
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    lineHeight: 1, transition: "background .15s, border-color .15s, color .15s",
    width: full ? "100%" : "auto",
    fontSize: size === "sm" ? 14 : 16,
    padding: size === "sm" ? "9px 14px" : "11px 18px",
    ...style,
  };
  const variants = {
    primary: { background: hover ? "var(--sp-navy-pressed)" : "var(--blue-main)", color: "#fff" },
    secondary: { background: hover ? "var(--gray-50)" : "#fff", color: "var(--sp-navy)", borderColor: "var(--gray-300)" },
    tertiary: { background: hover ? "var(--blue-50)" : "transparent", color: "var(--blue-main)" },
    destructive: { background: hover ? "#9f1f15" : "var(--error-700)", color: "#fff" },
    "dest-outline": { background: hover ? "var(--error-bg)" : "#fff", color: "var(--error-700)", borderColor: "var(--error-border)" },
  };
  return (
    <button style={{ ...base, ...variants[variant] }} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      {icon && <Icon name={icon} style={{ fontSize: size === "sm" ? 16 : 18 }} />}
      {children}
      {iconRight && <Icon name={iconRight} style={{ fontSize: size === "sm" ? 16 : 18 }} />}
    </button>
  );
}

// --- Badge ---
const badgeTones = {
  brand: { background: "var(--blue-100)", color: "var(--blue-main)" },
  success: { background: "var(--success-bg)", color: "var(--success-700)", dot: "var(--success-600)" },
  error: { background: "var(--error-bg)", color: "var(--error-700)", dot: "var(--error-600)" },
  warning: { background: "var(--warning-bg)", color: "var(--warning-700)", dot: "var(--warning-600)" },
  neutral: { background: "var(--gray-100)", color: "var(--gray-700)" },
  secondary: { background: "var(--secondary-100)", color: "var(--secondary-800)" },
};
function Badge({ children, tone = "neutral", dot, icon, style }) {
  const t = badgeTones[tone] || badgeTones.neutral;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 500,
      padding: "4px 12px", borderRadius: "var(--radius-pill)", lineHeight: 1.3, whiteSpace: "nowrap",
      background: t.background, color: t.color, ...style }}>
      {dot && <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot || t.color }} />}
      {icon && <Icon name={icon} style={{ fontSize: 15 }} />}
      {children}
    </span>
  );
}

// --- Avatar (initials, navy) ---
function Avatar({ name, size = 40, tone = "navy" }) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const tones = {
    navy: { background: "var(--sp-navy)", color: "#fff" },
    blue: { background: "var(--blue-100)", color: "var(--blue-main)" },
    gray: { background: "var(--gray-100)", color: "var(--gray-600)" },
  };
  return (
    <span style={{ width: size, height: size, borderRadius: "50%", display: "inline-flex",
      alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: size * 0.38,
      flex: "none", ...tones[tone] }}>{initials}</span>
  );
}

// --- Input ---
function Input({ label, placeholder, value, onChange, icon, type = "text", error, hint, style }) {
  const [focus, setFocus] = useState(false);
  return (
    <label style={{ display: "block", ...style }}>
      {label && <div style={{ fontSize: 16, fontWeight: 500, color: "var(--gray-700)", marginBottom: 6 }}>{label}</div>}
      <div style={{ height: 44, borderRadius: "var(--radius-md)", background: "#fff",
        border: "1px solid " + (error ? "var(--error-500)" : focus ? "var(--blue-main)" : "var(--gray-300)"),
        boxShadow: focus ? "0 0 0 4px var(--ring)" : "none",
        display: "flex", alignItems: "center", gap: 8, padding: "0 12px", boxSizing: "border-box",
        transition: "border-color .15s, box-shadow .15s" }}>
        {icon && <Icon name={icon} style={{ color: "var(--gray-500)", fontSize: 18 }} />}
        <input type={type} placeholder={placeholder} value={value}
          onChange={e => onChange && onChange(e.target.value)}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ border: "none", outline: "none", flex: 1, fontFamily: "var(--font-sans)",
            fontSize: 16, color: "var(--gray-900)", background: "transparent" }} />
      </div>
      {(error || hint) && <div style={{ fontSize: 13, marginTop: 6, color: error ? "var(--error-700)" : "var(--gray-500)" }}>{error || hint}</div>}
    </label>
  );
}

// --- Card shell ---
function Card({ children, style, pad = 20 }) {
  return <div style={{ background: "#fff", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)", padding: pad, ...style }}>{children}</div>;
}

Object.assign(window, { nok, pct, Icon, Button, Badge, Avatar, Input, Card });
