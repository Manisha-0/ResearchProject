import {
  authenticatedApiRequest,
} from "@/lib/api";

import type {
  DocumentAccessResponse,
  PatientDocument,
} from "@/types/document";


export async function getMyDocuments(): Promise<
  PatientDocument[]
> {
  return authenticatedApiRequest<
    PatientDocument[]
  >(
    "/me/documents",
    {
      method: "GET",
    },
  );
}


export async function createMyDocumentAccess(
  documentId: string,
): Promise<DocumentAccessResponse> {
  return authenticatedApiRequest<
    DocumentAccessResponse
  >(
    `/me/documents/${documentId}/access`,
    {
      method: "POST",
    },
  );
}