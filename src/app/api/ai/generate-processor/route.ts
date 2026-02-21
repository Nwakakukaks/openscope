import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateProcessorCode(code: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const hasPipelineClass = /class\s+\w+Pipeline\s*\(.*?Pipeline\s*\)/.test(code);
  const hasConfigClass = /class\s+\w+Config\s*\(.*?BasePipelineConfig\s*\)/.test(code);
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
    errors.push("Runtime parameters must NOT be stored in self - they won't update dynamically!");
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
  const hasDevicePlacement = /device\s*=/.test(code) || /\.to\s*\(.*?device/.test(code);

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

const ARCHITECTURE_SYSTEM_PROMPT = `You are an AI assistant that generates Daydream Scope pipeline processors following strict architectural rules.

## CRITICAL REQUIREMENTS

You MUST follow the official Daydream Scope architecture exactly. Any deviation will result in broken code.

### 1. Plugin Structure

Folder structure:
my-plugin/
- pyproject.toml
- src/
  - my_plugin/
    - __init__.py
    - pipeline.py

### 2. Configuration Schema

ALL configs must inherit from BasePipelineConfig:

PYTHON_BLOCK
from pydantic import Field
from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, ui_field_config

class MyConfig(BasePipelineConfig):
    pipeline_id = "my-id"
    pipeline_name = "My Pipeline"
    pipeline_description = "Description"
    supports_prompts = False
    modes = {"video": ModeDefaults(default=True)}
    usage = []  # or [UsageType.PREPROCESSOR], [UsageType.POSTPROCESSOR]
    
    # Parameters - use RUNTIME by default (no is_load_param)
    my_param: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Parameter description",
        json_schema_extra=ui_field_config(order=1, label="My Label"),
    )
PYTHON_BLOCK

### 3. Pipeline Class Structure

PYTHON_BLOCK
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
        video = kwargs.get("video")
        if video is None:
            raise ValueError("MyPipeline requires video input")

        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0

        # CRITICAL: Get runtime parameters from kwargs
        my_param = kwargs.get("my_param", 0.5)

        # ... processing ...

        return {"video": frames.clamp(0, 1)}

def register_pipelines(register):
    register(MyPipeline)
PYTHON_BLOCK

### 4. Runtime vs Load-Time Parameters (CRITICAL)

- Runtime (DEFAULT): Parameters change immediately during streaming. Access via kwargs.get() in __call__().
- Load-time: Use is_load_param=True. Requires pipeline restart.

RULE: Never store runtime values in self. Always use kwargs.get().

### 5. Tensor Format

- Input: THWC, [0, 255] range
- Processing: THWC, [0, 1] range  
- Output: THWC, [0, 1] range (clamp!)

### 6. Non-Negotiable Rules

MUST:
- Include pipeline_id, pipeline_name, pipeline_description
- Include get_config_class() classmethod
- Include __init__, prepare, __call__ methods
- Access runtime params via kwargs.get()
- Return {"video": frames.clamp(0, 1)}
- Use device=self.device for tensor operations

MUST NOT:
- Store runtime params in self
- Use is_load_param unless absolutely necessary
- Return raw [0, 255] tensors
- Skip device placement
- Omit register_pipelines hook

## Your Task

Generate a complete, export-ready pipeline Python file based on the user's description.

Output ONLY the Python code in a code block. No explanations before or after.`.replace(/PYTHON_BLOCK/g, "```python");

export async function POST(request: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { detail: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { kind, description } = body;

    if (!description) {
      return NextResponse.json(
        { detail: "Description is required" },
        { status: 400 }
      );
    }

    const pipelineType = kind === "preprocessor" ? "PREPROCESSOR" : "POSTPROCESSOR";
    
    const userMessage = `Create a ${pipelineType} pipeline for Scope with the following description:

${description}

The pipeline should:
- Be a ${pipelineType.toLowerCase()} (runs ${kind === "preprocessor" ? "before" : "after"} the main generation)
- Use runtime parameters for all user-adjustable values
- Follow the exact structure shown above
- Include appropriate effect logic for the described functionality`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
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
        temperature: 0.2,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { detail: `Groq API error: ${error}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const generatedCode = data.choices?.[0]?.message?.content;

    if (!generatedCode) {
      return NextResponse.json(
        { detail: "No code generated" },
        { status: 500 }
      );
    }

    const codeMatch = generatedCode.match(/```python\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : generatedCode;

    const validation = validateProcessorCode(code);

    return NextResponse.json({
      code,
      validation,
      disclaimer: "AI-generated code may contain errors. Please review before use.",
    });
  } catch (error) {
    console.error("Error generating processor:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
