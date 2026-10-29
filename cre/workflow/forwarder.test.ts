// SPEC §13: 수신 컨트랙트는 고정한 forwarder만 받는다. 실제 EVM(@ethereumjs/evm)에서 컴파일한 바이트코드를 돌린다.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { Common, Mainnet } from "@ethereumjs/common";
import { createEVM } from "@ethereumjs/evm";
import { createAddressFromString, hexToBytes, bytesToHex } from "@ethereumjs/util";
import { encodeAbiParameters, encodeDeployData, encodeFunctionData, decodeFunctionResult, decodeErrorResult } from "viem";
import { compileReceiver } from "./compileReceiver";
import { encodeOnchainReport } from "./onchain";

// Chainlink 공식 문서 Forwarder Directory, Simulation Testnets 표, Ethereum Sepolia (docs/evidence/cre-forwarder-directory-ts-2026-10-30.md)
const DOC_SEPOLIA_MOCK_FORWARDER = "0x15fC6ae953E024d975e77382eEeC56A9101f9F88";
const OTHER = "0x570880967B591AeA114E91966f695928F30c82A3";
const art = compileReceiver();
const evm = await createEVM({ common: new Common({ chain: Mainnet, hardfork: "cancun" }) });
const addr = (a: string) => createAddressFromString(a.toLowerCase());
const HASH = "b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198";

async function deploy(forwarder: string) {
  const data = encodeDeployData({ abi: art.abi, bytecode: art.bytecode as `0x${string}`, args: [forwarder as `0x${string}`] });
  const r = await evm.runCall({ caller: addr(OTHER), data: hexToBytes(data), gasLimit: 10_000_000n });
  return { r, at: r.createdAddress! };
}
const call = (to: any, from: string, data: `0x${string}`) => evm.runCall({ caller: addr(from), to, data: hexToBytes(data), gasLimit: 5_000_000n });
const report = () => { const e = encodeOnchainReport({ verdict: "PASS", reasons: "", receiptHash: HASH }); if (!e.ok) throw new Error(e.why); return e.hex; };
const onReport = (rep: `0x${string}`) => encodeFunctionData({ abi: art.abi, functionName: "onReport", args: ["0x", rep] });

test("공식 문서 표의 Ethereum Sepolia Mock Forwarder 주소가 사본 원문에 그대로 있다", () => {
  const doc = readFileSync(new URL("../../docs/evidence/cre-forwarder-directory-ts-2026-10-30.md", import.meta.url).pathname, "utf8");
  expect(doc).toMatch(new RegExp(`\\| Ethereum Sepolia\\s+\\| ethereum-testnet-sepolia\\s+\\| ${DOC_SEPOLIA_MOCK_FORWARDER} \\|`));
  expect(doc).toContain("Mock Forwarder Address");
});
test("forwarder 아닌 주소의 onReport는 NotForwarder로 되돌려지고 기록이 남지 않는다", async () => {
  const { at } = await deploy(DOC_SEPOLIA_MOCK_FORWARDER);
  const res = await call(at, OTHER, onReport(report()));
  expect(res.execResult.exceptionError).toBeDefined();
  const err = decodeErrorResult({ abi: art.abi, data: bytesToHex(res.execResult.returnValue) });
  expect(err.errorName).toBe("NotForwarder");
  const seen = await call(at, OTHER, encodeFunctionData({ abi: art.abi, functionName: "seen", args: [`0x${HASH}`] }));
  expect(decodeFunctionResult({ abi: art.abi, functionName: "seen", data: bytesToHex(seen.execResult.returnValue) })).toBe(false);
});
test("고정한 forwarder가 부르면 QuoteVerdict 이벤트 1건, seen·verdictOf 기록", async () => {
  const { at } = await deploy(DOC_SEPOLIA_MOCK_FORWARDER);
  const res = await call(at, DOC_SEPOLIA_MOCK_FORWARDER, onReport(report()));
  expect(res.execResult.exceptionError).toBeUndefined();
  expect(res.execResult.logs?.length).toBe(1);
  const seen = await call(at, OTHER, encodeFunctionData({ abi: art.abi, functionName: "seen", args: [`0x${HASH}`] }));
  expect(decodeFunctionResult({ abi: art.abi, functionName: "seen", data: bytesToHex(seen.execResult.returnValue) })).toBe(true);
  const v = await call(at, OTHER, encodeFunctionData({ abi: art.abi, functionName: "verdictOf", args: [`0x${HASH}`] }));
  expect(decodeFunctionResult({ abi: art.abi, functionName: "verdictOf", data: bytesToHex(v.execResult.returnValue) })).toBe(1);
});
test("forwarder()가 생성자 인자를 돌려주고, 0 주소는 배포가 되돌려진다", async () => {
  const { at } = await deploy(DOC_SEPOLIA_MOCK_FORWARDER);
  const f = await call(at, OTHER, encodeFunctionData({ abi: art.abi, functionName: "forwarder" }));
  expect((decodeFunctionResult({ abi: art.abi, functionName: "forwarder", data: bytesToHex(f.execResult.returnValue) }) as string).toLowerCase()).toBe(DOC_SEPOLIA_MOCK_FORWARDER.toLowerCase());
  const z = await deploy("0x0000000000000000000000000000000000000000");
  expect(z.r.execResult.exceptionError).toBeDefined();
});
test("커밋된 receiver JSON은 현재 .sol을 컴파일한 결과와 같다(산출물이 소스와 어긋나지 않는다)", () => {
  const committed = JSON.parse(readFileSync(new URL("../receiver/QuoteProofReceiver.json", import.meta.url).pathname, "utf8"));
  expect(committed.bytecode).toBe(art.bytecode);
  expect(JSON.stringify(committed.abi)).toBe(JSON.stringify(art.abi));
});
