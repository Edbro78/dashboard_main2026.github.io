/**
 * Kjør: node scripts/verify-import-json-extract.mjs
 * Verifiserer balansert JSON-uttrekk som brukes i dashboard-import.
 */
function extractJsonObjectAfterMarker(text, marker) {
  const raw = String(text || "").replace(/^\uFEFF/, "");
  const idx = raw.indexOf(marker);
  if (idx < 0) return null;
  const braceStart = raw.indexOf("{", idx + marker.length);
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
      if (c === "\\") {
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
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return raw.slice(braceStart, i + 1);
    }
  }
  return null;
}

function extractJsonObjectAfterRiskMarker(fullText) {
  const raw = String(fullText || "").replace(/^\uFEFF/, "");
  const m = /risikostate\s*\(json\):/i.exec(raw);
  if (!m) return null;
  const braceStart = raw.indexOf("{", m.index + m[0].length);
  if (braceStart < 0) return null;
  let depth = 0, inString = false, esc = false;
  for (let i = braceStart; i < raw.length; i++) {
    const c = raw[i];
    if (inString) {
      if (esc) { esc = false; continue; }
      if (c === "\\") { esc = true; continue; }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return raw.slice(braceStart, i + 1);
    }
  }
  return null;
}

const nested = { a: 1, b: { c: "str\"ing", d: [1] } };
const tkPretty = `T-konto state (json):\n${JSON.stringify(nested, null, 2)}`;
const markers = [
  ["T-konto", `--- T ---\nT-konto state (json): ${JSON.stringify(nested)}\n--- X ---`, "T-konto state (json):"],
  ["T-konto pretty", `--- T ---\n${tkPretty}\n--- X ---`, "T-konto state (json):"],
  ["Maal", `Maal og behov state (json): ${JSON.stringify({ v: 1, state: nested })}\n`, "Maal og behov state (json):"],
  ["Malsetninger", `\uFEFFMalsetninger state (json): ${JSON.stringify({ selectedGoals: {} })}\n`, "Malsetninger state (json):"],
  ["Pensjon", `Pensjonsgapet state (json): ${JSON.stringify({ v: 1, inputs: { age: "45" } })}\nextra`, "Pensjonsgapet state (json):"],
  ["Formue", `Formuesskatt state (json): ${JSON.stringify({ v: 1, values: { assets: {} } })}\n`, "Formuesskatt state (json):"],
];

let failed = 0;
for (const [name, blob, marker] of markers) {
  const j = extractJsonObjectAfterMarker(blob, marker);
  try {
    if (!j) throw new Error("null");
    JSON.parse(j);
  } catch (e) {
    console.error("FAIL", name, e.message);
    failed++;
  }
}

const riskBlob = `--- R ---\nRisikostate (json): ${JSON.stringify({ startCapital: 1e7 })}\n`;
try {
  const j = extractJsonObjectAfterRiskMarker(riskBlob);
  if (!j || JSON.parse(j).startCapital !== 1e7) throw new Error("risk parse");
} catch (e) {
  console.error("FAIL risiko", e.message);
  failed++;
}

if (failed) {
  process.exit(1);
}
console.log("OK: import JSON extract helpers", markers.length + 1, "checks");
