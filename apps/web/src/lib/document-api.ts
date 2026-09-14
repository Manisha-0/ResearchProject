import { authenticatedApiRequest } from "@/lib/api";

import type {
  DocumentAccessResponse,
  DocumentSummary,
  DocumentType,
  PatientDocument,
} from "@/types/document";

export async function getPatientDocuments(
  patientId: string,
): Promise<PatientDocument[]> {
  return authenticatedApiRequest<PatientDocument[]>(
    `/patients/${patientId}/documents`,
  );
}

export async function uploadPatientDocument(
  patientId: string,
  documentType: DocumentType,
  file: File,
  patientVisible: boolean,
): Promise<PatientDocument> {
  const formData = new FormData();

  formData.append("document_type", documentType);

  formData.append(
    "patient_visible",
    String(patientVisible),
  );

  formData.append("file", file);

  return authenticatedApiRequest<PatientDocument>(
    `/patients/${patientId}/documents`,
    {
      method: "POST",
      body: formData,
    },
  );
}

export async function createDocumentAccess(
  patientId: string,
  documentId: string,
): Promise<DocumentAccessResponse> {
  return authenticatedApiRequest<DocumentAccessResponse>(
    `/patients/${patientId}/documents/${documentId}/access`,
    {
      method: "POST",
    },
  );
}

export async function deletePatientDocument(
  patientId: string,
  documentId: string,
): Promise<void> {
  return authenticatedApiRequest<void>(
    `/patients/${patientId}/documents/${documentId}`,
    {
      method: "DELETE",
    },
  );
}

export async function getDocumentSummary(
  patientId: string,
  documentId: string,
): Promise<DocumentSummary> {
  return authenticatedApiRequest<DocumentSummary>(
    `/patients/${patientId}/documents/${documentId}/summary`,
  );
}

export async function generateDocumentSummary(
  patientId: string,
  documentId: string,
): Promise<DocumentSummary> {
  return authenticatedApiRequest<DocumentSummary>(
    `/patients/${patientId}/documents/${documentId}/summarize`,
    {
      method: "POST",
    },
  );
}