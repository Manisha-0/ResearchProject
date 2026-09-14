export type DocumentType =
  | "referral"
  | "care_plan"
  | "discharge_instructions"
  | "administrative"
  | "other";

export type PatientDocument = {
  id: string;

  patient_id: string;

  document_type:
    DocumentType;

  original_filename: string;

  content_type: string;

  file_size_bytes: number;

  uploaded_by_user_id:
    string;

  created_at: string;
};

export type DocumentAccessResponse = {
  url: string;

  expires_in_seconds:
    number;
};