import type { SourceId } from "../domain/types";

/** Citation(예: "410 U.S. 113")에 해당하는 Opinion 본문을 한 출처에서 읽는다. 못 읽으면 null. */
export interface OpinionSource {
  readonly id: SourceId;
  readOpinion(citation: string): Promise<string | null>;
}
export type Clock = () => string;
