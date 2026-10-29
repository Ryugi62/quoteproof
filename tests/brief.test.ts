import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { extractBriefQuotes } from "../src/domain/brief";
import { verifyBrief, formatBriefReport } from "../src/application/verifyBrief";
import { capSource, liiSource, capUrl, liiUrl, type Fetcher } from "../src/adapters/sources";
import { fixtureFetcher } from "../src/infrastructure/fixtureFetcher";

const GIDEON = "any person haled into court, who is too poor to hire a lawyer, cannot be assured a fair trial unless counsel is provided for him";

test("따옴표 인용과 뒤따르는 U.S. 인용을 쌍으로 뽑는다(쪽 지정·연도 무시, 끝 쉼표·마침표 제거)", () => {
  const q = extractBriefQuotes(`The Court said "${GIDEON}." Gideon v. Wainwright, 372 U.S. 335, 344 (1963).`);
  expect(q.length).toBe(1);
  expect(q[0].quote).toBe(GIDEON);
  expect(q[0].citation).toBe("372 U.S. 335");
  expect(q[0].status).toBe("READY");
});
test("둥근 따옴표도 뽑고, 낱말 3개 미만 따옴표는 건너뛴다", () => {
  const q = extractBriefQuotes(`The word "sanction" and “good cause” are used; “the Court held that the statute is void,” 372 U.S. 335.`);
  expect(q.map((x) => x.quote)).toEqual(["the Court held that the statute is void"]);
});
test("인용이 Quote 앞에 있으면 앞쪽에서 찾는다", () => {
  const q = extractBriefQuotes(`In Gideon, 372 U.S. 335, 344, the Court wrote "${GIDEON}".`);
  expect(q[0].citation).toBe("372 U.S. 335");
});
test("U.S. 인용이 없으면 NO_CITATION, 다른 판례집이면 UNSUPPORTED_REPORTER", () => {
  const a = extractBriefQuotes(`Plaintiff says "a party must show prejudice before dismissal" and nothing else.`);
  expect(a[0].status).toBe("NOT_CHECKED"); expect(a[0].why).toBe("NO_CITATION");
  const b = extractBriefQuotes(`"a party must show prejudice before dismissal," Doe v. Roe, 123 F.3d 456 (9th Cir. 1997).`);
  expect(b[0].status).toBe("NOT_CHECKED"); expect(b[0].why).toBe("UNSUPPORTED_REPORTER");
});
test("약식 인용은 같은 권의 완전 인용이 정확히 1개일 때만 푼다", () => {
  const ok = extractBriefQuotes(`See Cooter, 496 U.S. 384, 393. Later: "as a bar to the courthouse door," 496 U.S. at 398.`);
  expect(ok[0].citation).toBe("496 U.S. 384");
  const none = extractBriefQuotes(`"as a bar to the courthouse door," 496 U.S. at 398.`);
  expect(none[0].why).toBe("UNRESOLVED_SHORT_CITE");
});

const src = (f: Fetcher) => [capSource(f), liiSource(f)];
const fixedClock = () => "2026-10-30T00:00:00Z";

test("서면 단위: 진짜 PASS · 변조 HOLD · 인용 없음 NOT_CHECKED, 요약 1줄과 종료 판단", async () => {
  const brief = `"${GIDEON}." 372 U.S. 335.\n"any person haled into court, who is too poor to hire a lawyer, can still be assured a fair trial even if counsel is not provided" 372 U.S. 335.\n"nothing cited here at all".`;
  const r = await verifyBrief(brief, src(fixtureFetcher), { clock: fixedClock });
  expect(r.rows[0].status).toBe("PASS");
  expect(r.rows[1].status).toBe("HOLD");
  expect(r.rows[2].status).toBe("NOT_CHECKED");
  expect(r.summary.quotes).toBe(3);
  expect(r.summary.pass + r.summary.hold + r.summary.notChecked).toBe(3);
  const out = formatBriefReport(r);
  expect(out.split("\n").filter((l) => l.startsWith("Summary:")).length).toBe(1);
  expect(out).toContain("brief text stayed local");
});

test("프라이버시: 읽기 요청 URL은 Citation에서 만든 출처 URL뿐이고 서면 낱말은 URL에 없다", async () => {
  const urls: string[] = [];
  const spy: Fetcher = async (u) => { urls.push(u); return fixtureFetcher(u); };
  const brief = `Secret client Zebrafish Holdings paid. "${GIDEON}." 372 U.S. 335. Also "confidential settlement figure of nine hundred" 372 U.S. 335.`;
  await verifyBrief(brief, src(spy), { clock: fixedClock });
  expect(urls.length).toBeGreaterThan(0);
  for (const u of urls) expect([capUrl(372, 335), liiUrl(372, 335)]).toContain(u);
  expect(urls.join(" ")).not.toContain("Zebrafish");
});

test("재구성 예시 서면(Allen): 법원이 가짜로 지목한 P6·P7은 HOLD, 진짜 2건은 PASS, 하급심·무인용은 NOT_CHECKED", async () => {
  const text = readFileSync(new URL("../fixtures/brief-example-allen.txt", import.meta.url).pathname, "utf8");
  const r = await verifyBrief(text, src(fixtureFetcher), { clock: fixedClock });
  const by = (frag: string) => r.rows.find((x) => x.quote.includes(frag))!;
  expect(by("reasonable attorney in like circumstances").status).toBe("HOLD");
  expect(by("as a bar to the courthouse door").status).toBe("HOLD");
  expect(by("Rule 38 gives appellate courts").status).toBe("PASS");
  expect(by("any person haled into court").status).toBe("PASS");
  expect(by("a party must show prejudice").why).toBe("UNSUPPORTED_REPORTER");
  expect(r.summary).toMatchObject({ pass: 2, hold: 2 });
});

// ---- v4 (SPEC §15): Id. / supra ----
test("Id.는 바로 앞 인용 사건으로 잇는다(Id. at N 포함)", () => {
  const q = extractBriefQuotes(`The Court held as much. Cooter & Gell v. Hartmarx Corp., 496 U.S. 384, 393 (1990). It also said "as a bar to the courthouse door." Id. at 398.`);
  expect(q.length).toBe(1);
  expect(q[0].citation).toBe("496 U.S. 384");
  expect(q[0].status).toBe("READY");
});
test("Id.의 앞 인용이 약식 인용이면 그 약식이 푼 사건으로 잇는다", () => {
  const q = extractBriefQuotes(`See Cooter, 496 U.S. 384, 393. Later, 496 U.S. at 398. The Court wrote "as a bar to the courthouse door." Id. at 399.`);
  expect(q[0].citation).toBe("496 U.S. 384");
});
test("Id.인데 앞 인용이 없으면 ID_NO_ANTECEDENT", () => {
  const q = extractBriefQuotes(`Plaintiff relies on "as a bar to the courthouse door." Id. at 398.`);
  expect(q[0].status).toBe("NOT_CHECKED"); expect(q[0].why).toBe("ID_NO_ANTECEDENT");
});
test("Id.의 앞 인용이 다른 판례집이면 ID_ANTECEDENT_NOT_CHECKABLE (엉뚱한 사건으로 잇지 않는다)", () => {
  const q = extractBriefQuotes(`See Gideon v. Wainwright, 372 U.S. 335, 344. Doe v. Roe, 123 F.3d 456 (9th Cir. 1997). The panel said "a party must show prejudice before dismissal." Id. at 460.`);
  expect(q[0].status).toBe("NOT_CHECKED"); expect(q[0].why).toBe("ID_ANTECEDENT_NOT_CHECKABLE");
});
test("앞 인용이 ;로 이어진 복수 인용이면 Id.는 ID_AMBIGUOUS", () => {
  const q = extractBriefQuotes(`See Gideon v. Wainwright, 372 U.S. 335, 344; Cooter & Gell v. Hartmarx Corp., 496 U.S. 384, 393. The Court wrote "as a bar to the courthouse door." Id. at 398.`);
  expect(q[0].status).toBe("NOT_CHECKED"); expect(q[0].why).toBe("ID_AMBIGUOUS");
});
test("supra는 앞서 나온 사건 이름이 정확히 하나 맞을 때 푼다, 0건·2건 이상이면 UNRESOLVED_SUPRA", () => {
  const ok = extractBriefQuotes(`Gideon v. Wainwright, 372 U.S. 335, 344 (1963). Later: "any person haled into court, who is too poor to hire a lawyer," Gideon, supra, at 344.`);
  expect(ok[0].citation).toBe("372 U.S. 335");
  const none = extractBriefQuotes(`Gideon v. Wainwright, 372 U.S. 335. Later: "as a bar to the courthouse door," Cooter, supra, at 398.`);
  expect(none[0].why).toBe("UNRESOLVED_SUPRA");
  const two = extractBriefQuotes(`Smith v. Jones, 100 U.S. 1. Smith v. Brown, 200 U.S. 2. "as a bar to the courthouse door," Smith, supra, at 5.`);
  expect(two[0].why).toBe("UNRESOLVED_SUPRA");
});
test("Id. 서면 전체: 풀린 Quote는 판정하고 Id.는 읽기 요청 URL에 서면 낱말을 넣지 않는다", async () => {
  const urls: string[] = [];
  const spy: Fetcher = async (u) => { urls.push(u); return fixtureFetcher(u); };
  const brief = `Cooter & Gell v. Hartmarx Corp., 496 U.S. 384, 393 (1990). The Court said Rule 11 does not reach "a reasonable attorney in like circumstances could believe his actions to be factually and legally justified." Id. at 393. It also said "Rule 38 gives appellate courts ample authority to award expenses." Id. at 406.`;
  const r = await verifyBrief(brief, src(spy), { clock: fixedClock });
  expect(r.rows.map((x) => x.citation)).toEqual(["496 U.S. 384", "496 U.S. 384"]);
  expect(r.rows[1].status).toBe("PASS");
  for (const u of urls) expect([capUrl(496, 384), liiUrl(496, 384)]).toContain(u);
});
test("예시 서면(Id./supra): Id.·supra로 이은 진짜는 PASS, 바꾼 문장은 HOLD, F.3d 뒤 Id.는 NOT_CHECKED(엉뚱한 사건으로 잇지 않음)", async () => {
  const text = readFileSync(new URL("../fixtures/brief-example-id-supra.txt", import.meta.url).pathname, "utf8");
  const r = await verifyBrief(text, src(fixtureFetcher), { clock: fixedClock });
  const by = (frag: string) => r.rows.find((x) => x.quote.includes(frag))!;
  expect(by("any person haled into court").status).toBe("PASS");
  expect(by("can still be assured a fair trial").status).toBe("HOLD");
  expect(by("Rule 38 gives appellate courts").status).toBe("PASS");
  expect(by("Rule 38 gives appellate courts").citation).toBe("496 U.S. 384");
  expect(by("a party must show prejudice").why).toBe("ID_ANTECEDENT_NOT_CHECKABLE");
  expect(r.summary).toMatchObject({ quotes: 4, pass: 2, hold: 1, notChecked: 1 });
});
