// Sepolia 수신 컨트랙트 배포(SPEC §12). 키는 ~/.config/quoteproof/sepolia.env(권한 600, 레포 밖)에서만 읽고 출력하지 않는다.
// v4: 생성자 인자로 CRE forwarder 주소를 고정한다(SPEC §13). 기본값 = Chainlink 공식 문서 Forwarder Directory의 Ethereum Sepolia Mock Forwarder.
// 사용: cd cre/workflow && bun run deployReceiver.ts [--balance-only] [--forwarder 0x…]
import { createPublicClient, createWalletClient, formatEther, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { readFileSync } from "node:fs";
import { encodeDeployData } from "viem";
const fi = process.argv.indexOf("--forwarder");
const FORWARDER = (fi >= 0 ? process.argv[fi + 1] : "0x15fC6ae953E024d975e77382eEeC56A9101f9F88") as `0x${string}`;
const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const env = readFileSync(`${process.env.HOME}/.config/quoteproof/sepolia.env`, "utf8");
const key = `0x${env.match(/CRE_ETH_PRIVATE_KEY=([0-9a-fA-F]{64})/)![1]}` as const;
const account = privateKeyToAccount(key);
const pub = createPublicClient({ chain: sepolia, transport: http(RPC) });
const bal = await pub.getBalance({ address: account.address });
console.log(`address ${account.address}  balance ${formatEther(bal)} SepETH`);
if (process.argv.includes("--balance-only")) process.exit(0);
if (bal === 0n) { console.error("balance is 0: nothing to deploy with"); process.exit(1); }
const art = JSON.parse(readFileSync(new URL("../receiver/QuoteProofReceiver.json", import.meta.url).pathname, "utf8"));
const wallet = createWalletClient({ account, chain: sepolia, transport: http(RPC) });
console.log(`forwarder (constructor arg) ${FORWARDER}`);
const hash = await wallet.deployContract({ abi: art.abi, bytecode: art.bytecode, args: [FORWARDER] });
console.log(`deploy tx ${hash}`);
const rc = await pub.waitForTransactionReceipt({ hash });
console.log(`status ${rc.status} block ${rc.blockNumber} contract ${rc.contractAddress} gasUsed ${rc.gasUsed}`);
