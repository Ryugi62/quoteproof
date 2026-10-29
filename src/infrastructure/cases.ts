// 시험셋이 쓰는 판결 목록(출처 URL의 정본). 두 출처 모두 공개·무토큰.
export interface CaseRef { slug: string; cite: string; name: string; vol: number; page: number; lii: boolean }
export const CASES: CaseRef[] = [
  { slug: "brown-1954", cite: "347 U.S. 483", name: "Brown v. Board of Education", vol: 347, page: 483, lii: false },
  { slug: "marbury-1803", cite: "5 U.S. 137", name: "Marbury v. Madison", vol: 5, page: 137, lii: true },
  { slug: "gideon-1963", cite: "372 U.S. 335", name: "Gideon v. Wainwright", vol: 372, page: 335, lii: true },
  { slug: "terry-1968", cite: "392 U.S. 1", name: "Terry v. Ohio", vol: 392, page: 1, lii: true },
  { slug: "tinker-1969", cite: "393 U.S. 503", name: "Tinker v. Des Moines", vol: 393, page: 503, lii: true },
  { slug: "nyt-sullivan-1964", cite: "376 U.S. 254", name: "New York Times v. Sullivan", vol: 376, page: 254, lii: true },
  { slug: "mapp-1961", cite: "367 U.S. 643", name: "Mapp v. Ohio", vol: 367, page: 643, lii: true },
  { slug: "mathews-1976", cite: "424 U.S. 319", name: "Mathews v. Eldridge", vol: 424, page: 319, lii: true },
  { slug: "celotex-1986", cite: "477 U.S. 317", name: "Celotex v. Catrett", vol: 477, page: 317, lii: true },
  { slug: "anderson-1986", cite: "477 U.S. 242", name: "Anderson v. Liberty Lobby", vol: 477, page: 242, lii: true },
  { slug: "daubert-1993", cite: "509 U.S. 579", name: "Daubert v. Merrell Dow", vol: 509, page: 579, lii: true },
  { slug: "erie-1938", cite: "304 U.S. 64", name: "Erie Railroad v. Tompkins", vol: 304, page: 64, lii: true },
  { slug: "strickland-1984", cite: "466 U.S. 668", name: "Strickland v. Washington", vol: 466, page: 668, lii: true },
  { slug: "roe-1973", cite: "410 U.S. 113", name: "Roe v. Wade", vol: 410, page: 113, lii: true },
  { slug: "bush-gore-2000", cite: "531 U.S. 98", name: "Bush v. Gore", vol: 531, page: 98, lii: true },
  { slug: "iqbal-2009", cite: "556 U.S. 662", name: "Ashcroft v. Iqbal", vol: 556, page: 662, lii: false },
  { slug: "twombly-2007", cite: "550 U.S. 544", name: "Bell Atlantic v. Twombly", vol: 550, page: 544, lii: false },
];
// 공개 사례(AI 조작 인용 목록) 대조용 판결 — 합성 시험셋의 문장 풀에는 넣지 않는다(시드 재현성).
export const EXTRA_CASES: CaseRef[] = [
  { slug: "sinochem-2007", cite: "549 U.S. 422", name: "Sinochem v. Malaysia Intl Shipping", vol: 549, page: 422, lii: false },
  { slug: "christianson-1988", cite: "486 U.S. 800", name: "Christianson v. Colt Industries", vol: 486, page: 800, lii: true },
  { slug: "withrow-1975", cite: "421 U.S. 35", name: "Withrow v. Larkin", vol: 421, page: 35, lii: true },
  { slug: "scheuer-1974", cite: "416 U.S. 232", name: "Scheuer v. Rhodes", vol: 416, page: 232, lii: true },
  { slug: "cooter-gell-1990", cite: "496 U.S. 384", name: "Cooter & Gell v. Hartmarx", vol: 496, page: 384, lii: true },
  { slug: "oates-1879", cite: "100 U.S. 239", name: "Oates v. National Bank", vol: 100, page: 239, lii: true },
  { slug: "smith-allwright-1944", cite: "321 U.S. 649", name: "Smith v. Allwright", vol: 321, page: 649, lii: true },
];
export const ALL_CASES = [...CASES, ...EXTRA_CASES];
export const capUrl = (c: CaseRef) => `https://static.case.law/us/${c.vol}/cases/${String(c.page).padStart(4, "0")}-01.json`;
export const liiUrl = (c: CaseRef) => `https://www.law.cornell.edu/supremecourt/text/${c.vol}/${c.page}`;
