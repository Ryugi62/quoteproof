#!/usr/bin/env python3
"""QuoteProof 데모 영상 렌더러 v3 (목소리·얼굴 없음, 자막만 — tts_engine none).
입력: demo/captures/*.txt (demo/capture.sh가 실제 실행으로 받은 출력) + fixtures/eval-results.md + cre/workflow/main.ts
출력: demo/quoteproof-demo.mp4, demo/quoteproof-demo.srt, demo/frames/*.png
사용: python3 demo/render.py   (ffmpeg 필요)
화면 글은 전부 영어이고 로그도 영어다(v3). 자막은 큐당 한 줄 ≤42자로 나누고, 문장 사이 쉼(0.35~0.62s)은 빈 띠로 둔다.
출력 추가: demo/timeline.json (문장·자막 큐·컷·화면 글 — 결과물 게이트 V4). 소리 시작 실측은 demo/measure_onsets.py.
"""
import json, os, re, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, "demo")
CAP = os.path.join(D, "captures")
FR = os.path.join(D, "frames")
os.makedirs(FR, exist_ok=True)
W, H = 1280, 720
BG, FG, DIM = (13, 17, 23), (230, 237, 243), (139, 148, 158)
GREEN, RED, AMBER, BLUE, PANEL = (63, 185, 80), (248, 81, 73), (210, 153, 34), (88, 166, 255), (22, 27, 34)
MONO = "/System/Library/Fonts/Menlo.ttc"
SANS = "/System/Library/Fonts/HelveticaNeue.ttc"
def mono(s): return ImageFont.truetype(MONO, s)
def sans(s, bold=False): return ImageFont.truetype(SANS, s, index=1 if bold else 0)

def tr(s): return s

def read(name): return open(os.path.join(CAP, name), encoding="utf-8").read()

def new():
    im = Image.new("RGB", (W, H), BG); return im, ImageDraw.Draw(im)

def strip(im, text):
    """하단 고정 자막 띠(한 줄)를 그린 복사본. text가 비면 빈 띠(문장 사이 쉼)."""
    im = im.copy(); d = ImageDraw.Draw(im)
    d.rectangle([0, 640, W, H], fill=(0, 0, 0))
    if text:
        f = sans(30)
        tw = d.textlength(text, font=f)
        assert tw <= W - 60, f"subtitle too long: {text}"
        d.text(((W - tw) / 2, 660), text, font=f, fill=(255, 255, 255))
    return im

def title(d, text, color=FG, y=28, size=34):
    d.text((48, y), text, font=sans(size, True), fill=color)

def term(d, lines, x=48, y=96, size=15, lh=None, bottom=630, title_text=None):
    """lines: [(text, color)]. 터미널 판 + 줄바꿈."""
    f = mono(size); lh = lh or size + 7
    cw = d.textlength("M", font=f); maxc = int((W - 80 - x) / cw)
    rows = []
    for text, col in lines:
        for p in ([text[i:i + maxc] for i in range(0, max(len(text), 1), maxc)] or [""]): rows.append((p, col))
    hdr = 20 if title_text else 0
    bot = min(bottom, y + hdr + len(rows) * lh + 18)
    d.rounded_rectangle([x - 16, y - 12, W - 32, bot], 10, fill=PANEL)
    if title_text: d.text((x, y - 8), title_text, font=sans(15), fill=DIM); y += 20
    for p, col in rows:
        if y + lh > bottom: return
        d.text((x, y), p, font=f, fill=col); y += lh

def colorize(lines):
    out = []
    for l in lines:
        c = FG
        if l.startswith("$"): c = BLUE
        elif re.search(r'"verdict": "PASS"|PASS|✓|found:.*true|: true', l) and "false" not in l: c = GREEN
        elif re.search(r'HOLD|NOT_IN_OPINION|DISTORTION|NOT FOUND|NOT_FOUND|✗|false|missing', l): c = RED
        elif re.search(r'receiptHash', l): c = AMBER
        out.append((l, c))
    return out

def condense_receipt(txt):
    """CLI가 낸 영수증 JSON을 한 화면에 맞게 줄인다: 명령 줄 + 판정·편집·출처별 한 줄 + 해시. (값은 그대로)"""
    cmd, _, body = txt.partition("\n")
    body = "\n".join(l for l in body.splitlines() if not re.match(r"(NOTE:|waiting |SKIPPED:|OFFLINE)", l))
    body = body[: body.rindex("}") + 1]
    j = json.loads(body)
    o = [cmd]
    o.append(f'verdict    : {j["verdict"]}   reasons: {",".join(j["reasons"]) or "-"}   edits: {",".join(j["edits"]) or "-"}')
    for s in j["sources"]:
        o.append(f'source {s["id"]:<4}: found={str(s["found"]).lower():<5} at={s["start"]:<6} text sha256={s["textSha256"][:12]}..  {s["reason"]}')
    o.append(f'checkedAt  : {j["checkedAt"]}  (excluded from hash)')
    o.append(f'receiptHash: {j["receiptHash"]}')
    return o, j


def chain_scene():
    """체인 쓰기 장면 — demo/captures/chain.txt(docs/evidence의 체인 쓰기 실측 로그 사본)가 있으면 그대로 보여 준다."""
    p = os.path.join(CAP, "chain.txt")
    if not os.path.exists(p): return None
    lines = [l.rstrip("\n") for l in open(p, encoding="utf-8")]
    flag = open(os.path.join(CAP, "chain.flag")).read().strip()
    im, d = new(); title(d, "Chain write: measured, not assumed", GREEN if flag == "broadcast" else AMBER)
    term(d, [(l[:150], GREEN if "SUCCESS" in l or "0x" in l else (AMBER if flag != "broadcast" else FG)) for l in lines[:18]], size=16, lh=30, title_text="docs/evidence/chain-write")
    text = open(os.path.join(CAP, "chain.caption")).read().strip()
    return (im, text, 8.0, "chain write")

TESTLINE = " | ".join(x.strip() for x in read("test.txt").splitlines() if x.strip() and (x.strip().endswith(" pass") or x.strip().endswith(" fail") or x.strip().startswith("Ran ")))

# ---- 장면 조립 (v3) ----------------------------------------------------------
FPS = 30
MAXCH = 42
FUNC_END = {"the", "a", "an", "of", "with", "to", "and", "but", "or", "in", "on", "for", "at", "by", "from", "that", "is", "are", "was", "it", "its", "your", "my", "our", "their", "as", "than", "into", "if", "so"}
GAPS = [0.40, 0.55, 0.35, 0.62, 0.48, 0.58, 0.38, 0.52, 0.44, 0.60]   # 문장 사이 쉼(고르면 기계 같다, V7)
scenes = []   # {img, text, secs_min, screen}
def add(im, text, secs_min=0.0, screen=""):
    scenes.append({"img": im, "text": text, "min": secs_min, "screen": screen})

def split_cues(text):
    """문장을 ≤42자 한 줄 큐로 나눈다. 구두점 뒤를 우선하고, 관사·전치사·접속사로 끝나지 않게 한다(V11)."""
    words = text.split(); cues = []; cur = []
    def ok_end(w): return w[-1] in ".!?,;:" or w.lower().strip(".,;:") not in FUNC_END
    while words:
        cur = []
        while words and len(" ".join(cur + [words[0]])) <= MAXCH: cur.append(words.pop(0))
        assert cur, f"word longer than a cue: {words[0]}"
        # 되돌려서 좋은 끊는 자리 찾기
        while len(cur) > 1 and words and not ok_end(cur[-1]): words.insert(0, cur.pop())
        # 구두점에서 끊을 수 있으면 거기서 끊는다(남은 길이가 충분할 때)
        if words:
            for i in range(len(cur) - 1, 0, -1):
                if cur[i - 1][-1] in ",;:" and len(" ".join(cur[:i])) >= 18:
                    words = cur[i:] + words; cur = cur[:i]; break
        cues.append(" ".join(cur))
    return cues

def q(t): return round(t * FPS) / FPS

def plan():
    """scenes → 시간표. 문장 길이 = max(낱말/3.0, 글자/19, 최소 화면 시간), 말 속도 1.8~3.3 단어/초 안."""
    t_cut = 0.0; prev_end = None; plans = []
    for i, sc in enumerate(scenes):
        words = len(sc["text"].split()); chars = len(sc["text"])
        cues = split_cues(sc["text"]); GAP_IN = 0.10
        dur = max(words / 3.0, chars / 19.0, sc["min"] - 0.25)
        assert 1.8 <= words / dur <= 3.3, f"scene {i} speed {words/dur:.2f} w/s: lengthen or shorten the caption: {sc['text']}"
        gap = GAPS[i % len(GAPS)]
        start = q((prev_end + gap) if prev_end is not None else 0.25)
        cut = q(start - 0.25) if prev_end is not None else 0.0
        total_c = sum(len(c) for c in cues); avail = dur - GAP_IN * (len(cues) - 1)
        cs = []; x = start
        for c in cues:
            d = q(max(0.84, avail * len(c) / total_c))
            cs.append({"start": q(x), "end": q(x + d), "lines": [c]}); x = q(x + d + GAP_IN)
        end = cs[-1]["end"]
        for c in cs: assert len(c["lines"][0]) / (c["end"] - c["start"]) <= 20.0 + 1e-6, (c, "cps")
        plans.append({"cut": cut, "start": start, "end": end, "cues": cs, "words": words}); prev_end = end
    return plans

def compose(plans):
    """프레임 목록 [(path, secs)] — 장면 이미지에 자막 띠만 바꿔 입힌다. 시각은 1/30초로 맞춘다."""
    frames = []; n = 0
    def put(im, secs):
        nonlocal n
        p = os.path.join(FR, f"f{n:03d}.png"); im.save(p); n += 1; frames.append((p, secs))
    for i, (sc, pl) in enumerate(zip(scenes, plans)):
        nxt_cut = plans[i + 1]["cut"] if i + 1 < len(plans) else q(pl["end"] + 1.2)
        t = pl["cut"]
        for c in pl["cues"]:
            if c["start"] > t + 1e-6: put(strip(sc["img"], ""), q(c["start"] - t)); t = c["start"]
            put(strip(sc["img"], c["lines"][0]), q(c["end"] - c["start"])); t = c["end"]
        if nxt_cut > t + 1e-6: put(strip(sc["img"], ""), q(nxt_cut - t))
    return frames

def build():
    # 1 제목
    im, d = new()
    d.text((48, 190), "QuoteProof", font=sans(84, True), fill=FG)
    d.text((48, 305), "Is the quoted sentence really in the court opinion?", font=sans(38), fill=BLUE)
    d.text((48, 380), "Re-reads two public sources, does not trust the filer, and issues a hash-stamped receipt.", font=sans(24), fill=DIM)
    d.text((48, 470), "BLI Legal Tech Hackathon 2  |  LegalTech & RegTech  |  no voice-over: subtitles + real runs", font=sans(20), fill=DIM)
    add(im, "Every screen here is a real run, and anything that is not one is labeled.", 6.0, "QuoteProof title")

    # 2~4 문제·기존 도구
    def card(lines_, text, secs, head=None, headcol=FG):
        im, d = new()
        if head: title(d, head, headcol)
        y = 120
        for t, size, col, bold in lines_:
            d.text((48, y), t, font=sans(size, bold), fill=col); y += int(size * 1.55)
        add(im, text, secs, head or "")
    card([("Allen v. Western Governors University  (D. Nev., 2026-03-31)", 30, FG, True),
          ("Pro se filing quoted Cooter & Gell v. Hartmarx, 496 U.S. 384:", 26, DIM, False),
          ("   “as a bar to the courthouse door”", 34, AMBER, True),
          ("Court: that quote is not in the opinion.", 26, FG, False),
          ("Outcome: case dismissed with prejudice; adverse costs order.", 26, RED, True),
          ("Source: AI Hallucination Cases database (D. Charlotin, CC BY 4.0), 2,242 cases, 1,513 in the US.", 18, DIM, False)],
         "In 2026 a court found that a quote cited to Cooter and Gell was not in that opinion.", 6.5, head="The problem: invented quotes")
    card([("Case-existence lookup asks:   “Does 496 U.S. 384 exist?”", 28, DIM, False),
          ("QuoteProof asks:                 “Are these words in it?”  (paid tools ask this too: next card)", 28, FG, True),
          ("", 20, FG, False),
          ("Allowed edits pass:  ellipsis ...   [t]he   [the Court]   line breaks   curly quotes", 22, GREEN, False),
          ("Held:  changed word, added word, deleted negation, word swapped inside [brackets]", 22, RED, False),
          ("", 20, FG, False),
          ("Two independent re-reads, reproducible receipt hash, published error rates. String matches only.", 22, DIM, False)],
         "Lookup tools ask whether the case exists. QuoteProof asks whether the quoted words are in it.", 6.0, head="The question")
    card([("Westlaw Edge Quick Check:  report has “an analysis of quotations”", 24, FG, False),
          ("Lexis+ Brief Analysis:         “Quote Check ... detects errors in cited quotes”", 24, FG, False),
          ("Clearbrief:                          flags “inaccurate quotes”;  $300 per user per month", 24, FG, False),
          ("Their pages do not say how it works or how often it is wrong.", 24, AMBER, True),
          ("", 20, FG, False),
          ("QuoteProof: two free public sources, a receipt hash anyone can recompute,", 24, GREEN, False),
          ("false-alarm 13.2% and miss 0/84 published, limits stated first. No accuracy comparison is claimed.", 24, GREEN, False),
          ("Sources: official product pages, read 2026-10-30 (see README table).", 18, DIM, False)],
         "Paid tools check quotes too but publish no error rates; here sources are free and rates public.", 5.5, head="Existing tools")

    # 5~10 실제 실행 3건
    p7, j7 = condense_receipt(read("verify-p7.txt"))
    for k, st, mn in [(1, "Real run: the quote the court rejected, checked against two independent sources.", 4.0),
                      (len(p7), "Both sources report not found, so the verdict is HOLD with a receipt hash anyone can recompute.", 6.5)]:
        im, d = new(); title(d, "Same quote, QuoteProof (live run)", FG)
        term(d, colorize(p7[:k]), size=20, title_text="terminal  ~/dev/quoteproof"); add(im, st, mn, "verify-p7 " + ("cmd" if k == 1 else "result"))
    for name, head, subs in [("verify-genuine.txt", "Run 1: a genuine quote (372 U.S. 335, Gideon)",
                              ["Real run: a genuine sentence from Gideon versus Wainwright.",
                               "Both sources find it at a position, so it passes and the receipt records where."]),
                             ("verify-altered.txt", "Run 2: the same sentence with its meaning flipped",
                              ["Now the same sentence with its meaning flipped by three small edits.",
                               "Neither source has it, so the verdict is HOLD and the receipt hash changes."])]:
        lines, j = condense_receipt(read(name))
        for k, st, mn in [(1, subs[0], 3.5), (len(lines), subs[1], 5.5)]:
            im, d = new(); title(d, head, FG)
            term(d, colorize(lines[:k]), size=20, title_text="terminal  ~/dev/quoteproof"); add(im, st, mn, head + (" cmd" if k == 1 else " result"))

    # 11~13 v3 준비서면 일괄 검사
    br = [l for l in read("verify-brief.txt").splitlines() if l.strip() and not l.startswith("error:") and not re.match(r"(NOTE:|waiting |SKIPPED:|OFFLINE)", l)]
    cmd = br[0]; table = [l for l in br[1:] if not l.startswith("read requests")]
    im, d = new(); title(d, "New in v3: check a whole brief", FG)
    term(d, [(cmd, BLUE)], size=22, title_text="terminal  ~/dev/quoteproof")
    d.text((48, 190), "Input: fixtures/brief-example-allen.txt  (a reconstructed example, not the filing).", font=sans(22), fill=DIM)
    d.text((48, 232), "It holds 5 quotations: two the court rejected, two genuine, one lower-court cite.", font=sans(22), fill=DIM)
    add(im, "New in version three: one command extracts every quotation from a brief file and checks each one.", 5.5, "verify-brief cmd")
    im, d = new(); title(d, "Brief-level report (real run)", FG)
    cols = []
    for l in table:
        if l.startswith("#") or l[:1].isdigit(): l = (l[:109] + "…") if len(l) > 110 else l
        c = FG
        if "| HOLD" in l: c = RED
        elif "| PASS" in l: c = GREEN
        elif "NOT_CHECKED" in l: c = AMBER
        elif l.startswith("Summary"): c = AMBER
        cols.append((l, c))
    term(d, [(cmd, BLUE)] + cols, size=15, lh=32, title_text="terminal  exit 1 = at least one HOLD")
    add(im, "Two invented quotes are held and two genuine ones pass; a lower court cite is not checked, never passed.", 7.5, "verify-brief table")
    card([("What leaves the machine, and how fast.", 30, FG, True),
          ("Read requests are built from the citation only: static.case.law/us/496/cases/0384-01.json", 21, GREEN, False),
          ("and law.cornell.edu/supremecourt/text/496/384. The quote is compared locally; a test checks every URL.", 21, GREEN, False),
          ("", 14, FG, False),
          ("v4: Cornell LII robots.txt says  Crawl-delay: 10  -> the CLI waits 10 s between requests to law.cornell.edu.", 21, FG, False),
          ("Real log:  waiting 10.0s before the next request to www.law.cornell.edu (robots.txt Crawl-delay 10s)", 19, AMBER, False),
          ("Found and disclosed: static.case.law/robots.txt says  Disallow: /  (see README Limits).", 21, AMBER, False)],
         "Only citation addresses leave the machine, and the tool waits the ten seconds Cornell's robots file asks for.", 7.5, head="Privacy and robots.txt")
    ids = read("brief-idsupra.txt").splitlines()
    im, d = new(); title(d, "New in v4: Id. and supra are followed", FG)
    cols = []
    for l in ids[1:]:
        l = (l[:109] + "…") if len(l) > 110 else l
        c = FG
        if "| HOLD" in l: c = RED
        elif "| PASS" in l: c = GREEN
        elif "NOT_CHECKED" in l or l.startswith("Summary"): c = AMBER
        cols.append((l, c))
    term(d, [("$ bun run verify-brief fixtures/brief-example-id-supra.txt", BLUE)] + cols, size=15, lh=32, title_text="rows 1-2 via Id., row 3 via Cooter & Gell, supra; row 4 follows a F.3d cite")
    add(im, "Id and supra now follow to their case, and when they cannot, the row says why instead of guessing.", 8.0, "Id supra table")

    # 14~15 표
    im, d = new(); title(d, "False alarms and misses (fixtures/eval-results.md)", FG)
    rows = [("set / configuration", "false alarm (genuine held)", "miss (altered passed)"),
            ("dev set, 2 sources strict", "4/34 = 11.8%  [4.7-26.6]", "0/42 = 0.0%  [0.0-8.4]"),
            ("dev set, punctuation tolerance*", "3/34 =  8.8%  [3.0-23.0]", "0/42 = 0.0%  [0.0-8.4]"),
            ("holdout, 2 sources strict", "5/34 = 14.7%  [6.4-30.1]", "0/42 = 0.0%  [0.0-8.4]"),
            ("holdout, punctuation tolerance*", "3/34 =  8.8%  [3.0-23.0]", "0/42 = 0.0%  [0.0-8.4]"),
            ("both sets pooled, strict (default)", "9/68 = 13.2%  [7.1-23.3]", "0/84 = 0.0%  [0.0-4.4]"),
            ("both sets pooled, tolerance*", "6/68 =  8.8%  [4.1-17.9]", "0/84 = 0.0%  [0.0-4.4]"),
            ("public cases (court-labeled)", "n/a", "0/8 passed  [0.0-32.4]")]
    y = 110; xs = [48, 520, 900]
    for i, r in enumerate(rows):
        col = FG if i else DIM
        for x, t in zip(xs, r):
            c = col
            if i and x == xs[1] and "13.2" in t: c = RED
            d.text((x, y), t, font=mono(19), fill=c)
        y += 44
        if i == 0: d.line([48, y - 8, W - 48, y - 8], fill=DIM)
    d.text((48, y + 16), "Wilson 95% intervals in brackets.  * tolerance = post-hoc policy added after the dev set was seen; default is strict.", font=sans(18), fill=DIM)
    add(im, "The strict default misses the ten percent false alarm target: thirteen point two percent.", 6.0, "numbers table")
    im, d = new(); title(d, "What the false alarms are", FG)
    for i, (t, c) in enumerate([
            ("9 false alarms (strict, both sets):", FG),
            ("  2  one source has a transcription typo (“ease” for “case”, “definance”) -- two sources caught it", GREEN),
            ("  2  text only in one source (ad / appendix in NYT v. Sullivan)", AMBER),
            ("  4  punctuation / hyphen spacing differences between sources", AMBER),
            ("  1  spelling variant (removeable / removable)", AMBER),
            ("", FG),
            ("0 of 8 court-identified fake quotes passed (all HOLD; 1 of them for lack of a second source).", FG),
            ("Altered quotes were written by the author, so 0% miss is optimistic. The 8 public cases are the only external labels.", RED)]):
        d.text((48, 110 + i * 56), t, font=sans(24), fill=c)
    add(im, "Most false alarms are the two sources disagreeing rather than the matching rules, and the miss rate is optimistic.", 7.0, "false alarm causes")

    # 16~18 합의·결정성
    cg = [l for l in read("consensus-genuine.txt").splitlines() if not l.lstrip().startswith("[NOTE") and not l.lstrip().startswith("[waiting")]
    cg = [(l[:118] + "…" if l.startswith(("node1:", "node2:", "node3:", "node4:")) else l[:190]) for l in cg]
    cg = [l for l in cg if not l.startswith(("node2:", "node3:"))]   # 화면에는 노드 1·4와 합의 줄만(전문은 docs/evidence/local-consensus-genuine.log)
    cg_view = ["$ bun run src/infrastructure/localConsensus.ts \"372 U.S. 335\" \"<genuine quote>\" 4"] + cg
    im, d = new(); title(d, "Two sources, four local processes, one consensus", FG)
    term(d, colorize(cg_view), size=17, title_text="terminal  (local re-implementation of the CRE consensus rule, not cre simulate)")
    add(im, "Four local processes (not CRE nodes) each read both sources live; three of four must agree and all four do.", 6.0, "local consensus genuine")
    g1, _ = condense_receipt(read("verify-genuine.txt")); g2, _ = condense_receipt(read("verify-genuine-rerun.txt"))
    im, d = new(); title(d, "Determinism: re-run the same input", FG)
    L = [("run 1  " + g1[-2], FG), ("run 1  " + g1[-1], AMBER), ("", FG), ("run 2  " + g2[-2], FG), ("run 2  " + g2[-1], AMBER), ("", FG),
         ("checkedAt differs, receiptHash is identical.", GREEN),
         ("Eval: 79 cases x 2 policies x 2 sets, re-run at a different time: all receipt hashes identical.", GREEN),
         ("(from fixtures/eval-results.md, “determinism” lines)", DIM)]
    term(d, L, size=22, lh=40, title_text="receipt hash = sha256(canonical JSON without time)")
    add(im, "Running the same input at a different clock time gives the identical receipt hash.", 5.0, "determinism")

    # 19~21 CRE
    main_ts = open(os.path.join(ROOT, "cre/workflow/main.ts"), encoding="utf-8").read().splitlines()
    pick = [l for l in main_ts if re.search(r"fetchBoth|writeReport|prepareReportRequest|HTTPClient|for \(const \[id|runInNodeMode|consensusIdenticalAggregation|verifyFromTexts|HTTPCapability|toObservation|sendRequest", l)]
    pick = [l.strip()[:140] for l in pick if not l.strip().startswith("//")]
    im, d = new(); title(d, "CRE workflow: cre/workflow/main.ts (excerpt, abbreviated)", FG)
    term(d, [(l, FG) for l in pick[:14]] + [("", FG), ("The simulator runs this code once per node, locally; each run reads BOTH sources.", AMBER)], size=17, lh=26, title_text="cre/workflow/main.ts")
    add(im, "The simulator runs this workflow once per node (local): read both sources, agree, then write the report.", 6.5, "CRE code excerpt")
    for kind, st, mn in [("genuine", "The CRE simulator ran it for real, exit code zero: consensus PASS and a dry run write.", 7.5),
                         ("altered", "The altered payload gives HOLD with NOT_IN_OPINION through the same workflow and the same write path.", 5.5)]:
        sim = [l for l in read(f"cre-simulate-{kind}.txt").splitlines() if any(k in l for k in ("USER LOG", "Simulation Result", "verdict", "# exit code"))]
        im, d = new(); title(d, f"CRE CLI simulation ({kind} payload): real run, 2026-10-30", GREEN)
        L = [(f"$ cre workflow simulate workflow --target local-simulation --non-interactive --trigger-index 0 --http-payload payload-{kind}.json", BLUE)] + \
            [(l.replace('\\"', '"')[:200], GREEN if ("PASS" in l or "verdict" in l) else FG) for l in sim] + [("", FG), ("No --broadcast: dry run, txHash = none, nothing sent to Sepolia.", RED)]
        term(d, L, size=17, lh=28, title_text=f"cre CLI v1.39.0   log: docs/evidence/cre-simulate-v3-english-{kind}-2026-10-30.log")
        add(im, st, mn, f"CRE simulate {kind}")

    # 22 체인 쓰기 실측
    chain = chain_scene()
    if chain: add(*chain)
    bc = [l for l in read("brief-cre.txt").splitlines() if l.strip()]
    im, d = new(); title(d, "Product path into CRE: verify-brief -> CRE simulator -> Sepolia", GREEN)
    L = [("$ bun run verify-brief <brief> --cre-payload <dir> --cre-simulate 3 --cre-broadcast", BLUE)] + [(l[:150], GREEN if ("==" in l or "SUCCESS" in l) else FG) for l in bc]
    term(d, L, size=17, lh=30, title_text="one quote + its citation go to the workflow; CRE hash == local receipt hash")
    add(im, "Opt-in: with --cre-broadcast the same command sends the checked quote into the CRE simulator; its hash matches the local receipt.", 9.0, "brief to CRE")

    # 23~24 한계·끝
    im, d = new(); title(d, "Limits and what is next", FG)
    for i, (t, c) in enumerate([
            ("Scope: US Supreme Court opinions (U.S. Reports) only. Two-source coverage: 20 of 24 fixture opinions.", FG),
            ("Test sets: 34 genuine + 42 altered per set, two sets; 8 public cases. Intervals are wide.", FG),
            ("Punctuation tolerance is a post-hoc policy; the strict 2-source default is what is reported first.", AMBER),
            ("Not covered: lower courts, footnotes; Id. follows a nearest-citation rule; 3 borderline negation drops are held.", FG),
            ("CRE is opt-in, simulator only (--broadcast, mock forwarder); no CRE network deployment.", AMBER),
            ("robots.txt: LII 10 s delay kept; CAP's robots file says Disallow: / (disclosed in README).", AMBER),
            ("Repo tests: " + TESTLINE, GREEN)]):
        d.text((48, 105 + i * 58), t, font=sans(22), fill=c)
    add(im, "Limits first: Supreme Court opinions only, small test sets, and a post hoc policy that is not the headline.", 6.5, "limits")
    im, d = new(); title(d, "QuoteProof", FG)
    d.text((48, 200), "The words, not just the case.", font=sans(54, True), fill=FG)
    d.text((48, 300), "Commands: bun run verify | verify-brief | eval | test        MIT license, code and fixtures in the repo", font=sans(22), fill=DIM)
    d.text((48, 350), "Free public sources  |  receipt hash anyone can recompute  |  published error rates and limits", font=sans(24), fill=GREEN)
    add(im, "QuoteProof checks the words and not only the case, and it states its limits first.", 5.0, "end")

def srt_time(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}"

def main():
    build()
    plans = plan()
    frames = compose(plans)
    lst = os.path.join(D, "frames.txt")
    with open(lst, "w") as f:
        for p, secs in frames: f.write(f"file '{p}'\nduration {secs:.4f}\n")
        f.write(f"file '{frames[-1][0]}'\n")
    out = os.path.join(D, "quoteproof-demo.mp4")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst, "-vf", f"fps={FPS},format=yuv420p",
                    "-c:v", "libx264", "-crf", "20", "-preset", "medium", "-an", "-movflags", "+faststart", out], check=True)
    cues = [c for pl in plans for c in pl["cues"]]
    with open(os.path.join(D, "quoteproof-demo.srt"), "w", encoding="utf-8") as f:
        for i, c in enumerate(cues, 1): f.write(f"{i}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['lines'][0]}\n\n")
    total = sum(s for _, s in frames)
    tl = {"fps": FPS, "total": round(total, 3), "audio": "none (subtitle-only video, tts_engine none)",
          "sentences": [{"id": f"S{i+1:02d}", "start": pl["start"], "end": pl["end"], "text": sc["text"], "pause_before": 0} for i, (sc, pl) in enumerate(zip(scenes, plans))],
          "cues": cues,
          "cuts": [{"t": pl["cut"], "lead_into": f"S{i+1:02d}"} for i, pl in enumerate(plans) if i > 0],
          "screen_text": [sc["screen"] for sc in scenes]}
    json.dump(tl, open(os.path.join(D, "timeline.json"), "w"), indent=1, ensure_ascii=False)
    print("scenes", len(scenes), "cues", len(cues), "seconds", round(total, 2), "->", out)

main()
