export type CopilotSource = {
  source_id: string;
  type: string;
  label: string;
};

export type CopilotResponse = {
  answer: string;
  sources: CopilotSource[];
  model_name: string;
};

export type CopilotMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: CopilotSource[];
};