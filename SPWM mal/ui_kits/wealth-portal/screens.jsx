/* global React, DATA, PageHeader, KpiCard, NewsCard, AdvisorCard, AssetAllocation, HoldingsTable, SectionTitle, Card, LineChart, Badge, Icon, Button, nok, pct */
// ============================================================================
// Screens — page bodies for the portal
// ============================================================================
const colGap = { display: "flex", flexDirection: "column", gap: 24 };

function Hjem({ navigate }) {
  return (
    <div style={colGap}>
      <PageHeader title="Oversikt" />
      <div>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--gray-600)" }}>God ettermiddag,</div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 28, color: "var(--sp-navy)" }}>Isak Design Test AS</div>
      </div>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <KpiCard title="Investeringer" {...DATA.invest} color="var(--chart-violet)"
          detailLabel="Se detaljer om investeringer" onDetail={() => navigate("investeringer")} />
        <KpiCard title="Pensjon" {...DATA.pensjon} color="var(--chart-blue)"
          detailLabel="Se detaljer om pensjon" onDetail={() => navigate("pensjon")} />
      </div>
      <AssetAllocation data={DATA.allocation} />
      <div>
        <SectionTitle action="Se alle nyheter">Nyheter</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 24 }}>
          {DATA.news.map(n => <NewsCard key={n.title} {...n} />)}
        </div>
      </div>
    </div>
  );
}

function PerfHeader({ d, color }) {
  const positive = d.ret >= 0;
  const retColor = positive ? "var(--blue-main)" : "var(--gray-500)";
  return (
    <Card pad={24}>
      <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Totalverdi</div>
          <div style={{ fontSize: 34, fontWeight: 600, color: "var(--sp-navy)", fontVariantNumeric: "tabular-nums" }}>{nok(d.total)}</div>
        </div>
        <div>
          <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Avkastning siden start</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: retColor, fontVariantNumeric: "tabular-nums" }}>{nok(d.ret)}</span>
            <Badge tone={positive ? "brand" : "neutral"} dot>{pct(d.retPct)}</Badge>
          </div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {["1M","3M","1Å","Siden start"].map((p,i) => (
            <span key={p} style={{ fontSize: 13, fontWeight: 600, padding: "6px 12px", borderRadius: "var(--radius-pill)",
              background: i===3 ? "var(--blue-100)" : "transparent", color: i===3 ? "var(--blue-main)" : "var(--gray-500)", cursor: "pointer" }}>{p}</span>
          ))}
        </div>
      </div>
      <LineChart values={d.series} color="var(--chart-blue)" height={240}
        months={["2019","2020","2021","2022","2023","2024"]} />
    </Card>
  );
}

function Investeringer() {
  return (
    <div style={colGap}>
      <PageHeader title="Investeringer" />
      <PerfHeader d={DATA.invest} color="var(--chart-violet)" />
      <AssetAllocation data={DATA.allocation} />
      <HoldingsTable rows={DATA.holdings} />
    </div>
  );
}

function Pensjon() {
  return (
    <div style={colGap}>
      <PageHeader title="Pensjon" />
      <PerfHeader d={DATA.pensjon} color="var(--chart-blue)" />
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <Card pad={24} style={{ flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--sp-navy)", marginBottom: 14 }}>Pensjonsavtaler</div>
          {[["Innskuddspensjon (OTP)", 812400],["Egen pensjonskonto", 254834],["IPS — Individuell sparing", 133000]].map(([n,v]) => (
            <div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid var(--gray-100)" }}>
              <span style={{ fontSize: 15, color: "var(--sp-navy)" }}>{n}</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "var(--sp-navy)", fontVariantNumeric: "tabular-nums" }}>{nok(v)}</span>
            </div>
          ))}
        </Card>
        <Card pad={24} style={{ flex: 1, minWidth: 280, background: "var(--blue-50)", border: "1px solid var(--blue-200)" }}>
          <Icon name="bulb" style={{ fontSize: 24, color: "var(--blue-main)" }} />
          <div style={{ fontSize: 18, fontWeight: 600, color: "var(--sp-navy)", margin: "10px 0 6px" }}>Estimert pensjon ved 67 år</div>
          <div style={{ fontSize: 15, color: "var(--gray-600)", lineHeight: 1.5, marginBottom: 16 }}>Basert på dagens innbetalinger og en forventet årlig avkastning på 4,5 %.</div>
          <div style={{ fontSize: 28, fontWeight: 600, color: "var(--sp-navy)" }}>~ 28 400 kr/mnd</div>
          <div style={{ marginTop: 16 }}><Button variant="secondary" size="sm" iconRight="right-arrow-alt">Beregn pensjon</Button></div>
        </Card>
      </div>
    </div>
  );
}

function Dokumenter() {
  const docs = [
    { name: "Kvartalsrapport Q2 2024", type: "Rapport", date: "02.06.2024", size: "1,8 MB" },
    { name: "Årsoppgave 2023", type: "Oppgave", date: "15.01.2024", size: "640 kB" },
    { name: "Porteføljeanalyse — mai 2024", type: "Analyse", date: "03.05.2024", size: "2,1 MB" },
    { name: "Avtaledokument — forvaltning", type: "Avtale", date: "12.11.2023", size: "320 kB" },
  ];
  return (
    <div style={colGap}>
      <PageHeader title="Dokumenter" />
      <Card pad={8}>
        {docs.map((d, i) => (
          <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 16px",
            borderBottom: i < docs.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
            <span style={{ width: 40, height: 40, borderRadius: "var(--radius-md)", background: "var(--blue-100)",
              display: "flex", alignItems: "center", justifyContent: "center", flex: "none" }}>
              <Icon name="file-blank" style={{ fontSize: 20, color: "var(--blue-main)" }} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--sp-navy)" }}>{d.name}</div>
              <div style={{ fontSize: 13, color: "var(--gray-500)" }}>{d.type} · {d.date} · {d.size}</div>
            </div>
            <Button variant="tertiary" size="sm" icon="download">Last ned</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Radgiver() {
  return (
    <div style={colGap}>
      <PageHeader title="Rådgiver" />
      <SectionTitle>Dine rådgivere</SectionTitle>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {DATA.advisors.map(a => <AdvisorCard key={a.name} {...a} />)}
      </div>
      <Card pad={24} style={{ background: "var(--sp-navy)", color: "#fff" }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 24 }}>Book et møte</div>
            <div style={{ fontSize: 15, color: "var(--blue-200)", marginTop: 6 }}>Snakk med rådgiveren din om porteføljen, pensjon eller nye investeringer.</div>
          </div>
          <Button variant="secondary" iconRight="calendar">Finn et tidspunkt</Button>
        </div>
      </Card>
    </div>
  );
}

Object.assign(window, { Hjem, Investeringer, Pensjon, Dokumenter, Radgiver });
