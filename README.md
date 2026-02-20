# OpenScope

Visual node-based plugin builder for Daydream Scope. Build Scope plugins visually by connecting nodes, preview in real-time, and export as Python files ready to install.

## Overview

OpenScope is a visual plugin builder that lets you create AI video processing pipelines for Daydream Scope without writing code. Connect nodes to define your pipeline, adjust parameters visually, and export ready-to-use plugins.

## Why OpenScope?

We built OpenScope to make video AI processing accessible to everyone. Instead of writing Python code, you can visually compose processors using an intuitive node-based interface. Whether you want to create pre-processors, post-processors, or full AI pipelines, OpenScope makes it simple.

## Features (MVP)

- **Video Input/Output** - Upload video files and receive processed video output
- **Reactive Code Blocks** - Toggle to see live Python code that updates instantly when you change parameters
- **Plugin Export** - Export as a valid Daydream-compatible plugin ZIP with correct folder structure
- **Pre-processors** - Segmentation and Depth Estimation
- **Post-processors** - Kaleido and VHS/Retro CRT effects
- **AI-Assisted Processor Development (Beta)** - Use AI to generate custom processor code
- **Massive Processor Library** - Larger library with more processors coming soon

## Quick Start

### Frontend

```bash
cd openscope
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the builder.

### Backend (Optional - required for AI features)

```bash
cd openscope/backend

# Copy environment template
cp .env.example .env

# Edit .env and add your Groq API key (get free at https://console.groq.com)
# Optional: Add GitHub token for publishing

# Run the backend
./run.sh
```

The backend runs on port 3001 and proxies to the frontend.

### Test Export Locally

1. Build a pipeline by dragging nodes to canvas
2. Configure your processor settings in the Properties panel
3. Click "Export" → "Export as Plugin"
4. Install the ZIP in Daydream Scope to test

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Groq AI - Get free key at https://console.groq.com
GROQ_API_KEY=your_groq_api_key

# GitHub - Optional, for publishing plugins
GITHUB_TOKEN=your_github_token

# Scope API
SCOPE_API_URL=http://localhost:8000
```

## Node Types

### Input Nodes
- **Video Input** - Accept video frames
- **Text Prompt** - Text prompts with weights  
- **Image Input** - Reference images
- **Parameters** - Configuration values

### Pre-processors (Working)
- **Segmentation** - Detect and mask objects
- **Depth Estimation** - Generate depth maps

### Post-processors (Working)
- **Kaleido** - Kaleidoscope symmetry effect
- **VHS / Retro CRT** - Retro VHS scan line effect

### Coming Soon
- Background Removal, Edge Detection, Depth Estimation, Realtime style transfer (Pre)
-  Color Grading, Upscaling and more effects like Chromatic Aberration, Halftone etc. (Post)

## Templates

OpenScope includes starter templates:

- **Blank Plugin** - Start from scratch
- **Kaleido Effect** - Kaleidoscope mirror effect
- **VHS Retro** - Retro CRT/VHS effect
- **Segmentation** - Object masking preprocessor

## Export

Click "Export" to generate Python code that can be installed as a Scope plugin:

```bash
# Install locally for development
uv run daydream-scope install -e /path/to/your-plugin
```

## Future Plans

- Expand processor library with more pre and post-processors
- Enable community-built processors (anyone can contribute and earn from their efforts)
- Finetune agent assisted development
- Improve real-time preview capabilities

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### PR Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Issue Reporting

Found a bug or have a feature request? Please open an issue on GitHub.

## Tech Stack

- **Frontend**: Next.js 14, React Flow, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **AI**: Groq (Llama 3.1)
- **Integration**: PyGithub

## License

MIT
