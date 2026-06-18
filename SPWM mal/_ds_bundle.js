/* @ds-bundle: {"format":3,"namespace":"SDerbergPartnersWMDesignSystem_d1de3e","components":[],"sourceHashes":{"ui_kits/wealth-portal/app.jsx":"d0b951964f0e","ui_kits/wealth-portal/cards.jsx":"c5de36ccacc7","ui_kits/wealth-portal/charts.jsx":"60ad2f7cd144","ui_kits/wealth-portal/data.jsx":"a75e054b6fd5","ui_kits/wealth-portal/primitives.jsx":"48d138fa243a","ui_kits/wealth-portal/screens.jsx":"4ba5353a75b3","ui_kits/wealth-portal/shell.jsx":"24a74612c004","ui_kits/wealth-portal/tables.jsx":"980d8bb001a4"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.SDerbergPartnersWMDesignSystem_d1de3e = window.SDerbergPartnersWMDesignSystem_d1de3e || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// ui_kits/wealth-portal/app.jsx
try { (() => {
/* global React, ReactDOM, Sidebar, MobileTopbar, PageHeader, Button, Input, Icon, Hjem, Investeringer, Pensjon, Dokumenter, Radgiver */
// ============================================================================
// App — login + authenticated portal shell + simple router
// ============================================================================
const {
  useState
} = React;
function Login({
  onLogin
}) {
  const [email, setEmail] = useState("isak@designtest.no");
  const [pw, setPw] = useState("");
  return /*#__PURE__*/React.createElement("div", {
    style: {
      minHeight: "100vh",
      display: "flex",
      background: "var(--gray-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 0",
      background: "var(--sp-navy)",
      color: "#fff",
      padding: 56,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/spwm-logo-white.svg",
    alt: "S\xF6derberg & Partners Wealth Management",
    style: {
      height: 34,
      alignSelf: "flex-start"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 40,
      lineHeight: 1.15
    }
  }, "Din formue,", /*#__PURE__*/React.createElement("br", null), "forvaltet med omtanke."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: "var(--blue-200)",
      marginTop: 20,
      maxWidth: 420,
      lineHeight: 1.5
    }
  }, "F\xE5 full oversikt over investeringer og pensjon, og en direkte linje til din personlige r\xE5dgiver.")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--secondary-400)"
    }
  }, "\xA9 2024 S\xF6derberg & Partners Wealth Management")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: "1 1 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 32,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 380
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 30,
      color: "var(--sp-navy)",
      margin: "0 0 6px"
    }
  }, "Logg inn"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      color: "var(--gray-500)",
      margin: "0 0 28px"
    }
  }, "Velkommen tilbake til din klientportal."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement(Input, {
    label: "E-post",
    placeholder: "navn@firma.no",
    value: email,
    onChange: setEmail,
    icon: "envelope"
  }), /*#__PURE__*/React.createElement(Input, {
    label: "Passord",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    type: "password",
    value: pw,
    onChange: setPw,
    icon: "lock-alt"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      color: "var(--blue-main)",
      cursor: "pointer"
    }
  }, "Glemt passord?")), /*#__PURE__*/React.createElement(Button, {
    full: true,
    onClick: onLogin
  }, "Logg inn"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      color: "var(--gray-400)",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--gray-200)"
    }
  }), " eller ", /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      height: 1,
      background: "var(--gray-200)"
    }
  })), /*#__PURE__*/React.createElement(Button, {
    full: true,
    variant: "secondary",
    icon: "id-card",
    onClick: onLogin
  }, "Logg inn med BankID")))));
}
const SCREENS = {
  hjem: Hjem,
  investeringer: Investeringer,
  pensjon: Pensjon,
  dokumenter: Dokumenter,
  radgiver: Radgiver
};
function Portal({
  onLogout
}) {
  const [route, setRoute] = useState("hjem");
  const [mobileNav, setMobileNav] = useState(false);
  const Screen = SCREENS[route] || Hjem;
  const navigate = r => {
    setRoute(r);
    setMobileNav(false);
    window.scrollTo && window.scrollTo(0, 0);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: "100vh",
      display: "flex",
      background: "#fff",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-sidebar"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: route,
    onNavigate: navigate,
    onLogout: onLogout
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      padding: "12px 12px 0 0",
      boxSizing: "border-box"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "wp-mobilebar"
  }, /*#__PURE__*/React.createElement(MobileTopbar, {
    onMenu: () => setMobileNav(v => !v)
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflowY: "auto",
      background: "var(--gray-50)",
      borderRadius: "var(--radius-2xl) 0 0 0",
      padding: "28px 40px 48px"
    },
    className: "wp-main"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 1120,
      margin: "0 auto"
    }
  }, /*#__PURE__*/React.createElement(Screen, {
    navigate: navigate
  })))), mobileNav && /*#__PURE__*/React.createElement("div", {
    onClick: () => setMobileNav(false),
    style: {
      position: "fixed",
      inset: 0,
      background: "rgba(16,24,40,.4)",
      zIndex: 50
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: "absolute",
      top: 0,
      right: 0,
      height: "100%",
      boxShadow: "var(--shadow-xl)"
    }
  }, /*#__PURE__*/React.createElement(Sidebar, {
    active: route,
    onNavigate: navigate,
    onLogout: onLogout
  }))));
}
function App() {
  const [authed, setAuthed] = useState(false);
  return authed ? /*#__PURE__*/React.createElement(Portal, {
    onLogout: () => setAuthed(false)
  }) : /*#__PURE__*/React.createElement(Login, {
    onLogin: () => setAuthed(true)
  });
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wealth-portal/cards.jsx
try { (() => {
/* global React, Icon, Badge, Card, LineChart, nok, pct */
// ============================================================================
// Content cards — KPI value card, news card, advisor card, section helpers
// ============================================================================

function SectionTitle({
  children,
  action,
  onAction
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 24,
      color: "var(--sp-navy)"
    }
  }, children), action && /*#__PURE__*/React.createElement(DetailLink, {
    onClick: onAction
  }, action));
}
function DetailLink({
  children,
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("a", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 600,
      color: "var(--blue-main)",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      textDecoration: h ? "underline" : "none"
    }
  }, children, " ", /*#__PURE__*/React.createElement(Icon, {
    name: "right-arrow-alt",
    style: {
      fontSize: 18
    }
  }));
}
function KpiCard({
  title,
  total,
  ret,
  retPct,
  color,
  series,
  onDetail,
  detailLabel
}) {
  const positive = ret >= 0;
  // Brand convention: positive = blue (calm, not alarming), negative = neutral gray.
  const retColor = positive ? "var(--blue-main)" : "var(--gray-500)";
  return /*#__PURE__*/React.createElement(Card, {
    pad: 20,
    style: {
      flex: 1,
      minWidth: 280,
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: "var(--sp-navy)",
      marginBottom: 16
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--gray-500)"
    }
  }, "Totalverdi"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: "var(--sp-navy)",
      fontVariantNumeric: "tabular-nums",
      margin: "2px 0 14px"
    }
  }, nok(total)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--gray-500)"
    }
  }, "Avkastning siden start"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 2
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: retColor,
      fontVariantNumeric: "tabular-nums"
    }
  }, nok(ret)), /*#__PURE__*/React.createElement(Badge, {
    tone: positive ? "brand" : "neutral"
  }, pct(retPct))), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: "16px 0",
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(LineChart, {
    values: series,
    color: "var(--chart-blue)",
    height: 64,
    months: null,
    showAxis: false
  })), /*#__PURE__*/React.createElement(DetailLink, {
    onClick: onDetail
  }, detailLabel));
}
function NewsCard({
  category,
  title,
  excerpt,
  tone = "gray",
  onClick
}) {
  const [h, setH] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClick,
    onMouseEnter: () => setH(true),
    onMouseLeave: () => setH(false),
    style: {
      background: "#fff",
      border: "1px solid var(--gray-200)",
      borderRadius: "var(--radius-lg)",
      overflow: "hidden",
      cursor: "pointer",
      transition: "box-shadow .15s, transform .15s",
      boxShadow: h ? "var(--shadow-md)" : "none",
      transform: h ? "translateY(-2px)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 132,
      background: "linear-gradient(135deg, var(--secondary-200), var(--blue-100))",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--secondary-400)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "image-alt",
    style: {
      fontSize: 30
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "0.06em",
      textTransform: "uppercase",
      color: "var(--gray-400)",
      marginBottom: 6
    }
  }, category), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: "var(--sp-navy)",
      lineHeight: 1.3,
      marginBottom: 6
    }
  }, title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--gray-600)",
      lineHeight: 1.45
    }
  }, excerpt), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(DetailLink, null, "Les artikkelen"))));
}
function AdvisorCard({
  name,
  role,
  phone,
  email,
  primary
}) {
  return /*#__PURE__*/React.createElement(Card, {
    pad: 20,
    style: {
      display: "flex",
      gap: 16,
      alignItems: "center",
      flex: 1,
      minWidth: 280
    }
  }, /*#__PURE__*/React.createElement(Avatar, {
    name: name,
    size: 56
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, primary && /*#__PURE__*/React.createElement(Badge, {
    tone: "brand",
    style: {
      marginBottom: 6,
      fontSize: 12,
      padding: "2px 10px"
    }
  }, "Din r\xE5dgiver"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: "var(--sp-navy)"
    }
  }, name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--gray-500)",
      marginBottom: 10
    }
  }, role), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    icon: "phone"
  }, phone), /*#__PURE__*/React.createElement(Badge, {
    tone: "neutral",
    icon: "envelope"
  }, email))));
}
Object.assign(window, {
  SectionTitle,
  DetailLink,
  KpiCard,
  NewsCard,
  AdvisorCard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/cards.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wealth-portal/charts.jsx
try { (() => {
/* global React */
// ============================================================================
// Charts — SVG line chart (with area fill) + doughnut allocation
// ============================================================================

// Build a smooth-ish path from values normalized to a viewBox.
function buildPath(values, w, h, pad) {
  const min = Math.min(...values),
    max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * stepX, pad + (h - pad * 2) * (1 - (v - min) / range)]);
  // Catmull-Rom -> cubic bezier for a soft line
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i],
      p1 = pts[i],
      p2 = pts[i + 1],
      p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6,
      c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6,
      c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return {
    d,
    pts
  };
}
function LineChart({
  values,
  color = "var(--blue-main)",
  height = 220,
  months,
  showAxis = true
}) {
  const w = 760,
    h = height,
    pad = 8;
  const {
    d,
    pts
  } = buildPath(values, w, h, pad);
  const area = `${d} L ${pts[pts.length - 1][0]},${h - pad} L ${pts[0][0]},${h - pad} Z`;
  const gid = "g" + Math.round((color.length + values[0]) * 99 % 9999);
  const labels = months || ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${w} ${h}`,
    width: "100%",
    height: h,
    preserveAspectRatio: "none",
    style: {
      display: "block"
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("linearGradient", {
    id: gid,
    x1: "0",
    y1: "0",
    x2: "0",
    y2: "1"
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0%",
    stopColor: color,
    stopOpacity: "0.16"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "100%",
    stopColor: color,
    stopOpacity: "0"
  }))), showAxis && [0.25, 0.5, 0.75].map(f => /*#__PURE__*/React.createElement("line", {
    key: f,
    x1: pad,
    x2: w - pad,
    y1: pad + (h - pad * 2) * f,
    y2: pad + (h - pad * 2) * f,
    stroke: "var(--chart-grid)",
    strokeWidth: "1",
    strokeDasharray: "0"
  })), /*#__PURE__*/React.createElement("path", {
    d: area,
    fill: `url(#${gid})`
  }), /*#__PURE__*/React.createElement("path", {
    d: d,
    fill: "none",
    stroke: color,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    vectorEffect: "non-scaling-stroke"
  })), showAxis && months !== null && /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 8,
      padding: "0 4px"
    }
  }, labels.map(m => /*#__PURE__*/React.createElement("span", {
    key: m,
    style: {
      fontSize: 11,
      color: "var(--gray-400)"
    }
  }, m))));
}

// Doughnut from segments [{label,value,color}]
function Doughnut({
  segments,
  size = 168,
  thickness = 26,
  centerLabel,
  centerSub
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2,
    cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${size} ${size}`,
    width: size,
    height: size
  }, /*#__PURE__*/React.createElement("g", {
    transform: `rotate(-90 ${cx} ${cy})`
  }, segments.map((s, i) => {
    const frac = s.value / total;
    const dash = frac * circ;
    const el = /*#__PURE__*/React.createElement("circle", {
      key: i,
      cx: cx,
      cy: cy,
      r: r,
      fill: "none",
      stroke: s.color,
      strokeWidth: thickness,
      strokeDasharray: `${dash} ${circ - dash}`,
      strokeDashoffset: -offset
    });
    offset += dash;
    return el;
  })), centerLabel && /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy - 2,
    textAnchor: "middle",
    style: {
      fontFamily: "var(--font-sans)",
      fontWeight: 600,
      fontSize: 22,
      fill: "var(--sp-navy)"
    }
  }, centerLabel), centerSub && /*#__PURE__*/React.createElement("text", {
    x: cx,
    y: cy + 18,
    textAnchor: "middle",
    style: {
      fontFamily: "var(--font-sans)",
      fontSize: 12,
      fill: "var(--gray-500)"
    }
  }, centerSub));
}
Object.assign(window, {
  LineChart,
  Doughnut
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/charts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wealth-portal/data.jsx
try { (() => {
// ============================================================================
// Sample data — realistic Norwegian wealth-management figures
// ============================================================================
const DATA = {
  invest: {
    total: 6002474,
    ret: 1928156,
    retPct: 26.12,
    series: [4.0, 4.05, 4.12, 4.02, 4.2, 4.35, 4.28, 4.5, 4.62, 4.55, 4.7, 4.85, 4.78, 4.95, 5.1, 5.05, 5.25, 5.4, 5.35, 5.55, 5.7, 5.8, 5.92, 6.0]
  },
  pensjon: {
    total: 1200234,
    ret: -142928,
    retPct: -14.51,
    series: [1.42, 1.40, 1.41, 1.38, 1.36, 1.37, 1.34, 1.32, 1.33, 1.30, 1.28, 1.29, 1.27, 1.25, 1.26, 1.24, 1.23, 1.22, 1.21, 1.215, 1.205, 1.20, 1.20, 1.20]
  },
  allocation: [{
    label: "Kontantbeholdning",
    value: 305081,
    color: "#002359"
  }, {
    label: "Likviditetsfond",
    value: 1322441,
    color: "#0A5EDC"
  }, {
    label: "Aksjer",
    value: 3140858,
    color: "#6096E8"
  }, {
    label: "Alternative strategier",
    value: 768256,
    color: "#9747FF"
  }, {
    label: "Renter",
    value: 465838,
    color: "#A0AEC4"
  }],
  holdings: [{
    name: "Arctic Norwegian Value Creation",
    value: 612277,
    share: 7.97,
    ret: 9.41
  }, {
    name: " AMSA Emerging Markets Equity Fund",
    value: 421629,
    share: 5.49,
    ret: 4.08
  }, {
    name: "Storebrand Global Indeks",
    value: 538709,
    share: 7.01,
    ret: 11.74
  }, {
    name: "Holberg Norge",
    value: 391033,
    share: 5.09,
    ret: -3.79
  }, {
    name: "Nordea Global Equity Opportunities",
    value: 663172,
    share: 8.63,
    ret: 14.22
  }, {
    name: "DNB Teknologi",
    value: 1067364,
    share: 13.90,
    ret: 22.06
  }, {
    name: "KLP AksjeGlobal Indeks",
    value: 620494,
    share: 8.08,
    ret: 6.91
  }, {
    name: "Skagen Global",
    value: 1088197,
    share: 14.16,
    ret: 10.20
  }, {
    name: "SSGA Global Bond NOK H",
    value: 1082617,
    share: 14.09,
    ret: 0.84
  }],
  news: [{
    category: "Markedssyn",
    title: "Et sterkt kvartal for globale aksjer",
    excerpt: "Verdens børser leverte bredt i andre kvartal, drevet av lavere inflasjon og forventninger om rentekutt."
  }, {
    category: "Pensjon",
    title: "Slik påvirker rentebanen pensjonen din",
    excerpt: "Langsiktige renter har falt — vi ser på hva det betyr for fremtidig pensjonskapital."
  }, {
    category: "Bærekraft",
    title: "Nye krav til bærekraftsrapportering",
    excerpt: "Fra 2025 stilles strengere krav. Her er hva det betyr for porteføljen din."
  }],
  advisors: [{
    name: "André Lund Walker",
    role: "Senior rådgiver · Wealth Management",
    phone: "+47 922 14 087",
    email: "andre.walker@soderbergpartners.no",
    primary: true
  }, {
    name: "Michael V. Sivertsen",
    role: "Administrerende direktør",
    phone: "+47 951 33 210",
    email: "michael.sivertsen@soderbergpartners.no"
  }]
};
window.DATA = DATA;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wealth-portal/primitives.jsx
try { (() => {
/* global React */
// ============================================================================
// Söderberg & Partners WM — UI Kit primitives
// Button, Badge, Avatar, Input, Money/Return formatters
// ============================================================================
const {
  useState
} = React;

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
function Icon({
  name,
  solid,
  style
}) {
  return /*#__PURE__*/React.createElement("i", {
    className: (solid ? "bxs-" : "bx bx-") + name,
    style: style
  });
}

// --- Button ---
function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconRight,
  onClick,
  full,
  style
}) {
  const [hover, setHover] = useState(false);
  const base = {
    fontFamily: "var(--font-sans)",
    fontWeight: 600,
    cursor: "pointer",
    borderRadius: "var(--radius-md)",
    border: "1px solid transparent",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    lineHeight: 1,
    transition: "background .15s, border-color .15s, color .15s",
    width: full ? "100%" : "auto",
    fontSize: size === "sm" ? 14 : 16,
    padding: size === "sm" ? "9px 14px" : "11px 18px",
    ...style
  };
  const variants = {
    primary: {
      background: hover ? "var(--sp-navy-pressed)" : "var(--blue-main)",
      color: "#fff"
    },
    secondary: {
      background: hover ? "var(--gray-50)" : "#fff",
      color: "var(--sp-navy)",
      borderColor: "var(--gray-300)"
    },
    tertiary: {
      background: hover ? "var(--blue-50)" : "transparent",
      color: "var(--blue-main)"
    },
    destructive: {
      background: hover ? "#9f1f15" : "var(--error-700)",
      color: "#fff"
    },
    "dest-outline": {
      background: hover ? "var(--error-bg)" : "#fff",
      color: "var(--error-700)",
      borderColor: "var(--error-border)"
    }
  };
  return /*#__PURE__*/React.createElement("button", {
    style: {
      ...base,
      ...variants[variant]
    },
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false)
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    style: {
      fontSize: size === "sm" ? 16 : 18
    }
  }), children, iconRight && /*#__PURE__*/React.createElement(Icon, {
    name: iconRight,
    style: {
      fontSize: size === "sm" ? 16 : 18
    }
  }));
}

// --- Badge ---
const badgeTones = {
  brand: {
    background: "var(--blue-100)",
    color: "var(--blue-main)"
  },
  success: {
    background: "var(--success-bg)",
    color: "var(--success-700)",
    dot: "var(--success-600)"
  },
  error: {
    background: "var(--error-bg)",
    color: "var(--error-700)",
    dot: "var(--error-600)"
  },
  warning: {
    background: "var(--warning-bg)",
    color: "var(--warning-700)",
    dot: "var(--warning-600)"
  },
  neutral: {
    background: "var(--gray-100)",
    color: "var(--gray-700)"
  },
  secondary: {
    background: "var(--secondary-100)",
    color: "var(--secondary-800)"
  }
};
function Badge({
  children,
  tone = "neutral",
  dot,
  icon,
  style
}) {
  const t = badgeTones[tone] || badgeTones.neutral;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      fontSize: 14,
      fontWeight: 500,
      padding: "4px 12px",
      borderRadius: "var(--radius-pill)",
      lineHeight: 1.3,
      whiteSpace: "nowrap",
      background: t.background,
      color: t.color,
      ...style
    }
  }, dot && /*#__PURE__*/React.createElement("span", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: t.dot || t.color
    }
  }), icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    style: {
      fontSize: 15
    }
  }), children);
}

// --- Avatar (initials, navy) ---
function Avatar({
  name,
  size = 40,
  tone = "navy"
}) {
  const initials = name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const tones = {
    navy: {
      background: "var(--sp-navy)",
      color: "#fff"
    },
    blue: {
      background: "var(--blue-100)",
      color: "var(--blue-main)"
    },
    gray: {
      background: "var(--gray-100)",
      color: "var(--gray-600)"
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      width: size,
      height: size,
      borderRadius: "50%",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: size * 0.38,
      flex: "none",
      ...tones[tone]
    }
  }, initials);
}

// --- Input ---
function Input({
  label,
  placeholder,
  value,
  onChange,
  icon,
  type = "text",
  error,
  hint,
  style
}) {
  const [focus, setFocus] = useState(false);
  return /*#__PURE__*/React.createElement("label", {
    style: {
      display: "block",
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 500,
      color: "var(--gray-700)",
      marginBottom: 6
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      borderRadius: "var(--radius-md)",
      background: "#fff",
      border: "1px solid " + (error ? "var(--error-500)" : focus ? "var(--blue-main)" : "var(--gray-300)"),
      boxShadow: focus ? "0 0 0 4px var(--ring)" : "none",
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "0 12px",
      boxSizing: "border-box",
      transition: "border-color .15s, box-shadow .15s"
    }
  }, icon && /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    style: {
      color: "var(--gray-500)",
      fontSize: 18
    }
  }), /*#__PURE__*/React.createElement("input", {
    type: type,
    placeholder: placeholder,
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      border: "none",
      outline: "none",
      flex: 1,
      fontFamily: "var(--font-sans)",
      fontSize: 16,
      color: "var(--gray-900)",
      background: "transparent"
    }
  })), (error || hint) && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      marginTop: 6,
      color: error ? "var(--error-700)" : "var(--gray-500)"
    }
  }, error || hint));
}

// --- Card shell ---
function Card({
  children,
  style,
  pad = 20
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--gray-200)",
      borderRadius: "var(--radius-lg)",
      padding: pad,
      ...style
    }
  }, children);
}
Object.assign(window, {
  nok,
  pct,
  Icon,
  Button,
  Badge,
  Avatar,
  Input,
  Card
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/primitives.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wealth-portal/screens.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* global React, DATA, PageHeader, KpiCard, NewsCard, AdvisorCard, AssetAllocation, HoldingsTable, SectionTitle, Card, LineChart, Badge, Icon, Button, nok, pct */
// ============================================================================
// Screens — page bodies for the portal
// ============================================================================
const colGap = {
  display: "flex",
  flexDirection: "column",
  gap: 24
};
function Hjem({
  navigate
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: colGap
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Oversikt"
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 20,
      color: "var(--gray-600)"
    }
  }, "God ettermiddag,"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 28,
      color: "var(--sp-navy)"
    }
  }, "Isak Design Test AS")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(KpiCard, _extends({
    title: "Investeringer"
  }, DATA.invest, {
    color: "var(--chart-violet)",
    detailLabel: "Se detaljer om investeringer",
    onDetail: () => navigate("investeringer")
  })), /*#__PURE__*/React.createElement(KpiCard, _extends({
    title: "Pensjon"
  }, DATA.pensjon, {
    color: "var(--chart-blue)",
    detailLabel: "Se detaljer om pensjon",
    onDetail: () => navigate("pensjon")
  }))), /*#__PURE__*/React.createElement(AssetAllocation, {
    data: DATA.allocation
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(SectionTitle, {
    action: "Se alle nyheter"
  }, "Nyheter"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
      gap: 24
    }
  }, DATA.news.map(n => /*#__PURE__*/React.createElement(NewsCard, _extends({
    key: n.title
  }, n))))));
}
function PerfHeader({
  d,
  color
}) {
  const positive = d.ret >= 0;
  const retColor = positive ? "var(--blue-main)" : "var(--gray-500)";
  return /*#__PURE__*/React.createElement(Card, {
    pad: 24
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 40,
      flexWrap: "wrap",
      alignItems: "flex-start",
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--gray-500)"
    }
  }, "Totalverdi"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 34,
      fontWeight: 600,
      color: "var(--sp-navy)",
      fontVariantNumeric: "tabular-nums"
    }
  }, nok(d.total))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--gray-500)"
    }
  }, "Avkastning siden start"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      fontWeight: 600,
      color: retColor,
      fontVariantNumeric: "tabular-nums"
    }
  }, nok(d.ret)), /*#__PURE__*/React.createElement(Badge, {
    tone: positive ? "brand" : "neutral",
    dot: true
  }, pct(d.retPct)))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: "auto",
      display: "flex",
      gap: 8,
      alignItems: "center"
    }
  }, ["1M", "3M", "1Å", "Siden start"].map((p, i) => /*#__PURE__*/React.createElement("span", {
    key: p,
    style: {
      fontSize: 13,
      fontWeight: 600,
      padding: "6px 12px",
      borderRadius: "var(--radius-pill)",
      background: i === 3 ? "var(--blue-100)" : "transparent",
      color: i === 3 ? "var(--blue-main)" : "var(--gray-500)",
      cursor: "pointer"
    }
  }, p)))), /*#__PURE__*/React.createElement(LineChart, {
    values: d.series,
    color: "var(--chart-blue)",
    height: 240,
    months: ["2019", "2020", "2021", "2022", "2023", "2024"]
  }));
}
function Investeringer() {
  return /*#__PURE__*/React.createElement("div", {
    style: colGap
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Investeringer"
  }), /*#__PURE__*/React.createElement(PerfHeader, {
    d: DATA.invest,
    color: "var(--chart-violet)"
  }), /*#__PURE__*/React.createElement(AssetAllocation, {
    data: DATA.allocation
  }), /*#__PURE__*/React.createElement(HoldingsTable, {
    rows: DATA.holdings
  }));
}
function Pensjon() {
  return /*#__PURE__*/React.createElement("div", {
    style: colGap
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Pensjon"
  }), /*#__PURE__*/React.createElement(PerfHeader, {
    d: DATA.pensjon,
    color: "var(--chart-blue)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement(Card, {
    pad: 24,
    style: {
      flex: 1,
      minWidth: 280
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      fontWeight: 600,
      color: "var(--sp-navy)",
      marginBottom: 14
    }
  }, "Pensjonsavtaler"), [["Innskuddspensjon (OTP)", 812400], ["Egen pensjonskonto", 254834], ["IPS — Individuell sparing", 133000]].map(([n, v]) => /*#__PURE__*/React.createElement("div", {
    key: n,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid var(--gray-100)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      color: "var(--sp-navy)"
    }
  }, n), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--sp-navy)",
      fontVariantNumeric: "tabular-nums"
    }
  }, nok(v))))), /*#__PURE__*/React.createElement(Card, {
    pad: 24,
    style: {
      flex: 1,
      minWidth: 280,
      background: "var(--blue-50)",
      border: "1px solid var(--blue-200)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bulb",
    style: {
      fontSize: 24,
      color: "var(--blue-main)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      color: "var(--sp-navy)",
      margin: "10px 0 6px"
    }
  }, "Estimert pensjon ved 67 \xE5r"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: "var(--gray-600)",
      lineHeight: 1.5,
      marginBottom: 16
    }
  }, "Basert p\xE5 dagens innbetalinger og en forventet \xE5rlig avkastning p\xE5 4,5 %."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: "var(--sp-navy)"
    }
  }, "~ 28 400 kr/mnd"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    size: "sm",
    iconRight: "right-arrow-alt"
  }, "Beregn pensjon")))));
}
function Dokumenter() {
  const docs = [{
    name: "Kvartalsrapport Q2 2024",
    type: "Rapport",
    date: "02.06.2024",
    size: "1,8 MB"
  }, {
    name: "Årsoppgave 2023",
    type: "Oppgave",
    date: "15.01.2024",
    size: "640 kB"
  }, {
    name: "Porteføljeanalyse — mai 2024",
    type: "Analyse",
    date: "03.05.2024",
    size: "2,1 MB"
  }, {
    name: "Avtaledokument — forvaltning",
    type: "Avtale",
    date: "12.11.2023",
    size: "320 kB"
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: colGap
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "Dokumenter"
  }), /*#__PURE__*/React.createElement(Card, {
    pad: 8
  }, docs.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: d.name,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      padding: "16px 16px",
      borderBottom: i < docs.length - 1 ? "1px solid var(--gray-100)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "var(--radius-md)",
      background: "var(--blue-100)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file-blank",
    style: {
      fontSize: 20,
      color: "var(--blue-main)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      fontWeight: 600,
      color: "var(--sp-navy)"
    }
  }, d.name), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--gray-500)"
    }
  }, d.type, " \xB7 ", d.date, " \xB7 ", d.size)), /*#__PURE__*/React.createElement(Button, {
    variant: "tertiary",
    size: "sm",
    icon: "download"
  }, "Last ned")))));
}
function Radgiver() {
  return /*#__PURE__*/React.createElement("div", {
    style: colGap
  }, /*#__PURE__*/React.createElement(PageHeader, {
    title: "R\xE5dgiver"
  }), /*#__PURE__*/React.createElement(SectionTitle, null, "Dine r\xE5dgivere"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      flexWrap: "wrap"
    }
  }, DATA.advisors.map(a => /*#__PURE__*/React.createElement(AdvisorCard, _extends({
    key: a.name
  }, a)))), /*#__PURE__*/React.createElement(Card, {
    pad: 24,
    style: {
      background: "var(--sp-navy)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 20,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 240
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 24
    }
  }, "Book et m\xF8te"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 15,
      color: "var(--blue-200)",
      marginTop: 6
    }
  }, "Snakk med r\xE5dgiveren din om portef\xF8ljen, pensjon eller nye investeringer.")), /*#__PURE__*/React.createElement(Button, {
    variant: "secondary",
    iconRight: "calendar"
  }, "Finn et tidspunkt"))));
}
Object.assign(window, {
  Hjem,
  Investeringer,
  Pensjon,
  Dokumenter,
  Radgiver
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wealth-portal/shell.jsx
try { (() => {
/* global React, Icon, Badge */
// ============================================================================
// App shell — Sidebar (desktop), PageHeader, Topbar (mobile)
// ============================================================================
const {
  useState: useStateShell
} = React;
const NAV = [{
  id: "hjem",
  label: "Hjem",
  icon: "home-alt-2"
}, {
  id: "investeringer",
  label: "Investeringer",
  icon: "pie-chart-alt-2"
}, {
  id: "pensjon",
  label: "Pensjon",
  icon: "wallet"
}, {
  id: "dokumenter",
  label: "Dokumenter",
  icon: "file"
}, {
  id: "radgiver",
  label: "Rådgiver",
  icon: "conversation"
}];
function NavItem({
  item,
  active,
  onClick
}) {
  const [hover, setHover] = useStateShell(false);
  return /*#__PURE__*/React.createElement("button", {
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      height: 44,
      width: "100%",
      borderRadius: "var(--radius-md)",
      padding: "0 12px",
      boxSizing: "border-box",
      border: "none",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: 16,
      fontWeight: 500,
      textAlign: "left",
      color: "var(--sp-navy)",
      transition: "background .15s",
      background: active ? "var(--blue-100)" : hover ? "var(--gray-50)" : "transparent"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: item.icon,
    style: {
      fontSize: 20,
      color: active ? "var(--blue-main)" : "var(--sp-navy)"
    }
  }), item.label);
}
function Sidebar({
  active,
  onNavigate,
  onLogout
}) {
  return /*#__PURE__*/React.createElement("aside", {
    style: {
      width: 280,
      flex: "none",
      background: "#fff",
      height: "100%",
      boxSizing: "border-box",
      padding: "32px 24px",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/spwm-logo.svg",
    alt: "S\xF6derberg & Partners Wealth Management",
    style: {
      height: 34,
      marginBottom: 40,
      marginLeft: 4
    }
  }), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, NAV.map(n => /*#__PURE__*/React.createElement(NavItem, {
    key: n.id,
    item: n,
    active: active === n.id,
    onClick: () => onNavigate(n.id)
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--gray-500)",
      marginBottom: 4
    }
  }, "Klientvelger"), /*#__PURE__*/React.createElement(ClientSelector, null)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(NavItem, {
    item: {
      label: "Min side",
      icon: "user"
    },
    onClick: () => onNavigate("hjem")
  }), /*#__PURE__*/React.createElement(NavItem, {
    item: {
      label: "Logg ut",
      icon: "log-out"
    },
    onClick: onLogout
  }))));
}
function ClientSelector({
  mobile
}) {
  const clients = ["Isak Design Test AS", "Familien Berg Holding", "Privat — Isak Berg"];
  const [open, setOpen] = useStateShell(false);
  const [sel, setSel] = useStateShell(0);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setOpen(o => !o),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      width: mobile ? "auto" : "100%",
      height: 40,
      borderRadius: "var(--radius-md)",
      padding: "0 12px",
      boxSizing: "border-box",
      border: "1px solid var(--gray-300)",
      background: "#fff",
      cursor: "pointer",
      fontFamily: "var(--font-sans)",
      fontSize: 16,
      fontWeight: 500,
      color: "var(--sp-navy)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "group",
    style: {
      fontSize: 20
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, clients[sel]), /*#__PURE__*/React.createElement(Icon, {
    name: "chevron-down",
    style: {
      fontSize: 18,
      marginLeft: "auto",
      color: "var(--gray-500)"
    }
  })), open && /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      bottom: mobile ? "auto" : 48,
      top: mobile ? 48 : "auto",
      left: 0,
      width: 232,
      background: "#fff",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--gray-200)",
      boxShadow: "var(--shadow-lg)",
      padding: 6,
      zIndex: 40
    }
  }, clients.map((c, i) => /*#__PURE__*/React.createElement("button", {
    key: c,
    onClick: () => {
      setSel(i);
      setOpen(false);
    },
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      width: "100%",
      border: "none",
      background: i === sel ? "var(--blue-100)" : "transparent",
      cursor: "pointer",
      textAlign: "left",
      padding: "8px 10px",
      borderRadius: 6,
      fontFamily: "var(--font-sans)",
      fontSize: 14,
      color: "var(--sp-navy)",
      fontWeight: i === sel ? 600 : 400
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "group",
    style: {
      fontSize: 16,
      color: "var(--gray-500)"
    }
  }), c, i === sel && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    style: {
      marginLeft: "auto",
      color: "var(--blue-main)"
    }
  })))));
}
function PageHeader({
  title,
  date = "02.06.2024"
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0,
      fontFamily: "var(--font-display)",
      fontWeight: 500,
      fontSize: 30,
      lineHeight: "38px",
      color: "var(--sp-navy)"
    }
  }, title), /*#__PURE__*/React.createElement(Badge, {
    tone: "brand",
    icon: "info-circle"
  }, "Rapporteringsdato: ", date));
}
function MobileTopbar({
  onMenu
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 64,
      background: "#fff",
      borderBottom: "1px solid var(--gray-200)",
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: "../../assets/spwm-mark.svg",
    alt: "",
    style: {
      height: 30,
      flex: "none"
    },
    onError: e => {
      e.target.style.display = 'none';
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(ClientSelector, {
    mobile: true
  })), /*#__PURE__*/React.createElement("button", {
    onClick: onMenu,
    style: {
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "var(--sp-navy)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "menu-alt-right",
    style: {
      fontSize: 26
    }
  })));
}
Object.assign(window, {
  Sidebar,
  PageHeader,
  MobileTopbar,
  ClientSelector,
  NAV
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/shell.jsx", error: String((e && e.message) || e) }); }

// ui_kits/wealth-portal/tables.jsx
try { (() => {
/* global React, Icon, Card, Doughnut, nok, pct, SectionTitle */
// ============================================================================
// Tables — Asset allocation overview + Holdings (Beholdning)
// ============================================================================

const th = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--gray-500)",
  textAlign: "left",
  padding: "0 0 12px",
  borderBottom: "1px solid var(--gray-200)"
};
const td = {
  fontSize: 15,
  color: "var(--sp-navy)",
  padding: "14px 0",
  borderBottom: "1px solid var(--gray-100)",
  verticalAlign: "middle"
};
const tdNum = {
  ...td,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums"
};
function AssetAllocation({
  data
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return /*#__PURE__*/React.createElement(Card, {
    pad: 24
  }, /*#__PURE__*/React.createElement(SectionTitle, null, "Assetoversikt"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 32,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 320
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse"
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Aktivklasser"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "Markedsverdi"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "Fordeling"))), /*#__PURE__*/React.createElement("tbody", null, data.map(d => /*#__PURE__*/React.createElement("tr", {
    key: d.label
  }, /*#__PURE__*/React.createElement("td", {
    style: td
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "inline-flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 10,
      height: 10,
      borderRadius: 3,
      background: d.color,
      flex: "none"
    }
  }), d.label)), /*#__PURE__*/React.createElement("td", {
    style: tdNum
  }, nok(d.value)), /*#__PURE__*/React.createElement("td", {
    style: tdNum
  }, (d.value / total * 100).toFixed(2).replace(".", ","), " %"))), /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    style: {
      ...td,
      fontWeight: 600,
      borderBottom: "none"
    }
  }, "Sum"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdNum,
      fontWeight: 600,
      borderBottom: "none"
    }
  }, nok(total)), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdNum,
      fontWeight: 600,
      borderBottom: "none"
    }
  }, "100,00 %"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Doughnut, {
    segments: data,
    centerLabel: (data[2].value / total * 100).toFixed(0) + "%",
    centerSub: "Aksjer"
  }))));
}
function HoldingsTable({
  rows
}) {
  return /*#__PURE__*/React.createElement(Card, {
    pad: 24
  }, /*#__PURE__*/React.createElement(SectionTitle, {
    action: "Last ned rapport"
  }, "Beholdning"), /*#__PURE__*/React.createElement("div", {
    style: {
      overflowX: "auto"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      minWidth: 560
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: th
  }, "Aksje / fond"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "Markedsverdi"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "Andel"), /*#__PURE__*/React.createElement("th", {
    style: {
      ...th,
      textAlign: "right"
    }
  }, "Avkastning periode"))), /*#__PURE__*/React.createElement("tbody", null, rows.map(r => /*#__PURE__*/React.createElement("tr", {
    key: r.name
  }, /*#__PURE__*/React.createElement("td", {
    style: td
  }, r.name), /*#__PURE__*/React.createElement("td", {
    style: tdNum
  }, nok(r.value)), /*#__PURE__*/React.createElement("td", {
    style: tdNum
  }, r.share.toFixed(2).replace(".", ","), " %"), /*#__PURE__*/React.createElement("td", {
    style: {
      ...tdNum,
      color: r.ret >= 0 ? "var(--blue-main)" : "var(--gray-500)",
      fontWeight: 600
    }
  }, pct(r.ret))))))));
}
Object.assign(window, {
  AssetAllocation,
  HoldingsTable
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/wealth-portal/tables.jsx", error: String((e && e.message) || e) }); }

})();
