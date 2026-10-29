// 고정 fixtures가 지금 라이브 출처와 같은 본문을 주는지 확인한다(본문 텍스트의 sha256 비교).
import { ALL_CASES, capUrl, liiUrl } from "./cases";
import { fixtureFetcher } from "./fixtureFetcher";
import { capText, liiText } from "../adapters/sources";
import { normalizeText } from "../domain/normalize";
import { sha256Hex } from "../domain/sha256";
import { makePoliteGet } from "./liveFetcher";
// 비교용 라이브 읽기는 크롤러 성격이라 strict: robots.txt가 막는 출처(CAP)는 읽지 않고 「skipped」로 센다. LII는 Crawl-delay 10초(SPEC §14).
const polite = makePoliteGet((m) => console.error(m), "strict");

let same = 0, diff = 0, skipped = 0; const lines: string[] = [];
for (const c of ALL_CASES) {
  for (const [id, url, parse] of [["cap", capUrl(c), capText], ["lii", liiUrl(c), liiText]] as const) {
    if (id === "lii" && !c.lii) { skipped++; continue; }
    const fx = await fixtureFetcher(url); const live = await polite(url);
    if (live == null) { skipped++; lines.push(`SKIPPED ${id} ${c.cite} (not read: robots.txt disallow, non-200 or unreadable)`); continue; }
    const a = fx ? parse(fx) : null, b = parse(live);
    const ha = a ? sha256Hex(normalizeText(a)) : "-", hb = b ? sha256Hex(normalizeText(b)) : "-";
    if (ha === hb && ha !== "-") same++; else { diff++; lines.push(`DIFF ${id} ${c.cite} fixture=${ha.slice(0, 12)} live=${hb.slice(0, 12)} `); }
  }
}
console.log(`live check ${new Date().toISOString()}: same ${same} · different ${diff} · skipped (no LII text) ${skipped}`);
lines.forEach((l) => console.log(l));
