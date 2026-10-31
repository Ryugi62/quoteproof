## 개발셋(시드 20261030, 진단에 사용) — 진짜 34(G9 제외) · 변조 42
| 구성 | 오탐률(진짜인데 보류) | 누락률(변조인데 통과) | 오탐 건 |
|---|---|---|---|
| 출처 2곳 합의·엄격(기본) | 4/34 = 11.8% [4.7–26.6] | 0/42 = 0.0% [0.0–8.4] | G019, G020, G026, G034 |
| 출처 2곳 합의·부호 허용(사후 정책) | 3/34 = 8.8% [3.0–23.0] | 0/42 = 0.0% [0.0–8.4] | G019, G020, G034 |
| CAP만 (순환 라벨: 진짜 인용을 CAP 본문에서 뽑아 0%는 구조상 당연, 외부 증거 아님) | 0/34 = 0.0% [0.0–10.2] | 0/42 = 0.0% [0.0–8.4] | - |
| LII만 | 4/34 = 11.8% [4.7–26.6] | 0/42 = 0.0% [0.0–8.4] | G019, G020, G026, G034 |

경계 사례 G9(사람 판단, 헤드라인 제외): 엄격 3/3 보류

| 그룹(엄격) | 건수 | 기대 | 어긋난 건 |
|---|---|---|---|
| G1 전체 문장 그대로 | 5 | PASS | 0 |
| G2 문장 속 절 그대로 | 6 | PASS | 0 |
| G3 둥근 따옴표·줄바꿈·겹공백 | 4 | PASS | 0 |
| G4 문장 중간 생략(…) | 6 | PASS | 2 (G019:SOURCE_DISAGREE, G020:SOURCE_DISAGREE) |
| G5 문장 이어 생략(. . .) | 3 | PASS | 0 |
| G6 대괄호 대소문자 [t]he | 4 | PASS | 1 (G026:SOURCE_DISAGREE) |
| G7 대괄호 대명사 치환 [the Court] | 3 | PASS | 0 |
| G8 앞·뒤 생략 | 3 | PASS | 1 (G034:SOURCE_DISAGREE) |
| G9 대비 부연절 생략(부정어 포함, 뜻 보존) | 3 | PASS | 3 (G035:DISTORTION, G036:DISTORTION, G037:DISTORTION) |
| A1 낱말 한 개 교체 | 6 | HOLD | 0 |
| A2 낱말 추가 | 4 | HOLD | 0 |
| A3 낱말 삭제(표시 없음) | 3 | HOLD | 0 |
| A4 부정어 끼워넣기 | 5 | HOLD | 0 |
| A5 생략으로 부정어 삭제 | 5 | HOLD | 0 |
| A6 대괄호로 내용어 세탁 | 4 | HOLD | 0 |
| A7 먼 두 곳 이어붙이기(…) | 3 | HOLD | 0 |
| A8 통째로 지어낸 문장 | 5 | HOLD | 0 |
| A9 다른 판결에 귀속 | 4 | HOLD | 0 |
| A11 앞부분 진짜 + 지어낸 꼬리 | 3 | HOLD | 0 |

결정성: 시각을 바꿔 2회 실행 → 영수증 해시 전 건 동일 (79건 × 2정책)

## 홀드아웃(시드 20261031, 진단에 쓰지 않음) — 진짜 34(G9 제외) · 변조 42
| 구성 | 오탐률(진짜인데 보류) | 누락률(변조인데 통과) | 오탐 건 |
|---|---|---|---|
| 출처 2곳 합의·엄격(기본) | 5/34 = 14.7% [6.4–30.1] | 0/42 = 0.0% [0.0–8.4] | G002, G005, G009, G019, G024 |
| 출처 2곳 합의·부호 허용(사후 정책) | 3/34 = 8.8% [3.0–23.0] | 0/42 = 0.0% [0.0–8.4] | G002, G005, G024 |
| CAP만 (순환 라벨: 진짜 인용을 CAP 본문에서 뽑아 0%는 구조상 당연, 외부 증거 아님) | 0/34 = 0.0% [0.0–10.2] | 0/42 = 0.0% [0.0–8.4] | - |
| LII만 | 5/34 = 14.7% [6.4–30.1] | 0/42 = 0.0% [0.0–8.4] | G002, G005, G009, G019, G024 |

경계 사례 G9(사람 판단, 헤드라인 제외): 엄격 3/3 보류

| 그룹(엄격) | 건수 | 기대 | 어긋난 건 |
|---|---|---|---|
| G1 전체 문장 그대로 | 5 | PASS | 2 (G002:SOURCE_DISAGREE, G005:SOURCE_DISAGREE) |
| G2 문장 속 절 그대로 | 6 | PASS | 1 (G009:SOURCE_DISAGREE) |
| G3 둥근 따옴표·줄바꿈·겹공백 | 4 | PASS | 0 |
| G4 문장 중간 생략(…) | 6 | PASS | 1 (G019:SOURCE_DISAGREE) |
| G5 문장 이어 생략(. . .) | 3 | PASS | 1 (G024:SOURCE_DISAGREE) |
| G6 대괄호 대소문자 [t]he | 4 | PASS | 0 |
| G7 대괄호 대명사 치환 [the Court] | 3 | PASS | 0 |
| G8 앞·뒤 생략 | 3 | PASS | 0 |
| G9 대비 부연절 생략(부정어 포함, 뜻 보존) | 3 | PASS | 3 (G035:DISTORTION, G036:DISTORTION, G037:SOURCE_DISAGREE) |
| A1 낱말 한 개 교체 | 6 | HOLD | 0 |
| A2 낱말 추가 | 4 | HOLD | 0 |
| A3 낱말 삭제(표시 없음) | 3 | HOLD | 0 |
| A4 부정어 끼워넣기 | 5 | HOLD | 0 |
| A5 생략으로 부정어 삭제 | 5 | HOLD | 0 |
| A6 대괄호로 내용어 세탁 | 4 | HOLD | 0 |
| A7 먼 두 곳 이어붙이기(…) | 3 | HOLD | 0 |
| A8 통째로 지어낸 문장 | 5 | HOLD | 0 |
| A9 다른 판결에 귀속 | 4 | HOLD | 0 |
| A11 앞부분 진짜 + 지어낸 꼬리 | 3 | HOLD | 0 |

결정성: 시각을 바꿔 2회 실행 → 영수증 해시 전 건 동일 (79건 × 2정책)


## 공개 사례 — AI 조작 인용 목록(Charlotin DB)의 연방대법원 귀속 가짜 인용문 10건 (법원이 「그 판결에 없다」고 판단)
| # | 사건(법원·날짜) | 귀속 판결 | 인용문 | 판정 | 사유 | CAP | LII |
|---|---|---|---|---|---|---|---|
| P1 | Reilly v. Conn. Interlocal Risk Mgmt. Agency (D. Conn. 2025-06-20) | Gideon v. Wainwright 372 U.S. 335 | [c]onstitutional rights would be of little value if they cou… | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P2 | Curtin v. Watts, et al. (M.D.N.C. 2026-05-20) | Sinochem 549 U.S. 422 | must dismiss, it cannot transfer | HOLD | INSUFFICIENT_SOURCES | HOLD | HOLD |
| P3 | Curtin v. Watts, et al. (M.D.N.C. 2026-05-20) | Christianson v. Colt 486 U.S. 800 | should not revisit a jurisdictional ruling made by a coordin… | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P4 | Seeto v. Kendall (D. Nev. 2026-05-05) | Withrow v. Larkin 421 U.S. 35 | would offer a possible temptation to the average man as a ju… | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P5 | Boyle, et al. v. Steven Kramer (E.D. Mich. 2026-05-28) | Scheuer v. Rhodes 416 U.S. 232 | circumstances of the occasion | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P6 | Edward C. Allen v. Western Governors University, et al. (D. Nev. 2026-03-31) | Cooter & Gell v. Hartmarx 496 U.S. 384 | a reasonable attorney in like circumstances could believe hi… | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P7 | Edward C. Allen v. Western Governors University, et al. (D. Nev. 2026-03-31) | Cooter & Gell v. Hartmarx 496 U.S. 384 | as a bar to the courthouse door | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P8 | Gerou v. George, Whitten, and United States (E.D. Wis. 2025-12-18) | Oates v. National Bank 100 U.S. 239 | may only deal in negotiable instruments and lawful money | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P9 | Vita Law Offices v. Lockridge Grindal Nauen P.L.L.P. (S.D. Fla. 2025-07-23) | Carden v. Arkoma Associates 494 U.S. 185 | the relevant inquiry is not whether state law recognizes a p… | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P10 | Vita Law Offices v. Lockridge Grindal Nauen P.L.L.P. (S.D. Fla. 2025-07-23) | Carden v. Arkoma Associates 494 U.S. 185 | litigation-driven reassessments of an entity's internal stru… | HOLD | NOT_IN_OPINION | HOLD | HOLD |
| P1b | (참고) Smith v. Allwright에 귀속 ( ) | Smith v. Allwright 321 U.S. 649 | [c]onstitutional rights would be of little value if they cou… | HOLD | NOT_IN_OPINION | HOLD | HOLD |

공개 사례 누락(통과해 버린 건): 0/10

### 목록에는 있으나 시험하지 못한 공개 사례 7건 (통과·보류 어느 쪽으로도 세지 않음)
| # | 사건(법원·날짜) | 귀속 판결 | 보류 사유 | 설명 |
|---|---|---|---|---|
| D1 | James Jordan v. USA, Clinicas Del Camino Real, Inc., et al. (C.D. Cal. 2026-04-06) | City of Chicago v. International College of Surgeons 522 U.S. 156 | 인용문 원문 없음 | DB가 「인용문이 그 판결에 없다」는 법원 판단만 적고 인용문 원문은 적지 않았다 → 시험할 문장이 없어 보류(통과로 세지 않음) |
| D2 | David Martin v. ODS Community Dental Insurance et al. (D. Or. 2026-02-18) | Zschernig v. Miller 389 U.S. 429 | 인용문 원문 없음 | DB가 「인용문이 그 판결에 없다」는 법원 판단만 적고 인용문 원문은 적지 않았다 → 시험할 문장이 없어 보류(통과로 세지 않음) |
| D3 | Kamps v. British Crown Corporation, et al. (W.D. Mich. 2026-01-07) | Penhallow v. Doane's Administrators 3 U.S. 54 | 인용문 원문 없음 | DB는 「abstractions」「the tangible」라는 낱말만 적고 문장 전체는 적지 않았다 → 보류 |
| D4 | Black Oak Capital BOCA, LLC v. Paul Evans, LLC, et al. (D. Utah 2025-12-04) | Agency Holding Corp. v. Malley-Duff & Associates 483 U.S. 143 | 인용문 원문 없음 | DB가 「인용문이 그 판결에 없다」는 법원 판단만 적고 인용문 원문은 적지 않았다 → 시험할 문장이 없어 보류(통과로 세지 않음) |
| D5 | Mitchell Taylor Button & Dusty Button v. Juliet Doherty et al. (S.D.N.Y. 2025-10-18) | Foman v. Davis 371 U.S. 178 | 인용문 원문 없음 | DB가 「인용문이 그 판결에 없다」는 법원 판단만 적고 인용문 원문은 적지 않았다 → 시험할 문장이 없어 보류(통과로 세지 않음) |
| D6 | Mitchell Taylor Button & Dusty Button v. Sigrid McCawley (S.D. Fla. 2026-02-04) | Parekh (하급심 판결) (DB에 인용 표기 없음) | 지원 밖(하급심) | 문장은 있으나 하급심 판결이라 U.S. Reports 어댑터가 읽지 못한다 → 보류(지원 밖) |
| D7 | Mitchell Taylor Button et al. v. John Jimison (1) (W.D. Wash. 2025-10-17) | 미특정 제9순회 의견 (법원이 판결을 찾지 못함) | 지원 밖(하급심) | 법원이 판결 자체를 찾지 못했다 → 지원 밖, 보류 |

공개 사례 합계: 시험 10 + 시험 불가 7 = 17건