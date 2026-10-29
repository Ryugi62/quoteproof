import { extractBriefQuotes, type NotCheckedWhy } from "../domain/brief";
import type { Receipt } from "../domain/types";
import type { OpinionSource } from "./ports";
import { verifyQuote, type VerifyOptions } from "./verifyQuote";

export interface BriefRow {
  n: number; quote: string; citation: string | null;
  status: "PASS" | "HOLD" | "NOT_CHECKED";
  reasons: string[]; why?: NotCheckedWhy; receiptHash?: string;
}
export interface BriefReport {
  rows: BriefRow[];
  summary: { quotes: number; pass: number; hold: number; notChecked: number };
}

/** 서면 한 부를 일괄 검사한다. 읽기 요청에는 Citation에서 만든 출처 URL만 쓰인다(Quote는 로컬 대조에만 쓴다). */
export async function verifyBrief(text: string, sources: OpinionSource[], opt: VerifyOptions = {}): Promise<BriefReport> {
  const rows: BriefRow[] = [];
  for (const q of extractBriefQuotes(text)) {
    if (q.status === "NOT_CHECKED" || !q.citation) { rows.push({ n: q.index, quote: q.quote, citation: null, status: "NOT_CHECKED", reasons: [], why: q.why }); continue; }
    const r: Receipt = await verifyQuote(q.citation, q.quote, sources, opt);
    rows.push({ n: q.index, quote: q.quote, citation: q.citation, status: r.verdict, reasons: r.reasons, receiptHash: r.receiptHash });
  }
  const c = (s: string) => rows.filter((r) => r.status === s).length;
  return { rows, summary: { quotes: rows.length, pass: c("PASS"), hold: c("HOLD"), notChecked: c("NOT_CHECKED") } };
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
export function formatBriefReport(r: BriefReport): string {
  const lines = ["#  | verdict     | citation     | detail                           | quote"];
  for (const x of r.rows) {
    const detail = x.status === "NOT_CHECKED" ? (x.why ?? "") : x.status === "HOLD" ? x.reasons.join(",") + " " + (x.receiptHash ?? "").slice(0, 8) : "hash " + (x.receiptHash ?? "").slice(0, 8);
    lines.push(`${String(x.n).padEnd(2)} | ${x.status.padEnd(11)} | ${(x.citation ?? "-").padEnd(12)} | ${detail.padEnd(32)} | ${clip(x.quote, 60)}`);
  }
  const s = r.summary;
  lines.push(`Summary: ${s.quotes} quotes found · ${s.pass} PASS · ${s.hold} HOLD · ${s.notChecked} not checked (no supported citation) · brief text stayed local`);
  return lines.join("\n");
}
