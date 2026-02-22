import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const SCOPE_SERVER_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface PipelineExample {
  pipeline_id: string;
  pipeline_name: string;
  usage: string[];
  code?: string;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateProcessorCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasPipelineClass = /class\s+\w+Pipeline\s*\(.*?Pipeline\s*\)/.test(
    code,
  );
  const hasConfigClass =
    /class\s+\w+Config\s*\(.*?BasePipelineConfig\s*\)/.test(code);
  const hasGetConfigClass = /def\s+get_config_class\s*\(/.test(code);
  const hasCallMethod = /def\s+__call__\s*\(/.test(code);
  const hasPrepareMethod = /def\s+prepare\s*\(/.test(code);
  const hasInitMethod = /def\s+__init__\s*\(/.test(code);
  const hasRegisterPipelines = /def\s+register_pipelines\s*\(/.test(code);

  const usesKwargsGet = /kwargs\.get\s*\(/.test(code);
  const storesInSelf = /self\.\w+\s*=\s*kwargs\.get\s*\(/.test(code);

  if (!hasConfigClass) {
    errors.push("Missing Config class that inherits from BasePipelineConfig");
  }

  if (!hasPipelineClass) {
    errors.push("Missing Pipeline class that inherits from Pipeline");
  }

  if (!hasGetConfigClass) {
    errors.push("Missing get_config_class() classmethod");
  }

  if (!hasCallMethod) {
    errors.push("Missing __call__() method");
  }

  if (!hasPrepareMethod) {
    errors.push("Missing prepare() method");
  }

  if (!hasInitMethod) {
    errors.push("Missing __init__() method");
  }

  if (!hasRegisterPipelines) {
    errors.push("Missing register_pipelines() hook function");
  }

  if (!usesKwargsGet) {
    warnings.push("Code should access runtime parameters via kwargs.get()");
  }

  if (storesInSelf) {
    errors.push(
      "Runtime parameters must NOT be stored in self - they won't update dynamically!",
    );
  }

  const hasPipelineId = /pipeline_id\s*=\s*["']/.test(code);
  const hasPipelineName = /pipeline_name\s*=\s*["']/.test(code);
  const hasModes = /modes\s*=/.test(code);

  if (!hasPipelineId) {
    errors.push("Config must define pipeline_id");
  }

  if (!hasPipelineName) {
    errors.push("Config must define pipeline_name");
  }

  if (!hasModes) {
    warnings.push("Config should define modes for the pipeline");
  }

  const usesTorch = /import\s+torch/.test(code);
  const hasDevicePlacement =
    /device\s*=/.test(code) || /\.to\s*\(.*?device/.test(code);

  if (!hasDevicePlacement && usesTorch) {
    warnings.push("Code should handle device placement for tensors");
  }

  const returnsVideo = /return\s*\{\s*["']video["']/.test(code);
  if (!returnsVideo) {
    errors.push("__call__ must return {'video': ...}");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

async function getPipelineExamples(kind: string): Promise<PipelineExample[]> {
  try {
    const response = await fetch(`${SCOPE_SERVER_URL}/api/scope/pipelines`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (response.ok) {
      const data = await response.json();
      const pipelines = data.pipelines || {};
      const examples: PipelineExample[] = [];

      for (const [id, info] of Object.entries(pipelines)) {
        const pipeline = info as { pipeline_name?: string; usage?: string[] };
        const usage = pipeline.usage || [];

        const isPreprocessor = usage.includes("preprocessor");
        const isPostprocessor = usage.includes("postprocessor");

        if (kind === "preprocessor" && isPreprocessor) {
          examples.push({
            pipeline_id: id,
            pipeline_name: pipeline.pipeline_name || id,
            usage: usage,
          });
        } else if (kind === "postprocessor" && isPostprocessor) {
          examples.push({
            pipeline_id: id,
            pipeline_name: pipeline.pipeline_name || id,
            usage: usage,
          });
        }
      }

      return examples.slice(0, 10);
    }
  } catch {
    // Silently fail
  }
  return [];
}

const ARCHITECTURE_SYSTEM_PROMPT = `You are an expert AI assistant specialized in generating Daydream Scope pre/post processor pipeline code.

## Context

You are working within a VISUAL NODE-BASED BUILDER called OpenScope. Users drag nodes onto a canvas and connect them to build video processing pipelines. The node you are generating code for is:

- A SINGLE preprocessor OR postprocessor node
- This node will be connected to other nodes in the visual graph
- The code you generate is for THIS SPECIFIC NODE ONLY (not a full plugin)
- This code will be used as the implementation for the custom processor node

## Node Type

You will be generating code for either:
- **PREPROCESSOR**: Runs BEFORE the main AI generation, processes input video
- **POSTPROCESSOR**: Runs AFTER the main AI generation, processes output video

## Daydream Scope Architecture - CRITICAL

### Configuration Schema

ALL configs MUST inherit from BasePipelineConfig. This config determines how the Properties Panel renders in OpenScope:

\`\`\`python
from pydantic import Field
from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, ui_field_config

class MyConfig(BasePipelineConfig):
    pipeline_id = "my-unique-id"
    pipeline_name = "My Processor Name"
    pipeline_description = "Description of what this processor does"
    supports_prompts = False
    modes = {"video": ModeDefaults(default=True)}
    usage = [UsageType.PREPROCESSOR]  # or [UsageType.POSTPROCESSOR]
    
    # RUNTIME PARAMETERS - these appear in Properties Panel and update in real-time
    # Format: param_name: type = Field(default=value, ge=min, le=max, description="...", json_schema_extra=ui_field_config(order=N, label="Display Label"))
    
    intensity: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="How strong the effect is",
        json_schema_extra=ui_field_config(order=1, label="Intensity"),
    )
    
    radius: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Size of the effect area",
        json_schema_extra=ui_field_config(order=2, label="Radius"),
    )
\`\`\`

### Pipeline Class

\`\`\`python
from typing import TYPE_CHECKING
import torch
from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig

class MyPipeline(Pipeline):
    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        return MyConfig

    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device if device is not None else torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

    def prepare(self, **kwargs) -> Requirements:
        return Requirements(input_size=1)

    def __call__(self, **kwargs) -> dict:
        # Get input video from kwargs
        video = kwargs.get("video")
        if video is None:
            raise ValueError("MyPipeline requires video input")

        # Convert to tensor: THWC format, [0, 255] range
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0  # Now [0, 1]

        # Get RUNTIME parameters from kwargs (NOT from self!)
        # These update in real-time during streaming
        intensity = kwargs.get("intensity", 0.5)
        radius = kwargs.get("radius", 5)

        # === YOUR PROCESSING LOGIC HERE ===
        # Process frames according to user's description
        
        # Return processed frames - MUST be THWC, [0, 1] range
        return {"video": frames.clamp(0, 1)}

def register_pipelines(register):
    register(MyPipeline)
\`\`\`

### Key Rules

1. **Runtime Parameters**: Access via kwargs.get() in __call__(). These appear in Properties Panel and update in real-time.

2. **Tensor Format**:
   - Input: THWC (Time, Height, Width, Channels), [0, 255] range
   - Processing: THWC, [0, 1] range
   - Output: THWC, [0, 1] range (MUST clamp!)

3. **Device Placement**: Always move tensors to self.device for GPU acceleration

4. **Return Format**: MUST return {"video": tensor}

## How Configs Become Properties Panel Fields

The Field definition in your Config class directly controls what appears in OpenScope's Properties Panel:

| Field Definition | Properties Panel |
|-----------------|------------------|
| float with ge=0.0, le=1.0 | Slider (0 to 1) |
| int with ge=1, le=100 | Slider (1 to 100) |
| bool = Field(default=True) | Toggle switch |
| str = Field(default="...") | Text input |
| label="Intensity" | Display name "Intensity" |
| order=1 | Position in panel (1 = first) |

## Output Requirements

Generate COMPLETE code for this SINGLE processor node:
1. Include all imports
2. Include Config class with runtime parameters (label, order, constraints)
3. Include Pipeline class with processing logic
4. Include register_pipelines function
5. Use meaningful parameter names and appropriate ranges
6. Add comments explaining the processing

Output ONLY the Python code in a python code block. No explanations.`;

export async function POST(request: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { detail: "GROQ_API_KEY not configured" },
        { status: 500 },
      );
    }

    const body = await request.json();
    const { kind, description } = body;

    if (!description) {
      return NextResponse.json(
        { detail: "Description is required" },
        { status: 400 },
      );
    }

    const pipelineExamples = await getPipelineExamples(kind);
    const examplesContext =
      pipelineExamples.length > 0
        ? `

EXISTING ${kind.toUpperCase()}ORS ON YOUR SCOPE SERVER:
${pipelineExamples.map((p) => `- ${p.pipeline_id}: ${p.pipeline_name}`).join("\n")}

Use these as reference for the coding pattern and config style. Create something NEW and DIFFERENT.`
        : "";

    const pipelineType =
      kind === "preprocessor" ? "PREPROCESSOR" : "POSTPROCESSOR";

    const userMessage = `Generate code for a SINGLE ${pipelineType} node.

USER'S DESCRIPTION: ${description}

${examplesContext}

This is for ONE node in a visual node graph, not a full plugin.

Requirements:
1. Use ONLY runtime parameters (kwargs.get() in __call__)
2. Follow the Config class pattern for Properties Panel rendering
3. Include appropriate runtime parameters for the effect (2-5 params)
4. Each param needs: label (for display), order (for panel position), ge/le constraints, default
5. Include actual processing logic in __call__
6. Ensure output is clamped to [0, 1] range
7. Handle device placement for GPU

Generate the complete pipeline code now:`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content: ARCHITECTURE_SYSTEM_PROMPT,
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.3,
        reasoning_effort: "medium",
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { detail: `Groq API error: ${error}` },
        { status: response.status },
      );
    }

    const data = await response.json();
    const generatedCode = data.choices?.[0]?.message?.content;

    if (!generatedCode) {
      return NextResponse.json(
        { detail: "No code generated" },
        { status: 500 },
      );
    }

    const codeMatch = generatedCode.match(/```python\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : generatedCode;

    const validation = validateProcessorCode(code);

    return NextResponse.json({
      code,
      validation,
      disclaimer:
        "AI-generated code may contain errors. Please review before use.",
    });
  } catch (error) {
    console.error("Error generating processor:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 },
    );
  }
}
