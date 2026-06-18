/* global React, ReactDOM, Sidebar, MobileTopbar, PageHeader, Button, Input, Icon, Hjem, Investeringer, Pensjon, Dokumenter, Radgiver */
// ============================================================================
// App — login + authenticated portal shell + simple router
// ============================================================================
const { useState } = React;

function Login({ onLogin }) {
  const [email, setEmail] = useState("isak@designtest.no");
  const [pw, setPw] = useState("");
  return (
    <div style={{ minHeight: "100vh", display: "flex", background: "var(--gray-50)" }}>
      {/* Brand panel */}
      <div style={{ flex: "1 1 0", background: "var(--sp-navy)", color: "#fff", padding: 56,
        display: "flex", flexDirection: "column", justifyContent: "space-between", minWidth: 0 }}>
        <img src="../../assets/spwm-logo-white.svg" alt="Söderberg & Partners Wealth Management" style={{ height: 34, alignSelf: "flex-start" }} />
        <div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 40, lineHeight: 1.15 }}>
            Din formue,<br />forvaltet med omtanke.
          </div>
          <div style={{ fontSize: 16, color: "var(--blue-200)", marginTop: 20, maxWidth: 420, lineHeight: 1.5 }}>
            Få full oversikt over investeringer og pensjon, og en direkte linje til din personlige rådgiver.
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--secondary-400)" }}>© 2024 Söderberg & Partners Wealth Management</div>
      </div>
      {/* Form */}
      <div style={{ flex: "1 1 0", display: "flex", alignItems: "center", justifyContent: "center", padding: 32, minWidth: 0 }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: 30, color: "var(--sp-navy)", margin: "0 0 6px" }}>Logg inn</h1>
          <p style={{ fontSize: 15, color: "var(--gray-500)", margin: "0 0 28px" }}>Velkommen tilbake til din klientportal.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <Input label="E-post" placeholder="navn@firma.no" value={email} onChange={setEmail} icon="envelope" />
            <Input label="Passord" placeholder="••••••••" type="password" value={pw} onChange={setPw} icon="lock-alt" />
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <a style={{ fontSize: 14, fontWeight: 600, color: "var(--blue-main)", cursor: "pointer" }}>Glemt passord?</a>
            </div>
            <Button full onClick={onLogin}>Logg inn</Button>
            <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--gray-400)", fontSize: 13 }}>
              <span style={{ flex: 1, height: 1, background: "var(--gray-200)" }} /> eller <span style={{ flex: 1, height: 1, background: "var(--gray-200)" }} />
            </div>
            <Button full variant="secondary" icon="id-card" onClick={onLogin}>Logg inn med BankID</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const SCREENS = { hjem: Hjem, investeringer: Investeringer, pensjon: Pensjon, dokumenter: Dokumenter, radgiver: Radgiver };

function Portal({ onLogout }) {
  const [route, setRoute] = useState("hjem");
  const [mobileNav, setMobileNav] = useState(false);
  const Screen = SCREENS[route] || Hjem;
  const navigate = (r) => { setRoute(r); setMobileNav(false); window.scrollTo && window.scrollTo(0, 0); };
  return (
    <div style={{ height: "100vh", display: "flex", background: "#fff", overflow: "hidden" }}>
      {/* Desktop sidebar */}
      <div className="wp-sidebar"><Sidebar active={route} onNavigate={navigate} onLogout={onLogout} /></div>
      {/* Main */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "12px 12px 0 0", boxSizing: "border-box" }}>
        <div className="wp-mobilebar"><MobileTopbar onMenu={() => setMobileNav(v => !v)} /></div>
        <main style={{ flex: 1, overflowY: "auto", background: "var(--gray-50)", borderRadius: "var(--radius-2xl) 0 0 0",
          padding: "28px 40px 48px" }} className="wp-main">
          <div style={{ maxWidth: 1120, margin: "0 auto" }}><Screen navigate={navigate} /></div>
        </main>
      </div>
      {/* Mobile nav drawer */}
      {mobileNav && (
        <div onClick={() => setMobileNav(false)} style={{ position: "fixed", inset: 0, background: "rgba(16,24,40,.4)", zIndex: 50 }}>
          <div onClick={e => e.stopPropagation()} style={{ position: "absolute", top: 0, right: 0, height: "100%", boxShadow: "var(--shadow-xl)" }}>
            <Sidebar active={route} onNavigate={navigate} onLogout={onLogout} />
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useState(false);
  return authed ? <Portal onLogout={() => setAuthed(false)} /> : <Login onLogin={() => setAuthed(true)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
