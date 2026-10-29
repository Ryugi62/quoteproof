// verify-brief 결과 → CRE 워크플로 HTTP 페이로드 (SPEC §16). 파일 쓰기·프로세스 실행은 infrastructure가 한다.
import type { BriefReport } from "./verifyBrief";

export interface CrePayload { file: string; row: number; body: { citation: string; quote: string } }
export interface CreIndexRow { row: number; citation: string | null; localVerdict: string; localReceiptHash?: string; payload: string | null; notChecked?: string }
export interface CreBundle { payloads: CrePayload[]; index: CreIndexRow[] }

/** READY(판정된) 행마다 {citation, quote}. 페이로드에는 그 Quote 문장과 인용뿐이다. */
export function buildCrePayloads(r: BriefReport): CreBundle {
  const payloads: CrePayload[] = [], index: CreIndexRow[] = [];
  for (const x of r.rows) {
    if (x.status === "NOT_CHECKED" || !x.citation) { index.push({ row: x.n, citation: null, localVerdict: "NOT_CHECKED", payload: null, notChecked: x.why }); continue; }
    const file = `payload-${String(payloads.length + 1).padStart(2, "0")}.json`;
    payloads.push({ file, row: x.n, body: { citation: x.citation, quote: x.quote } });
    index.push({ row: x.n, citation: x.citation, localVerdict: x.status, localReceiptHash: x.receiptHash, payload: file });
  }
  return { payloads, index };
}

export interface CreResult { verdict: string; reasons: string; hash: string; chainLine: string }
/** `cre workflow simulate` 출력에서 USER LOG의 합의 줄과 체인 쓰기 줄을 뽑는다. */
export function parseCreLog(out: string): CreResult | null {
  const m = out.match(/\[USER LOG\] Consensus result: (\w+) ([A-Z_,]*)\s*hash=([0-9a-f]{64})?/);
  if (!m) return null;
  const chain = out.match(/\[USER LOG\] (writeReport reply: .*|Chain write [^\n]*)/);
  return { verdict: m[1], reasons: m[2] ?? "", hash: m[3] ?? "", chainLine: chain ? chain[1] : "" };
}

export type CreRunner = (payloadFile: string) => Promise<{ code: number; out: string }>;
export interface BridgeResult { ok: boolean; hashMatch?: boolean; lines: string[] }

/** index의 row번 행(verify-brief 표의 # 번호)을 CRE 시뮬레이터로 돌리고 로컬 영수증 해시와 맞춰 본다. */
export async function bridgeToCre(b: CreBundle, row: number, run: CreRunner): Promise<BridgeResult> {
  const ix = b.index.find((x) => x.row === row);
  if (!ix) return { ok: false, lines: [`CRE: row ${row} not found in the brief report`] };
  if (!ix.payload) return { ok: false, lines: [`CRE: row ${row} is NOT_CHECKED (${ix.notChecked}); no payload was made, nothing sent to CRE`] };
  const { code, out } = await run(ix.payload);
  const lines: string[] = [];
  if (code !== 0) return { ok: false, lines: [`CRE: cre workflow simulate failed (exit ${code})`, ...out.trim().split("\n").slice(-5)] };
  const r = parseCreLog(out);
  if (!r) return { ok: false, lines: ["CRE: simulate exited 0 but no 'Consensus result' USER LOG line was found", ...out.trim().split("\n").slice(-5)] };
  lines.push(`CRE row ${row}: ${ix.payload} -> [USER LOG] Consensus result: ${r.verdict}${r.reasons ? " " + r.reasons : ""} hash=${r.hash.slice(0, 8)}…`);
  if (r.chainLine) lines.push(`CRE row ${row}: [USER LOG] ${r.chainLine}`);
  const match = r.hash === ix.localReceiptHash && r.verdict === ix.localVerdict;
  lines.push(match ? `CRE consensus hash == local receipt hash (${r.hash.slice(0, 8)}…, verdict ${r.verdict})` : `MISMATCH: CRE ${r.verdict} ${r.hash.slice(0, 8)}… vs local ${ix.localVerdict} ${(ix.localReceiptHash ?? "-").slice(0, 8)}…`);
  return { ok: true, hashMatch: match, lines };
}
