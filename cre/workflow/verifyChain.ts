// 실측: 거래 해시를 Sepolia RPC로 다시 조회해 상태와 우리 컨트랙트의 QuoteVerdict 이벤트를 확인한다(SPEC §12).
// 사용: bun run verifyChain.ts <txHash> <receiverAddress>
import { createPublicClient, decodeEventLog, http } from "viem";
import { sepolia } from "viem/chains";
import { readFileSync } from "node:fs";
const [tx, receiver] = process.argv.slice(2);
const art = JSON.parse(readFileSync(new URL("../receiver/QuoteProofReceiver.json", import.meta.url).pathname, "utf8"));
const pub = createPublicClient({ chain: sepolia, transport: http("https://ethereum-sepolia-rpc.publicnode.com") });
const rc = await pub.getTransactionReceipt({ hash: tx as `0x${string}` });
console.log(`tx ${tx}\nstatus ${rc.status} block ${rc.blockNumber} to ${rc.to} from ${rc.from} gasUsed ${rc.gasUsed}`);
let found = 0; let lastHash: `0x${string}` | null = null;
for (const l of rc.logs) {
  if (l.address.toLowerCase() !== receiver.toLowerCase()) continue;
  const ev = decodeEventLog({ abi: art.abi, data: l.data, topics: l.topics });
  console.log(`event from receiver ${l.address}: ${ev.eventName} ${JSON.stringify(ev.args)}`); found++;
  lastHash = (ev.args as any).receiptHash;
}
console.log(`QuoteVerdict events from the receiver in this transaction: ${found}`);
const code = await pub.getCode({ address: receiver as `0x${string}` });
console.log(`receiver code length ${(code!.length - 2) / 2} bytes; explorer: https://sepolia.etherscan.io/tx/${tx}`);
// v4 (SPEC §13): 거래의 to가 수신 컨트랙트가 고정한 forwarder와 같아야 한다
const fwd = (await pub.readContract({ address: receiver as `0x${string}`, abi: art.abi, functionName: "forwarder" })) as string;
console.log(`receiver.forwarder()=${fwd}; tx.to == forwarder: ${rc.to?.toLowerCase() === fwd.toLowerCase()}`);
if (lastHash) {
  const seen = await pub.readContract({ address: receiver as `0x${string}`, abi: art.abi, functionName: "seen", args: [lastHash] });
  const v = await pub.readContract({ address: receiver as `0x${string}`, abi: art.abi, functionName: "verdictOf", args: [lastHash] });
  console.log(`receiver.seen(${lastHash.slice(0, 10)}…)=${seen} verdictOf=${v}`);
}
// 직접 호출 시험: 배포자(= forwarder가 아닌 주소)가 onReport를 직접 부르면 되돌려져야 한다(eth_call, 거래를 보내지 않는다)
if (process.argv.includes("--direct-call-check")) {
  const report = ("0x" + "00".repeat(31) + "01" + "00".repeat(31) + "01" + "00".repeat(31) + "60" + "00".repeat(32)) as `0x${string}`;
  try { await pub.simulateContract({ account: rc.from, address: receiver as `0x${string}`, abi: art.abi, functionName: "onReport", args: ["0x", report] }); console.log("direct onReport from the deployer: NOT reverted (unexpected)"); }
  catch (e: any) { console.log(`direct onReport from ${rc.from} (not the forwarder): reverted as expected -> ${String(e.shortMessage ?? e.message).split("\n").slice(0, 3).join(" | ").slice(0, 200)}`); }
}
