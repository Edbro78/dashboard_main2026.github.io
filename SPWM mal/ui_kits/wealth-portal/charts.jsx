/* global React */
// ============================================================================
// Charts — SVG line chart (with area fill) + doughnut allocation
// ============================================================================

// Build a smooth-ish path from values normalized to a viewBox.
function buildPath(values, w, h, pad) {
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (w - pad * 2) / (values.length - 1);
  const pts = values.map((v, i) => [pad + i * stepX, pad + (h - pad * 2) * (1 - (v - min) / range)]);
  // Catmull-Rom -> cubic bezier for a soft line
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return { d, pts };
}

function LineChart({ values, color = "var(--blue-main)", height = 220, months, showAxis = true }) {
  const w = 760, h = height, pad = 8;
  const { d, pts } = buildPath(values, w, h, pad);
  const area = `${d} L ${pts[pts.length - 1][0]},${h - pad} L ${pts[0][0]},${h - pad} Z`;
  const gid = "g" + Math.round((color.length + values[0]) * 99 % 9999);
  const labels = months || ["Jan", "Feb", "Mar", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Des"];
  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.16" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {showAxis && [0.25, 0.5, 0.75].map(f => (
          <line key={f} x1={pad} x2={w - pad} y1={pad + (h - pad * 2) * f} y2={pad + (h - pad * 2) * f}
            stroke="var(--chart-grid)" strokeWidth="1" strokeDasharray="0" />
        ))}
        <path d={area} fill={`url(#${gid})`} />
        <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" />
      </svg>
      {showAxis && months !== null && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, padding: "0 4px" }}>
          {labels.map(m => <span key={m} style={{ fontSize: 11, color: "var(--gray-400)" }}>{m}</span>)}
        </div>
      )}
    </div>
  );
}

// Doughnut from segments [{label,value,color}]
function Doughnut({ segments, size = 168, thickness = 26, centerLabel, centerSub }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        {segments.map((s, i) => {
          const frac = s.value / total;
          const dash = frac * circ;
          const el = (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={thickness}
              strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-offset} />
          );
          offset += dash;
          return el;
        })}
      </g>
      {centerLabel && <text x={cx} y={cy - 2} textAnchor="middle" style={{ fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 22, fill: "var(--sp-navy)" }}>{centerLabel}</text>}
      {centerSub && <text x={cx} y={cy + 18} textAnchor="middle" style={{ fontFamily: "var(--font-sans)", fontSize: 12, fill: "var(--gray-500)" }}>{centerSub}</text>}
    </svg>
  );
}

Object.assign(window, { LineChart, Doughnut });
