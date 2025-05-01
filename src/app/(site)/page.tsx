// src/app/page.tsx
"use client";

import React, { useState } from "react";
import { toast } from "sonner";

export default function HomePage() {
  const [desc, setDesc] = useState("");
  const [code, setCode] = useState("");
  const [tags, setTags] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Snippet posted!");
    setDesc("");
    setCode("");
    setTags("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-3xl mx-auto p-6">
      <textarea
        rows={2}
        placeholder="Description"
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        className="w-full bg-muted border border-border rounded-md p-3 placeholder:text-muted-fg focus:ring-accent focus:outline-none"
      />
      <div className="bg-muted border border-border rounded-lg p-3 font-mono">
        <textarea
          rows={8}
          placeholder="Your code here…"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full bg-transparent focus:outline-none"
        />
      </div>
      <input
        placeholder="Tags (comma separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className="w-full bg-muted border border-border rounded-md p-2 placeholder:text-muted-fg focus:ring-accent focus:outline-none"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-accent text-foreground rounded-md hover:opacity-90 transition"
      >
        Post Snippet
      </button>
    </form>
  );
}