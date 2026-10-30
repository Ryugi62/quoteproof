import { sha256Hex } from "./sha256";
import { normalizeText } from "./normalize";
import type { Receipt, SourceMatch, Verdict } from "./types";

export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return "[" + v.map(canonicalJson).join(",") + "]";
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return "{" + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ":" + canonicalJson(o[k])).join(",") + "}";
  }
  return JSON.stringify(v);
}

/** 출처 N곳의 결과를 하나의 판정으로 합의한다(SPEC §3-5). */
export function decide(sources: SourceMatch[], minSources: number): { verdict: Verdict; reasons: string[] } {
  if (sources.length < minSources) return { verdict: "HOLD", reasons: ["INSUFFICIENT_SOURCES"] };
  const found = sources.filter((s) => s.found);
  if (found.length === 0) {
    const extra = sources.map((s) => s.reason).filter((r) => r !== "NOT_FOUND" && r !== "OK");
    return { verdict: "HOLD", reasons: [...new Set(["NOT_IN_OPINION", ...extra])] };
  }
  if (found.length < sources.length) return { verdict: "HOLD", reasons: ["SOURCE_DISAGREE"] };
  if (sources.some((s) => s.distortion)) return { verdict: "HOLD", reasons: ["DISTORTION"] };
  return { verdict: "PASS", reasons: [] };
}

export interface ReceiptInput { citation: string; quote: string; sources: SourceMatch[]; minSources: number; checkedAt: string }

export function buildReceipt(i: ReceiptInput): Receipt {
  const sources = [...i.sources].sort((a, b) => (a.id < b.id ? -1 : 1));
  const { verdict, reasons } = decide(sources, i.minSources);
  const edits = [...new Set(sources.flatMap((s) => s.edits))].sort();
  const body = {
    citation: i.citation, quote: normalizeText(i.quote), verdict, reasons, edits, minSources: i.minSources,
    sources: sources.map((s) => ({ id: s.id, textSha256: s.textSha256, found: s.found, start: s.start, end: s.end, edits: s.edits, distortion: s.distortion, reason: s.reason, variance: s.variance })),
  };
  return { ...body, sources, nodeCount: sources.length, checkedAt: i.checkedAt, receiptHash: sha256Hex(canonicalJson(body)) };
}
