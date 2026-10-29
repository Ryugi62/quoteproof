// SPEC v2 §8: OnchainReport 인코딩 + main.ts의 writeReport 경로를 CRE SDK 테스트 런타임에서 시험한다.
import { expect } from "bun:test";
import { test } from "@chainlink/cre-sdk/test";
import { decodeAbiParameters } from "viem";
import { encodeOnchainReport, REPORT_ABI } from "./onchain";

const H = "b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198";

test("PASS는 verdictCode 1, 해시가 bytes32로 되돌려 읽힌다", () => {
  const enc = encodeOnchainReport({ verdict: "PASS", reasons: "", receiptHash: H });
  expect(enc.ok).toBe(true);
  if (!enc.ok) return;
  const [hash, code, reasons] = decodeAbiParameters(REPORT_ABI, enc.hex);
  expect(hash).toBe(`0x${H}`); expect(code).toBe(1); expect(reasons).toBe("");
});
test("HOLD/NOT_IN_OPINION은 verdictCode 0과 이유를 담는다", () => {
  const enc = encodeOnchainReport({ verdict: "HOLD", reasons: "NOT_IN_OPINION", receiptHash: H });
  expect(enc.ok).toBe(true);
  if (!enc.ok) return;
  const [, code, reasons] = decodeAbiParameters(REPORT_ABI, enc.hex);
  expect(code).toBe(0); expect(reasons).toBe("NOT_IN_OPINION");
});
test("해시가 비었거나 형식이 틀리면 쓰지 않는다", () => {
  expect(encodeOnchainReport({ verdict: "HOLD", reasons: "INSUFFICIENT_SOURCES", receiptHash: "" }).ok).toBe(false);
  expect(encodeOnchainReport({ verdict: "PASS", reasons: "", receiptHash: "zz" }).ok).toBe(false);
});
test("같은 입력이면 같은 바이트(결정성)", () => {
  const a = encodeOnchainReport({ verdict: "PASS", reasons: "", receiptHash: H });
  const b = encodeOnchainReport({ verdict: "PASS", reasons: "", receiptHash: H });
  expect(a).toEqual(b);
});

// ── main.ts의 writeOnchain 경로(SDK 테스트 런타임, EVM 모의) ──
import { EvmMock, newTestRuntime } from "@chainlink/cre-sdk/test";
import { getNetwork } from "@chainlink/cre-sdk";
import { writeOnchain } from "./main";

const cfg = { minSources: 2, evm: { chainSelectorName: "ethereum-testnet-sepolia", receiverAddress: "0x0000000000000000000000000000000000000001", gasLimit: "500000" } };
const sel = getNetwork({ chainFamily: "evm", chainSelectorName: "ethereum-testnet-sepolia", isTestnet: true })!.chainSelector.selector;

test("writeOnchain은 수신자 주소와 ABI 보고서를 writeReport로 보낸다", () => {
  const evm = EvmMock.testInstance(sel);
  let seen: any = null;
  (evm as any).writeReport = (req: any) => { seen = req; return { txStatus: 2 }; };
  const rt = newTestRuntime(null, {}, cfg);
  const out = writeOnchain(rt as any, { verdict: "PASS", reasons: "", receiptHash: H, sourceSummary: "" });
  expect(out).toBe("TX_STATUS_SUCCESS");
  expect(seen).not.toBeNull();
  expect(Buffer.from(seen.receiver).toString("hex")).toBe("0000000000000000000000000000000000000001");
});
test("해시가 없으면 writeReport를 부르지 않는다", () => {
  const evm = EvmMock.testInstance(sel);
  let called = false;
  (evm as any).writeReport = () => { called = true; return { txStatus: 2 }; };
  const rt = newTestRuntime(null, {}, cfg);
  expect(writeOnchain(rt as any, { verdict: "HOLD", reasons: "INSUFFICIENT_SOURCES", receiptHash: "", sourceSummary: "" })).toBe("skipped");
  expect(called).toBe(false);
});
