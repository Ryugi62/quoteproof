// 라이브 대조 CLI: bun run verify "<citation>" "<quote>"  → 영수증 JSON
import { verifyQuote } from "../application/verifyQuote";
import { makeLiveFetcher } from "./liveFetcher";
import { capSource, liiSource } from "../adapters/sources";

const liveFetcher = makeLiveFetcher((m) => console.error(m));   // robots.txt 준수: LII Crawl-delay 10초(SPEC §14)
const [citation, quote] = process.argv.slice(2);
if (!citation || !quote) { console.error('usage: bun run verify "372 U.S. 335" "<quote>"'); process.exit(2); }
const receipt = await verifyQuote(citation, quote, [capSource(liveFetcher), liiSource(liveFetcher)]);
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.verdict === "PASS" ? 0 : 1);
