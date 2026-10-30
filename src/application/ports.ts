import type { SourceId } from "../domain/types";

/** Citation(예: "410 U.S. 113")에 해당하는 Opinion 본문을 한 출처에서 읽는다. 못 읽으면 null. */
export interface OpinionSource {
  readonly id: SourceId;
  readOpinion(citation: string): Promise<string | null>;
  /** SPEC §17: 이 출처가 citation 에 대해 읽는 공개 주소(영수증에 싣는다). 모르면 null. */
  urlFor?(citation: string): string | null;
}
export type Clock = () => string;
