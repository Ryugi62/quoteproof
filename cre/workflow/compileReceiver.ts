// QuoteProofReceiver.sol → ../receiver/QuoteProofReceiver.json (ABI + bytecode). solc-js 0.8.28 (devDependency).
// 사용: cd cre/workflow && bun run compileReceiver.ts
import solc from "solc";
import { readFileSync, writeFileSync } from "node:fs";

export function compileReceiver(): { compiler: string; abi: any[]; bytecode: string } {
  const path = new URL("../receiver/QuoteProofReceiver.sol", import.meta.url).pathname;
  const input = { language: "Solidity", sources: { "QuoteProofReceiver.sol": { content: readFileSync(path, "utf8") } },
    settings: { optimizer: { enabled: false }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } };
  const out = JSON.parse(solc.compile(JSON.stringify(input)));
  const errs = (out.errors ?? []).filter((e: any) => e.severity === "error");
  if (errs.length) throw new Error(errs.map((e: any) => e.formattedMessage).join("\n"));
  const c = out.contracts["QuoteProofReceiver.sol"]["QuoteProofReceiver"];
  return { compiler: `solc-js ${solc.version()}`, abi: c.abi, bytecode: "0x" + c.evm.bytecode.object };
}
if (import.meta.main) {
  const art = compileReceiver();
  writeFileSync(new URL("../receiver/QuoteProofReceiver.json", import.meta.url).pathname, JSON.stringify(art));
  console.log(`wrote receiver artifact: ${art.compiler}, bytecode ${(art.bytecode.length - 2) / 2} bytes`);
}
