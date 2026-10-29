// 공개 판결 원문을 받아 fixtures/raw에 고정한다(LII는 Cornell 저작물인 마크업을 빼고 본문 글자만)(출처 URL·받은 날짜·sha256을 manifest에).
import { ALL_CASES, capUrl, liiUrl } from "./cases";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { liiText } from "../adapters/sources";
import { createHash } from "node:crypto";
import { makePoliteGet } from "./liveFetcher";
// 일괄 내려받기는 크롤러에 해당하므로 strict: robots.txt가 막는 출처(static.case.law는 「Disallow: /」)는 요청하지 않는다. LII는 Crawl-delay 10초(SPEC §14).
const polite = makePoliteGet((m) => console.error(m), "strict");

const root = new URL("../../fixtures/", import.meta.url).pathname;
mkdirSync(root + "raw/cap", { recursive: true });
mkdirSync(root + "raw/lii-text", { recursive: true });
const manifestPath = root + "manifest.json";
const manifest: Record<string, any> = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : {};

for (const c of ALL_CASES) {
  for (const [src, url, ext] of [["cap", capUrl(c), "json"], ["lii-text", liiUrl(c), "txt"]] as const) {
    if (src === "lii-text" && !c.lii) continue;
    const file = `raw/${src}/${c.slug}.${ext}`;
    if (existsSync(root + file)) continue;
    const got = await polite(url);
    if (got == null) { console.error("FAIL (not read: robots.txt disallow, non-200 or unreadable)", url); continue; }
    let body = got;
    if (src === "lii-text") { const t = liiText(body); if (!t) { console.error("FAIL(no text)", url); continue; } body = t; } // LII 마크업은 저장하지 않는다(본문 글자만)
    writeFileSync(root + file, body);
    manifest[file] = { url, status: 200, fetchedAt: new Date().toISOString(), bytes: body.length, sha256: createHash("sha256").update(body).digest("hex"), cite: c.cite, name: c.name };
    console.log("ok", file, body.length);
  }
}
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
