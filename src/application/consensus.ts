import type { Receipt } from "../domain/types";

/** 노드 한 개가 합의에 내놓는 값 — 원시 타입만(CRE의 consensusIdenticalAggregation과 같은 모양). 원문·본문은 없다. */
export interface Observation { verdict: string; reasons: string; receiptHash: string; sourceSummary: string }

export function toObservation(r: Receipt): Observation {
  return {
    verdict: r.verdict, reasons: r.reasons.join(","), receiptHash: r.receiptHash,
    sourceSummary: r.sources.map((s) => `${s.id}:${s.found ? "found" : "missing"}:${s.textSha256.slice(0, 12)}`).join("|"),
  };
}

export type Consensus = { reached: true; value: Observation; agree: number; of: number } | { reached: false; agree: number; of: number };

/** CRE와 같은 규칙: n개 노드 중 비잔틴 쿼럼(2f+1, n=3f+1이면 ⌈2n/3⌉)이 정확히 같은 값을 내야 합의. */
export function identicalConsensus(obs: Observation[]): Consensus {
  const n = obs.length; const quorum = Math.floor((2 * n) / 3) + 1 > n ? n : Math.floor((2 * n) / 3) + 1;
  const tally = new Map<string, { v: Observation; c: number }>();
  for (const o of obs) { const k = JSON.stringify(o); const e = tally.get(k); if (e) e.c++; else tally.set(k, { v: o, c: 1 }); }
  const top = [...tally.values()].sort((a, b) => b.c - a.c)[0];
  return top && top.c >= quorum ? { reached: true, value: top.v, agree: top.c, of: n } : { reached: false, agree: top?.c ?? 0, of: n };
}
