export type SubmissionState = {
  ok: boolean;
  message: string;
};

export const initialSubmissionState: SubmissionState = { ok: false, message: "" };
