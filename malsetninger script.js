const { useState, useMemo, useEffect, useRef } = React;
const {
  TrendingUp,
  ShieldCheck,
  Users,
  Anchor,
  Heart,
  Briefcase,
  CheckCircle2,
  Activity,
  History,
  Layers,
  ClipboardCheck,
  Landmark,
  MoreHorizontal,
} = LucideReact;

/** Første komplette JSON-objekt etter markør (balanserte { }; strengar og escapes). */
function extractJsonObjectAfterMarker(text, marker) {
  const raw = String(text || '').replace(/^\uFEFF/, '');
  const idx = raw.indexOf(marker);
  if (idx < 0) return null;
  const braceStart = raw.indexOf('{', idx + marker.length);
  if (braceStart < 0) return null;
  let depth = 0;
  let inString = false;
  let esc = false;
  for (let i = braceStart; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (esc) {
        esc = false;
        continue;
      }
      if (c === '\\') {
        esc = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return raw.slice(braceStart, i + 1);
    }
  }
  return null;
}

/** Matcher eksport-rekkefølge for «Mål {tittel}»-linjer (same som goalOptions i App). */
const MALSETNINGER_MAAL_TITLE_TO_ID = {
  'Bevare formuen': 'bevare_formuen',
  Pensjon: 'pensjon',
  'Hjelpe barn': 'hjelpe_barn',
  Generasjonsskifte: 'generesjonsskifte',
  'Økonomisk trygghet': 'okonomisk_trygghet',
  Formuesvekst: 'formuesvekst',
  'Fremtidige investeringer': 'fremtidige_investeringer',
  Annet: 'annet',
};

const MALSETNINGER_DEFAULT_GOALS = {
  okonomisk_trygghet: 3,
  formuesvekst: 2,
};
const MALSETNINGER_DEFAULT_EDUCATION = 'relevant';
const MALSETNINGER_DEFAULT_EXPERIENCE = {
  aksjer: { type: 'enkel', volume: 'lav', period: 'kort' },
  renter: { type: 'enkel', volume: 'lav', period: 'kort' },
  alternativt: { type: 'enkel', volume: 'lav', period: 'kort' },
};
const MALSETNINGER_DEFAULT_KNOWLEDGE = {
  produkter: { aksjer: 1, renter: 0, alternativt: 0 },
  risiko: 2,
  egenskaper: 2,
};

function isMalsetningerIngenDataText(text) {
  const t = String(text || '').replace(/^\uFEFF/, '').trim().toLowerCase();
  return !t || t === 'ingen data';
}

/**
 * Leser nummererte linjer frå Output (utan JSON).
 * @returns {object|null} same struktur som JSON-payload, eller null
 */
function parseMalsetningerExportLines(raw) {
  const text = String(raw || '')
    .replace(/^\uFEFF/, '')
    .replace(/\u2028/g, '\n')
    .replace(/\u2029/g, '\n');
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const touched = {
    edu: false,
    exp: false,
    knwProd: false,
    knwRisiko: false,
    knwEgen: false,
    goals: false,
  };
  const out = {
    selectedGoals: {},
    educationLevel: 'relevant',
    experience: {
      aksjer: { type: 'enkel', volume: 'lav', period: 'kort' },
      renter: { type: 'enkel', volume: 'lav', period: 'kort' },
      alternativt: { type: 'enkel', volume: 'lav', period: 'kort' },
    },
    knowledge: {
      produkter: {},
      risiko: 2,
      egenskaper: 2,
    },
  };
  const mergeCat = (cat, field, value) => {
    const c = out.experience[cat];
    if (!c) return;
    if (field === 'type' && ['enkel', 'fond', 'derivater', 'kompleks'].includes(value)) {
      c.type = value;
      touched.exp = true;
    } else if (field === 'volume' && ['lav', 'middels', 'hoy'].includes(value)) {
      c.volume = value;
      touched.exp = true;
    } else if (field === 'period' && ['kort', 'middels', 'lang'].includes(value)) {
      c.period = value;
      touched.exp = true;
    }
  };
  let hasAny = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^malsetninger\s+state\s*\(json\):/i.test(line)) break;
    const m = line.match(/^(\d+)\s*:\s*(.+?)\s*:\s*(.+)$/);
    if (!m) continue;
    const label = m[2].trim();
    const valRaw = m[3].trim();
    if (label === 'Utdanning') {
      if (['ingen', 'relevant', 'hoyere'].includes(valRaw)) {
        out.educationLevel = valRaw;
        touched.edu = true;
        hasAny = true;
      }
      continue;
    }
    const erf = label.match(/^Erfaring\s+(aksjer|renter|alternativt)\s*[–-]\s*(type|volum|horisont)$/i);
    if (erf) {
      const cat = erf[1].toLowerCase();
      const limb = erf[2].toLowerCase();
      const field = limb === 'horisont' ? 'period' : limb;
      mergeCat(cat, field, valRaw);
      if (touched.exp) hasAny = true;
      continue;
    }
    if (label === 'Kunnskap produkt aksjer') {
      const n = Number(valRaw);
      if (Number.isFinite(n)) {
        out.knowledge.produkter.aksjer = Math.max(0, Math.min(3, Math.round(n)));
        touched.knwProd = true;
        hasAny = true;
      }
      continue;
    }
    if (label === 'Kunnskap produkt renter') {
      const n = Number(valRaw);
      if (Number.isFinite(n)) {
        out.knowledge.produkter.renter = Math.max(0, Math.min(3, Math.round(n)));
        touched.knwProd = true;
        hasAny = true;
      }
      continue;
    }
    if (label === 'Kunnskap produkt alternativt') {
      const n = Number(valRaw);
      if (Number.isFinite(n)) {
        out.knowledge.produkter.alternativt = Math.max(0, Math.min(3, Math.round(n)));
        touched.knwProd = true;
        hasAny = true;
      }
      continue;
    }
    if (label === 'Kunnskap risiko') {
      const n = Number(valRaw);
      if (Number.isFinite(n)) {
        out.knowledge.risiko = Math.max(1, Math.min(5, Math.round(n)));
        touched.knwRisiko = true;
        hasAny = true;
      }
      continue;
    }
    if (label === 'Kunnskap egenskaper') {
      const n = Number(valRaw);
      if (Number.isFinite(n)) {
        out.knowledge.egenskaper = Math.max(1, Math.min(5, Math.round(n)));
        touched.knwEgen = true;
        hasAny = true;
      }
      continue;
    }
    if (/^score\s+/i.test(label)) continue;
    if (label.startsWith('Mål ')) {
      const title = label.slice(4).trim();
      const gid = MALSETNINGER_MAAL_TITLE_TO_ID[title];
      if (gid) {
        touched.goals = true;
        hasAny = true;
        const imp = parseInt(valRaw, 10);
        if (Number.isFinite(imp) && imp >= 0 && imp <= 3) out.selectedGoals[gid] = imp;
      }
    }
  }
  if (!hasAny) return null;
  const data = {};
  if (touched.edu) data.educationLevel = out.educationLevel;
  if (touched.exp) data.experience = out.experience;
  if (touched.knwProd || touched.knwRisiko || touched.knwEgen) {
    data.knowledge = {};
    if (touched.knwProd) data.knowledge.produkter = { ...out.knowledge.produkter };
    if (touched.knwRisiko) data.knowledge.risiko = out.knowledge.risiko;
    if (touched.knwEgen) data.knowledge.egenskaper = out.knowledge.egenskaper;
  }
  if (touched.goals) data.selectedGoals = { ...out.selectedGoals };
  return data;
}

const GOAL_IMPORTANCE_CLASS = {
  0: 'mbh-goal-idle',
  1: 'mbh-goal-i1',
  2: 'mbh-goal-i2',
  3: 'mbh-goal-i3',
};

const PRODUCT_TIER_CLASS = {
  0: 'mbh-tier-0',
  1: 'mbh-tier-1',
  2: 'mbh-tier-2',
  3: 'mbh-tier-3',
};

const SectionLabel = ({ children, light = false, className = '' }) => (
  <span className={`mbh-section-label ${light ? 'mbh-section-label--light' : ''} ${className}`}>
    {children}
  </span>
);

const Card = ({ children, className = '' }) => (
  <div className={`mbh-card ${className}`}>
    {children}
  </div>
);

const LevelIndicator = ({ label, value, onChange }) => (
  <div className="flex flex-col space-y-[0.376437375rem]">
    <div className="flex justify-between items-center">
      <span className="text-[12.1px] font-medium uppercase tracking-[0.1em] opacity-70">{label}</span>
      <span className="mbh-level-nivaa">{`Nivå ${value} / 5`}</span>
    </div>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`h-[7.2px] flex-1 transition-all duration-200 mbh-level-btn ${
            value >= level ? 'mbh-level-active' : 'mbh-level-inactive'
          }`}
          aria-label={`Sett nivå til ${level}`}
        />
      ))}
    </div>
  </div>
);

function computeExperienceLevel({ type, volume, period }) {
  let level = 1;
  if (period === 'lang') level += 2;
  else if (period === 'middels') level += 1;
  if (volume === 'hoy') level += 1;
  if (['derivater', 'kompleks'].includes(type)) level += 1;
  return Math.min(5, level);
}

const ExperienceRow = ({ title, data, updateFn }) => (
  <div className="space-y-[0.75287475rem] pt-[0.75287475rem] first:pt-0 border-t first:border-none mbh-divider">
    <div className="flex justify-between items-center">
      <h4 className="text-sm font-bold uppercase tracking-tight mbh-subheading">{title}</h4>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`w-3.5 h-[5.4px] ${computeExperienceLevel(data) >= i ? 'mbh-exp-bar-active' : 'mbh-exp-bar-inactive'}`} />
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-[0.75287475rem]">
      <div className="space-y-[0.25095825rem]">
        <label className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-40 flex items-center gap-1">
          <Layers size={10} /> Transaksjonstype
        </label>
        <select
          className="mbh-select"
          value={data.type}
          onChange={(e) => updateFn('type', e.target.value)}
        >
          <option value="enkel">Enkle Kjøp/Salg</option>
          <option value="fond">Fond/ETF</option>
          <option value="derivater">Derivater/Gearing</option>
          <option value="kompleks">Strukturerte prod.</option>
        </select>
      </div>

      <div className="space-y-[0.25095825rem]">
        <label className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-40 flex items-center gap-1">
          <Activity size={10} /> Volum & Frekvens
        </label>
        <select
          className="mbh-select"
          value={data.volume}
          onChange={(e) => updateFn('volume', e.target.value)}
        >
          <option value="lav">{'Lav (Få årlige)'}</option>
          <option value="middels">{'Middels (Månedlig)'}</option>
          <option value="hoy">Høy (Ukentlig+)</option>
        </select>
      </div>
      <div className="space-y-[0.25095825rem]">
        <label className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-40 flex items-center gap-1">
          <History size={10} /> Tidsperiode
        </label>
        <select
          className="mbh-select"
          value={data.period}
          onChange={(e) => updateFn('period', e.target.value)}
        >
          <option value="kort">{'Under 1 år'}</option>
          <option value="middels">{'1 - 5 år'}</option>
          <option value="lang">{'Over 5 år'}</option>
        </select>
      </div>
    </div>
  </div>
);

function App() {
  const [selectedGoals, setSelectedGoals] = useState({
    okonomisk_trygghet: 3,
    formuesvekst: 2,
  });

  const [educationLevel, setEducationLevel] = useState('relevant');
  const [experience, setExperience] = useState({
    aksjer: { type: 'enkel', volume: 'lav', period: 'kort' },
    renter: { type: 'enkel', volume: 'lav', period: 'kort' },
    alternativt: { type: 'enkel', volume: 'lav', period: 'kort' },
  });
  const [knowledge, setKnowledge] = useState({
    produkter: { aksjer: 1, renter: 0, alternativt: 0 },
    risiko: 2,
    egenskaper: 2,
  });

  const goalOptions = useMemo(() => [
    { id: 'bevare_formuen', title: 'Bevare formuen', icon: <Anchor size={11} /> },
    { id: 'pensjon', title: 'Pensjon', icon: <Landmark size={11} /> },
    { id: 'hjelpe_barn', title: 'Hjelpe barn', icon: <Heart size={11} /> },
    { id: 'generesjonsskifte', title: 'Generasjonsskifte', icon: <Users size={11} /> },
    { id: 'okonomisk_trygghet', title: 'Økonomisk trygghet', icon: <ShieldCheck size={11} /> },
    { id: 'formuesvekst', title: 'Formuesvekst', icon: <TrendingUp size={11} /> },
    { id: 'fremtidige_investeringer', title: 'Fremtidige investeringer', icon: <Briefcase size={11} /> },
    { id: 'annet', title: 'Annet', icon: <MoreHorizontal size={11} /> },
  ], []);

  const cycleGoalImportance = (id) => {
    setSelectedGoals((prev) => {
      const current = prev[id] || 0;
      const next = (current + 1) % 4;
      const newState = { ...prev };
      if (next === 0) delete newState[id];
      else newState[id] = next;
      return newState;
    });
  };

  const cycleProductKnowledge = (prod) => {
    setKnowledge((prev) => {
      const current = prev.produkter[prod];
      const next = (current + 1) % 4;
      return {
        ...prev,
        produkter: { ...prev.produkter, [prod]: next },
      };
    });
  };

  const updateExperience = (category, field, value) => {
    setExperience((prev) => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }));
  };

  const totals = useMemo(() => {
    const expScore = (
      computeExperienceLevel(experience.aksjer)
      + computeExperienceLevel(experience.renter)
      + computeExperienceLevel(experience.alternativt)
    ) / 3;
    const prodScore = (Object.values(knowledge.produkter).reduce((a, b) => a + b, 0) / 9) * 5;
    const knwScore = (prodScore + knowledge.risiko + knowledge.egenskaper) / 3;
    const eduBonus = educationLevel === 'hoyere' ? 1.5 : educationLevel === 'relevant' ? 0.8 : 0;

    const total = ((expScore + knwScore + eduBonus) / 11.5) * 10;
    const sortedGoals = Object.entries(selectedGoals)
      .map(([id, importance]) => ({
        id,
        title: goalOptions.find((o) => o.id === id)?.title,
        importance,
      }))
      .sort((a, b) => b.importance - a.importance);
    return {
      expScore: expScore.toFixed(1),
      knwScore: knwScore.toFixed(1),
      total: total.toFixed(1),
      sortedGoals,
    };
  }, [experience, knowledge, educationLevel, selectedGoals, goalOptions]);

  const totalsRef = useRef(null);
  totalsRef.current = totals;

  useEffect(() => {
    window.MalsetningerGetExportText = () => {
      const lines = [];
      let n = 1;
      const pushIf = (changed, label, value) => {
        if (!changed) return;
        lines.push(`${n} : ${label} : ${value}`);
        n += 1;
      };
      pushIf(educationLevel !== MALSETNINGER_DEFAULT_EDUCATION, 'Utdanning', educationLevel || 'ingen');
      ['aksjer', 'renter', 'alternativt'].forEach((cat) => {
        const ex = experience[cat] || {};
        const def = MALSETNINGER_DEFAULT_EXPERIENCE[cat];
        pushIf((ex.type ?? '') !== def.type, `Erfaring ${cat} – type`, ex.type ?? '');
        pushIf((ex.volume ?? '') !== def.volume, `Erfaring ${cat} – volum`, ex.volume ?? '');
        pushIf((ex.period ?? '') !== def.period, `Erfaring ${cat} – horisont`, ex.period ?? '');
      });
      const pr = knowledge.produkter || {};
      const defPr = MALSETNINGER_DEFAULT_KNOWLEDGE.produkter;
      pushIf(Number(pr.aksjer ?? 0) !== defPr.aksjer, 'Kunnskap produkt aksjer', String(pr.aksjer ?? 0));
      pushIf(Number(pr.renter ?? 0) !== defPr.renter, 'Kunnskap produkt renter', String(pr.renter ?? 0));
      pushIf(Number(pr.alternativt ?? 0) !== defPr.alternativt, 'Kunnskap produkt alternativt', String(pr.alternativt ?? 0));
      pushIf(Number(knowledge.risiko ?? 0) !== MALSETNINGER_DEFAULT_KNOWLEDGE.risiko, 'Kunnskap risiko', String(knowledge.risiko ?? 0));
      pushIf(Number(knowledge.egenskaper ?? 0) !== MALSETNINGER_DEFAULT_KNOWLEDGE.egenskaper, 'Kunnskap egenskaper', String(knowledge.egenskaper ?? 0));
      goalOptions.forEach((g) => {
        const imp = selectedGoals[g.id] || 0;
        const defImp = MALSETNINGER_DEFAULT_GOALS[g.id] || 0;
        pushIf(imp !== defImp, `Mål ${g.title}`, String(imp));
      });
      return lines.join('\n');
    };
    return () => {
      if (window.MalsetningerGetExportText) delete window.MalsetningerGetExportText;
    };
  }, [selectedGoals, educationLevel, experience, knowledge, goalOptions]);

  useEffect(() => {
    window.MalsetningerGetSelectedGoalsForDashboard = () => {
      const t = totalsRef.current;
      if (!t || !Array.isArray(t.sortedGoals)) return [];
      return t.sortedGoals
        .filter((g) => g && g.importance > 0 && g.title)
        .map((g) => ({
          id: g.id,
          title: g.title,
          importance: g.importance,
          importanceLabel:
            g.importance === 1 ? 'Litt viktig' : g.importance === 2 ? 'Middels viktig' : 'Veldig viktig',
        }));
    };
    return () => {
      if (window.MalsetningerGetSelectedGoalsForDashboard) {
        delete window.MalsetningerGetSelectedGoalsForDashboard;
      }
    };
  }, []);

  useEffect(() => {
    try {
      if (
        window.parent &&
        window.parent !== window &&
        typeof window.parent.MaalOgBehovOnMalsetningerGoalsChanged === 'function'
      ) {
        window.parent.MaalOgBehovOnMalsetningerGoalsChanged();
      }
    } catch (_) {}
  }, [selectedGoals]);

  useEffect(() => {
    window.MalsetningerApplyExportText = (sectionBody) => {
      const raw = String(sectionBody || '').replace(/^\uFEFF/, '').replace(/\u2028/g, '\n').replace(/\u2029/g, '\n').trim();

      const cloneDefaultExperience = () => JSON.parse(JSON.stringify(MALSETNINGER_DEFAULT_EXPERIENCE));
      const cloneDefaultKnowledge = () => JSON.parse(JSON.stringify(MALSETNINGER_DEFAULT_KNOWLEDGE));
      const resetMalsetningerToDefaults = () => {
        setSelectedGoals({ ...MALSETNINGER_DEFAULT_GOALS });
        setEducationLevel(MALSETNINGER_DEFAULT_EDUCATION);
        setExperience(cloneDefaultExperience());
        setKnowledge(cloneDefaultKnowledge());
      };

      if (isMalsetningerIngenDataText(raw)) {
        resetMalsetningerToDefaults();
        return true;
      }

      const applyFromData = (data, { mergeGoals = false } = {}) => {
        if (!data || typeof data !== 'object') return false;
        try {
          if (data.selectedGoals && typeof data.selectedGoals === 'object') {
            if (mergeGoals) {
              setSelectedGoals((prev) => {
                const sg = { ...prev };
                Object.keys(data.selectedGoals).forEach((k) => {
                  const v = Number(data.selectedGoals[k]);
                  if (v >= 1 && v <= 3) sg[k] = v;
                  else if (v === 0) delete sg[k];
                });
                return sg;
              });
            } else {
              const sg = {};
              Object.keys(data.selectedGoals).forEach((k) => {
                const v = Number(data.selectedGoals[k]);
                if (v >= 1 && v <= 3) sg[k] = v;
              });
              setSelectedGoals(sg);
            }
          }
          if (['ingen', 'relevant', 'hoyere'].includes(data.educationLevel)) {
            setEducationLevel(data.educationLevel);
          }
          const mergeCat = (src, fallback) => {
            if (!src || typeof src !== 'object') return fallback;
            const type = ['enkel', 'fond', 'derivater', 'kompleks'].includes(src.type) ? src.type : fallback.type;
            const volume = ['lav', 'middels', 'hoy'].includes(src.volume) ? src.volume : fallback.volume;
            const period = ['kort', 'middels', 'lang'].includes(src.period) ? src.period : fallback.period;
            return { type, volume, period };
          };
          if (data.experience && typeof data.experience === 'object') {
            setExperience((prev) => ({
              aksjer: mergeCat(data.experience.aksjer, prev.aksjer),
              renter: mergeCat(data.experience.renter, prev.renter),
              alternativt: mergeCat(data.experience.alternativt, prev.alternativt),
            }));
          }
          if (data.knowledge && typeof data.knowledge === 'object') {
            const produkter = data.knowledge.produkter || {};
            const clampLvl = (x, fb) => {
              const n = Number(x);
              return Number.isFinite(n) ? Math.max(0, Math.min(3, Math.round(n))) : fb;
            };
            setKnowledge((prev) => ({
              produkter: {
                aksjer: produkter.aksjer !== undefined ? clampLvl(produkter.aksjer, prev.produkter.aksjer) : prev.produkter.aksjer,
                renter: produkter.renter !== undefined ? clampLvl(produkter.renter, prev.produkter.renter) : prev.produkter.renter,
                alternativt: produkter.alternativt !== undefined ? clampLvl(produkter.alternativt, prev.produkter.alternativt) : prev.produkter.alternativt,
              },
              risiko:
                data.knowledge.risiko !== undefined
                  ? Math.max(1, Math.min(5, Number(data.knowledge.risiko) || prev.risiko))
                  : prev.risiko,
              egenskaper:
                data.knowledge.egenskaper !== undefined
                  ? Math.max(1, Math.min(5, Number(data.knowledge.egenskaper) || prev.egenskaper))
                  : prev.egenskaper,
            }));
          }
          return true;
        } catch {
          return false;
        }
      };

      const MB = 'Malsetninger state (json):';
      if (raw.includes(MB)) {
        let jsonPart = extractJsonObjectAfterMarker(raw, MB);
        if (!jsonPart) {
          const linesSplit = raw.split('\n').map((l) => l.trimEnd());
          const jsonLine = linesSplit.find((l) => l.startsWith(MB));
          if (jsonLine) jsonPart = jsonLine.slice(MB.length).trim();
        }
        if (jsonPart) {
          try {
            const parsed = JSON.parse(jsonPart);
            if (applyFromData(parsed)) return true;
          } catch {
            /* linjeformat under */
          }
        }
      }
      const fromLines = parseMalsetningerExportLines(raw);
      if (fromLines) {
        resetMalsetningerToDefaults();
        return applyFromData(fromLines, { mergeGoals: true });
      }
      return false;
    };
    return () => {
      if (window.MalsetningerApplyExportText) delete window.MalsetningerApplyExportText;
    };
  }, []);

  return (
    <div className="malsetninger-app font-sans">

      <main className="max-w-[88rem] mx-auto pt-3 md:pt-5 pb-6 md:pb-10 px-[1.35rem] md:px-[2.25rem] space-y-3">

        <Card className="!px-[1.129312125rem] !pb-[1.129312125rem] !pt-[0.5646560625rem]">
          <h3 className="text-lg font-bold tracking-tight mbh-heading mb-[0.3387936375rem]">
            {'Målsetninger'}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-[0.45172485rem] mt-[0.677587275rem]">
            {goalOptions.map((goal) => {
              const importance = selectedGoals[goal.id] || 0;

              const style = GOAL_IMPORTANCE_CLASS[importance] || GOAL_IMPORTANCE_CLASS[0];
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => cycleGoalImportance(goal.id)}
                  className={`flex flex-col items-center justify-center p-[0.54206982rem] border transition-all duration-200 gap-[0.27103491rem] min-h-[50.5931832px] rounded-md ${style}`}
                >
                  <div className="transition-transform group-hover:scale-110">
                    {goal.icon}
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-center leading-tight">
                    {goal.title}
                  </span>
                  {importance > 0 && (
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] opacity-60">
                      {importance === 1 ? 'Litt viktig' : importance === 2 ? 'Middels viktig' : 'Veldig viktig'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[0.61965rem]">

          <Card className="!px-[1.549125rem] !pb-[1.25479125rem] !pt-[0.627395625rem]">
            <div className="mb-[1.003833rem] border-b mbh-divider pb-[0.5019165rem]">
              <h3 className="text-lg font-bold tracking-tight mbh-heading">Erfaring</h3>
            </div>
            <div className="space-y-[1.25479125rem]">
              <ExperienceRow title="Aksjer" data={experience.aksjer} updateFn={(f, v) => updateExperience('aksjer', f, v)} />
              <ExperienceRow title="Renter" data={experience.renter} updateFn={(f, v) => updateExperience('renter', f, v)} />
              <ExperienceRow title="Alternative investeringer" data={experience.alternativt} updateFn={(f, v) => updateExperience('alternativt', f, v)} />
            </div>
          </Card>
          <div className="space-y-[0.61965rem]">
            <Card className="!px-[1.549125rem] !pb-[1.25479125rem] !pt-[0.627395625rem]">
              <div className="mb-[1.003833rem] border-b mbh-divider pb-[0.5019165rem]">
                <h3 className="text-lg font-bold tracking-tight mbh-heading">Kunnskap</h3>
              </div>
              <div className="space-y-[1.25479125rem]">
                <div className="space-y-[0.376437375rem]">
                  <span className="text-[12.1px] font-medium uppercase tracking-[0.1em] opacity-70">{'Type Produkter (Trykk for kunnskapsnivå)'}</span>
                  <div className="grid grid-cols-3 gap-[0.309825rem]">
                    {['aksjer', 'renter', 'alternativt'].map((prod) => {
                      const level = knowledge.produkter[prod];
                      const tierStyle = PRODUCT_TIER_CLASS[level] || PRODUCT_TIER_CLASS[0];

                      return (
                        <button
                          key={prod}
                          type="button"
                          onClick={() => cycleProductKnowledge(prod)}
                          className={`py-[0.5019165rem] px-[0.309825rem] text-[11px] font-bold uppercase tracking-[0.1em] border transition-all duration-200 rounded-md ${tierStyle}`}
                        >
                          {prod === 'alternativt' ? 'Alternative' : prod}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <LevelIndicator
                  label={'Risiko-forståelse (Lav til Høy)'}
                  value={knowledge.risiko}
                  onChange={(v) => setKnowledge({ ...knowledge, risiko: v })}
                />
                <LevelIndicator
                  label="Egenskaper & Art (Teknisk oppbygning)"
                  value={knowledge.egenskaper}
                  onChange={(v) => setKnowledge({ ...knowledge, egenskaper: v })}
                />
              </div>
            </Card>
            <Card className="!px-[1.549125rem] !pb-[1.25479125rem] !pt-[0.627395625rem]">
              <div className="mb-[1.003833rem] border-b mbh-divider pb-[0.5019165rem]">
                <h3 className="text-lg font-bold tracking-tight mbh-heading">Utdanning</h3>
              </div>
              <div className="grid grid-cols-1 gap-[0.274422846375rem]">
                {[
                  { id: 'ingen', label: 'Ikke relevant utdanning' },
                  { id: 'relevant', label: 'Relevant utdanning (Finans/Øk.)' },
                  { id: 'hoyere', label: 'Høyere spesialisert utdanning' },
                ].map((edu) => (
                  <button
                    key={edu.id}
                    type="button"
                    onClick={() => setEducationLevel(edu.id)}
                    className={`p-[0.3658971285rem] text-left border flex justify-between items-center transition-all rounded-md ${
                      educationLevel === edu.id ? 'mbh-edu-active' : 'mbh-edu-inactive'
                    }`}
                  >
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em]">{edu.label}</span>
                    {educationLevel === edu.id && <CheckCircle2 size={14} className="mbh-edu-check" />}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
        <div className="mbh-summary-panel">
          <div className="py-[0.629558294625rem] md:py-[0.88161633225rem] px-[2.25rem] md:px-[3.15rem] relative z-10 grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-x-[1.9683rem] gap-y-[0.774840978rem]">

            <div className="lg:col-span-4 flex flex-col gap-[0.4428675rem] lg:self-start">
              <SectionLabel light className="!mb-0 leading-tight">{'Målsetninger'}</SectionLabel>
              <div className="flex flex-col gap-[0.1937102445rem]">
                {totals.sortedGoals.map((goal, i) => (
                  <div key={i} className={`px-4 py-[0.29056536675rem] border flex items-baseline justify-between gap-3 transition-all rounded-sm ${
                    goal.importance === 3 ? 'mbh-summary-goal-high' :
                      goal.importance === 2 ? 'mbh-summary-goal-mid' :
                        'mbh-summary-goal-low'
                  }`}
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className={`mt-[0.35em] shrink-0 w-1.5 h-1.5 rounded-full inline-block ${
                        goal.importance === 3 ? 'mbh-summary-dot-high' :
                          goal.importance === 2 ? 'mbh-summary-dot-mid' :
                            'mbh-summary-dot-low'
                      }`}
                      />
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] leading-none">
                        {goal.title}
                      </span>
                    </div>
                    <span className="text-[8.8px] font-medium opacity-40 uppercase tracking-[0.1em] leading-none shrink-0">
                      {goal.importance === 3 ? 'Høy' : goal.importance === 2 ? 'Mid' : 'Lav'}
                    </span>
                  </div>
                ))}
                {totals.sortedGoals.length === 0 && <span className="text-[11px] font-normal opacity-30 italic">{'Ingen mål valgt'}</span>}
              </div>
            </div>
            <div className="lg:col-span-5 border-y lg:border-y-0 lg:border-x mbh-summary-mid-col py-[0.629558294625rem] lg:py-0 lg:px-[1.77147rem] flex flex-col gap-[0.4428675rem] justify-start lg:self-start">
              <div className="grid grid-cols-2 gap-x-[1.9683rem]">
                <SectionLabel light className="!mb-0 whitespace-nowrap leading-tight">Erfaring</SectionLabel>
                <SectionLabel light className="!mb-0 whitespace-nowrap leading-tight">Kunnskap</SectionLabel>
              </div>
              <div className="grid grid-cols-2 gap-x-[1.9683rem] gap-y-[0.118098rem]">
                <div className="min-h-[0.92278116162rem] flex items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[1.3286025rem] leading-none font-black text-white">{totals.expScore}</span>
                    <span className="text-[11px] font-medium opacity-30 uppercase tracking-[0.1em] leading-none">/ 5.0</span>
                  </div>
                </div>
                <div className="min-h-[0.92278116162rem] flex items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[1.3286025rem] leading-none font-black text-white">{totals.knwScore}</span>
                    <span className="text-[11px] font-medium opacity-30 uppercase tracking-[0.1em] leading-none">/ 5.0</span>
                  </div>
                </div>
                <p className="text-[11px] font-normal opacity-40 uppercase leading-snug m-0 tracking-[0.05em]">
                  Vektet analyse av transaksjonstyper, volum og historikk
                </p>
                <p className="text-[11px] font-normal opacity-40 uppercase leading-snug m-0 tracking-[0.05em]">
                  {'Faglig forståelse av instrumenters art, teknikk og risiko'}
                </p>
              </div>
            </div>
            <div className="lg:col-span-3 flex flex-col justify-start items-center text-center mbh-summary-score-box px-[1.3122rem] pb-[0.774840978rem] pt-0 rounded-md lg:self-start w-full">
              <SectionLabel light className="!mb-0 leading-tight w-full">Samlet Score</SectionLabel>
              <div className="relative inline-flex items-center justify-center mt-[0.4428675rem]">
                <svg className="w-[4.0291730856rem] h-[4.0291730856rem] transform -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent" className="mbh-score-ring-track" />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * (1 - totals.total / 10)}
                    className="mbh-score-ring-fill transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-[1.439319375rem] font-black text-white">{totals.total}</span>
              </div>
              <div className="mt-[0.5811307335rem] flex items-center gap-2 opacity-30">
                <ClipboardCheck size={12} />
                <span className="text-[8.8px] font-medium uppercase tracking-[0.1em]">Objektiv Profilering</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
