#!/usr/bin/env python3
"""완성 mp4에서 자막 띠를 실측해 문장별 「소리 시작」 대신 쓸 자막 켜짐 시각을 timeline.json speech_onsets에 적는다.
이 영상은 소리가 없다(tts_engine none) — 문장의 시작 = 그 문장 첫 자막이 화면에 처음 나타난 프레임을 디코드한 mp4에서 센 값이다.
사용: python3 demo/measure_onsets.py   (ffmpeg 필요)"""
import json, os, subprocess
D = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(D, "timeline.json"), encoding="utf-8"))
fps = tl["fps"]; W, H = 320, 16
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(D, "quoteproof-demo.mp4"), "-vf", f"fps={fps},crop=1280:80:0:645,scale={W}:{H},format=gray", "-f", "rawvideo", "-"],
                     capture_output=True, check=True).stdout
fs = W * H; n = len(raw) // fs
on = [max(raw[i * fs:(i + 1) * fs]) > 120 for i in range(n)]
starts = [i / fps for i in range(n) if on[i] and (i == 0 or not on[i - 1])]
out = []
for s in tl["sentences"]:
    first = min((c for c in tl["cues"] if c["start"] >= s["start"] - 0.3), key=lambda c: c["start"])
    near = min(starts, key=lambda t: abs(t - first["start"]))
    assert abs(near - first["start"]) <= 0.1, (s["id"], near, first["start"])
    out.append({"id": s["id"], "t": round(near, 3)})
tl["speech_onsets"] = out
tl["onset_note"] = "no audio track; onset = first frame where the caption strip shows the sentence's first cue, measured on the decoded mp4"
json.dump(tl, open(os.path.join(D, "timeline.json"), "w"), indent=1, ensure_ascii=False)
print(f"frames {n} · caption onsets {len(starts)} · sentences {len(out)} measured")
