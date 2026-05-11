const { useState, useMemo } = React;
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

const SectionLabel = ({ children, light = false, className = '' }) => (
  <span className={`block text-[10px] font-medium tracking-[0.1em] uppercase mb-3 ${light ? 'text-[oklch(0.85_0.08_235.3)]' : 'text-[oklch(0.29_0.12_274.6)]'} ${className}`}>
    {children}
  </span>
);

const Card = ({ children, className = '' }) => (
  <div className={`bg-white border border-[oklch(0.96_0.00_0.0)] p-10 shadow-sm transition-all duration-300 hover:shadow-md ${className}`}>
    {children}
  </div>
);

const LevelIndicator = ({ label, value, onChange }) => (
  <div className="flex flex-col space-y-[0.41826375rem]">
    <div className="flex justify-between items-center">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-70">{label}</span>
      <span className="text-[10px] font-medium text-[oklch(0.29_0.12_274.6)] uppercase tracking-[0.1em]">Nivå {value} / 5</span>
    </div>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((level) => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(level)}
          className={`h-2 flex-1 transition-all duration-200 ${
            value >= level
              ? 'bg-[oklch(0.29_0.12_274.6)]'
              : 'bg-[oklch(0.96_0.00_0.0)]'
          } hover:ring-1 hover:ring-[oklch(0.29_0.12_274.6)]`}
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
  <div className="space-y-[0.8365275rem] pt-[0.8365275rem] first:pt-0 border-t first:border-none border-[oklch(0.96_0.00_0.0)]">
    <div className="flex justify-between items-center">
      <h4 className="text-sm font-bold uppercase tracking-tight text-[oklch(0.24_0.08_273.1)]">{title}</h4>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`w-3.5 h-1.5 ${computeExperienceLevel(data) >= i ? 'bg-[oklch(0.29_0.12_274.6)]' : 'bg-[oklch(0.96_0.00_0.0)]'}`} />
        ))}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-[0.8365275rem]">
      <div className="space-y-[0.2788425rem]">
        <label className="text-[10px] font-medium uppercase tracking-[0.1em] opacity-40 flex items-center gap-1">
          <Layers size={10} /> Transaksjonstype
        </label>
        <select
          className="w-full bg-[oklch(0.96_0.00_0.0)] p-[0.30491427375rem] text-[11px] font-normal outline-none border-none focus:ring-1 focus:ring-[oklch(0.29_0.12_274.6)] text-[oklch(0.27_0.00_0.0)]"
          value={data.type}
          onChange={(e) => updateFn('type', e.target.value)}
        >
          <option value="enkel">Enkle Kjøp/Salg</option>
          <option value="fond">Fond/ETF</option>
          <option value="derivater">Derivater/Gearing</option>
          <option value="kompleks">Strukturerte prod.</option>
        </select>
      </div>

      <div className="space-y-[0.2788425rem]">
        <label className="text-[10px] font-medium uppercase tracking-[0.1em] opacity-40 flex items-center gap-1">
          <Activity size={10} /> Volum & Frekvens
        </label>
        <select
          className="w-full bg-[oklch(0.96_0.00_0.0)] p-[0.30491427375rem] text-[11px] font-normal outline-none border-none focus:ring-1 focus:ring-[oklch(0.29_0.12_274.6)] text-[oklch(0.27_0.00_0.0)]"
          value={data.volume}
          onChange={(e) => updateFn('volume', e.target.value)}
        >
          <option value="lav">Lav (Få årlige)</option>
          <option value="middels">Middels (Månedlig)</option>
          <option value="hoy">Høy (Ukentlig+)</option>
        </select>
      </div>
      <div className="space-y-[0.2788425rem]">
        <label className="text-[10px] font-medium uppercase tracking-[0.1em] opacity-40 flex items-center gap-1">
          <History size={10} /> Tidsperiode
        </label>
        <select
          className="w-full bg-[oklch(0.96_0.00_0.0)] p-[0.30491427375rem] text-[11px] font-normal outline-none border-none focus:ring-1 focus:ring-[oklch(0.29_0.12_274.6)] text-[oklch(0.27_0.00_0.0)]"
          value={data.period}
          onChange={(e) => updateFn('period', e.target.value)}
        >
          <option value="kort">Under 1 år</option>
          <option value="middels">1 - 5 år</option>
          <option value="lang">Over 5 år</option>
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
    { id: 'generesjonsskifte', title: 'Generesjonsskifte', icon: <Users size={11} /> },
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

  return (
    <div className="min-h-screen bg-[oklch(0.92_0.05_234.1)] font-sans text-[oklch(0.27_0.00_0.0)]">

      <main className="max-w-[88rem] mx-auto pt-3 md:pt-5 pb-6 md:pb-10 px-[1.35rem] md:px-[2.25rem] space-y-3">

        <Card className="!px-[1.25479125rem] !pb-[1.25479125rem] !pt-[0.627395625rem]">
          <h3 className="text-lg font-bold tracking-tight text-[oklch(0.24_0.08_273.1)] mb-[0.376437375rem]">
            Målsetninger
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-[0.5019165rem] mt-[0.75287475rem]">
            {goalOptions.map((goal) => {
              const importance = selectedGoals[goal.id] || 0;

              const style =
                importance === 1 ? 'bg-[oklch(0.85_0.08_235.3)] text-[oklch(0.24_0.08_273.1)] border-[oklch(0.85_0.08_235.3)] shadow-lg' :
                  importance === 2 ? 'bg-[oklch(0.29_0.12_274.6)] text-white border-[oklch(0.29_0.12_274.6)] shadow-xl' :
                    importance === 3 ? 'bg-[oklch(0.24_0.08_273.1)] text-white border-[oklch(0.24_0.08_273.1)] shadow-2xl' :
                      'bg-white border-[#CECCCC] text-[oklch(0.27_0.00_0.0)] opacity-60 shadow-lg hover:shadow-xl';
              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => cycleGoalImportance(goal.id)}
                  className={`flex flex-col items-center justify-center p-[0.6022998rem] border transition-all duration-300 gap-[0.3011499rem] min-h-[56.214648px] ${style}`}
                >
                  <div className="transition-transform group-hover:scale-110">
                    {goal.icon}
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-center leading-tight">
                    {goal.title}
                  </span>
                  {importance > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-60">
                      {importance === 1 ? 'Litt viktig' : importance === 2 ? 'Middels viktig' : 'Veldig viktig'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Card>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-[0.6885rem]">

          <Card className="!px-[1.72125rem] !pb-[1.3942125rem] !pt-[0.69710625rem]">
            <div className="mb-[1.11537rem] border-b border-[oklch(0.96_0.00_0.0)] pb-[0.557685rem]">
              <h3 className="text-lg font-bold tracking-tight text-[oklch(0.24_0.08_273.1)]">Erfaring</h3>
            </div>
            <div className="space-y-[1.3942125rem]">
              <ExperienceRow title="Aksjer" data={experience.aksjer} updateFn={(f, v) => updateExperience('aksjer', f, v)} />
              <ExperienceRow title="Renter" data={experience.renter} updateFn={(f, v) => updateExperience('renter', f, v)} />
              <ExperienceRow title="Alternative investeringer" data={experience.alternativt} updateFn={(f, v) => updateExperience('alternativt', f, v)} />
            </div>
          </Card>
          <div className="space-y-[0.6885rem]">
            <Card className="!px-[1.72125rem] !pb-[1.3942125rem] !pt-[0.69710625rem]">
              <div className="mb-[1.11537rem] border-b border-[oklch(0.96_0.00_0.0)] pb-[0.557685rem]">
                <h3 className="text-lg font-bold tracking-tight text-[oklch(0.24_0.08_273.1)]">Kunnskap</h3>
              </div>
              <div className="space-y-[1.3942125rem]">
                <div className="space-y-[0.41826375rem]">
                  <span className="text-[11px] font-medium uppercase tracking-[0.1em] opacity-70">Type Produkter (Trykk for kunnskapsnivå)</span>
                  <div className="grid grid-cols-3 gap-[0.34425rem]">
                    {['aksjer', 'renter', 'alternativt'].map((prod) => {
                      const level = knowledge.produkter[prod];
                      const tierStyle =
                        level === 1 ? 'bg-[oklch(0.92_0.05_234.1)] text-[oklch(0.29_0.12_274.6)] border-[oklch(0.85_0.08_235.3)] shadow-lg' :
                          level === 2 ? 'bg-[oklch(0.85_0.08_235.3)] text-[oklch(0.24_0.08_273.1)] border-[oklch(0.55_0.10_250)] shadow-xl' :
                            level === 3 ? 'bg-[oklch(0.29_0.12_274.6)] text-white border-[oklch(0.24_0.08_273.1)] shadow-2xl' :
                              'bg-white border-[#CECCCC] text-[oklch(0.27_0.00_0.0)] opacity-60 shadow-lg hover:shadow-xl';

                      return (
                        <button
                          key={prod}
                          type="button"
                          onClick={() => cycleProductKnowledge(prod)}
                          className={`py-[0.557685rem] px-[0.34425rem] text-[10px] font-bold uppercase tracking-[0.1em] border transition-all duration-300 ${tierStyle}`}
                        >
                          {prod === 'alternativt' ? 'Alternative' : prod}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <LevelIndicator
                  label="Risiko-forståelse (Lav til Høy)"
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
            <Card className="!px-[1.72125rem] !pb-[1.3942125rem] !pt-[0.69710625rem]">
              <div className="mb-[1.11537rem] border-b border-[oklch(0.96_0.00_0.0)] pb-[0.557685rem]">
                <h3 className="text-lg font-bold tracking-tight text-[oklch(0.24_0.08_273.1)]">Utdanning</h3>
              </div>
              <div className="grid grid-cols-1 gap-[0.30491427375rem]">
                {[
                  { id: 'ingen', label: 'Ikke relevant utdanning' },
                  { id: 'relevant', label: 'Relevant utdanning (Finans/Øk.)' },
                  { id: 'hoyere', label: 'Høyere spesialisert utdanning' },
                ].map((edu) => (
                  <button
                    key={edu.id}
                    type="button"
                    onClick={() => setEducationLevel(edu.id)}
                    className={`p-[0.406552365rem] text-left border flex justify-between items-center transition-all ${
                      educationLevel === edu.id ? 'bg-[oklch(0.24_0.08_273.1)] border-[oklch(0.24_0.08_273.1)] text-white' : 'bg-white border-[#CECCCC] text-[oklch(0.27_0.00_0.0)]'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-[0.1em]">{edu.label}</span>
                    {educationLevel === edu.id && <CheckCircle2 size={14} className="text-[oklch(0.85_0.08_235.3)]" />}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
        <div className="bg-[oklch(0.24_0.08_273.1)] text-white shadow-2xl relative overflow-hidden">
          <div className="py-[1.0661625rem] md:py-[1.493025rem] px-[2.25rem] md:px-[3.15rem] relative z-10 grid grid-cols-1 lg:grid-cols-12 lg:items-start gap-x-[1.9683rem] gap-y-[1.3122rem]">

            <div className="lg:col-span-4 flex flex-col gap-[0.75rem] lg:self-start">
              <SectionLabel light className="!mb-0 leading-tight">Målsetninger</SectionLabel>
              <div className="flex flex-col gap-[0.32805rem]">
                {totals.sortedGoals.map((goal, i) => (
                  <div key={i} className={`px-4 py-[0.492075rem] border flex items-baseline justify-between gap-3 transition-all ${
                    goal.importance === 3 ? 'bg-white/15 border-white/20' :
                      goal.importance === 2 ? 'bg-white/10 border-white/10' :
                        'bg-white/5 border-white/5 opacity-70'
                  }`}
                  >
                    <div className="flex items-baseline gap-2 min-w-0">
                      <span className={`mt-[0.35em] shrink-0 w-1.5 h-1.5 rounded-full inline-block ${
                        goal.importance === 3 ? 'bg-[oklch(0.85_0.08_235.3)]' :
                          goal.importance === 2 ? 'bg-white/60' :
                            'bg-white/30'
                      }`}
                      />
                      <span className="text-[10px] font-bold uppercase tracking-[0.1em] leading-none">
                        {goal.title}
                      </span>
                    </div>
                    <span className="text-[8px] font-medium opacity-40 uppercase tracking-[0.1em] leading-none shrink-0">
                      {goal.importance === 3 ? 'Høy' : goal.importance === 2 ? 'Mid' : 'Lav'}
                    </span>
                  </div>
                ))}
                {totals.sortedGoals.length === 0 && <span className="text-[10px] font-normal opacity-30 italic">Ingen mål valgt</span>}
              </div>
            </div>
            <div className="lg:col-span-5 border-y lg:border-y-0 lg:border-x border-white/5 py-[1.0661625rem] lg:py-0 lg:px-[1.77147rem] flex flex-col gap-[0.75rem] justify-start lg:self-start">
              <div className="grid grid-cols-2 gap-x-[1.9683rem]">
                <SectionLabel light className="!mb-0 whitespace-nowrap leading-tight">Erfaring</SectionLabel>
                <SectionLabel light className="!mb-0 whitespace-nowrap leading-tight">Kunnskap</SectionLabel>
              </div>
              <div className="grid grid-cols-2 gap-x-[1.9683rem] gap-y-[0.2rem]">
                <div className="min-h-[1.562738rem] flex items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[1.476225rem] leading-none font-black text-white">{totals.expScore}</span>
                    <span className="text-[10px] font-medium opacity-30 uppercase tracking-[0.1em] leading-none">/ 5.0</span>
                  </div>
                </div>
                <div className="min-h-[1.562738rem] flex items-end">
                  <div className="flex items-baseline gap-1">
                    <span className="text-[1.476225rem] leading-none font-black text-white">{totals.knwScore}</span>
                    <span className="text-[10px] font-medium opacity-30 uppercase tracking-[0.1em] leading-none">/ 5.0</span>
                  </div>
                </div>
                <p className="text-[10px] font-normal opacity-40 uppercase leading-snug m-0 tracking-[0.05em]">
                  Vektet analyse av transaksjonstyper, volum og historikk
                </p>
                <p className="text-[10px] font-normal opacity-40 uppercase leading-snug m-0 tracking-[0.05em]">
                  Faglig forståelse av instrumenters art, teknikk og risiko
                </p>
              </div>
            </div>
            <div className="lg:col-span-3 flex flex-col justify-start items-center text-center bg-white/5 px-[1.3122rem] pb-[1.3122rem] pt-0 border border-white/5 lg:self-start w-full">
              <SectionLabel light className="!mb-0 leading-tight w-full">Samlet Score</SectionLabel>
              <div className="relative inline-flex items-center justify-center mt-[0.75rem]">
                <svg className="w-[6.82344rem] h-[6.82344rem] transform -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
                  <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-white/5" />
                  <circle
                    cx="64"
                    cy="64"
                    r="58"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * (1 - totals.total / 10)}
                    className="text-[oklch(0.85_0.08_235.3)] transition-all duration-1000"
                  />
                </svg>
                <span className="absolute text-[1.59924375rem] font-black text-white">{totals.total}</span>
              </div>
              <div className="mt-[0.98415rem] flex items-center gap-2 opacity-30">
                <ClipboardCheck size={12} />
                <span className="text-[8px] font-medium uppercase tracking-[0.1em]">Objektiv Profilering</span>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/[0.02] to-transparent pointer-events-none" />
        </div>
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
