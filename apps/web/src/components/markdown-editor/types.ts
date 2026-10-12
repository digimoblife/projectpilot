export interface SavedMarkdownDoc {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

export type ViewMode = "split" | "editor" | "preview";
