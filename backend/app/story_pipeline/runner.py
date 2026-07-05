from __future__ import annotations

from collections.abc import AsyncIterator

from pydantic_graph import EndMarker
from pydantic_graph.graph_builder import GraphTask

from app.story_pipeline.deps import StoryRunDeps
from app.story_pipeline.events import PipelineEnd, PipelineGraphComplete, PipelineStep
from app.story_pipeline.graph import scene_graph
from app.story_pipeline.serialization import serialize_pipeline_value


async def run_scene_graph(
    deps: StoryRunDeps,
) -> AsyncIterator[PipelineStep | PipelineEnd | PipelineGraphComplete]:
    async with scene_graph.iter(inputs=deps, deps=deps) as run:
        async for event in run:
            if isinstance(event, list):
                for task in event:
                    if isinstance(task, GraphTask):
                        yield PipelineStep(
                            node_id=task.node_id,
                            inputs=serialize_pipeline_value(task.inputs),
                        )
            elif isinstance(event, EndMarker):
                yield PipelineEnd(
                    output=serialize_pipeline_value(event._value),
                )

        if run.output is not None:
            yield PipelineGraphComplete(output=run.output)
