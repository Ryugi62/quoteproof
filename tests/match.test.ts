import { describe, expect, test } from "bun:test";
import { matchQuote } from "../src/domain/match";

const T = "The Court held that the statute is void. The right of privacy, whether it be founded in the Fourteenth Amendment, is broad enough to encompass a decision. But the statute does not apply to minors who are present. We have never decided otherwise.";

describe("matchQuote — 허용 편집은 통과", () => {
  test("정확 일치", () => {
    const r = matchQuote("The Court held that the statute is void", "x " + T);
    expect(r.found).toBe(true); expect(r.edits).toEqual([]);
  });
  test("생략 부호 …", () => {
    const r = matchQuote("The right of privacy … is broad enough to encompass a decision", T);
    expect(r.found).toBe(true); expect(r.edits).toContain("ELLIPSIS");
  });
  test("생략 부호 . . . 과 ...", () => {
    expect(matchQuote("The right of privacy . . . is broad enough", T).found).toBe(true);
    expect(matchQuote("The right of privacy ... is broad enough", T).found).toBe(true);
  });
  test("대괄호 대소문자 [t]he", () => {
    const r = matchQuote("[t]he Court held that the statute is void", "see: " + T.replace("The Court", "The Court"));
    expect(r.found).toBe(true); expect(r.edits).toContain("BRACKET_CASE");
  });
  test("대괄호 삽입 [and]", () => {
    const r = matchQuote("is void, [and] the right", "it is void, the right of way");
    expect(r.found).toBe(true); expect(r.edits).toContain("BRACKET_WORD");
  });
  test("대괄호가 대명사를 대신함 [the defendant]", () => {
    const r = matchQuote("[the defendant] was present", "Then he was present at the scene.");
    expect(r.found).toBe(true); expect(r.edits).toContain("BRACKET_WORD");
  });
  test("줄바꿈·공백·둥근 따옴표·긴 줄표", () => {
    const r = matchQuote("The  Court\nheld that the statute is void", T);
    expect(r.found).toBe(true);
    expect(matchQuote("“don’t”", "he said \"don't\" twice").found).toBe(true);
    expect(matchQuote("a — b", "a - b").found).toBe(true);
  });
});

describe("matchQuote — 변조는 보류", () => {
  test("낱말 변경", () => { expect(matchQuote("the Court ruled that the statute is void", T).found).toBe(false); });
  test("낱말 추가", () => { expect(matchQuote("the Court held that the old statute is void", T).found).toBe(false); });
  test("낱말 경계 위반", () => { expect(matchQuote("he Court held", T).found).toBe(false); });
  test("대소문자 무표시 변경", () => { expect(matchQuote("THE COURT held", T).found).toBe(false); });
  test("조각 순서 뒤바뀜", () => { expect(matchQuote("is void … The Court held", T).found).toBe(false); });
  test("대괄호로 내용어 세탁", () => {
    const r = matchQuote("The Court [has decided] that the statute is void", T);
    expect(r.found).toBe(false); expect(r.reason).toBe("BRACKET_REPLACES_CONTENT_WORD");
  });
});

describe("matchQuote — 문맥 왜곡 의심", () => {
  test("같은 문장 안에서 not 생략", () => {
    const r = matchQuote("the statute … apply to minors", T);
    expect(r.found).toBe(true); expect(r.distortion).toBe(true);
  });
  test("대괄호에 부정어", () => {
    const r = matchQuote("the statute [does not] apply to minors", T);
    expect(r.distortion).toBe(true);
  });
  test("문장 경계 밖 생략은 왜곡 아님", () => {
    const r = matchQuote("The Court held that the statute is void. … We have never decided otherwise.", T);
    expect(r.found).toBe(true); expect(r.distortion).toBe(false);
  });
  test("대괄호가 지운 원문의 부정어", () => {
    const r = matchQuote("the statute [does] apply to minors", T);
    expect(r.distortion).toBe(true);
  });
});
