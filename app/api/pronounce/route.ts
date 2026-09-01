import { dictionary } from "cmu-pronouncing-dictionary";

const VOWELS: Record<string, string> = {
  AA: "ɑ",
  AE: "æ",
  AH: "ʌ",
  AO: "ɔ",
  AW: "aʊ",
  AY: "aɪ",
  EH: "ɛ",
  ER: "ɝ",
  EY: "eɪ",
  IH: "ɪ",
  IY: "i",
  OW: "oʊ",
  OY: "ɔɪ",
  UH: "ʊ",
  UW: "u",
};

const CONSONANTS: Record<string, string> = {
  B: "b",
  CH: "tʃ",
  D: "d",
  DH: "ð",
  F: "f",
  G: "ɡ",
  HH: "h",
  JH: "dʒ",
  K: "k",
  L: "l",
  M: "m",
  N: "n",
  NG: "ŋ",
  P: "p",
  R: "ɹ",
  S: "s",
  SH: "ʃ",
  T: "t",
  TH: "θ",
  V: "v",
  W: "w",
  Y: "j",
  Z: "z",
  ZH: "ʒ",
};

function arpabetToIpa(arpabet: string) {
  const tokens = arpabet.split(/\s+/).filter(Boolean);
  const vowelIndexes = tokens
    .map((token, index) => (VOWELS[token.replace(/[012]/g, "")] ? index : -1))
    .filter((index) => index >= 0);
  if (!vowelIndexes.length) {
    return tokens.map((token) => CONSONANTS[token] ?? "").join("");
  }

  const syllableStarts = [0];
  for (let index = 1; index < vowelIndexes.length; index += 1) {
    const previousVowel = vowelIndexes[index - 1];
    const currentVowel = vowelIndexes[index];
    syllableStarts.push(currentVowel - previousVowel > 1 ? currentVowel - 1 : currentVowel);
  }

  return syllableStarts
    .map((start, index) => {
      const end = syllableStarts[index + 1] ?? tokens.length;
      const syllable = tokens.slice(start, end);
      const stressedVowel = syllable.find((token) => /[12]$/.test(token));
      const stress = stressedVowel?.endsWith("1") ? "ˈ" : stressedVowel?.endsWith("2") ? "ˌ" : "";
      const segments = syllable.map((token) => {
        const base = token.replace(/[012]/g, "");
        if (VOWELS[base]) {
          if (base === "AH" && token.endsWith("0")) return "ə";
          if (base === "ER" && token.endsWith("0")) return "ɚ";
          return VOWELS[base];
        }
        return CONSONANTS[base] ?? "";
      });
      return `${stress}${segments.join("")}`;
    })
    .join(".");
}

function pronunciationsFor(word: string) {
  const values = new Set<string>();
  const base = dictionary[word];
  if (base) values.add(base);
  for (let index = 1; index <= 9; index += 1) {
    const alternate = dictionary[`${word}(${index})`];
    if (alternate) values.add(alternate);
  }

  return Array.from(values).map((value) => {
    const arpabet = value.split(/\s+#/)[0].trim();
    return { arpabet, ipa: arpabetToIpa(arpabet) };
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const words = Array.isArray(body?.words)
    ? body.words
        .filter((word: unknown): word is string => typeof word === "string")
        .map((word: string) => word.toLocaleLowerCase().trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];

  const uniqueWords = Array.from(new Set(words));
  return Response.json({
    entries: Object.fromEntries(
      uniqueWords.map((word) => [
        word,
        { word, pronunciations: pronunciationsFor(word) },
      ]),
    ),
    source: "CMU Pronouncing Dictionary",
    accent: "North American English",
  });
}
