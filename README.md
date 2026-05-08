# Storybook Agent

Interactive AI storytelling application where a child uploads a photo of a hand-drawn character and an AI agent turns it into a dynamic, illustrated story.

---

## 1. Project Goal

The goal is to build an agent-driven experience where the user uploads a photograph and the agent is responsible for the rest of the story experience.

This is achieved by giving an LLM a set of tools and prompt skills so it can:

- analyze the uploaded image,
- create and continue the story,
- stream story text progressively,
- generate illustrations,

The agent is wrapped inside an application that provides the structure and runtime utilities, such as:

- the initial upload UI,
- API endpoints,
- story state management,
- hard limits for turns and generated images.

---