/* global React, Icon, Badge, Card, LineChart, nok, pct */
// ============================================================================
// Content cards — KPI value card, news card, advisor card, section helpers
// ============================================================================

function SectionTitle({ children, action, onAction }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 24, color: "var(--sp-navy)" }}>{children}</h2>
      {action && <DetailLink onClick={onAction}>{action}</DetailLink>}
    </div>
  );
}

function DetailLink({ children, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <a onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ cursor: "pointer", fontSize: 14, fontWeight: 600, color: "var(--blue-main)",
        display: "inline-flex", alignItems: "center", gap: 6, textDecoration: h ? "underline" : "none" }}>
      {children} <Icon name="right-arrow-alt" style={{ fontSize: 18 }} />
    </a>
  );
}

function KpiCard({ title, total, ret, retPct, color, series, onDetail, detailLabel }) {
  const positive = ret >= 0;
  // Brand convention: positive = blue (calm, not alarming), negative = neutral gray.
  const retColor = positive ? "var(--blue-main)" : "var(--gray-500)";
  return (
    <Card pad={20} style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: "var(--sp-navy)", marginBottom: 16 }}>{title}</div>
      <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Totalverdi</div>
      <div style={{ fontSize: 28, fontWeight: 600, color: "var(--sp-navy)", fontVariantNumeric: "tabular-nums", margin: "2px 0 14px" }}>{nok(total)}</div>
      <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Avkastning siden start</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 600, color: retColor, fontVariantNumeric: "tabular-nums" }}>{nok(ret)}</span>
        <Badge tone={positive ? "brand" : "neutral"}>{pct(retPct)}</Badge>
      </div>
      <div style={{ margin: "16px 0", flex: 1 }}>
        <LineChart values={series} color="var(--chart-blue)" height={64} months={null} showAxis={false} />
      </div>
      <DetailLink onClick={onDetail}>{detailLabel}</DetailLink>
    </Card>
  );
}

function NewsCard({ category, title, excerpt, tone = "gray", onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <div onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ background: "#fff", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-lg)",
        overflow: "hidden", cursor: "pointer", transition: "box-shadow .15s, transform .15s",
        boxShadow: h ? "var(--shadow-md)" : "none", transform: h ? "translateY(-2px)" : "none" }}>
      <div style={{ height: 132, background: "linear-gradient(135deg, var(--secondary-200), var(--blue-100))",
        display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-400)" }}>
        <Icon name="image-alt" style={{ fontSize: 30 }} />
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gray-400)", marginBottom: 6 }}>{category}</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--sp-navy)", lineHeight: 1.3, marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 14, color: "var(--gray-600)", lineHeight: 1.45 }}>{excerpt}</div>
        <div style={{ marginTop: 12 }}><DetailLink>Les artikkelen</DetailLink></div>
      </div>
    </div>
  );
}

function AdvisorCard({ name, role, phone, email, primary }) {
  return (
    <Card pad={20} style={{ display: "flex", gap: 16, alignItems: "center", flex: 1, minWidth: 280 }}>
      <Avatar name={name} size={56} />
      <div style={{ minWidth: 0 }}>
        {primary && <Badge tone="brand" style={{ marginBottom: 6, fontSize: 12, padding: "2px 10px" }}>Din rådgiver</Badge>}
        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--sp-navy)" }}>{name}</div>
        <div style={{ fontSize: 14, color: "var(--gray-500)", marginBottom: 10 }}>{role}</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge tone="neutral" icon="phone">{phone}</Badge>
          <Badge tone="neutral" icon="envelope">{email}</Badge>
        </div>
      </div>
    </Card>
  );
}

Object.assign(window, { SectionTitle, DetailLink, KpiCard, NewsCard, AdvisorCard });
