import Link from "next/link";
import { Braces, BrainCog, FolderDown, Library, PictureInPicture, Workflow } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[hsl(220,13%,6%)] text-[hsl(220,10%,96%)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[hsl(220,10%,18%)]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg">OpenScope</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="#features" className="text-sm text-[hsl(220,9%,55%)] hover:text-[hsl(220,10%,96%)] transition-colors">Features</Link>
            <a href="https://github.com/nwakakukaks/openscope" target="_blank" rel="noopener noreferrer" className="text-sm text-[hsl(220,9%,55%)] hover:text-[hsl(220,10%,96%)] transition-colors">GitHub</a>
            <Link href="/app" className="px-4 py-2 bg-[hsl(217,91%,60%)] text-white rounded-lg text-sm font-medium hover:bg-[hsl(217,91%,60%)/90] transition-colors">
              Try Now
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            Build Live Video Experiences<br />
            <span className="text-[hsl(217,91%,60%)]">Without Writing Code</span>
          </h1>
          <p className="text-xl text-[hsl(220,9%,55%)] mb-10 max-w-2xl mx-auto">
            OpenScope is a visual node-based plugin builder for Scope.
            Connect nodes, adjust parameters, and export ready-to-use plugins in minutes.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/app" className="px-8 py-3 bg-[hsl(217,91%,60%)] text-white rounded-lg text-base font-medium hover:bg-[hsl(217,91%,60%)/90] transition-colors">
              Start Building
            </Link>
            <a href="https://github.com/nwakakukaks/openscope" target="_blank" rel="noopener noreferrer" className="px-8 py-3 border border-[hsl(220,10%,18%)] text-[hsl(220,10%,96%)] rounded-lg text-base font-medium hover:bg-[hsl(220,10%,14%)] transition-colors">
              View on GitHub
            </a>
          </div>
        </div>

        {/* Hero Image Placeholder */}
        <div className="max-w-5xl mx-auto mt-16">
          <div className="aspect-video rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,12%,9%)] flex items-center justify-center">
            <span className="text-[hsl(220,9%,55%)]">OpenScope Editor Preview</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-6 border-t border-[hsl(220,10%,18%)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">Features</h2>
          <p className="text-[hsl(220,9%,55%)] text-center mb-16 max-w-2xl mx-auto">
            Everything you need to create video processing plugins visually
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,12%,9%)]">
              <div className="w-12 h-12 rounded-lg bg-[hsl(217,91%,60%)]/20 flex items-center justify-center mb-4">
                <PictureInPicture/>
              </div>
              <h3 className="text-lg font-semibold mb-2">Video to AI Output</h3>
              <p className="text-sm text-[hsl(220,9%,55%)]">
                Upload video files, process them through your custom pipeline, and get the output ready for Daydream Scope.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,12%,9%)]">
              <div className="w-12 h-12 rounded-lg bg-[hsl(217,91%,60%)]/20 flex items-center justify-center mb-4">
 <Braces />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Code Blocks</h3>
              <p className="text-sm text-[hsl(220,9%,55%)]">
                Toggle to see Python code that updates instantly as you adjust parameters. Always see what runs.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,12%,9%)]">
              <div className="w-12 h-12 rounded-lg bg-[hsl(217,91%,60%)]/20 flex items-center justify-center mb-4">
                <FolderDown/>
              </div>
              <h3 className="text-lg font-semibold mb-2">Plugin Export</h3>
              <p className="text-sm text-[hsl(220,9%,55%)]">
                One-click export generates a valid Daydream-compatible plugin ZIP with the correct folder structure.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,12%,9%)]">
            <div className="w-12 h-12 rounded-lg bg-[hsl(217,91%,60%)]/20 flex items-center justify-center mb-4">
               <BrainCog/>
              </div>
              <h3 className="text-lg font-semibold mb-2">AI Processor (Beta)</h3>
              <p className="text-sm text-[hsl(220,9%,55%)]">
                Describe what you want, and AI generates the Python code for your custom processor.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,12%,9%)]">
              <div className="w-12 h-12 rounded-lg bg-[hsl(217,91%,60%)]/20 flex items-center justify-center mb-4">
<Library/>
              </div>
              <h3 className="text-lg font-semibold mb-2">Growing Library</h3>
              <p className="text-sm text-[hsl(220,9%,55%)]">
                Start with 2 pre-processors and 2 post-processors. More coming soon!
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-xl border border-[hsl(220,10%,18%)] bg-[hsl(220,12%,9%)]">
              <div className="w-12 h-12 rounded-lg bg-[hsl(217,91%,60%)]/20 flex items-center justify-center mb-4">
               <Workflow/> 
              </div>
              <h3 className="text-lg font-semibold mb-2">Visual Builder</h3>
              <p className="text-sm text-[hsl(220,9%,55%)]">
                Drag and drop nodes to build pipelines. No code required.
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* Footer */}
      <footer className="py-6 px-6 border-t border-[hsl(220,10%,18%)]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">

              <span className="font-semibold">OpenScope</span>
            </div>

            <div className="flex items-center gap-6">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-[hsl(220,9%,55%)] hover:text-[hsl(220,10%,96%)] transition-colors">GitHub</a>
              <a href="#" className="text-sm text-[hsl(220,9%,55%)] hover:text-[hsl(220,10%,96%)] transition-colors">Documentation</a>
              <a href="#" className="text-sm text-[hsl(220,9%,55%)] hover:text-[hsl(220,10%,96%)] transition-colors">Community</a>
            </div>

            <p className="text-sm text-[hsl(220,9%,55%)]">
              copyright 2026 Openscope
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
