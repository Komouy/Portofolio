export type Language = 'id' | 'en';
export type Theme = 'light' | 'dark';

export interface Project {
  id: string;
  title: string;
  description: string;
  tags: string[];
  githubUrl?: string;
  demoUrl?: string;
  image?: string;
  source?: 'static' | 'github' | 'custom';
  repoName?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  showForm?: boolean;
}

export interface GitHubRepo {
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  language: string | null;
  topics?: string[];
}
