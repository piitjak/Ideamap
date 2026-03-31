/**
 * Represents a single node in the mind map.
 * Nodes can contain text, notes, links, and images, and can have multiple children.
 */
export interface MindMapNode {
  /** Unique identifier for the node (UUID) */
  id: string;
  /** The main text content displayed on the node */
  text: string;
  /** Optional detailed notes associated with the node */
  notes?: string;
  /** Optional list of external URLs linked to this node */
  links?: string[];
  /** Optional list of image URLs displayed within the node's details */
  images?: string[];
  /** Array of child nodes branching from this node */
  children: MindMapNode[];
  /** Whether the node's children are currently visible in the UI */
  isExpanded?: boolean;
  /** Hex color code for the node's background */
  color?: string;
}

/**
 * Represents a complete mind map topic or project.
 */
export interface TopicPage {
  /** Unique identifier for the topic */
  id: string;
  /** The title of the topic, also used as the root node text */
  title: string;
  /** The root node of the mind map tree */
  root: MindMapNode;
  /** Unix timestamp of when the topic was created */
  createdAt: number;
  /** Unix timestamp of the last modification */
  updatedAt: number;
}

/**
 * The root data structure for the entire application state.
 */
export interface AppData {
  /** List of all mind map topics created by the user */
  topics: TopicPage[];
  /** ID of the topic that was last viewed by the user */
  lastOpenedTopicId?: string;
}
