export type SubmissionEvent = {
  type: "submission";
  at: string;
  username: string;
  isHallOfFame?: boolean;
  trackSlug: string;
  levelIdx: number;
  levelTitle: string;
};

export type LiveEvent = SubmissionEvent;
