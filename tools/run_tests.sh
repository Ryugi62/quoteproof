#!/bin/bash
# 결과물 게이트 repo_checks용 시험 실행 명령(루트 시험 + CRE 워크플로 시험).
export PATH="$HOME/.local/bin:$HOME/.local/node/bin:$HOME/.bun/bin:$PATH"
cd "$(dirname "$0")/.." && bun test && (cd cre/workflow && bun test)
