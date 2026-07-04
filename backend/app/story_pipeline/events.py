from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PipelineStart:
    history_id: str
    story_state: dict[str, Any]


@dataclass(frozen=True)
class PipelineStep:
    node_id: str
    inputs: dict[str, Any]


@dataclass(frozen=True)
class PipelineEnd:
    output: dict[str, Any]


@dataclass(frozen=True)
class PipelineDone:
    history_id: str
    output: dict[str, Any]
    story_state: dict[str, Any]


@dataclass(frozen=True)
class PipelineError:
    detail: str


@dataclass(frozen=True)
class PipelineGraphComplete:
    output: object


PipelineEvent = (
    PipelineStart
    | PipelineStep
    | PipelineEnd
    | PipelineGraphComplete
    | PipelineDone
    | PipelineError
)
