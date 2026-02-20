# OpenScope

Visual node-based plugin builder for Daydream Scope. Build Scope plugins visually by connecting nodes, preview in real-time, and export as Python files ready to install.

## Overview

OpenScope is a visual plugin builder that lets you create AI video processing pipelines for Daydream Scope without writing code. Connect nodes to define your pipeline, adjust parameters visually, and export ready-to-use plugins.

## Why OpenScope?

We built OpenScope to make video AI processing accessible to everyone. Instead of writing Python code, you can visually compose processors using an intuitive node-based interface. Whether you want to create pre-processors, post-processors, or full AI pipelines, OpenScope makes it simple.

## Features

- **Visual Node Builder** - Drag and drop nodes to create custom pipelines
- **Real-time Code Preview** - Toggle to see live Python code that updates instantly when you change parameters
- **Plugin Export** - Export as a valid Daydream-compatible plugin ZIP with correct folder structure
- **AI-Assisted Development (Beta)** - Describe what you want, and AI generates the Python code for your custom processor
- **Dynamic Pipeline Library** - Processors are loaded dynamically from your Scope server

## Quick Start

### Frontend

```bash
cd openscope
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the builder.

### Backend (Required for full functionality)

```bash
cd openscope/backend

# Copy environment template
cp .env.example .env

# Edit .env and add your Groq API key (get free at https://console.groq.com)
# Add your Scope server URL

# Run the backend
./run.sh
```

The backend runs on port 3001 and proxies to the frontend.

### Scope Server

OpenScope connects to a Scope server for pipeline processing. You can:

1. **Run locally**: `cd scope && uv run daydream-scope`
2. **Deploy remotely**: See [DEPLOYMENT.md](../DEPLOYMENT.md) for deployment options

## Configuration

### Environment Variables

Create a `.env` file in the backend directory:

```env
# Groq AI - Get free key at https://console.groq.com
GROQ_API_KEY=your_groq_api_key

# GitHub - Optional, for publishing plugins
GITHUB_TOKEN=your_github_token

# Scope API - Your Scope server URL
SCOPE_API_URL=http://localhost:8000
```

## Node Types

### Input Nodes
- **Video Input** - Accept video frames from camera or file
- **Text Prompt** - Text prompts with weights for generation
- **Image Input** - Reference images for processing

### Pipeline Nodes
Dynamically loaded from your Scope server. These include video generation pipelines like:
- LongLive
- StreamDiffusion
- And more from Scope's plugin system

### Pre-processors
Video processing nodes that run before the main pipeline:
- **YOLO Mask** - Object detection and masking
- **Kaleido (Pre)** - Kaleidoscope preprocessing
- **Custom (Beta)** - AI-generate your own preprocessor

### Post-processors
Video processing nodes that run after the main pipeline:
- **Bloom** - Glow effect
- **Cosmic VFX** - Glitch, retro, distortion effects
- **VFX Pack** - Color grading, edge detection, blur effects
- **Kaleido (Post)** - Kaleidoscope symmetry effect
- **Custom (Beta)** - AI-generate your own postprocessor

## Templates

OpenScope includes starter templates:

- **Blank Plugin** - Start from scratch
- **Kaleido Effect** - Kaleidoscope mirror effect  
- **VHS Retro** - Retro CRT/VHS effect
- **Object Mask** - YOLO-based object masking
- **Bloom Effect** - Glow/bloom post-processing

## Export

Click "Export" to generate Python code that can be installed as a Scope plugin:

```bash
# Install locally for development
uv run daydream-scope install -e /path/to/your-plugin
```

## Deployment

See [DEPLOYMENT.md](../DEPLOYMENT.md) for deploying OpenScope and Scope to production.

### Quick Deploy

1. **Scope** → Deploy to Render (or RunPod for GPU)
2. **OpenScope Backend** → Deploy to Render
3. **OpenScope Frontend** → Deploy to Vercel

## Tech Stack

- **Frontend**: Next.js 14, React Flow, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **AI**: Groq (Llama 3.1)
- **Integration**: PyGithub

## License

MIT
