import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const COMPREHENSIVE_NODE_KNOWLEDGE = `
## OPENSCOPE NODE LIBRARY - COMPLETE REFERENCE

### 1. PLUGIN CONFIGURATION
- **pluginConfig**: Define pipeline ID, name, usage type (main/preprocessor/postprocessor/all), input mode (text/video), and enable prompts

### 2. INPUT NODES
- **videoInput**: Accept video frames from camera or file. Parameters: Frames (1-100 buffer count), VideoFile upload
- **textPrompt**: Text input with weight for AI generation. Parameters: Text (prompt), Weight (0-2)
- **imageInput**: Reference image for image-to-video pipelines. Parameters: Path
- **parameters**: Key-value parameter storage. Parameters: Key, Value

### 3. OUTPUT NODES
- **pipelineOutput**: Main pipeline output marker for generative AI pipelines

### 4. PRE-PROCESSOR NODES (run BEFORE main generation)
- **yoloMask / yolo_mask**: AI segmentation for object detection. Parameters: modelSize (nano/small/medium/large/xlarge), outputMode (mask/overlay), targetClass (person/car/dog/etc), confidenceThreshold, invertMask
- **kaleido-scope-pre**: GPU kaleidoscope preprocessor. Parameters: enabled, mix, mirrorMode (none/2x/4x/kaleido6), rotationalEnabled, Slices (3-12), rotationDeg (0-360), zoom (0.5-2), warp

### 5. POST-PROCESSOR NODES (run AFTER main generation)
- **bloom**: Bloom/glow effect. Parameters: threshold (0-1), softKnee (0-1), intensity (0-2), radius (1-48), downsample (1-4), debug
- **cosmicVFX**: 30+ visual effects combined. Sub-parameters:
  - Glitch: enableGlitch, glitchShader (basic/digital/color), glitchIntensity (0-2)
  - Retro: enableRetro, retroShader (vhs/retro/cinema), retroIntensity (0-2)
  - Distortion: enableDistortion, distortionShader (wave/spike/noise), distortionIntensity (0-2)
  - Color: enableColor, colorShader (hueshift/colorize/duotone), colorIntensity (0-2)
  - Edge: enableEdge, edgeShader (sobel/laplacian/canny), edgeIntensity (0-2)
  - Blur: enableBlur, blurShader (gaussian/motion/radial), blurIntensity (0-2)
  - Generative: enableGenerative, generativeShader (noise/pattern/gradient), generativeIntensity
  - Atmospheric: enableAtmospheric, atmosphericShader (fog/rain/snow), atmosphericIntensity
  - Utility: enableUtility, utilityShader (invert/grayscale/posterize), utilityIntensity
  - Global: intensity (0-2), speed (0-3), scale (0.1-5), hueShift (-1 to 1), saturation (0-2), brightness (0-2), blendMode
- **vfxPack**: Chromatic, VHS, Halftone effects. Parameters:
  - Chromatic: chromaticEnabled, chromaticIntensity (0-1), chromaticAngle (0-360)
  - VHS: vhsEnabled, scanLineIntensity (0-1), scanLineCount (10-500), vhsNoise (0-1), trackingDistortion (0-1)
  - Halftone: halftoneEnabled, halftoneDotSize (4-20), halftoneSharpness (0-1)
- **kaleido-scope-post**: GPU kaleidoscope postprocessor. Same parameters as preprocessor version

### 6. BUILT-IN EFFECT NODES (visual configuration)
- **kaleidoscope**: Full kaleidoscope with enabled, mix, mirrorMode, rotationalEnabled, rotationalSlices, rotationDeg, zoom, warp
- **chromatic**: RGB channel displacement. Parameters: enabled, intensity (0-1), angle (0-360)
- **vhs**: Retro VHS/CRT effect. Parameters: enabled, scanLineIntensity, scanLineCount, noise, tracking
- **halftone**: Newspaper dot pattern. Parameters: enabled, dotSize (4-20), sharpness (0-1)

### 7. AI PRE/POST-PROCESSORS (from Scope server)
- **segmentation**: AI segmentation. Parameters: model (sam/sam2/yolo), targetClass
- **depthEstimation**: Depth maps for VACE. Parameters: model (depth-anything/miDaS/zoe)
- **backgroundRemoval**: Remove background. Parameters: model (u2net/bgv16/modnet)
- **upscaling**: AI upscale. Parameters: scale (2/4), model (realesrgan/esrgan/swinir)
- **denoising**: Remove noise. Parameters: strength (0-1), method (bm3d/dncnn/ffdnet)
- **styleTransfer**: Art style. Parameters: style (anime/oil/sketch/watercolor), strength (0-1)

### 8. SETTINGS NODES (for generation control)
- **noiseSettings**: Control noise scale (0-2), noiseController (on/off)
- **vaceSettings**: VACE context guidance - vaceEnabled, vaceContextScale (0-2), useInputVideo
- **resolutionSettings**: Output resolution - width/height (256-2048)
- **advancedSettings**: Denoising steps (1-100), quantization, kvCacheAttentionBias (-1 to 1)
- **loraSettings**: LoRA adapters (JSON array)

### 9. GUIDE NODES
- **lessonGettingStarted**: Welcome to OpenScope tutorial
- **lessonFirstProcessor**: Create your first processor guide
- **lessonNodeTypes**: Understanding node types
- **lessonPreprocessors**: Working with preprocessors
- **lessonPostprocessors**: Working with postprocessors
- **noteGuide**: Custom notes and instructions
`;

const ARCHITECTURE_INFO = `
## DAYDREAM SCOPE ARCHITECTURE

### Pipeline Types
1. **main**: Primary AI generation pipeline
2. **preprocessor**: Runs BEFORE main generation - for preprocessing (segmentation, depth, background removal)
3. **postprocessor**: Runs AFTER main generation - for effects and adjustments
4. **all**: Can be used as either

### Data Flow
Input → [Pre-processors] → Main Pipeline → [Post-processors] → Output

### Key Concepts
- **Runtime Parameters**: Change during streaming via kwargs.get() in __call__()
- **Load-time Parameters**: Use is_load_param=True, requires pipeline restart
- **Tensor Format**: THWC, [0, 255] input → THWC, [0, 1] processing → THWC, [0, 1] output
- **Device Placement**: Always use device=self.device for tensor operations
- **Plugin Config**: Must set usage type (main/preprocessor/postprocessor/all) and input mode (text/video/image)

### Creating Custom Processors (AI Generation)
Use "Create New (Beta)" in Pre-processor or Post-processor category to generate custom processor code via AI. Describe what you want the processor to do.

### Export
Export generates a Python plugin with:
- pyproject.toml (plugin metadata)
- src/<plugin_name>/__init__.py
- src/<plugin_name>/pipeline.py (main processor code)
`;

const SYSTEM_PROMPT = `You are an expert AI assistant for OpenScope, a visual node-based plugin builder for Daydream Scope.

${COMPREHENSIVE_NODE_KNOWLEDGE}

${ARCHITECTURE_INFO}

## Your Capabilities

1. **SUGGEST NODES**: Based on user's goal, recommend which nodes to use and in what order
2. **EXPLAIN NODES**: Describe what specific nodes do, their parameters, when to use them
3. **BUILD WORKFLOWS**: Help design complete pipelines for desired effects
4. **DEBUG ISSUES**: Help troubleshoot problems with node graphs
5. **HELP WITH CONFIG**: Explain parameters and their effects
6. **CREATE PROCESSORS**: Guide users to use "Create New (Beta)" for AI-generated custom processors

## Guidelines

- Be concise but comprehensive with parameter details
- Consider the data flow: Input → Preprocessors → Main → Postprocessors → Output
- Remind users they need both input and output nodes to run
- For processor creation, explain how to use the AI generator
- When suggesting effects, recommend the appropriate category (preprocessor vs postprocessor)

## Current Canvas
{node_graph}

Answer the user's question helpfully. Use the comprehensive node knowledge above.`;

export async function POST(request: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json(
        { detail: "GROQ_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { messages, node_graph } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { detail: "Messages array is required" },
        { status: 400 }
      );
    }

    const nodeGraphInfo = node_graph && node_graph.nodes && node_graph.nodes.length > 0
      ? `Nodes currently in canvas:\n${node_graph.nodes.map((n: any) => `- ${n.data.type}: ${n.data.label || ''}`).join('\n')}`
      : "No nodes in canvas yet";

    const systemContent = SYSTEM_PROMPT.replace('{node_graph}', nodeGraphInfo);

    const groqMessages = [
      { role: "system", content: systemContent },
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 2048,
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
    const responseText = data.choices?.[0]?.message?.content;

    if (!responseText) {
      return NextResponse.json(
        { detail: "No response from AI" },
        { status: 500 }
      );
    }

    return NextResponse.json({ response: responseText });
  } catch (error) {
    console.error("Error in chat:", error);
    return NextResponse.json(
      { detail: "Internal server error" },
      { status: 500 }
    );
  }
}
