# OpenScope: Because Everyone Should Be Able to Build Plugins

A fellow cohort participant shared this after spending a day building their first plugin:

"It seems it is still quite challenging for a person who doesn't have strong coding experience, like me, to build a plugin at the moment. Though the vibe coding experience was amazing."

Plugins is where Scope gets genuinely exciting. The ability to build entirely new experiences on top of Scope without touching the core codebase is a huge deal. Right now you need some Python knowledge to get there, and not everyone has that background yet.

That's what OpenScope is built to fix.

What it is

OpenScope is a visual, node-based plugin builder for Daydream Scope. You drag nodes onto a canvas, wire them together, and the Python writes itself in real-time as you work. When you're ready, one click exports a Daydream-compatible plugin ZIP ready to install directly into Scope.

Features

What Shipped
The current release includes a rich node library covering inputs, outputs, pre-processors, main pipelines, post-processors, and agent plugin builder.

1. Core Nodes

Plugin Config: Define pipeline settings, usage mode (main/preprocessor/postprocessor), and configuration options

Input nodes: 
- Video Input: Accept video frames for processing
- Text Prompt: Text with weights for generation
- Image Input: Reference images for style transfer

Pipeline: Dynamically loaded pipelines from your Scope server - connect to any available processor

Pre-processor:
- Use existing preprocessor pipelines from your server
- Create New (Beta): Build new preprocessors with AI

Post-processor:
- Use existing postprocessor pipelines from your server
- Create New (Beta): Build new postprocessors with AI

Output Node: Main Pipeline output

2. AI-Powered Processor Creation (Beta)

Describe a processor in plain language and get working node code back. OpenScope's AI understands Scope's plugin spec specifically and can generate:
- Custom preprocessors for masking, transformations
- Custom postprocessors for effects, adjustments
- Full plugin configurations with modes

3. Starter Templates

Never start from a blank canvas. Choose from:
- Blank Plugin: Start fresh
- Kaleidoscope: Classic kaleidoscope effect
- YOLO Mask: Object detection masking
- Bloom: Glow effect
- Cosmic VFX: Cosmic-themed visual effects
- VFX Pack: Community VFX collection
- Community-submitted templates (coming soon)

4. Plugin Management

Install plugins directly from GitHub or other Git sources:
- Paste a GitHub URL or package name
- One-click install
- View installed plugins with version and pipeline count
- Uninstall plugins when no longer needed

5. Interactive Guides

Built-in tutorials to help you learn:
- 1. Getting Started: What is OpenScope?
- 2. First Processor: Create a custom processor with AI
- 3. Node Types: Understand all nodes available
- 4. Preprocessors: Use available pipelines or create new
- 5. Postprocessors: Use available pipelines or create new
- Custom Notes: Add your own notes to the canvas

6. AI Assistant

Chat with an AI assistant that can:
- Suggest nodes based on your goal
- Explain what each node does
- Help you build specific effects
- Fix issues with your plugin

7. Export in One Click

Produces a plugin ZIP that installs cleanly into Scope. Your node graph becomes ready-to-use Python code automatically.

Credits: A huge thank you to community creators @viborc (for the VFX Pack), @cosmic (for Cosmic VFX), @JamesDawson (for Scope bloom), @RyanontheInside(for YOLO Mask) and Marky (for kaleidoscope). Their work has been integrated into the starter templates.

What's Coming
Because of limited time, I had to prioritise getting a working version out thus leaving out a lot of implementations I would love to add. here's some additions that will be available in the coming weeks

Expanding the node library with more templates and nodes to create interesting experiences visually 

- Stronger real-time preview inside the builder
- Continued improvements to AI generation as it gets better at understanding Scope's architecture
- And more

The longer-term vision is that OpenScope becomes the on-ramp that makes Scope's plugin ecosystem genuinely open and accessible to everyone - visual artists, creative technologists, hobbyists who have the ideas but not necessarily the coding background to realise them.

Come Help Shape it
Try it, break it, tell me what's missing. If you've wanted to build a Scope plugin but hit a wall, try OpenScope and tell me where it hits a wall. And if you've built plugins the hard way and think the node model is missing something obvious — feedbacks are most welcomed!

Links

App: https://openscope-ebon.vercel.app/
Github: https://github.com/Nwakakukaks/openscope
