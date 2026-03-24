from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


SupportedLanguage = Literal['en', 'nl', 'ro']


def _strip_or_none(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


class ChartDatum(BaseModel):
    model_config = ConfigDict(extra='forbid')

    label: str = Field(..., min_length=1, max_length=80)
    value: float = Field(..., ge=0)

    @field_validator('label')
    @classmethod
    def validate_label(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError('Chart labels cannot be blank')
        return normalized


class ChartSeries(BaseModel):
    model_config = ConfigDict(extra='forbid')

    title: str = Field(..., min_length=1, max_length=90)
    description: str | None = Field(default=None, max_length=320)
    data: list[ChartDatum] = Field(..., min_length=1, max_length=12)

    @field_validator('title')
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError('Chart titles cannot be blank')
        return normalized

    @field_validator('description')
    @classmethod
    def validate_description(cls, value: str | None) -> str | None:
        return _strip_or_none(value)


class SelectedCard(BaseModel):
    model_config = ConfigDict(extra='forbid')

    id: int = Field(..., ge=1, le=999)
    title: str = Field(..., min_length=1, max_length=120)
    labels: list[str] = Field(default_factory=list, max_length=6)
    summary: str | None = Field(default=None, max_length=320)

    @field_validator('title')
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError('Card titles cannot be blank')
        return normalized

    @field_validator('labels')
    @classmethod
    def validate_labels(cls, value: list[str]) -> list[str]:
        unique_labels: list[str] = []
        seen: set[str] = set()
        for raw_label in value:
            normalized = raw_label.strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                unique_labels.append(normalized)
        return unique_labels

    @field_validator('summary')
    @classmethod
    def validate_summary(cls, value: str | None) -> str | None:
        return _strip_or_none(value)


class ReportContext(BaseModel):
    model_config = ConfigDict(extra='forbid')

    session_title: str | None = Field(default=None, max_length=120)
    facilitator: str | None = Field(default=None, max_length=120)
    client_alias: str | None = Field(default=None, max_length=120)
    notes: str | None = Field(default=None, max_length=2000)
    language: SupportedLanguage = 'en'

    @field_validator('session_title', 'facilitator', 'client_alias', 'notes')
    @classmethod
    def validate_optional_text(cls, value: str | None) -> str | None:
        return _strip_or_none(value)


class PdfGenerationRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')

    context: ReportContext = Field(default_factory=ReportContext)
    selected_cards: list[SelectedCard] = Field(..., min_length=1, max_length=6)
    graphs: list[ChartSeries] = Field(default_factory=list, max_length=4)

    @model_validator(mode='after')
    def validate_selected_cards(self) -> 'PdfGenerationRequest':
        seen: set[int] = set()
        for card in self.selected_cards:
            if card.id in seen:
                raise ValueError('Duplicate selected card ids are not allowed')
            seen.add(card.id)
        return self
