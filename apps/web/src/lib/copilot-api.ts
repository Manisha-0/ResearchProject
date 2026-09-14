import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  CopilotResponse,
} from "@/types/copilot";

export async function askPatientCopilot(
  patientId: string,
  question: string,
): Promise<CopilotResponse> {
  return authenticatedApiRequest<CopilotResponse>(
    `/patients/${patientId}/copilot`,
    {
      method: "POST",
      body: JSON.stringify({
        question,
      }),
    },
  );
}