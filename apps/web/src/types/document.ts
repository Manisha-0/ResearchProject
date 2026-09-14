export type DocumentType =
  | "referral"
  | "care_plan"
  | "discharge_instructions"
  | "administrative"
  | "other";

export type PatientDocument = {
  id: string;
  patient_id: string;
  document_type: DocumentType;
  original_filename: string;
  content_type: string;
  file_size_bytes: number;
  uploaded_by_user_id: string;
  patient_visible: boolean;
  created_at: string;
};

export type DocumentAccessResponse = {
  url: string;
  expires_in_seconds: number;
};

export type DocumentSummary = {
  id: string;
  document_id: string;
  patient_id: string;
  model_name: string;
  summary: string;
  key_details: string[];
  navigation_actions: string[];
  important_dates: string[];
  limitations: string[];
  source_character_count: number;
  source_truncated: boolean;
  generated_by_user_id: string;
  created_at: string;
  updated_at: string;
};