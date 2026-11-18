export {
  MinutesDocument,
  type IMinutesDocument,
} from "./minutes-document.model";

/** Backward-compatible status constants; the flat model is canonical. */
export const MinutesStatus = {
  DRAFT: "draft",
  REVIEW: "review",
  APPROVED: "approved",
  PUBLISHED: "published",
} as const;
