import { readFileSync, existsSync } from "node:fs";
import { ALL_CASES, capUrl, liiUrl } from "./cases";
import type { Fetcher } from "../adapters/sources";

const root = new URL("../../fixtures/raw/", import.meta.url).pathname;

/** URL → 고정 fixtures 파일. 네트워크를 쓰지 않는다(시험·평가의 재현성). */
export const fixtureFetcher: Fetcher = async (url) => {
  for (const c of ALL_CASES) {
    if (url === capUrl(c)) return read(`cap/${c.slug}.json`);
    if (url === liiUrl(c)) { const t = read(`lii-text/${c.slug}.txt`); return t == null ? null : wrapMain(t); }
  }
  return null;
};
const read = (rel: string) => (existsSync(root + rel) ? readFileSync(root + rel, "utf8") : null);

// LII 페이지의 마크업·탐색은 Cornell 저작물이라 저장하지 않는다. 본문 글자만 저장하고, 어댑터가 읽는 모양(<main>)으로 감싸 돌려준다.
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const wrapMain = (t: string) => `<main id="main"><p>${esc(t)}</p></main>`;
