from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import Document
from app.schemas.document import DocumentCreate, DocumentUpdate


def create_document(
    db: Session,
    data: DocumentCreate,
) -> Document:

    document = Document(**data.model_dump())

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


def get_document(
    db: Session,
    document_id: int,
) -> Document | None:

    return db.get(Document, document_id)


def get_documents(
    db: Session,
    patient_id: int | None = None,
) -> list[Document]:

    query = select(Document).order_by(
        Document.created_at.desc()
    )

    if patient_id is not None:
        query = query.where(
            Document.patient_id == patient_id
        )

    return list(db.scalars(query).all())


def update_document(
    db: Session,
    document: Document,
    data: DocumentUpdate,
) -> Document:

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(document, field, value)

    db.commit()
    db.refresh(document)

    return document


def delete_document(
    db: Session,
    document: Document,
) -> None:

    db.delete(document)
    db.commit()