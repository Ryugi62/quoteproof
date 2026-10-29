// SPEC v2 §8 — OnchainReport: 체인에 쓸 보고서 본문. 순수 함수(I/O 없음). 판정과 영수증 해시만 담는다(서면·본문 없음).
import { encodeAbiParameters, parseAbiParameters, type Hex } from "viem";

export const REPORT_ABI = parseAbiParameters("bytes32 receiptHash, uint8 verdictCode, string reasons");
export type ReportInput = { verdict: string; reasons: string; receiptHash: string };
export type Encoded = { ok: true; hex: Hex } | { ok: false; why: string };

export function encodeOnchainReport(i: ReportInput): Encoded {
  if (!/^[0-9a-f]{64}$/.test(i.receiptHash)) return { ok: false, why: "receiptHash is not 64 hex characters (not written)" };
  const code = i.verdict === "PASS" ? 1 : 0;
  return { ok: true, hex: encodeAbiParameters(REPORT_ABI, [`0x${i.receiptHash}`, code, i.reasons]) };
}
