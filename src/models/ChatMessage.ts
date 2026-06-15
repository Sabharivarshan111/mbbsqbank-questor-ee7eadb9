
export interface Reference {
  title: string;
  authors: string;
  journal?: string;
  year: string;
  url?: string;
  source?: string;
}

export interface MessageImage {
  term: string;
  imageUrl: string;
  caption?: string;
  sourceUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  references?: Reference[];
  /** If true, this message is kept in state/history but not rendered in the chat UI. */
  hidden?: boolean;
  /** Optional renderer hint — e.g. "mcq" to render interactive MCQ cards. */
  kind?: 'mcq';
  /** Auto-attached illustrative images (e.g. from Wikipedia). */
  images?: MessageImage[];
}
