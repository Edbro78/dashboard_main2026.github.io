/* global React, Icon, Card, Doughnut, nok, pct, SectionTitle */
// ============================================================================
// Tables — Asset allocation overview + Holdings (Beholdning)
// ============================================================================

const th = { fontSize: 13, fontWeight: 600, color: "var(--gray-500)", textAlign: "left", padding: "0 0 12px", borderBottom: "1px solid var(--gray-200)" };
const td = { fontSize: 15, color: "var(--sp-navy)", padding: "14px 0", borderBottom: "1px solid var(--gray-100)", verticalAlign: "middle" };
const tdNum = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums" };

function AssetAllocation({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card pad={24}>
      <SectionTitle>Assetoversikt</SectionTitle>
      <div style={{ display: "flex", gap: 32, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 320 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr>
              <th style={th}>Aktivklasser</th>
              <th style={{ ...th, textAlign: "right" }}>Markedsverdi</th>
              <th style={{ ...th, textAlign: "right" }}>Fordeling</th>
            </tr></thead>
            <tbody>
              {data.map(d => (
                <tr key={d.label}>
                  <td style={td}><span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flex: "none" }} />{d.label}</span></td>
                  <td style={tdNum}>{nok(d.value)}</td>
                  <td style={tdNum}>{(d.value / total * 100).toFixed(2).replace(".", ",")} %</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, fontWeight: 600, borderBottom: "none" }}>Sum</td>
                <td style={{ ...tdNum, fontWeight: 600, borderBottom: "none" }}>{nok(total)}</td>
                <td style={{ ...tdNum, fontWeight: 600, borderBottom: "none" }}>100,00 %</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Doughnut segments={data} centerLabel={(data[2].value / total * 100).toFixed(0) + "%"} centerSub="Aksjer" />
        </div>
      </div>
    </Card>
  );
}

function HoldingsTable({ rows }) {
  return (
    <Card pad={24}>
      <SectionTitle action="Last ned rapport">Beholdning</SectionTitle>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
          <thead><tr>
            <th style={th}>Aksje / fond</th>
            <th style={{ ...th, textAlign: "right" }}>Markedsverdi</th>
            <th style={{ ...th, textAlign: "right" }}>Andel</th>
            <th style={{ ...th, textAlign: "right" }}>Avkastning periode</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.name}>
                <td style={td}>{r.name}</td>
                <td style={tdNum}>{nok(r.value)}</td>
                <td style={tdNum}>{r.share.toFixed(2).replace(".", ",")} %</td>
                <td style={{ ...tdNum, color: r.ret >= 0 ? "var(--blue-main)" : "var(--gray-500)", fontWeight: 600 }}>{pct(r.ret)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

Object.assign(window, { AssetAllocation, HoldingsTable });
