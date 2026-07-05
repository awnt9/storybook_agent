from __future__ import annotations

from pydantic_graph import GraphBuilder, StepContext

from app.schemas.story_elements import Scene
from app.schemas.story_pipeline import BackgroundScenePlan
from app.story_pipeline.agents.background_planner import plan_background
from app.story_pipeline.agents.reference_image import enrich_story_deps
from app.story_pipeline.deps import StoryRunDeps
from app.story_pipeline.steps import background


g = GraphBuilder(
    input_type=StoryRunDeps,
    output_type=Scene,
    deps_type=StoryRunDeps,
)


@g.step
async def enrich_reference_image(
    ctx: StepContext[None, StoryRunDeps, StoryRunDeps],
) -> StoryRunDeps:
    return await enrich_story_deps(ctx.deps)


@g.step
async def compose_background_prompt(
    ctx: StepContext[None, StoryRunDeps, StoryRunDeps],
) -> BackgroundScenePlan:
    return await plan_background(ctx.deps)


@g.step
async def create_background_image(
    ctx: StepContext[None, StoryRunDeps, BackgroundScenePlan],
) -> Scene:
    return await background.run(ctx.deps, ctx.inputs)


g.add(
    g.edge_from(g.start_node).to(enrich_reference_image),
    g.edge_from(enrich_reference_image).to(compose_background_prompt),
    g.edge_from(compose_background_prompt).to(create_background_image),
    g.edge_from(create_background_image).to(g.end_node),
)

scene_graph = g.build()
