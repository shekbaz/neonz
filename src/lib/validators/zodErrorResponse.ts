import type { ZodError } from "zod";

export interface ApiIssue {
  path: string;
  code: string;
  message: string;
  minimum?: number;
  maximum?: number;
}

export function formatZodIssues(error: ZodError): ApiIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    code: issue.code,
    message: issue.message,
    minimum: "minimum" in issue ? (issue.minimum as number) : undefined,
    maximum: "maximum" in issue ? (issue.maximum as number) : undefined,
  }));
}
