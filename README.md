# OpenScope

Visual node-based plugin builder for Daydream Scope. Build Scope plugins visually by connecting nodes, preview in real-time, and export as Python files ready to install.

## Features

- **Visual Node Editor** - Drag and drop nodes to build plugins
- **Code Editor
- **Real-time Preview** - See your changes instantly
- **Code Generation** - Export as ready-to-install Python plugin
- **AI Assistance** - Get help from Groq-powered AI assistant
- **GitHub Integration** - Publish plugins directly to GitHub
- **Starter Templates** - Start with pre-built plugin templates

## Quick Start

### Frontend

```bash
cd openscope
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the builder.

### Backend (Optional - for AI & GitHub features)

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
- **Video** - Accept video frames
- **Text Prompt** - Text prompts with weights  
- **Image** - Reference images
- **Parameters** - Configuration values

### Processing Nodes
- **Brightness** - Adjust brightness (-100 to 100)
- **Contrast** - Adjust contrast (0 to 3)
- **Blur** - Gaussian blur effect
- **Mirror** - Horizontal/vertical mirroring
- **Kaleido** - Kaleidoscope symmetry
- **Blend** - Mix two video streams
- **Mask** - Object segmentation

### Output Nodes
- **Pipeline** - Main pipeline output
- **Preprocessor** - Preprocessor output
- **Postprocessor** - Postprocessor output

## Templates

OpenScope includes starter templates:

- **Blank Plugin** - Start from scratch
- **Kaleido Effect** - Kaleidoscope mirror effect
- **Brightness & Contrast** - Basic adjustments
- **Blur Effect** - Gaussian blur
- **Mirror Effect** - Horizontal/vertical flip
- **Blend Modes** - Video blending
- **Color Invert** - Simple color inversion
- **Text Prompt Processor** - For generation

## Export

Click "Export" to generate Python code that can be installed as a Scope plugin:

```bash
# Install locally for development
uv run daydream-scope install -e /path/to/your-plugin
```

## Tech Stack

- **Frontend**: Next.js 14, React Flow, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python
- **AI**: Groq (Llama 3.1)
- **Integration**: PyGithub

## Project Structure

```
openscope/
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/          # Pages
│   │   ├── components/   # React components
│   │   ├── store/        # Zustand state
│   │   └── lib/          # Utilities
│   └── package.json
├── backend/              # FastAPI backend
│   ├── openscope_backend/
│   │   ├── main.py       # App entry
│   │   ├── config.py     # Settings
│   │   └── routers/      # API routes
│   │       ├── api.py
│   │       ├── templates.py
│   │       ├── github.py
│   │       └── ai.py
│   └── pyproject.toml
└── README.md
```

## License

MIT
