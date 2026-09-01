"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Clipboard,
  Info,
  ListTree,
  LoaderCircle,
  RotateCcw,
  Search,
  TriangleAlert,
} from "lucide-react";
import {
  INITIAL_GROUPS,
  RHYME_ROWS,
  SOURCE_NOTE,
  SPECIAL_TRANSLATIONS,
} from "./transliteration-data";

type Mode = "roman" | "romanApprox" | "english";
type Tab = "transliterate" | "table" | "special";

type Pronunciation = {
  arpabet: string;
  ipa: string;
};

type PronunciationEntry = {
  word: string;
  pronunciations: Pronunciation[];
};

type PronunciationEntries = Record<string, PronunciationEntry>;

type OutputUnit = {
  id: string;
  source: string;
  normalized: string;
  initial: string;
  rhyme: string;
  candidates: string[];
  status: "mapped" | "missing" | "special";
  note?: string;
};

type DraftUnit = Omit<OutputUnit, "id">;
type ResultPart =
  | { type: "unit"; unit: OutputUnit }
  | { type: "literal"; value: string };

const specialBySource = new Map(
  SPECIAL_TRANSLATIONS.map((item) => [normalizeKey(item.source), item]),
);

const syllableDefinitions = RHYME_ROWS.flatMap((row) =>
  INITIAL_GROUPS.flatMap((initial) =>
    initial.aliases.flatMap((alias) =>
      row.variants.map((variant) => ({
        text: `${alias}${variant}`,
        initial,
        rhyme: row,
      })),
    ),
  ),
).sort((a, b) => b.text.length - a.text.length);

const rhymeByVariant = new Map(
  RHYME_ROWS.flatMap((row) => row.variants.map((variant) => [variant, row])),
);

function normalizeKey(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[’ʼ]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeRoman(value: string) {
  return normalizeKey(value)
    .replace(/sh/g, "š")
    .replace(/ch/g, "č")
    .replace(/zh/g, "ǰ")
    .replace(/j/g, "ǰ")
    .replace(/oe/g, "ö")
    .replace(/ue/g, "ü")
    .replace(/ḳ/g, "k");
}

function cellCandidates(value: string) {
  return Array.from(new Set(Array.from(value)));
}

function unitFromDefinition(
  source: string,
  definition: (typeof syllableDefinitions)[number],
  note?: string,
): DraftUnit {
  const cell = definition.rhyme.cells[definition.initial.key];
  const candidates = cellCandidates(cell);
  return {
    source,
    normalized: definition.text,
    initial: definition.initial.label,
    rhyme: definition.rhyme.label,
    candidates,
    status: candidates.length ? "mapped" : "missing",
    note,
  };
}

function unknownUnit(source: string): DraftUnit {
  return {
    source,
    normalized: source,
    initial: "—",
    rhyme: "—",
    candidates: [],
    status: "missing",
  };
}

function mergeUnknownUnits(units: DraftUnit[]) {
  return units.reduce<DraftUnit[]>((merged, unit) => {
    const previous = merged.at(-1);
    if (
      previous?.status === "missing" &&
      unit.status === "missing" &&
      previous.initial === "—" &&
      unit.initial === "—"
    ) {
      previous.source += unit.source;
      previous.normalized += unit.normalized;
    } else {
      merged.push({ ...unit });
    }
    return merged;
  }, []);
}

function parseRomanSegment(segment: string) {
  const normalized = normalizeRoman(segment);
  const memo = new Map<number, { units: DraftUnit[]; score: number }>();

  function solve(index: number): { units: DraftUnit[]; score: number } {
    if (index >= normalized.length) return { units: [], score: 0 };
    const cached = memo.get(index);
    if (cached) return cached;

    const unknownTail = solve(index + 1);
    let best = {
      units: [unknownUnit(normalized[index]), ...unknownTail.units],
      score: unknownTail.score - 20,
    };

    for (const definition of syllableDefinitions) {
      if (!normalized.startsWith(definition.text, index)) continue;
      const tail = solve(index + definition.text.length);
      const unit = unitFromDefinition(definition.text, definition);
      const score =
        tail.score + definition.text.length * 12 + (unit.candidates.length ? 8 : -2) - 1;
      if (score > best.score || (score === best.score && tail.units.length < best.units.length)) {
        best = { units: [unit, ...tail.units], score };
      }
    }

    memo.set(index, best);
    return best;
  }

  return mergeUnknownUnits(solve(0).units);
}

type PhoneticDraft = { onset: string; rhyme: string };

function mapRomanApproxVowels(group: string) {
  if (/oi|oy/.test(group)) return "oi";
  if (/ou|ow|au|aw/.test(group)) return "au";
  if (/ai|ay|ei|ey|igh/.test(group)) return "ai";
  if (/ee|ea|ie/.test(group)) return "i";
  if (/oo|ew/.test(group)) return "u";
  const first = group[0];
  return first === "y" ? "i" : first;
}

function normalizeRomanApproxLetters(word: string) {
  return word
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase()
    .replace(/tch/g, "č")
    .replace(/sch|sh/g, "š")
    .replace(/ch/g, "č")
    .replace(/zh/g, "ǰ")
    .replace(/ph/g, "p")
    .replace(/th/g, "t")
    .replace(/ck/g, "k")
    .replace(/qu/g, "k")
    .replace(/ng/g, "ŋ")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/j/g, "ǰ")
    .replace(/x/g, "ks")
    .replace(/z/g, "s")
    .replace(/v/g, "b")
    .replace(/f/g, "p")
    .replace(/w/g, "u")
    .replace(/r/g, "l")
    .replace(/h/g, "x")
    .replace(/[^a-zčǰšŋ]/g, "");
}

function approximateOnset(consonant: string) {
  return consonant === "ŋ" ? "g" : consonant;
}

function attachCoda(draft: PhoneticDraft | undefined, consonant: string) {
  if (!draft || !["n", "m", "ŋ"].includes(consonant)) return false;
  const coda = consonant === "ŋ" ? "ng" : consonant;
  const combined = `${draft.rhyme}${coda}`;
  if (!rhymeByVariant.has(combined)) return false;
  draft.rhyme = combined;
  return true;
}

function romanApproxSyllables(word: string) {
  const normalized = normalizeRomanApproxLetters(word);
  const drafts: PhoneticDraft[] = [];
  const nuclei = Array.from(normalized.matchAll(/[aeiouy]+/g));

  const emitEpenthetic = (consonant: string) => {
    drafts.push({ onset: approximateOnset(consonant), rhyme: "a" });
  };

  if (!nuclei.length) {
    Array.from(normalized).forEach(emitEpenthetic);
  } else {
    let cursor = 0;
    nuclei.forEach((match, nucleusIndex) => {
      const start = match.index ?? cursor;
      let cluster = Array.from(normalized.slice(cursor, start));

      if (nucleusIndex > 0 && cluster.length && attachCoda(drafts.at(-1), cluster[0])) {
        cluster = cluster.slice(1);
      }

      const onset = cluster.at(-1) ?? "";
      cluster.slice(0, -1).forEach(emitEpenthetic);
      drafts.push({ onset: approximateOnset(onset), rhyme: mapRomanApproxVowels(match[0]) });
      cursor = start + match[0].length;
    });

    let trailing = Array.from(normalized.slice(cursor));
    const finalCoda = trailing.at(-1);
    if (finalCoda && ["n", "m", "ŋ"].includes(finalCoda)) {
      trailing = trailing.slice(0, -1);
      trailing.forEach(emitEpenthetic);
      if (!attachCoda(drafts.at(-1), finalCoda)) emitEpenthetic(finalCoda);
    } else {
      trailing.forEach(emitEpenthetic);
    }
  }

  return drafts.map((draft) => {
    const definition = syllableDefinitions.find(
      (item) =>
        item.text === `${draft.onset}${draft.rhyme}` &&
        item.rhyme.variants.includes(draft.rhyme),
    );
    if (!definition) return unknownUnit(`${draft.onset}${draft.rhyme}`);
    return unitFromDefinition(definition.text, definition, "罗马音估读");
  });
}

const ARPA_VOWEL_TO_RHYME: Record<string, string> = {
  AA: "a",
  AE: "a",
  AH: "a",
  AO: "o",
  AW: "au",
  AY: "ai",
  EH: "e",
  ER: "e",
  EY: "ei",
  IH: "i",
  IY: "i",
  OW: "o",
  OY: "oi",
  UH: "u",
  UW: "u",
};

const ARPA_CONSONANT_TO_TARGET: Record<string, string> = {
  B: "b",
  CH: "č",
  D: "d",
  DH: "d",
  F: "p",
  G: "g",
  HH: "x",
  JH: "ǰ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "l",
  S: "s",
  SH: "š",
  T: "t",
  TH: "t",
  V: "b",
  W: "y",
  Y: "y",
  Z: "s",
  ZH: "ǰ",
};

function arpaBase(token: string) {
  return token.replace(/[012]/g, "");
}

function resolvePhoneticDraft(draft: PhoneticDraft, note: string) {
  const definition = syllableDefinitions.find(
    (item) =>
      item.text === `${draft.onset}${draft.rhyme}` &&
      item.rhyme.variants.includes(draft.rhyme),
  );
  if (!definition) return unknownUnit(`${draft.onset}${draft.rhyme}`);
  return unitFromDefinition(definition.text, definition, note);
}

function arpabetSyllables(pronunciation: string) {
  const phonemes = pronunciation.split(/\s+/).filter(Boolean);
  const vowelIndexes = phonemes
    .map((token, index) => (ARPA_VOWEL_TO_RHYME[arpaBase(token)] ? index : -1))
    .filter((index) => index >= 0);
  const drafts: PhoneticDraft[] = [];

  const emitEpenthetic = (consonant: string) => {
    const onset = consonant === "ŋ" ? "g" : consonant;
    drafts.push({ onset, rhyme: "a" });
  };

  if (!vowelIndexes.length) {
    phonemes
      .map((token) => ARPA_CONSONANT_TO_TARGET[arpaBase(token)])
      .filter(Boolean)
      .forEach(emitEpenthetic);
  } else {
    let cursor = 0;
    vowelIndexes.forEach((vowelIndex, nucleusIndex) => {
      let cluster = phonemes
        .slice(cursor, vowelIndex)
        .map((token) => ARPA_CONSONANT_TO_TARGET[arpaBase(token)])
        .filter(Boolean);

      if (nucleusIndex > 0 && cluster.length && attachCoda(drafts.at(-1), cluster[0])) {
        cluster = cluster.slice(1);
      }

      const onset = cluster.at(-1) ?? "";
      cluster.slice(0, -1).forEach(emitEpenthetic);
      drafts.push({
        onset: onset === "ŋ" ? "g" : onset,
        rhyme: ARPA_VOWEL_TO_RHYME[arpaBase(phonemes[vowelIndex])],
      });
      cursor = vowelIndex + 1;
    });

    let trailing = phonemes
      .slice(cursor)
      .map((token) => ARPA_CONSONANT_TO_TARGET[arpaBase(token)])
      .filter(Boolean);
    const finalCoda = trailing.at(-1);
    if (finalCoda && ["n", "m", "ŋ"].includes(finalCoda)) {
      trailing = trailing.slice(0, -1);
      trailing.forEach(emitEpenthetic);
      if (!attachCoda(drafts.at(-1), finalCoda)) emitEpenthetic(finalCoda);
    } else {
      trailing.forEach(emitEpenthetic);
    }
  }

  return drafts.map((draft) => resolvePhoneticDraft(draft, "CMUdict 发音映射"));
}

function englishWords(input: string) {
  return Array.from(
    new Set(
      (input.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g) ?? [])
        .map((word) => word.toLocaleLowerCase())
        .filter(Boolean),
    ),
  );
}

function specialUnit(source: string): DraftUnit | null {
  const special = specialBySource.get(normalizeKey(source));
  if (!special) return null;
  return {
    source,
    normalized: special.source,
    initial: "特例",
    rhyme: "整词",
    candidates: [...special.options],
    status: "special",
    note: "特殊译字",
  };
}

function parseWord(word: string, mode: Mode) {
  const special = specialUnit(word);
  if (special) return [special];
  if (mode === "romanApprox") return romanApproxSyllables(word);
  return word
    .split(/['’ʼ]+/)
    .filter(Boolean)
    .flatMap(parseRomanSegment);
}

function parseInput(
  input: string,
  mode: Mode,
  entries: PronunciationEntries,
  pronunciationChoices: Record<string, number>,
  lookupStatus: "idle" | "loading" | "ready" | "error",
) {
  const exactSpecial = mode === "english" ? null : specialUnit(input.trim());
  let sequence = 0;
  if (exactSpecial && input.trim().includes(" ")) {
    const unit = { ...exactSpecial, id: `unit-${sequence}` };
    return { parts: [{ type: "unit", unit } satisfies ResultPart], units: [unit] };
  }

  const chunks = input.match(/[\p{L}\p{M}'’ʼ]+|[^\p{L}\p{M}'’ʼ]+/gu) ?? [];
  const parts: ResultPart[] = [];
  const units: OutputUnit[] = [];

  for (const chunk of chunks) {
    if (/^[\p{L}\p{M}'’ʼ]+$/u.test(chunk)) {
      const key = normalizeKey(chunk);
      const pronunciation = entries[key]?.pronunciations[pronunciationChoices[key] ?? 0];
      const drafts = mode === "english"
        ? pronunciation
          ? arpabetSyllables(pronunciation.arpabet)
          : [{
              ...unknownUnit(chunk),
              note: lookupStatus === "loading"
                ? "查询发音中"
                : lookupStatus === "error"
                  ? "词典连接失败"
                  : "CMUdict 未收录",
            }]
        : parseWord(chunk, mode);
      for (const draft of drafts) {
        const unit = { ...draft, id: `unit-${sequence++}` };
        units.push(unit);
        parts.push({ type: "unit", unit });
      }
    } else {
      parts.push({ type: "literal", value: chunk });
    }
  }

  return { parts, units };
}

const EXAMPLES: { label: string; value: string; mode: Mode }[] = [
  { label: "morin", value: "morin", mode: "roman" },
  { label: "Kublai", value: "Kublai", mode: "romanApprox" },
  { label: "Alexander", value: "Alexander", mode: "english" },
];

export default function Home() {
  const [input, setInput] = useState("morin");
  const [mode, setMode] = useState<Mode>("roman");
  const [activeTab, setActiveTab] = useState<Tab>("transliterate");
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [indexQuery, setIndexQuery] = useState("");
  const [pronunciationEntries, setPronunciationEntries] = useState<PronunciationEntries>({});
  const [pronunciationChoices, setPronunciationChoices] = useState<Record<string, number>>({});
  const [lookupStatus, setLookupStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");

  const lookupWords = useMemo(() => englishWords(input), [input]);
  const lookupWordKey = lookupWords.join("\u0000");
  const parsed = useMemo(
    () => parseInput(input, mode, pronunciationEntries, pronunciationChoices, lookupStatus),
    [input, lookupStatus, mode, pronunciationChoices, pronunciationEntries],
  );
  const output = useMemo(
    () =>
      parsed.parts
        .map((part) =>
          part.type === "literal"
            ? part.value
            : choices[part.unit.id] ?? part.unit.candidates[0] ?? "□",
        )
        .join(""),
    [choices, parsed.parts],
  );

  const mappedCount = parsed.units.filter((unit) => unit.candidates.length).length;
  const missingCount = parsed.units.length - mappedCount;
  const coverage = parsed.units.length ? Math.round((mappedCount / parsed.units.length) * 100) : 0;

  useEffect(() => {
    setChoices({});
    setCopied(false);
  }, [input, mode]);

  useEffect(() => {
    setPronunciationChoices({});
    if (mode !== "english") {
      setLookupStatus("idle");
      return;
    }
    if (!lookupWords.length) {
      setPronunciationEntries({});
      setLookupStatus("ready");
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLookupStatus("loading");
      try {
        const response = await fetch("/api/pronounce", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ words: lookupWords }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Pronunciation lookup failed");
        const data = await response.json() as { entries: PronunciationEntries };
        setPronunciationEntries(data.entries);
        setLookupStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLookupStatus("error");
      }
    }, 180);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [lookupWordKey, mode]);

  const filteredRows = RHYME_ROWS.filter((row) => {
    const query = indexQuery.trim().toLocaleLowerCase();
    if (!query) return true;
    return (
      row.label.toLocaleLowerCase().includes(query) ||
      Object.values(row.cells).some((cell) => cell.includes(indexQuery.trim()))
    );
  });

  async function copyOutput() {
    if (!output.trim()) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  function loadExample(example: (typeof EXAMPLES)[number]) {
    setInput(example.value);
    setMode(example.mode);
    setActiveTab("transliterate");
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="seal" aria-hidden="true">譯</div>
          <div>
            <h1>中古蒙漢音譯器</h1>
          </div>
        </div>

        <nav className="tabs" aria-label="主要视图" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "transliterate"}
            className={activeTab === "transliterate" ? "active" : ""}
            onClick={() => setActiveTab("transliterate")}
          >
            <ListTree size={16} />音译
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "table"}
            className={activeTab === "table" ? "active" : ""}
            onClick={() => setActiveTab("table")}
          >
            <BookOpen size={16} />对音表
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "special"}
            className={activeTab === "special" ? "active" : ""}
            onClick={() => setActiveTab("special")}
          >
            特殊译字 <span>{SPECIAL_TRANSLATIONS.length}</span>
          </button>
        </nav>
      </header>

      {activeTab === "transliterate" && (
        <section className="workbench" aria-label="音译工作区">
          <div className="input-pane">
            <div className="pane-heading">
              <div>
                <span className="section-number">01</span>
                <h2>原文</h2>
              </div>
              <div className="segmented" aria-label="输入模式">
                <button
                  type="button"
                  className={mode === "roman" ? "selected" : ""}
                  aria-pressed={mode === "roman"}
                  onClick={() => setMode("roman")}
                >
                  学术转写
                </button>
                <button
                  type="button"
                  className={mode === "romanApprox" ? "selected" : ""}
                  aria-pressed={mode === "romanApprox"}
                  onClick={() => setMode("romanApprox")}
                >
                  罗马音近似
                </button>
                <button
                  type="button"
                  className={mode === "english" ? "selected" : ""}
                  aria-pressed={mode === "english"}
                  onClick={() => setMode("english")}
                >
                  英文近似
                </button>
              </div>
            </div>

            <div className="textarea-wrap">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 240))}
                placeholder={
                  mode === "roman"
                    ? "morin / ongqan"
                    : mode === "romanApprox"
                      ? "Kublai"
                      : "Alexander"
                }
                spellCheck={false}
                aria-label="待音译文本"
              />
              <span className="character-count">{input.length}/240</span>
            </div>

            <div className="sample-row" aria-label="示例">
              {EXAMPLES.map((example) => (
                <button key={example.label} type="button" onClick={() => loadExample(example)}>
                  {example.label}
                </button>
              ))}
              <button
                type="button"
                className="icon-button clear-button"
                title="清空"
                aria-label="清空输入"
                onClick={() => setInput("")}
              >
                <RotateCcw size={16} />
              </button>
            </div>

            <div className="mode-note">
              {mode === "roman" ? (
                <><span>严格匹配</span><code>š · č · ǰ · γ · ö · ü · ē</code></>
              ) : mode === "romanApprox" ? (
                <>
                  <span className="fun-label"><Info size={14} />并不严谨，仅供娱乐</span>
                  <code>{parsed.units.map((unit) => unit.normalized).join("-") || "—"}</code>
                </>
              ) : (
                <>
                  <span className="dictionary-label">
                    {lookupStatus === "loading" && <LoaderCircle className="spin" size={14} />}
                    基于CMUdict的北美英语IPA转写
                  </span>
                  <code>{parsed.units.map((unit) => unit.normalized).join("-") || "—"}</code>
                </>
              )}
            </div>

            {mode === "english" && lookupWords.length > 0 && (
              <div className="pronunciation-panel" aria-live="polite">
                {lookupWords.map((word) => {
                  const pronunciations = pronunciationEntries[word]?.pronunciations ?? [];
                  const selectedIndex = pronunciationChoices[word] ?? 0;
                  return (
                    <div className="pronunciation-row" key={word}>
                      <strong>{word}</strong>
                      {pronunciations.length > 1 ? (
                        <select
                          aria-label={`${word} 的英语读音`}
                          value={selectedIndex}
                          onChange={(event) =>
                            setPronunciationChoices((current) => ({
                              ...current,
                              [word]: Number(event.target.value),
                            }))
                          }
                        >
                          {pronunciations.map((pronunciation, index) => (
                            <option key={pronunciation.arpabet} value={index}>
                              /${pronunciation.ipa}/
                            </option>
                          ))}
                        </select>
                      ) : (
                        <code title={pronunciations[0]?.arpabet}>
                          {lookupStatus === "loading"
                            ? "查询中"
                            : pronunciations[0]
                              ? `/${pronunciations[0].ipa}/`
                              : "未收录"}
                        </code>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="output-pane">
            <div className="pane-heading output-heading">
              <div>
                <span className="section-number">02</span>
                <h2>译名</h2>
              </div>
              <button
                type="button"
                className="icon-command"
                onClick={copyOutput}
                disabled={!input.trim()}
              >
                {copied ? <Check size={17} /> : <Clipboard size={17} />}
                {copied ? "已复制" : "复制"}
              </button>
            </div>

            <div className="result-display" aria-live="polite">
              <span>{output || "—"}</span>
            </div>

            <div className="result-stats">
              <span>{parsed.units.length} 音节</span>
              <span>{coverage}% 表内覆盖</span>
              {missingCount > 0 && <span className="missing-stat">{missingCount} 待处理</span>}
            </div>

            {missingCount > 0 && (
              <div className="warning-line" role="status">
                <TriangleAlert size={17} />
                <span>方框表示该音节在试行表中没有对应项。</span>
              </div>
            )}

            <div className="unit-list">
              {parsed.units.map((unit, index) => (
                <article className={`unit-card ${unit.status}`} key={unit.id}>
                  <div className="unit-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="unit-main">
                    <div className="unit-meta">
                      <strong>{unit.normalized}</strong>
                      <span>{unit.note ?? `${unit.initial} + ${unit.rhyme}`}</span>
                    </div>
                    {unit.candidates.length ? (
                      <div className="candidate-grid" aria-label={`${unit.normalized} 的译字候选`}>
                        {unit.candidates.map((candidate) => {
                          const selected = (choices[unit.id] ?? unit.candidates[0]) === candidate;
                          return (
                            <button
                              type="button"
                              key={candidate}
                              className={selected ? "selected" : ""}
                              aria-pressed={selected}
                              onClick={() =>
                                setChoices((current) => ({ ...current, [unit.id]: candidate }))
                              }
                            >
                              {candidate}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="empty-candidate">无表内用字</div>
                    )}
                  </div>
                </article>
              ))}
              {!parsed.units.length && <div className="empty-state">等待输入</div>}
            </div>
          </div>
        </section>
      )}

      {activeTab === "table" && (
        <section className="reference-view" aria-labelledby="table-title">
          <div className="reference-heading">
            <div>
              <span className="section-number">INDEX</span>
              <h2 id="table-title">中古蒙漢對音表</h2>
              <p>{RHYME_ROWS.length} 组韵母 · {INITIAL_GROUPS.length} 组声母</p>
            </div>
            <label className="search-box">
              <Search size={17} />
              <input
                value={indexQuery}
                onChange={(event) => setIndexQuery(event.target.value)}
                placeholder="检索罗马字或汉字"
              />
            </label>
          </div>

          <div className="table-scroll">
            <table className="mapping-table">
              <thead>
                <tr>
                  <th>韵母</th>
                  {INITIAL_GROUPS.map((initial) => <th key={initial.key}>{initial.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.label}>
                    <th>{row.label}</th>
                    {INITIAL_GROUPS.map((initial) => (
                      <td key={initial.key}>{row.cells[initial.key] || <span>—</span>}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="source-note"><TriangleAlert size={16} />{SOURCE_NOTE}</div>
        </section>
      )}

      {activeTab === "special" && (
        <section className="reference-view" aria-labelledby="special-title">
          <div className="reference-heading">
            <div>
              <span className="section-number">EXCEPTIONS</span>
              <h2 id="special-title">部分特殊译字</h2>
              <p>整词匹配优先于常规音节切分</p>
            </div>
          </div>
          <div className="special-grid">
            {SPECIAL_TRANSLATIONS.map((item, index) => (
              <button
                type="button"
                className="special-row"
                key={item.source}
                onClick={() => loadExample({ label: item.source, value: item.source, mode: "roman" })}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <code>{item.source}</code>
                <strong>{item.options.join(" / ")}</strong>
              </button>
            ))}
          </div>
        </section>
      )}

      <footer>
        <span>数据源：中古蒙漢對音表試行版（3-18v）</span>
        <span>本地计算 · 不上传输入</span>
      </footer>
    </main>
  );
}
