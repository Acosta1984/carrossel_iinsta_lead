import type { CreativeResult } from "./creative.js";
import type { JobStatus } from "./types.js";

/** Job de geração de criativos. */
export interface Job {
  job_id: string;
  status: JobStatus;
  results?: CreativeResult[];
  error?: string;
  created_at: string;
  completed_at?: string;
}
