#!/bin/bash
# 결과물 게이트 repo_checks용 README 대조 명령(환경변수 접두 없이 부를 수 있게 PATH를 여기서 잡는다).
export PATH="$HOME/.local/bin:$HOME/.local/node/bin:$HOME/.bun/bin:$PATH"
cd "$(dirname "$0")/.." && exec bun run tools/check_readme.ts
