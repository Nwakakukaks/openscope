# Processor Architecture Guide

This document defines the authoritative architectural rules for generating Daydream Scope processors using AI.

## 1. Plugin Structure

### Folder Structure

```
my-plugin/
├── pyproject.toml
└── src/
    └── my_plugin/
        ├── __init__.py
        ├── schema.py       # Config schema (optional, can be inline)
        └── pipeline.py     # Pipeline implementation
```

### pyproject.toml Requirements

```toml
[project]
name = "my-scope-plugin"
version = "0.1.0"
requires-python = ">=3.12"

[project.entry-points."scope"]
my_scope_plugin = "my_scope_plugin.plugin"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/my_plugin"]
```

### Registration Hook

In `src/my_plugin/__init__.py`:

```python
from scope.core.plugins.hookspecs import hookimpl

@hookimpl
def register_pipelines(register):
    from .pipeline import MyPipeline
    register(MyPipeline)
```

---

## 2. Configuration Schema

### Base Configuration Class

All pipeline configs must inherit from `BasePipelineConfig`:

```python
from pydantic import Field
from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, UsageType, ui_field_config
```

### Required Class Variables

```python
class MyPipelineConfig(BasePipelineConfig):
    # Required metadata
    pipeline_id: str = "my-pipeline-id"      # Unique identifier
    pipeline_name: str = "My Pipeline"       # Display name
    pipeline_description: str = "Description" # Human-readable description
    
    supports_prompts: bool = True/False       # Does this pipeline accept text prompts?
    
    modes: dict = {"video": ModeDefaults(default=True)}  # Supported modes
    # Or: modes = {"text": ModeDefaults(default=True)}
    # Or: modes = {"video": ModeDefaults(default=True), "text": ModeDefaults(default=False)}
    
    usage: list = []  # [UsageType.PREPROCESSOR], [UsageType.POSTPROCESSOR], or []
```

### Parameter Fields

Parameters are defined as Pydantic fields with `Field()`:

```python
# Basic parameter
my_param: float = Field(
    default=0.5,
    ge=0.0,
    le=1.0,
    description="Description shown in UI",
)

# Parameter with UI configuration
my_param: float = Field(
    default=0.5,
    ge=0.0,
    le=1.0,
    description="Description",
    json_schema_extra=ui_field_config(
        order=1,           # Display order (lower = first)
        label="My Label",  # Short UI label
        component="slider", # UI component type
    ),
)
```

---

## 3. Runtime vs Load-Time Parameters

### Runtime Parameters (Default)

Runtime parameters can be changed while the pipeline is active. They take effect immediately:

```python
# RUNTIME PARAMETER - Default behavior
effect_intensity: float = Field(
    default=0.5,
    ge=0.0,
    le=1.0,
    description="Effect intensity",
    json_schema_extra=ui_field_config(order=1, label="Intensity"),
)
# Access via: kwargs.get("effect_intensity", 0.5)
```

### Load-Time Parameters

Parameters that require pipeline restart to take effect. Use `is_load_param=True`:

```python
# LOAD-TIME PARAMETER - Requires restart
resolution: int = Field(
    default=512,
    ge=256,
    le=2048,
    description="Output resolution",
    json_schema_extra=ui_field_config(
        order=1,
        component="resolution",
        is_load_param=True,  # <-- Mark as load-time
    ),
)
```

### Rules

1. **Default to runtime**: Most parameters should be runtime-configurable
2. **Use load-time only when necessary**: Model selection, resolution, quantization, etc.
3. **Access via kwargs**: Runtime parameters must be accessed in `__call__()` via `kwargs.get()`, NOT stored in `self`
4. **is_load_param=True**: Makes the parameter read-only during streaming

---

## 4. Pipeline Class Implementation

### Required Structure

```python
from typing import TYPE_CHECKING
import torch
from scope.core.pipelines.interface import Pipeline, Requirements

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


class MyPipeline(Pipeline):
    """Description of what this pipeline does."""
    
    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        """Return the config class."""
        return MyPipelineConfig

    def __init__(self, device: torch.device | None = None, **kwargs):
        """Initialize pipeline with device."""
        self.device = device if device is not None else torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

    def prepare(self, **kwargs) -> Requirements:
        """Declare input requirements."""
        return Requirements(input_size=1)

    def __call__(self, **kwargs) -> dict:
        """Process input and return output."""
        # Get input
        video = kwargs.get("video")
        if video is None:
            raise ValueError("MyPipeline requires video input")
        
        # Stack frames: (T, H, W, C) format, [0, 255] range
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        
        # Normalize to [0, 1] range
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0
        
        # Get runtime parameters from kwargs
        my_param = kwargs.get("my_param", 0.5)
        
        # ... processing logic ...
        
        # Return output - ensure [0, 1] range
        return {"video": frames.clamp(0, 1)}
```

### Tensor Format Rules

- **Input**: THWC format, [0, 255] range (integers)
- **Processing**: THWC format, [0, 1] range (floats)
- **Output**: THWC format, [0, 1] range (floats)
- **Device**: Always use `self.device` for tensor operations

---

## 5. Execution Flow

### Initialization Flow

```
1. User loads plugin
2. Scope discovers via entry points
3. register_pipelines() hook is called
4. Pipeline class is registered with pipeline ID
```

### Runtime Flow

```
1. User starts pipeline
2. Pipeline.__init__() is called (device setup)
3. Pipeline.prepare() is called (declare input requirements)
4. For each frame batch:
   a. Pipeline.__call__(**kwargs) is invoked
   b. kwargs contains: video, prompts, and ALL runtime parameters
   c. Parameters accessed via kwargs.get("param_name", default)
```

### Parameter Flow

```
UI Change → Structured Config Update → kwargs passed to __call__() → Immediate effect
```

---

## 6. Complete Example

### Full Pipeline File

```python
"""my-vfx-plugin - Example VFX pipeline"""

from typing import TYPE_CHECKING
import torch
from scope.core.pipelines.interface import Pipeline, Requirements
from scope.core.pipelines.base_schema import (
    BasePipelineConfig,
    ModeDefaults,
    ui_field_config,
)

if TYPE_CHECKING:
    from scope.core.pipelines.base_schema import BasePipelineConfig


class VFXConfig(BasePipelineConfig):
    """Configuration for the VFX pipeline."""

    pipeline_id = "my-vfx"
    pipeline_name = "My VFX"
    pipeline_description = "My custom visual effects"

    supports_prompts = False
    modes = {"video": ModeDefaults(default=True)}
    usage = []  # Main pipeline (not pre/post)

    # Runtime parameter - can change during streaming
    intensity: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Effect intensity",
        json_schema_extra=ui_field_config(order=1, label="Intensity"),
    )

    # Runtime parameter - boolean toggle
    enable_effect: bool = Field(
        default=True,
        description="Enable the effect",
        json_schema_extra=ui_field_config(order=2, label="Enable"),
    )


class VFXPipeline(Pipeline):
    """My custom VFX pipeline."""

    @classmethod
    def get_config_class(cls) -> type["BasePipelineConfig"]:
        return VFXConfig

    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device if device is not None else torch.device(
            "cuda" if torch.cuda.is_available() else "cpu"
        )

    def prepare(self, **kwargs) -> Requirements:
        return Requirements(input_size=1)

    def __call__(self, **kwargs) -> dict:
        video = kwargs.get("video")
        if video is None:
            raise ValueError("VFXPipeline requires video input")

        # Stack and normalize
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        frames = frames.to(device=self.device, dtype=torch.float32) / 255.0

        # Get runtime parameters
        intensity = kwargs.get("intensity", 0.5)
        enable_effect = kwargs.get("enable_effect", True)

        if enable_effect:
            # Apply effect with intensity
            frames = frames * intensity

        return {"video": frames.clamp(0, 1)}


def register_pipelines(register):
    """Hook to register this pipeline."""
    register(VFXPipeline)
```

---

## 7. Non-Negotiable Rules

### MUST Include

- [ ] `pipeline_id` - unique string identifier
- [ ] `pipeline_name` - display name
- [ ] `pipeline_description` - description
- [ ] `supports_prompts` - bool
- [ ] `modes` - dict of ModeDefaults
- [ ] `get_config_class()` classmethod
- [ ] `__init__(self, device, **kwargs)` 
- [ ] `prepare(self, **kwargs) -> Requirements`
- [ ] `__call__(self, **kwargs) -> dict`
- [ ] Access runtime params via `kwargs.get()`

### MUST NOT

- [ ] Store runtime parameters in `self` (they won't update!)
- [ ] Use `is_load_param=False` explicitly (default is runtime)
- [ ] Return raw [0, 255] tensors - always clamp to [0, 1]
- [ ] Use hardcoded values instead of kwargs
- [ ] Skip device placement

### Parameter Naming Conventions

- Use lowercase with underscores: `my_parameter`
- Prefix to avoid conflicts: `vfx_`, `effect_`, etc.
- Be descriptive but concise

---

## 8. Export Compliance

When exporting a plugin, the generated code must:

1. Match exactly what is shown in the code block
2. Be immediately executable without modification
3. Support runtime parameter changes
4. Follow the exact folder structure above
5. Include all required registration hooks
