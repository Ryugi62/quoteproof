import type { Receipt } from "../domain/types";

export interface LabelledCase { id: string; group: string; label: "genuine" | "altered"; citation: string; quote: string; construction: string }
export interface Rate { k: number; n: number; rate: number; lo: number; hi: number }

/** Wilson 95% 구간. n이 작을 때 단순 비율보다 정직하다. */
export function wilson(k: number, n: number): Rate {
  if (n === 0) return { k, n, rate: 0, lo: 0, hi: 1 };
  const z = 1.96, p = k / n, d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n), m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return { k, n, rate: p, lo: Math.max(0, (c - m) / d), hi: Math.min(1, (c + m) / d) };
}

/** 오탐 = 진짜인데 보류. 누락 = 변조인데 통과. */
export function summarize(cases: LabelledCase[], receipts: Map<string, Receipt>, includeGroup: (g: string) => boolean = () => true) {
  const sel = cases.filter((c) => includeGroup(c.group));
  const genuine = sel.filter((c) => c.label === "genuine"), altered = sel.filter((c) => c.label === "altered");
  const falseHold = genuine.filter((c) => receipts.get(c.id)!.verdict === "HOLD");
  const falsePass = altered.filter((c) => receipts.get(c.id)!.verdict === "PASS");
  return { falseHold: wilson(falseHold.length, genuine.length), falsePass: wilson(falsePass.length, altered.length), falseHoldIds: falseHold.map((c) => c.id), falsePassIds: falsePass.map((c) => c.id) };
}
