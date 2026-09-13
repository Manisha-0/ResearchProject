from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.crud.document import (
    create_document,
    delete_document,
    get_document,
    get_documents,
    update_document,
)
from app.db.database import get_db
from app.schemas.document import (
    DocumentCreate,
    DocumentResponse,
    DocumentUpdate,
)


router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)


@router.post("", response_model=DocumentResponse, status_code=201)
def create_document_route(
    data: DocumentCreate,
    db: Session = Depends(get_db),
):
    return create_document(db, data)


@router.get("", response_model=list[DocumentResponse])
def list_documents(
    patient_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
):
    return get_documents(db, patient_id)


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document_route(
    document_id: int,
    db: Session = Depends(get_db),
):
    document = get_document(db, document_id)

    if document is None:
        raise HTTPException(404, "Document not found")

    return document


@router.patch("/{document_id}", response_model=DocumentResponse)
def update_document_route(
    document_id: int,
    data: DocumentUpdate,
    db: Session = Depends(get_db),
):
    document = get_document(db, document_id)

    if document is None:
        raise HTTPException(404, "Document not found")

    return update_document(db, document, data)


@router.delete("/{document_id}", status_code=204)
def delete_document_route(
    document_id: int,
    db: Session = Depends(get_db),
):
    document = get_document(db, document_id)

    if document is None:
        raise HTTPException(404, "Document not found")

    delete_document(db, document)