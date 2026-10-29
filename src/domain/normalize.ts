// 정규화: 허용 편집 중 「형태」만 지운다(낱말·대소문자는 그대로).
export function normalizeText(s: string): string {
  return s
    .replace(/[‘’‛′]/g, "'")
    .replace(/[“”‟″]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/­/g, "")
    .replace(/[\s  -​  　]+/g, " ")
    .trim();
}

/** Quote가 가진 형태 편집(영수증 edits에 기록). */
export function formEdits(raw: string): string[] {
  const e: string[] = [];
  if (/[‘’“”]/.test(raw)) e.push("SMART_QUOTES");
  if (/[–—]/.test(raw)) e.push("DASH");
  if (/[\n\r\t ]|\s{2,}/.test(raw)) e.push("WHITESPACE");
  return e;
}

/** 출처끼리 달라지는 부호(쉼표·세미콜론·콜론·큰따옴표·하이픈)를 지운 비교용 문자열. 낱말은 건드리지 않는다. */
export function loosen(s: string): string {
  return normalizeText(s).replace(/[,;:"]/g, "").replace(/-/g, "").replace(/ {2,}/g, " ");
}
