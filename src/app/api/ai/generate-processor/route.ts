import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

interface SchemaField {
  type: "slider" | "select" | "text" | "toggle";
  label?: string;
  default: number | string | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

function extractSchemaFromCode(code: string): Record<string, SchemaField> {
  const schema: Record<string, SchemaField> = {};
  
  const fieldPattern = /(\w+):\s*(float|int|str|bool)\s*=\s*Field\s*\([^)]*\)/g;
  let match;
  
  while ((match = fieldPattern.exec(code)) !== null) {
    const paramName = match[1];
    const paramType = match[2];
    
    const defaultMatch = code.match(new RegExp(`${paramName}:\\s*${paramType}\\s*=\\s*Field\\s*\\([^)]*default\\s*=\\s*([0-9.]+|True|False|"[^"]*"|'[^']*')`));
    const minMatch = code.match(new RegExp(`${paramName}:\\s*${paramType}\\s*=\\s*Field\\s*\\([^)]*ge\\s*=\\s*([0-9.]+)`));
    const maxMatch = code.match(new RegExp(`${paramName}:\\s*${paramType}\\s*=\\s*Field\\s*\\([^)]*le\\s*=\\s*([0-9.]+)`));
    const stepMatch = code.match(new RegExp(`${paramName}:\\s*${paramType}\\s*=\\s*Field\\s*\\([^)]*step\\s*=\\s*([0-9.]+)`));
    const descMatch = code.match(new RegExp(`${paramName}:\\s*${paramType}\\s*=\\s*Field\\s*\\([^)]*description\\s*=\\s*"([^"]*)`));
    const labelMatch = code.match(new RegExp(`${paramName}:\\s*${paramType}\\s*=\\s*Field\\s*\\([^)]*label\\s*=\\s*"([^"]*)`));
    
    let defaultValue: number | string | boolean = 0.5;
    if (defaultMatch) {
      const val = defaultMatch[1];
      if (val === "True") defaultValue = true;
      else if (val === "False") defaultValue = false;
      else if (val.startsWith('"') || val.startsWith("'")) defaultValue = val.slice(1, -1);
      else defaultValue = parseFloat(val) || 0.5;
    }
    
    if (paramType === "float" || paramType === "int") {
      schema[paramName] = {
        type: "slider",
        label: labelMatch ? labelMatch[1] : paramName,
        default: defaultValue,
        min: minMatch ? parseFloat(minMatch[1]) : 0,
        max: maxMatch ? parseFloat(maxMatch[1]) : 1,
        step: stepMatch ? parseFloat(stepMatch[1]) : 0.01,
        description: descMatch ? descMatch[1] : "",
      };
    } else if (paramType === "str") {
      schema[paramName] = {
        type: "text",
        label: labelMatch ? labelMatch[1] : paramName,
        default: defaultValue,
        description: descMatch ? descMatch[1] : "",
      };
    } else if (paramType === "bool") {
      schema[paramName] = {
        type: "toggle",
        label: labelMatch ? labelMatch[1] : paramName,
        default: defaultValue as boolean,
        description: descMatch ? descMatch[1] : "",
      };
    }
  }
  
  return schema;
}

function extractSimpleEffectParams(code: string): Record<string, SchemaField> {
  const schema: Record<string, SchemaField> = {};
  
  const funcMatch = code.match(/def\s+effect_\w+\s*\([^)]*\):/);
  if (!funcMatch) return schema;
  
  const paramsStr = funcMatch[0].match(/\(([^)]*)\)/)?.[1] || "";
  const params = paramsStr.split(",").map(p => p.trim()).filter(p => p && !p.startsWith("**"));
  
  for (const param of params) {
    if (param.includes("=")) {
      const [nameAndType, defaultVal] = param.split("=").map(s => s.trim());
      const name = nameAndType.split(":")[0].trim();
      const type = nameAndType.split(":")[1]?.trim() || "float";
      
      let defaultValue: number | string | boolean = 0.5;
      const val = defaultVal?.trim() || "0.5";
      if (val === "True") defaultValue = true;
      else if (val === "False") defaultValue = false;
      else if (val.startsWith('"') || val.startsWith("'")) defaultValue = val.slice(1, -1);
      else defaultValue = parseFloat(val) || 0.5;
      
      if (type === "float" || type === "int") {
        schema[name] = {
          type: "slider",
          label: name,
          default: defaultValue,
          min: 0,
          max: type === "int" ? 10 : 1,
          step: type === "int" ? 1 : 0.01,
        };
      } else if (type === "str") {
        schema[name] = {
          type: "text",
          label: name,
          default: defaultValue,
        };
      } else if (type === "bool") {
        schema[name] = {
          type: "toggle",
          label: name,
          default: defaultValue as boolean,
        };
      }
    }
  }
  
  return schema;
}

const STYLE_SYSTEM_PROMPT = `Generate a Daydream Scope STYLE EFFECT function.

This generates a SIMPLE effect function (for use within a pipeline's effect chain), NOT a full pipeline.
Use this for style nodes that describe visual effects.

RULES:
- Input: frames tensor (T, H, W, C) in [0, 1]
- Output: Same shape, [0, 1], clamp output
- Use torch only
- Get params from kwargs.get("param_name", default)
- Function name: effect_<name>

${"```"}python
"""Effect name - brief description."""
import torch
import math

def effect_myname(frames: torch.Tensor, intensity: float = 0.5, **kwargs) -> torch.Tensor:
    """Apply the effect to video frames.
    
    Args:
        frames: (T, H, W, C) tensor in [0, 1] range
        intensity: effect strength 0-1
        **kwargs: additional parameters
    
    Returns:
        (T, H, W, C) tensor in [0, 1] range
    """
    if intensity <= 0:
        return frames
    
    # Your effect logic here using torch operations
    result = frames  # modify this
    
    return result.clamp(0, 1)
${"```"}

Output ONLY the python code block.`;

const PIPELINE_SYSTEM_PROMPT = `Generate a Daydream Scope PRE/POST PROCESSOR pipeline.

This generates a FULL plugin pipeline that can be used as a preprocessor or postprocessor.
The code includes: Config class, Pipeline class, and register_pipelines function.

REQUIRED STRUCTURE (in order):
1. Imports: torch, Field from pydantic, BasePipelineConfig/ModeDefaults/UsageType/ui_field_config from scope.core.pipelines.base_schema, Pipeline/Requirements from scope.core.pipelines.interface
2. Config class inheriting BasePipelineConfig with pipeline_id, pipeline_name, pipeline_description, usage, modes, supports_prompts, and parameter fields
3. Pipeline class inheriting Pipeline with get_config_class(), __init__(), prepare(), __call__()
4. register_pipelines(register) function

USAGE TYPE:
- UsageType.PREPROCESSOR = appears in Preprocessor dropdown
- UsageType.POSTPROCESSOR = appears in Postprocessor dropdown

${"```"}python
"""Effect name - brief description."""
from typing import TYPE_CHECKING
import torch
from pydantic import Field
from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, UsageType, ui_field_config
from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig

class MyEffectConfig(BasePipelineConfig):
    pipeline_id = "my-effect"
    pipeline_name = "My Effect"
    pipeline_description = "Description of what this effect does"
    usage = [UsageType.POSTPROCESSOR]  # or PREPROCESSOR
    modes = {"video": ModeDefaults(default=True)}
    supports_prompts = False
    
    # UI Parameters - add your own
    intensity: float = Field(default=0.5, ge=0.0, le=1.0, description="Effect strength", json_schema_extra=ui_field_config(order=1))

class MyEffectPipeline(Pipeline):
    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        return MyEffectConfig
    
    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")
    
    def prepare(self, **kwargs) -> Requirements:
        return Requirements(input_size=1)
    
    def __call__(self, **kwargs) -> dict:
        video = kwargs.get("video")
        if video is None:
            raise ValueError("Video required")
        frames = torch.stack([frame.squeeze(0) for frame in video], dim=0).to(self.device).float() / 255.0
        
        # Your effect logic here using frames tensor (T, H, W, C) in [0, 1]
        intensity = kwargs.get("intensity", 0.5)
        result = frames * intensity
        
        return {"video": result.clamp(0, 1).cpu()}

def register_pipelines(register):
    register(MyEffectPipeline)
${"```"}

Output ONLY the complete python code block with all imports, both classes, and register function.`;

export async function POST(request: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({ detail: "GROQ_API_KEY not configured" }, { status: 500 });
    }

    const body = await request.json();
    const { description, generator_type, processor_kind } = body;

    if (!description) {
      return NextResponse.json({ detail: "Description is required" }, { status: 400 });
    }

    const isPipeline = generator_type === "pipeline";
    const systemPrompt = isPipeline ? PIPELINE_SYSTEM_PROMPT : STYLE_SYSTEM_PROMPT;
    
    const userMessage = isPipeline
      ? `Create a ${processor_kind || "postprocessor"}: ${description}`
      : `Create effect: ${description}`;

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.5,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json({ detail: `Groq API error: ${error}` }, { status: response.status });
    }

    const data = await response.json();
    const generatedCode = data.choices?.[0]?.message?.content;

    if (!generatedCode) {
      return NextResponse.json({ detail: "No code generated" }, { status: 500 });
    }

    const codeMatch = generatedCode.match(/```python\n([\s\S]*?)```/);
    const code = codeMatch ? codeMatch[1].trim() : generatedCode.trim();

    const schema = isPipeline 
      ? extractSchemaFromCode(code)
      : extractSimpleEffectParams(code);

    return NextResponse.json({
      code,
      schema,
      generator_type: isPipeline ? "pipeline" : "style",
      disclaimer: "AI-generated code. Review before use.",
    });
  } catch (error) {
    console.error("Error generating:", error);
    return NextResponse.json({ detail: "Internal server error" }, { status: 500 });
  }
}
