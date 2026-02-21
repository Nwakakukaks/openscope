# OpenScope: Because Everyone Should Be Able to Build Plugins

A fellow cohort participant shared this in the Discord after spending a day trying to build a plugin:

> *"It seems it is still quite challenging for a person who doesn't have strong coding experience, like me, to build a plugin at the moment. Though the vibe coding experience was amazing."*

That last line is the whole thing. The vibe was there. The results weren't. They'd used AI assistance, followed the guides, got everything synced to GitHub — and still couldn't find their UI elements anywhere in Scope. Not because they did anything wrong. The gap between "I have an idea" and "I have a working plugin" is just still too wide.

Plugins are where Scope gets genuinely exciting. The ability to intercept a live diffusion pipeline at the frame level, inject parameters, chain processors, and entirely custom behaviors — that's powerful in a way most tools aren't. But it still requires enough Python knowledge that a lot of the most creative people in this cohort are hitting walls before they get anywhere.

That's what OpenScope is built to fix.

---

## What It Is

OpenScope is a visual, node-based plugin builder for Daydream Scope. You drag nodes onto a canvas, wire them together, and the Python writes itself in real-time as you work. When you're ready, one click exports a Daydream-compatible plugin ZIP ready to install directly into Scope.

The live code view is always there if you want it — toggle it on and watch the generated Python update as you adjust parameters. The goal was never to hide the code. It's to make the structure of a plugin visible and manipulable before you ever have to think about syntax.

---

## What's Shipped

The current release includes a growing node library covering inputs, pre-processors, effects, and post-processors:

- **Input nodes**: Video Input, Text Prompt, Image Input, Parameters
- **Pre-processors**: Segmentation (SAM), Depth Estimation (Depth Anything), YOLO Mask, Background Removal
- **Effects**: Blur, Mirror, Kaleido, Kaleidoscope, Vignette, Brightness, Contrast, Blend
- **Post-processors**: Color Grading, Upscaling, Denoising, Style Transfer, Chromatic Aberration, VHS/Retro CRT, Halftone, Bloom, Cosmic VFX

OpenScope ships with **six starter templates** so you're never starting from a blank canvas:
- Blank Plugin
- Kaleidoscope
- YOLO Mask
- Bloom Postprocessor
- Cosmic VFX Postprocessor
- VFX Pack Postprocessor

The **Beta AI generation** feature lets you describe a processor in plain language and get working node code back. It understands Scope's plugin spec specifically, so what it generates actually drops into your canvas and behaves correctly. Still beta — useful but not magic. Yet.

Export is one click. It produces a plugin ZIP that installs cleanly into Scope. That part is deliberately boring, because reliable should feel boring.

**Credits**: A huge thank you to community creators @viborc (for the VFX Pack with Chromatic Aberration, VHS, and Halftone effects), @cosmic (for Cosmic VFX), and the Daydream team (for YOLO Mask and the foundational pipeline architectures). Their work has been integrated into the templates and node library.

---

## What's Coming

The node library is intentionally lean for now — better to ship something solid and grow based on real usage than guess at what people need. From here:

- Expanding the node library based on what people actually reach for
- Community-built node sharing, so processors built by one creator show up in everyone's palette
- Stronger real-time preview inside the builder
- Continued improvements to AI generation as it gets better at understanding Scope's architecture

The longer-term vision is that OpenScope becomes the on-ramp that makes Scope's plugin ecosystem genuinely open — not just open-source in principle, but accessible to the visual artists and creative technologists who have the ideas but not necessarily the Python background to realize them.

---

## Come Help Shape It

The node library is small because I want it shaped by what this community actually needs. If you've wanted to build a Scope plugin but hit a wall, try OpenScope and tell me where *it* hits a wall. That feedback is worth more than any feature I could guess at.

And if you've built plugins the hard way and have strong opinions about what a node model gets wrong — those conversations are especially welcome.

GitHub is open. Let's see what gets built.
