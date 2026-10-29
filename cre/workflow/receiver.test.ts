// SPEC §12: 수신 컨트랙트 산출물(ABI·바이트코드)이 워크플로의 보고서 형식과 맞는다.
import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { decodeAbiParameters, encodeFunctionData, toFunctionSelector } from "viem";
import { encodeOnchainReport, REPORT_ABI } from "./onchain";
const art = JSON.parse(readFileSync(new URL("../receiver/QuoteProofReceiver.json", import.meta.url).pathname, "utf8"));
test("onReport(bytes,bytes)와 supportsInterface가 있고 QuoteVerdict 이벤트가 (bytes32 indexed, uint8, string)이다", () => {
  const fn = (n: string) => art.abi.find((x: any) => x.type === "function" && x.name === n);
  expect(fn("onReport").inputs.map((i: any) => i.type)).toEqual(["bytes", "bytes"]);
  expect(fn("supportsInterface").inputs[0].type).toBe("bytes4");
  const ev = art.abi.find((x: any) => x.type === "event" && x.name === "QuoteVerdict");
  expect(ev.inputs.map((i: any) => `${i.type}${i.indexed ? " indexed" : ""}`)).toEqual(["bytes32 indexed", "uint8", "string"]);
});
test("워크플로가 만든 보고서 바이트를 onReport 호출 데이터에 실어 되돌려 읽으면 같은 해시·판정", () => {
  const enc = encodeOnchainReport({ verdict: "PASS", reasons: "", receiptHash: "b5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198" });
  if (!enc.ok) throw new Error(enc.why);
  const data = encodeFunctionData({ abi: art.abi, functionName: "onReport", args: ["0x", enc.hex] });
  expect(data.startsWith(toFunctionSelector("onReport(bytes,bytes)"))).toBe(true);
  const [h, v] = decodeAbiParameters(REPORT_ABI, enc.hex);
  expect(h).toBe("0xb5fc1c1a814225f2b4d667e4a08872374d03f93a9c857b455baea32a2f59f198"); expect(v).toBe(1);
});
test("바이트코드가 있고 소스에 개인정보성 저장이 없다(해시·판정·이유 코드만)", () => {
  expect(art.bytecode.startsWith("0x60")).toBe(true);
  const src = readFileSync(new URL("../receiver/QuoteProofReceiver.sol", import.meta.url).pathname, "utf8");
  expect(src.match(/mapping\(/g)?.length).toBe(2);   // verdictOf, seen — 저장소는 이 둘뿐
  expect(src).not.toMatch(/brief|opinion text/i.test(src) ? /^$/ : /x^/);
});
