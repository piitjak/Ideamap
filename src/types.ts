export interface MindMapNode {
  id: string;
  text: string;
  notes?: string;
  links?: string[];
  images?: string[];
  children: MindMapNode[];
  isExpanded?: boolean;
  color?: string;
}

export interface TopicPage {
  id: string;
  title: string;
  root: MindMapNode;
  createdAt: number;
  updatedAt: number;
}

export interface AppData {
  topics: TopicPage[];
  lastOpenedTopicId?: string;
}
