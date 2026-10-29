// robots.txt 해석 — SPEC §14. 순수 함수: I/O 없음. 「User-agent: *」 묶음만 읽는다(우리 UA 전용 묶음은 쓰지 않는다).
export interface RobotsRules { crawlDelaySec: number | null; allow: string[]; disallow: string[] }

export function parseRobots(text: string): RobotsRules {
  const rules: RobotsRules = { crawlDelaySec: null, allow: [], disallow: [] };
  let inStar = false, sawAgentLine = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase(), val = line.slice(i + 1).trim();
    if (key === "user-agent") { if (!sawAgentLine) inStar = false; sawAgentLine = true; if (val === "*") inStar = true; continue; }
    sawAgentLine = false;
    if (!inStar) continue;
    if (key === "crawl-delay") { const n = Number(val); if (Number.isFinite(n) && n >= 0) rules.crawlDelaySec = n; }
    else if (key === "allow" && val) rules.allow.push(val);
    else if (key === "disallow" && val) rules.disallow.push(val);
  }
  return rules;
}

/** 규칙 패턴(`*` 와일드카드, 끝 `$`)이 경로(+쿼리)에 맞는지. */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const re = new RegExp("^" + body.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (anchored ? "$" : ""));
  return re.test(path);
}

/** 가장 긴 패턴이 이긴다(같으면 Allow). 규칙이 없으면 허용. */
export function isAllowed(rules: RobotsRules, pathAndQuery: string): boolean {
  let best = { len: -1, allow: true };
  for (const p of rules.disallow) if (matches(p, pathAndQuery) && p.length > best.len) best = { len: p.length, allow: false };
  for (const p of rules.allow) if (matches(p, pathAndQuery) && p.length >= best.len) best = { len: p.length, allow: true };
  return best.allow;
}
