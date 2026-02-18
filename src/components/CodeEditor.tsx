"use client";

import { useCallback } from "react";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/themes/prism-tomorrow.css";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export default function CodeEditor({ value, onChange, onClick }: CodeEditorProps) {
  const highlight = useCallback((code: string) => {
    return Prism.highlight(code, Prism.languages.python, "python");
  }, []);

  return (
    <div 
      className="rounded-lg overflow-hidden border border-border bg-[#1d1f21]"
      onClick={onClick}
    >
      <Editor
        value={value}
        onValueChange={onChange}
        highlight={highlight}
        padding={12}
        className="text-xs font-mono"
        style={{
          fontFamily: '"Fira Code", "JetBrains Mono", monospace',
          fontSize: 11,
          minHeight: 200,
          maxHeight: 300,
          overflow: 'hidden',
        }}
        textareaClassName="focus:outline-none"
      />
    </div>
  );
}
