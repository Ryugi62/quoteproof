// SPEC §6·§17: 수신 컨트랙트 소스에 서면·판결 본문을 담을 수 있는 저장소가 없는지 본다(순수 함수, I/O 없음).
// 허용 저장: 값이 uint8·bool·uint256·address·bytes32 인 mapping 과 immutable 주소. 문자열·가변 바이트 저장은 위반.
const ALLOWED_VALUE = /^(uint8|uint256|bool|address|bytes32)$/;

export function storageViolations(src: string): string[] {
  const code = src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
  const out: string[] = [];
  for (const m of code.matchAll(/mapping\s*\(\s*[\w\s]+=>\s*([\w\[\]\s]+?)\s*\)\s*(?:public|private|internal)?\s*(\w+)\s*;/g)) {
    if (!ALLOWED_VALUE.test(m[1].trim())) out.push(`mapping value ${m[1].trim()} in ${m[2]}`);
  }
  // 계약 본문 맨 앞 단계(함수 밖) 상태 변수: string/bytes 저장
  for (const m of code.matchAll(/(?:^|[;{}])\s*(string|bytes)\s+(?:public|private|internal)\s+(\w+)\s*;/g)) out.push(`state ${m[1]} ${m[2]}`);
  return out;
}
