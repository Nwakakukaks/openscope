# Pipeline Documentation

This document describes the built-in Scope pipelines and how to work with them in OpenScope.

## Built-in Pipelines

The following pipelines are available in Scope by default:

### passthrough

**Description**: A simple pass-through pipeline that returns input frames unchanged. Useful for testing or as a placeholder when no processing is needed.

**Input**: Video frames (THWC format, [0, 255] range)

**Output**: Same as input

**When to use**: 
- Testing the pipeline chain
- When you want to use pre/post processors without a main generation pipeline

**Parameters**: None

---

### controller-viz

**Description**: Visualizes control signals and intermediate states from the generation process. Useful for debugging and understanding how the model is generating video.

**Input**: Video frames + control signals

**Output**: Visualization overlay showing controller states

**When to use**: Debugging generation pipelines, understanding model behavior

---

### rife

**Description**: RIFE (Real-Time Intermediate Flow Estimation) for frame interpolation. Creates smooth intermediate frames between existing frames.

**Input**: Two video frames (start and end)

**Output**: Interpolated frames (typically 2x or 4x the frame rate)

**When to use**: 
- Slow-motion effects
- Smoothing jerky video
- Increasing frame rate

**Parameters**:
- `scale`: Upscaling factor (1-4)
- `fps`: Target output FPS

---

### scribble

**Description**: Processes scribble/sketch-style inputs for conditional generation. Converts rough drawings into generation-ready conditioning.

**Input**: Scribble/sketch images or video frames

**Output**: Processed conditioning frames

**When to use**:
- Sketch-to-video generation
- Style-conditioned generation

---

### gray

**Description**: Converts color video to grayscale. Simple but essential preprocessor for certain effects.

**Input**: Color video frames

**Output**: Grayscale frames

**When to use**:
- Testing pipelines without color complexity
- Certain style transfers that work better on grayscale

---

### optical-flow

**Description**: Computes optical flow between frames to capture motion information. Used for motion-conditioned generation or analysis.

**Input**: Video frames

**Output**: Optical flow vectors/visualization

**When to use**:
- Motion analysis
- Flow-conditioned generation
- Video understanding

---

## Pipeline Usage in OpenScope

### Adding a Pipeline

1. Open the Node Palette
2. Navigate to the "Pipeline" category
3. Drag the desired pipeline node to the canvas
4. Connect it between input and output nodes

### Configuration

Each pipeline has its own set of parameters that can be configured in the Properties Panel when the pipeline node is selected.

### Pre/Post Processor Integration

The standard flow in Scope is:

```
Plugin Config
→ Input (Video/Text/Image)
→ Preprocessor (optional)
→ Main Pipeline
→ Postprocessor (optional)
→ Output
```

Preprocessors modify input before the main pipeline. Postprocessors modify output after generation.

---

## Creating Custom Pipelines

### 1. Define the Schema

Create a Pydantic config class:

```python
from pydantic import Field
from scope.core.pipelines.base_schema import BasePipelineConfig, ModeDefaults, UsageType, ui_field_config

class MyPipelineConfig(BasePipelineConfig):
    pipeline_id = "my-custom-pipeline"
    pipeline_name = "My Custom Pipeline"
    pipeline_description = "Description of what this pipeline does"
    supports_prompts = False
    modes = {"video": ModeDefaults(default=True)}
    usage = []  # Leave empty for main pipeline
    
    # Add parameters
    my_parameter: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="My parameter description",
        json_schema_extra=ui_field_config(order=1, label="My Parameter"),
    )
```

### 2. Implement the Pipeline

```python
import torch
from scope.core.pipelines.interface import Pipeline, Requirements

class MyPipeline(Pipeline):
    @classmethod
    def get_config_class(cls):
        return MyPipelineConfig

    def __init__(self, device: torch.device | None = None, **kwargs):
        self.device = device or torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def prepare(self, **kwargs) -> Requirements:
        return Requirements(input_size=1)

    def __call__(self, **kwargs) -> dict:
        video = kwargs.get("video")
        if video is None:
            raise ValueError("Video input required")
        
        # Your processing logic here
        frames = torch.stack([f.squeeze(0) for f in video], dim=0)
        
        return {"video": frames}
```

### 3. Register the Pipeline

In your plugin's `__init__.py`:

```python
from scope.core.plugins import hookimpl, PluginSpec

class MyPlugin(PluginSpec):
    @hookimpl
    def register_pipelines(self, register):
        from .pipeline import MyPipeline, MyPipelineConfig
        register(MyPipeline)
```

---

## Model Dependencies

### Automatic Downloads

Scope can automatically download required models using the artifacts system:

```python
from scope.core.pipelines.artifacts import HuggingfaceRepoArtifact

class MyPipelineConfig(BasePipelineConfig):
    artifacts = [
        HuggingfaceRepoArtifact(
            repo_id="username/my-model",
            files=["model.pt"],
        ),
    ]
```

### Model Paths

Models are stored in `~/.daydream-scope/models/` (configurable via `DAYDREAM_SCOPE_MODELS_DIR`).

---

## Running Locally

### Development Mode

```bash
# From the scope directory
uv run daydream-scope --reload
```

This starts the server at http://localhost:8000

### Testing a Pipeline

```bash
# Load specific pipeline on startup
PIPELINE=passthrough uv run daydream-scope
```

---

## Exporting Pipeline Plugins

When you export a plugin from OpenScope, it generates:

```
my-plugin/
├── pyproject.toml
├── src/
│   └── my_plugin/
│       ├── __init__.py
│       ├── schema.py       # Config schema
│       └── pipeline.py     # Pipeline implementation
└── README.md
```

The exported plugin can be installed with:

```bash
uv run daydream-scope install -e /path/to/my-plugin
```

---

## Best Practices

1. **Always declare input requirements** via `prepare()` - this ensures correct frame buffering

2. **Use proper tensor formats**:
   - Input: THWC format, [0, 255] range
   - Output: THWC format, [0, 1] range

3. **Handle device placement** - Always move tensors to the correct device

4. **Add validation** - Use Pydantic field validation for all parameters

5. **Include debug options** - Helpful for troubleshooting issues

---

## Runtime vs Load-Time Parameters

Scope supports two types of parameters:

### Runtime Parameters (Default)

Runtime parameters can be changed while the pipeline is active. They take effect immediately without restarting the pipeline. These are ideal for:
- Effect intensities
- Boolean toggles
- Color adjustments
- Strength values

**Configuration:**
```python
from pydantic import Field
from scope.core.pipelines.base_schema import ui_field_config

effect_intensity: float = Field(
    default=0.5,
    ge=0.0,
    le=1.0,
    description="Effect intensity",
    json_schema_extra=ui_field_config(order=1, label="Intensity"),
)
# No is_load_param = runtime by default
```

**Access in pipeline:**
```python
def __call__(self, **kwargs) -> dict:
    intensity = kwargs.get("effect_intensity", 0.5)  # Gets current value
    # Use intensity for processing - changes apply immediately
```

### Load-Time Parameters

Load-time parameters require pipeline restart to take effect. Use `is_load_param=True` for:
- Resolution settings
- Model selection
- Quantization options
- Device configuration

**Configuration:**
```python
resolution: int = Field(
    default=512,
    ge=256,
    le=2048,
    description="Output resolution",
    json_schema_extra=ui_field_config(
        order=1,
        component="resolution",
        is_load_param=True,  # <-- Requires restart
    ),
)
```

### Key Rules

1. **Default to runtime** - Most parameters should be runtime-configurable
2. **Access via kwargs** - Runtime parameters must be accessed in `__call__()` via `kwargs.get()`, NOT stored in `self`
3. **No self.storage** - Never store runtime values in `self` - they won't update!
4. **Immediate effect** - Changes to runtime params reflect immediately in the output stream

### OpenScope Requirements

When building processors in OpenScope:
- All user-exposed parameters must be runtime-configurable unless explicitly impossible
- The code block must reflect the current parameter values
- Export must preserve runtime config semantics
- Generated plugins must accept dynamic config updates during streaming
