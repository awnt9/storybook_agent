from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.story_elements import Image


class GenerateTextArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    brief: str = Field(
        description="Resumen breve de lo que debe ocurrir en el siguiente fragmento del cuento."
    )
    tone: str = Field(
        default="infantil, cálido y claro",
        description="Tono narrativo que debe tener el texto.",
    )


class AnalyzeImageArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    image: Image | None = Field(
        default=None,
        description="Imagen a analizar, con al menos uno de los siguientes campos: image_id, path o url.",
    )
    question: str = Field(
        default="Describe la imagen para continuar el cuento.",
        description="Pregunta o instrucción concreta para analizar la imagen.",
    )


class GenerateImageArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    prompt: str = Field(
        description="Descripción visual de la imagen que debe generarse."
    )
    scene_text: str | None = Field(
        default=None,
        description="Texto de la escena que sirve como contexto para generar la imagen.",
    )


class EndLoopArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reason: str = Field(
        default="Ya hay suficiente material para construir el siguiente turno del cuento.",
        description="Motivo por el que el agente decide finalizar el bucle.",
    )
