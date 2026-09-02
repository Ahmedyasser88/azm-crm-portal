import { apiServerFetch } from "./fetch";
import type { AgentTask } from "../types/agentTask";
import type { PaginatedResult } from "../types/pagination";

const AGENT_TASKS_URL = "/api/agent-tasks";

export const agentTaskEndpoints = {
  list: (params: { pageNumber?: number; pageSize?: number; isCompleted?: boolean }) =>
    apiServerFetch<PaginatedResult<AgentTask>>({
      url: AGENT_TASKS_URL,
      params: {
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 20,
        isCompleted: params.isCompleted,
      },
      cache: "no-store",
    }),
};
