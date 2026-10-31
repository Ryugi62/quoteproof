# QuoteProof SPEC v5

작성: 2026-10-30 (코드보다 먼저). v5 변경(2026-10-31, 독립 레드팀 ⑥ 반영): §17(영수증에 출처 URL·노드 수 필드)을 추가했다. v4 변경(2026-10-30, 모의 p2 공통 지적 반영): §13(전달자 고정), §14(robots 준수), §15(`Id.`/`supra`), §16(verify-brief → CRE)를 추가했다. v3 변경(2026-10-30, 모의 p1 공통 지적 반영): §10(준비서면 일괄 검사 `verify-brief`), §11(영문 로그), §12(체인 쓰기 실측·한계)를 추가하고, §6 마지막 비목표를 §12로 대체했다. v2 변경(2026-10-30, 레드팀 8문 반영): §1·§6 체인 기록 문구, §8(체인 쓰기), §9(범위·근거 한계)를 추가했다. 대회: BLI Legal Tech Hackathon 2 (마감 2026-11-01 10:01 KST).

## 1. 목적
제출 전 서면 속 **인용 문장(Quote)이 판결 본문에 실제로 있는가**를 제출자를 믿지 않고 다시 확인한다.
「판례가 존재하나」(Citation 조회)가 아니라 「따옴표 안의 낱말이 판결문에 있나」를 본다.
정당한 인용 편집(AllowedEdit)은 통과시키고, 낱말 변경·추가·뜻을 뒤집는 생략은 보류(Hold)한다.
서면 원문은 로컬에 남고, 호출자(CRE 워크플로 반환값)에는 판정과 영수증 해시(Receipt hash)만 나간다. v2는 CRE 워크플로가 합의된 판정·영수증 해시를 Sepolia 수신 컨트랙트로 **쓰는 보고서(EVM writeReport)**를 만든다. 시뮬레이터를 `--broadcast` 없이 실행하면 실제 거래는 전송되지 않고(§8), `--broadcast`로 실행하면 Sepolia에 거래가 올라간다(§12).

## 2. 유비쿼터스 언어 (코드 이름 = 이 표)
| 용어 | 뜻 | 코드 |
|---|---|---|
| Quote | 서면에서 따옴표로 인용한 문장(편집 부호 포함, 따옴표 제외) | `Quote` |
| Citation | 인용의 출처 표기(예: `410 U.S. 113`) | `Citation` |
| Opinion | 판결 본문 한 건(출처 하나에서 받은 텍스트) | `Opinion` |
| Source | Opinion을 읽는 공개 출처(예: `cap`, `lii`) | `SourceId` |
| AllowedEdit | 허용 편집: 생략 부호(`…` `. . .` `...`), 대괄호 수정(`[t]he`, `[the court]`), 줄바꿈·공백, 둥근 따옴표·긴 줄표 | `AllowedEdit` |
| Hold | 보류 판정(통과 아님). 이유 코드 포함 | `Verdict.HOLD` |
| Pass | 모든 출처가 같은 위치 의미로 확인한 통과 | `Verdict.PASS` |
| Distortion | 생략·대괄호가 부정어를 지우거나 끼워 뜻을 뒤집는 의심 → 「문맥 왜곡 의심」 보류 | `DISTORTION` |
| Receipt | 결과마다 남기는 영수증(Citation, 본문 위치, 허용 편집 목록, 출처별 일치, 시각) | `Receipt` |
| ReceiptHash | 영수증 본문(시각 제외)의 SHA-256 | `receiptHash` |

## 3. 판정 규칙 (정본)
출처 하나에 대해 `matchQuote(quote, opinionText)` → `{found, start, end, edits[], distortion?, reason}`:
1. 정규화: 둥근 따옴표→곧은 따옴표, 긴 줄표→`-`, 줄바꿈·연속 공백→공백 1개, 비분리 공백→공백. **낱말·대소문자는 그대로** (대소문자 변경은 대괄호 `[t]`일 때만 허용).
2. 생략 부호로 Quote를 조각(Segment)으로 나눈다. 조각은 본문에 **순서대로**, **낱말 경계**에서 나타나야 한다.
3. 대괄호: 낱말에 붙은 `[x]`는 글자 수준 수정(대소문자 변경·접미 추가·≤3글자 교체). 떨어진 `[...]`는 낱말 수준 수정 — 원문 쪽이 비어 있거나(삽입), **기능어(대명사·관사·조동사 등) ≤2개**일 때만 허용. 내용어를 대괄호로 바꾸면 `BRACKET_REPLACES_CONTENT_WORD` 보류.
4. 왜곡: (a) 생략된 구간 중 같은 문장 안에 있는 부분(앞 조각 끝~문장 끝, 문장 시작~뒤 조각 시작)에 부정어(not, no, never, neither, nor, none, nothing, cannot, without, unless, except, n't)가 있으면 `DISTORTION`; (b) 대괄호 내용에 부정어가 있으면 `DISTORTION`; (c) 대괄호가 지운 원문에 부정어가 있으면 `DISTORTION`.
5. 출처 합의: 출처 N곳(기본 2) 모두 `found`이고 편집 목록이 같고 왜곡이 없으면 **PASS**. 하나라도 not found이면 `HOLD/NOT_IN_OPINION`. 출처끼리 엇갈리면 `HOLD/SOURCE_DISAGREE`. 출처 수 < minSources이면 `HOLD/INSUFFICIENT_SOURCES`. 왜곡이 하나라도 있으면 `HOLD/DISTORTION`.
6. 영수증 해시: `sha256(canonicalJson({citation, quote(정규화), verdict, reasons, edits, sources:[{id, textSha256, found, start, end}]}))`. `checkedAt`은 영수증에 적되 **해시에서 제외**. 출처 본문이 바뀌면 `textSha256`이 달라져 해시도 달라진다.

## 4. 숫자 성공 조건
| # | 조건 | 기준 |
|---|---|---|
| S1 | 시험셋 크기 | 진짜 인용 ≥30(그중 허용 편집 포함 ≥15), 변조 인용 ≥30 |
| S2 | 오탐률(진짜인데 보류) | ≤ 0.10 (표본 수·Wilson 95% 구간 함께 표기) |
| S3 | 누락률(변조인데 통과) | ≤ 0.05 |
| S4 | 결정성 | 같은 입력 2회 실행 → 시험셋 전 건 영수증 해시 동일 |
| S5 | 출처 독립 | 같은 Quote를 서로 다른 출처 2곳이 각자 읽고 일치 여부를 영수증에 기록 |
| S6 | CRE | `cre workflow simulate` 성공 로그 1건. 안 되면 로컬 다중 실행 합의로 같은 로직을 재현하고 그 사실을 표기 |
| S7 | 아키텍처 | `domain ← application ← adapters ← infrastructure`, 역방향 import 0건(시험으로 강제) |

## 5. Given / When / Then
- G: 판결 본문에 `the Court held that the statute is void` / W: Quote `"the Court held that the statute is void"` / T: PASS, 편집 목록 [].
- G: 본문에 `the right of privacy ... is broad enough` 근처 문장 / W: Quote `"the right of privacy … is broad enough"` / T: PASS, edits=[ELLIPSIS].
- G: 본문 `The Court held` / W: `"[t]he Court held"` / T: PASS, edits=[BRACKET_CASE].
- G: 본문 `the statute does not apply` / W: `"the statute … apply"` / T: HOLD/DISTORTION (같은 문장에서 not 생략).
- G: 본문 `the Court held` / W: `"the Court ruled"` / T: HOLD/NOT_IN_OPINION.
- G: 출처 A에는 있고 B에는 없음 / T: HOLD/SOURCE_DISAGREE.
- G: 같은 입력 / W: 두 번 실행 / T: receiptHash 동일.
- G: 둥근 따옴표 `“…”`와 줄바꿈이 낀 Quote / T: PASS, edits=[SMART_QUOTES 또는 WHITESPACE].

## 6. 비목표
- 판례 **존재**만 조회하는 일(Citation lookup)은 하지 않는다. 다른 도구가 한다.
- 법적 판단(인용이 논지를 뒷받침하는가)은 하지 않는다. 낱말 실재와 편집 허용 여부만 본다.
- 서면 원문을 외부로 보내지 않는다(Quote 문장과 출처 URL만 읽기 요청에 쓴다).
- 본 v1은 영어 미국 판결만. 한국 판결·번역 인용·각주 속 인용·`(citation omitted)` 처리는 범위 밖.
- 결제·실서비스 배포·메인넷 자금은 쓰지 않는다. 테스트넷 거래 전송은 §12의 조건(로그인·가입·결제·메인넷 잔액 없이 받는 무료 faucet)을 모두 만족할 때만 한다.

## 7. 구조 (Clean Architecture)
`src/domain`(순수: 정규화·조각·매칭·판정·영수증·해시, I/O 없음) ← `src/application`(유스케이스·SourcePort) ← `src/adapters`(출처별 본문 추출: CAP JSON, LII HTML — fetch는 주입) ← `src/infrastructure`(Node/Bun fetch, 고정 fixtures, CLI, 평가 러너, CRE 워크플로).

## 8. v2 체인 쓰기 (Chainlink CRE EVM writeReport)
- 용어: **OnchainReport** = 체인에 쓸 보고서 본문, ABI `(bytes32 receiptHash, uint8 verdictCode, string reasons)`. `verdictCode` 1 = PASS, 0 = HOLD. `receiver` = 보고서를 받는 Sepolia 컨트랙트 주소(설정값).
- G: 합의 결과가 PASS이고 receiptHash가 64자리 16진수 / W: `encodeOnchainReport` / T: `bytes32`로 해시가 들어간 ABI 바이트를 돌려준다(되돌려 읽으면 같은 값).
- G: 합의 결과가 HOLD/NOT_IN_OPINION / T: verdictCode 0, reasons 「NOT_IN_OPINION」.
- G: 해시가 비었거나 형식이 틀림(미지원 인용) / T: 쓰지 않고 이유를 반환값에 적는다(`chain: skipped`).
- G: CRE 시뮬레이터가 writeReport를 받음 / T: `--broadcast` 없이는 거래를 보내지 않는 모의 실행이며, 로그에 그 사실이 남는다. 실제 전송 여부는 로그가 말하는 대로만 적는다.
- 숫자 조건 S8: 시뮬 성공 로그 1건에 writeReport 호출 흔적이 있고 exit 0. 안 되면 원문 오류와 공식 문서 근거를 기록한다.
- 체인 기록은 「법적 판단」이 아니다. 낱말 실재 판정과 그 영수증 해시의 봉인일 뿐이다.

## 9. 범위·근거 한계 (v2 명시)
- 지원 법원: 미국 연방대법원(U.S. Reports)뿐. 하급심은 어댑터가 없어 공개 사례에서 「보류(지원 밖)」로 표기한다.
- 시험셋의 진짜 인용은 CAP 본문에서 뽑았으므로 「CAP만 오탐 0%」는 구조상 순환 결과다(외부 근거 아님). 외부 정답은 공개 사례(법원이 가짜로 판정한 인용)뿐이다.
- 오탐 헤드라인은 엄격 기본값(13.2%). 구두점 허용 수치는 사후 정책이다.

## 10. v3 준비서면 일괄 검사 (`bun run verify-brief <파일>`)
- 용어: **Brief** = 서면 텍스트 파일(.txt/.md). **BriefQuote** = Brief에서 뽑은 (Quote, Citation) 쌍. **BriefReport** = 건별 판정 표 + 요약 1줄.
- 추출 규칙: 큰따옴표(곧은 `"…"`, 둥근 `“…”`) 안의 글이 **낱말 3개 이상**이면 Quote 후보다(그보다 짧은 따옴표는 강조·인용 부호로 보고 건너뜀). Quote 끝의 `,` `.` 하나는 미국식 구두점이라 떼어 낸다(`. . .` 생략 부호는 유지).
- Citation 연결: Quote 닫는 따옴표 뒤 **다음 따옴표 시작 전까지(≤250자)**에서 첫 `NNN U.S. NNN`을 찾는다. 없으면 Quote 앞쪽 같은 범위에서 찾는다. 쪽 지정(`, 344`)·연도 괄호는 무시하고 첫 쪽만 쓴다. 약식 `NNN U.S. at NNN`은 같은 서면에 같은 권(volume)의 완전 인용이 **정확히 1개**일 때만 그 인용으로 푼다(아니면 `UNRESOLVED_SHORT_CITE`로 `NOT_CHECKED`).
- G: 서면에 `372 U.S. 335`와 진짜 인용 / W: verify-brief / T: 그 줄 `PASS`, 영수증 해시 표기.
- G: Quote에 U.S. 인용이 없거나(`NO_CITATION`) 다른 판례집 인용(`F.3d`, `F. Supp.`, `S. Ct.` 등, `UNSUPPORTED_REPORTER`)이면 **판정하지 않고** `NOT_CHECKED`로 이유와 함께 표에 적는다. 통과로 세지 않는다.
- G: 지원 인용이지만 변조·없는 인용 / T: 줄 `HOLD`와 이유 코드(기존 §3).
- 요약 1줄: `N quotes found · P PASS · H HOLD · X not checked`와 `brief text stayed local`을 같은 줄에 적는다. 종료 코드: HOLD가 하나라도 있으면 1, 없으면 0.
- **프라이버시(§6 비목표 유지)**: 읽기 요청에는 Quote가 아니라 **Citation에서 만든 출처 URL만** 쓴다(Quote는 로컬 대조에만 쓴다). 서면 전문·Quote 낱말은 요청 URL에 들어가지 않는다. 시험이 요청 URL 전수를 검사한다.
- 비목표(v4에서 `Id.`·`supra`는 §15로 이동): 각주 속 인용, 따옴표 없는 의역, 하급심은 v3에서도 판정하지 않는다(표에 `NOT_CHECKED`로 남기지도 못하는 것은 추출하지 않는다 — README Limits에 적는다).
- 재구성 예시 서면 `fixtures/brief-example-allen.txt`: 공개 사례 Allen v. Western Governors University(D. Nev. 2026-03-31, Charlotin DB)가 가짜로 지목한 Cooter & Gell 인용 2건(P6·P7)을 중심으로 **우리가 쓴 예시 글**이다(실제 제출 서면이 아니다). 진짜 인용·하급심 인용·인용 없는 따옴표를 섞었다.

## 11. v3 영문 로그
- CRE 워크플로의 `runtime.log` 줄은 영어로 쓴다(제출물 영어 요건). 시뮬 재실행(genuine·altered)의 로그를 `docs/evidence/`에 새로 남기고 README·buidl 인용 줄을 그 로그의 원문으로 바꾼다.
- 시험: 워크플로 소스의 `runtime.log` 문자열에 한글이 없다(`cre/workflow` 시험).

## 12. v3 체인 쓰기 실측
- 조건: 로컬에서 만든 테스트넷 키(`~/.config/quoteproof/`, 권한 600, 레포·볼트 밖) + **로그인·가입·결제·실명·메인넷 잔액 없이** 받는 무료 Sepolia faucet. 하나라도 필요하면 전송하지 않고, faucet 3곳의 요구 조건 원문만 `docs/evidence/`에 기록한다.
- 되면: 수신 컨트랙트(`onReport(bytes metadata, bytes report)`를 받아 이벤트로 `(receiptHash, verdictCode, reasons)`를 남김)를 Sepolia에 배포하고, `cre workflow simulate --broadcast` 1회로 거래 해시를 얻어 로그에 기록한다. 거래 해시는 Sepolia 탐색기 조회로 실측한다.
- 안 되면: README의 dry run 한계 문구를 그대로 둔다.
- 개인키는 레포·볼트·로그·영상에 들어가지 않는다(시험: 레포 전체에 64자리 16진수 비밀값 패턴 중 키 파일 값이 없음).
- **실측 결과(2026-10-30)**: pk910 PoW faucet(로그인·가입·메인넷 잔액 불필요)에서 0.05 SepETH를 받아 수신 컨트랙트 `0x6ae777f6c05a53ecc25bf9ac73cd8f4f0a270131`를 배포하고(거래 `0xc2bdf091…4971`), `cre workflow simulate --broadcast`로 genuine(`0x5e382225…7bc9`, verdictCode 1)·altered(`0xc192e3b5…471a`, verdictCode 0) 보고서를 각 1회 썼다. Sepolia RPC 재조회로 `QuoteVerdict` 이벤트와 `seen(receiptHash)=true`를 확인했다. 원문: `docs/evidence/chain-write-sepolia-2026-10-30.log`, faucet 조사: `docs/evidence/faucet-survey-2026-10-30.log`. 이것은 CRE 시뮬레이터의 `--broadcast`이며 CRE 네트워크 배포가 아니다.

## 13. v4 전달자(forwarder) 고정
- 용어: **Forwarder** = CRE가 보고서를 수신 컨트랙트에 전달할 때 `onReport`를 부르는 컨트랙트. 시뮬레이터는 공식 문서의 「Simulation Testnets / Mock Forwarder Address」 표에 있는 주소를 쓴다.
- 규칙: 수신 컨트랙트는 생성자 인자 `forwarder`를 immutable로 고정하고, `onReport`는 `msg.sender == forwarder`일 때만 받는다(아니면 `NotForwarder` 되돌림).
- 근거 원문: Chainlink 공식 문서 Forwarder Directory(TypeScript) 「Ethereum Sepolia | ethereum-testnet-sepolia | 0x15fC6ae953E024d975e77382eEeC56A9101f9F88」(Mock Forwarder). 원문 사본 `docs/evidence/cre-forwarder-directory-ts-2026-10-30.md`. v3에서 실측한 거래의 `to`(`0x15fc6ae9…9f88`)와 같은 주소다.
- G: forwarder가 아닌 주소가 `onReport` 호출 / T: 되돌림, 기록 없음. G: forwarder가 호출 / T: `QuoteVerdict` 이벤트 1건.
- 실측: 새 수신 컨트랙트 Sepolia 배포 → genuine·altered `cre workflow simulate --broadcast` → RPC 재조회에서 거래 `to` == 컨트랙트 `forwarder()`; 배포자 주소의 직접 `onReport` 호출(eth_call)이 되돌려진다.
- 한계: 이 forwarder는 시뮬레이터용(Mock)이다. 프로덕션 KeystoneForwarder 주소는 CRE 네트워크 배포 때 문서의 Production 표로 바꾼다. 배포는 하지 않았다.

## 14. v4 robots.txt 준수
- 근거 원문: `https://www.law.cornell.edu/robots.txt` 사본 `docs/evidence/lii-robots-2026-10-30.txt`: `User-agent: *` 아래 `Crawl-delay: 10`. 요청 경로 `/supremecourt/text/...`는 Disallow 목록에 없다.
- 규칙: 라이브 읽기(CLI `verify`·`verify-brief`)는 같은 호스트로 가는 연속 요청 사이에 그 호스트 robots.txt의 `Crawl-delay` 초만큼 쉰다(LII 10초). Disallow에 걸리는 경로는 요청하지 않는다(그 출처는 못 읽은 것으로 본다). robots.txt를 못 읽으면 LII는 10초를 기본값으로 쓴다.
- 같은 URL은 한 번만 읽는다(기존). 대기 시간은 주입 가능한 시계·sleep으로 시험한다.
- G: 같은 호스트 두 URL / T: 두 번째 요청은 첫 요청 뒤 ≥ Crawl-delay초. G: 다른 호스트 / T: 서로 기다리지 않는다. G: Disallow 경로 / T: 요청 0건.
- CRE 워크플로: 한 실행에서 LII로 가는 요청은 노드당 1건이다. WASM 안에서는 sleep을 쓸 수 없으므로 실행 사이의 간격은 호출자(사람·CLI)가 지킨다(README에 적는다).
- `fetchFixtures`(고정 fixtures 내려받기)는 기존 0.6–0.7초 대기를 Crawl-delay 10초로 바꾼다.

## 15. v4 `Id.` / `supra`
- 규칙(§10의 비목표를 대체): `Id.`·`Id. at N`은 **문서 순서상 바로 앞 인용**(완전 인용·약식 인용·다른 판례집 인용·supra)의 사건으로 잇는다. `supra`는 `<앞 당사자 이름>, supra`에서 이름이 앞서 나온 완전 인용 사건의 이름과 정확히 하나만 맞을 때 그 사건으로 잇는다.
- 못 잇는 경우는 판정하지 않고 `NOT_CHECKED`와 이유를 적는다: `ID_NO_ANTECEDENT`(앞 인용 없음) · `ID_ANTECEDENT_NOT_CHECKABLE`(앞 인용이 다른 판례집이거나 풀리지 않은 약식·supra) · `ID_AMBIGUOUS`(앞 인용이 `;`로 이어진 복수 인용의 일부) · `UNRESOLVED_SUPRA`(이름이 0건 또는 2건 이상과 맞음).
- G: `... 496 U.S. 384, 393. "…quote…" Id. at 398.` / T: Quote 인용 = `496 U.S. 384`, PASS 또는 HOLD를 판정. G: 앞 인용이 `123 F.3d 456` / T: `ID_ANTECEDENT_NOT_CHECKABLE`. G: `Cooter, supra` 이고 Cooter 사건이 서면에 하나 / T: 그 사건으로 판정.
- 쪽 번호(`at N`)는 판정에 쓰지 않는다(본문 전체에서 찾는다, 기존 규칙과 같음).
- 각주 속 인용·하급심·따옴표 없는 의역은 여전히 범위 밖이다.

## 16. v4 verify-brief → CRE
- 용어: **CrePayload** = CRE 워크플로 HTTP 트리거가 받는 JSON `{citation, quote}`(기존 `cre/payload-*.json`과 같은 모양). 판정 가능(READY)한 Quote마다 1개.
- 옵션: `bun run verify-brief <서면> --cre-payload <디렉터리>` 는 READY 행마다 `payload-NN.json`과 `index.json`(번호·citation·로컬 판정·로컬 영수증 해시·NOT_CHECKED 사유)을 쓴다. `--cre-simulate <N>` 은 N번 행의 페이로드로 `cre workflow simulate`(dry run)를 실행해 USER LOG 줄을 보여 주고, CRE 합의 해시가 로컬 영수증 해시와 같은지 한 줄로 알린다.
- 프라이버시(§6 유지): 페이로드에는 **그 Quote 문장과 인용**만 들어간다(서면 전문·다른 문장·당사자 정보는 없다). 옵션을 줘야만 파일이 생기고 CRE 호출도 옵션을 줘야만 일어난다. 기본 경로는 이전과 같이 CRE를 부르지 않는다. CRE 시뮬레이션이라도 페이로드는 CRE 도구(로컬 시뮬레이터)에 들어간다 — 기밀 실행(confidential workflow)은 쓰지 않았다(README Limits).
- G: 5건 서면 / W: `--cre-payload d` / T: PASS·HOLD 4건 → payload 4개, NOT_CHECKED 1건은 index에만 사유와 함께. G: 페이로드 / T: 서면에 없는 낱말·다른 문장이 없다.
- G: `--cre-simulate N`에서 `cre`가 없거나 실패 / T: 오류 줄과 종료 코드 2(판정은 이미 출력됨).
- 숫자 조건 S9: `cre workflow simulate` 실행 로그 1건 이상이 verify-brief가 만든 페이로드에서 나왔고, CRE 합의 해시 = 로컬 영수증 해시.

## 17. v5 영수증 출처 URL·노드 수
- 용어: **SourceUrl** = 그 출처에서 본문을 읽은 읽기 요청 URL(`SourceMatch.url`). **NodeCount** = 이 영수증이 대조한 독립 출처 읽기(노드)의 수(`Receipt.nodeCount`, = `sources.length`).
- 영수증을 읽는 사람이 출처를 직접 열어 볼 수 있게 한다. 두 필드는 **영수증 해시에 넣지 않는다**(`checkedAt`처럼 해시 밖) — 그래야 기존 해시(README의 `b5fc1c1a…` 등)가 그대로 재현된다. 출처 본문이 바뀐 것은 `textSha256`이 이미 해시에 담는다.
- 프라이버시(§6 유지): URL은 Citation에서 만든 공개 출처 주소뿐이다. Quote 문장·서면 내용은 URL에 들어가지 않는다.
- G: 410 U.S. 113을 CAP·LII에서 읽음 / T: `sources[0].url`은 `https://static.case.law/us/410/cases/0113-01.json`, `sources[1].url`은 `https://www.law.cornell.edu/supremecourt/text/410/113`, `nodeCount`는 2.
- G: 출처 URL·노드 수만 다른 두 영수증 / T: `receiptHash`가 같다.
- G: 한 출처를 못 읽음 / T: `nodeCount`는 1(읽은 출처만 센다), 판정은 `INSUFFICIENT_SOURCES`.
- G: 서면 문장이 영수증에 들어감 / T: URL 어디에도 Quote 낱말이 없다.

## 18. 웹 데모 (2026-10-31, 심사자가 설치 없이 확인)
- 목적: 심사자가 브라우저에서 자기 인용문을 넣어 「인용 문장이 판결문 원문에 있나」 규칙이 작동하는 것을 확인한다. 성공 조건: 비로그인 HTTP 200, 입력칸 `#cite`·`#quote`·`#check`, 결과 `#result`에 PASS/HOLD·영수증 해시.
- 판정 규칙은 CLI와 같은 `verifyFromTexts`(공유 코드, 사본 없음). `application/webCheck.checkBundled` 가 묶음 본문으로 호출하고, `tests/web.test.ts` 가 같은 입력에서 CLI(고정 fixtures)와 웹의 영수증 해시가 같음을 시험한다.
- 비목표: 실시간 원문 조회(첫 줄에 「bundled opinion texts — full live check: CLI」), 법리 해석(문자열 일치만 판정), 로그인, 서버.
- Given 묶음에 없는 인용 / When 확인 / Then PASS가 아니라 NOT_CHECKED(CLI 안내).

## 19. 문제 규모·파급 (2026-10-31)
- 파급 = N × s × a × c × q × u (기호표·출처·하한 0: `docs/problem-scale.md`). 숫자는 `src/infrastructure/problemScaleCli.ts` 가 고정 CSV 에서 센다. a=0 이면 0 USD 를 숨기지 않는다.

## UI 수용기준 (web/ 데모 — notes/원칙-디자인 체크리스트 10 구체화)
1. 모바일 퍼스트: 390px 가로 스크롤 0, viewport 메타, 확대 차단 없음.
2. 한 화면 한 질문: 입력 2개(판결 선택·인용문), 주 행동 1개(Check).
3. 타이포: 본문 16px·줄간격 1.55, 제목 1.5rem 굵게, 보조 ≥.85rem, 굵기 ≥400.
4. 여백: 간격 4/8 배수, 화면 좌우 16px.
5. 터치 목표: 버튼 높이 ≥44px.
6. 결과 먼저: 결과 첫 줄 = 큰 판정(PASS/HOLD), 이유는 그 아래.
7. 근거: 영수증 해시·출처 표는 결과 아래, 첫 화면 위쪽엔 표 없음.
8. 문구: 첫 줄에 「bundled opinion texts — full live check: CLI」를 밝히고, 오류는 원인+해결 1줄.
9. 색·대비: 글자 ≥4.5:1(주 버튼 #1b64da 위 흰 글자), 다크 대응, 포커스 표시 유지.
10. 의존: 외부 폰트·CDN 0, 판결문은 opinions.json 동봉.
Given 사용자가 판결과 인용문을 넣고 Check를 누르면 / When 인용문이 두 출처 원문 모두에 있으면 / Then PASS와 CLI와 같은 영수증 해시(tests/web.test.ts가 대조).
