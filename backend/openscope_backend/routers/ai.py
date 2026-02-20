"""AI Assistant router using Groq."""

import json
from typing import Optional, List
from pydantic import BaseModel

from fastapi import APIRouter, HTTPException

from ..config import get_settings

router = APIRouter()


class ChatMessage(BaseModel):
    """Chat message."""

    role: str
    content: str


class ChatRequest(BaseModel):
    """Chat request."""

    messages: List[ChatMessage]
    node_graph: Optional[dict] = None


class GenerateProcessorRequest(BaseModel):
    """Request for generating a processor."""

    kind: str  # "preprocessor" or "postprocessor"
    description: str
    existing_code: Optional[str] = None


class NodeSuggestion(BaseModel):
    """Suggested node."""

    type: str
    position: dict
    config: Optional[dict] = None
    reason: str


class SuggestNodesRequest(BaseModel):
    """Request for node suggestions."""

    goal: str
    current_nodes: list


# System prompt for the AI assistant
SYSTEM_PROMPT = """You are an expert plugin builder for Daydream Scope, a real-time video AI platform. 
Your task is to help users build Scope plugins visually using nodes.

Available node types:
- videoInput: Accept video frames as input
- textPrompt: Text prompts with weights
- imageInput: Reference images
- parameters: Configuration values
- brightness: Adjust brightness (-100 to 100)
- contrast: Adjust contrast (0 to 3)
- blur: Gaussian blur (radius 0-50)
- mirror: Mirror effect (horizontal/vertical/both)
- kaleido: Kaleidoscope (slices 2-24, rotation 0-360, zoom 0.1-3)
- blend: Blend two videos (mode: add/multiply/screen/overlay, opacity 0-1)
- mask: Object segmentation (target class, confidence)
- pipelineOutput: Main pipeline output
- preprocessorOutput: Preprocessor output
- postprocessorOutput: Postprocessor output

When suggesting nodes:
1. Understand what the user wants to achieve
2. Suggest the minimum nodes needed
3. Explain why each node is needed
4. Consider if they want a preprocessor, postprocessor, or main pipeline

For effects like kaleido, mirror, blur - these are typically postprocessors.
For segmentation like mask - this is typically a preprocessor.
For generation/transform - this is typically a main pipeline."""

# System prompt for generating processors
PROCESSOR_GENERATOR_PROMPT = """You are an expert Python developer for Daydream Scope video processing pipelines.

Generate Python code for a video {kind} based on the user's description.

The code should:
1. Accept a 'frames' parameter - a torch tensor of shape (T, H, W, C) with values in [0, 1] range
2. Accept any relevant configuration parameters
3. Process the frames and return the result as a torch tensor

IMPORTANT: 
- Only output the Python code, no explanations
- Use PyTorch for tensor operations
- Keep the code simple and functional
- Include error handling
- The function should be named 'process_frames'

Example structure:
```python
def process_frames(frames, param1=1.0, param2=0.5):
    # Your processing code here
    # frames shape: (T, H, W, C)
    result = frames  # modify this
    return result
```

Now generate the processor code for: {description}

Only output the Python code block, nothing else."""


async def call_groq(messages: list, settings) -> str:
    """Call Groq API."""
    try:
        from groq import AsyncGroq
    except ImportError:
        raise HTTPException(status_code=503, detail="Groq client not installed")

    if not settings.groq_api_key:
        raise HTTPException(status_code=401, detail="Groq API key not configured")

    client = AsyncGroq(api_key=settings.groq_api_key)

    try:
        response = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.7,
            max_tokens=1024,
        )
        return response.choices[0].message.content
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def chat(request: ChatRequest, settings=get_settings):
    """Chat with the AI assistant."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    for msg in request.messages:
        messages.append({"role": msg.role, "content": msg.content})

    if request.node_graph:
        messages.append(
            {
                "role": "system",
                "content": f"Current node graph: {json.dumps(request.node_graph)}",
            }
        )

    response = await call_groq(messages, settings)
    return {"response": response}


@router.post("/suggest-nodes")
async def suggest_nodes(request: SuggestNodesRequest, settings=get_settings):
    """Suggest nodes based on user's goal."""
    goal = request.goal
    current = request.current_nodes

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""I want to create a plugin that: {goal}

Current nodes in my graph: {json.dumps(current)}

Please suggest what nodes I should add. Respond with a JSON array of node suggestions, each with:
- type: the node type
- position: {{x, y}} position on canvas
- config: any default configuration
- reason: why this node is needed

Only respond with the JSON array, nothing else.""",
        },
    ]

    response = await call_groq(messages, settings)

    # Try to parse JSON from response
    try:
        # Find JSON array in response
        start = response.find("[")
        end = response.rfind("]") + 1
        if start >= 0 and end > start:
            suggestions = json.loads(response[start:end])
            return {"suggestions": suggestions}
    except json.JSONDecodeError:
        pass

    return {"suggestions": [], "raw_response": response}


@router.post("/explain-node")
async def explain_node(node_type: str, settings=get_settings):
    """Explain what a node does."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Explain what the '{node_type}' node does in Scope and when to use it. Keep it brief.",
        },
    ]

    response = await call_groq(messages, settings)
    return {"explanation": response}


@router.post("/fix-errors")
async def fix_errors(errors: List[str], node_graph: dict, settings=get_settings):
    """Fix errors in the node graph."""
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"""The following errors were detected in my node graph:
{json.dumps(errors)}

Current node graph:
{json.dumps(node_graph)}

Please suggest how to fix these errors. Explain what nodes need to be added, removed, or modified. Respond with a JSON object containing:
- explanation: what needs to be fixed
- suggestions: array of node changes (type, action: add/remove/modify, position, config)
- fixed_graph: the corrected node graph as JSON array

Only respond with the JSON object.""",
        },
    ]

    response = await call_groq(messages, settings)

    try:
        start = response.find("{")
        end = response.rfind("}") + 1
        if start >= 0 and end > start:
            result = json.loads(response[start:end])
            return result
    except json.JSONDecodeError:
        pass

    return {"explanation": response, "suggestions": []}


@router.get("/status")
async def ai_status(settings=get_settings):
    """Check AI assistant status."""
    return {
        "available": bool(settings.groq_api_key),
        "provider": "groq",
        "model": "llama-3.1-8b-instant",
    }


@router.post("/generate-processor")
async def generate_processor(request: GenerateProcessorRequest, settings=get_settings):
    """Generate a custom processor using AI."""
    description = request.description
    kind = request.kind

    if not description:
        raise HTTPException(status_code=400, detail="Description is required")

    if kind not in ["preprocessor", "postprocessor"]:
        raise HTTPException(
            status_code=400, detail="Kind must be 'preprocessor' or 'postprocessor'"
        )

    # Build the prompt
    prompt = PROCESSOR_GENERATOR_PROMPT.format(kind=kind, description=description)

    messages = [
        {"role": "system", "content": prompt},
    ]

    # If there's existing code, ask for modification
    if request.existing_code:
        messages.append(
            {
                "role": "user",
                "content": f"Here's the current code:\n```python\n{request.existing_code}\n```\n\nPlease modify it according to: {description}\n\nOnly output the modified Python code block.",
            }
        )

    response = await call_groq(messages, settings)

    # Extract code from response
    code = response
    if "```python" in response:
        start = response.find("```python") + len("```python")
        end = response.find("```", start)
        if end > start:
            code = response[start:end].strip()
    elif "```" in response:
        start = response.find("```") + 3
        end = response.find("```", start)
        if end > start:
            code = response[start:end].strip()

    return {
        "code": code,
        "disclaimer": "This is AI-generated code (Beta). Please review and test before using in production.",
    }
