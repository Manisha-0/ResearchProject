from pydantic import BaseModel, Field


class CopilotQuestionRequest(BaseModel):
    question: str = Field(
        min_length=2,
        max_length=1000,
    )


class GeminiCopilotOutput(BaseModel):
    answer: str = Field(
        min_length=1,
    )

    used_source_ids: list[str] = Field(
        default_factory=list,
    )


class CopilotSourceResponse(BaseModel):
    source_id: str
    type: str
    label: str


class CopilotResponse(BaseModel):
    answer: str

    sources: list[
        CopilotSourceResponse
    ]

    model_name: str