import type { OpinionSource } from "../application/ports";
import { htmlToText } from "./html";

export type Fetcher = (url: string) => Promise<string | null>;

/** "410 U.S. 113" → {vol, page}. 지금은 U.S. Reports만 안다(범위: 영어 미국 연방대법원 판결). */
export function parseUsCite(citation: string): { vol: number; page: number } | null {
  const m = citation.match(/^\s*(\d+)\s+U\.\s?S\.\s+(\d+)\s*$/);
  return m ? { vol: Number(m[1]), page: Number(m[2]) } : null;
}
export const capUrl = (vol: number, page: number) => `https://static.case.law/us/${vol}/cases/${String(page).padStart(4, "0")}-01.json`;
export const liiUrl = (vol: number, page: number) => `https://www.law.cornell.edu/supremecourt/text/${vol}/${page}`;

/** 출처 A: Harvard Caselaw Access Project(static.case.law). 다수·보충·반대 의견 본문(머리글 제외). */
export function capSource(fetcher: Fetcher): OpinionSource {
  return {
    id: "cap",
    urlFor(citation) { const c = parseUsCite(citation); return c ? capUrl(c.vol, c.page) : null; },
    async readOpinion(citation) {
      const c = parseUsCite(citation); if (!c) return null;
      const body = await fetcher(capUrl(c.vol, c.page)); if (!body) return null;
      return capText(body);
    },
  };
}
export function capText(json: string): string | null {
  const d = JSON.parse(json);
  const ops: { text?: string }[] = d?.casebody?.opinions ?? [];
  const t = ops.map((o) => o.text ?? "").join("\n\n");
  return t.length > 0 ? t : null;
}

/** 출처 B: Cornell LII 연방대법원 본문. 머리글(Syllabus)·변호인 표기까지 한 페이지에 들어 있다. */
export function liiSource(fetcher: Fetcher): OpinionSource {
  return {
    id: "lii",
    urlFor(citation) { const c = parseUsCite(citation); return c ? liiUrl(c.vol, c.page) : null; },
    async readOpinion(citation) {
      const c = parseUsCite(citation); if (!c) return null;
      const body = await fetcher(liiUrl(c.vol, c.page)); if (!body) return null;
      return liiText(body);
    },
  };
}
export function liiText(html: string): string | null {
  const i = html.indexOf('<main id="main"');
  const j = html.indexOf("</main>");
  const region = i >= 0 ? html.slice(i, j > i ? j : undefined) : html;
  const t = htmlToText(region);
  return t.trim().length > 2000 ? t : null; // 합본 안내 페이지(본문 없음)는 못 읽은 것으로 본다
}
