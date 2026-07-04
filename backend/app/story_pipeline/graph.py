from __future__ import annotations

from pydantic_graph import GraphBuilder, StepContext

from app.schemas.story_elements import Scene
from app.story_pipeline.deps import StoryRunDeps
from app.story_pipeline.steps import background


g = GraphBuilder(input_type=StoryRunDeps, output_type=Scene)


@g.step
async def create_background_image(ctx: StepContext[None, None, StoryRunDeps]) -> Scene:
    image = await background.run(ctx)
    return Scene(background_image=image)


g.add(
    g.edge_from(g.start_node).to(create_background_image),
    g.edge_from(create_background_image).to(g.end_node),
)

scene_graph = g.build()
