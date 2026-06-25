export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in-progress' | 'done';
export type BlockType =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bullet'
  | 'numbered'
  | 'todo'
  | 'quote'
  | 'code'
  | 'divider'
  | 'callout'
  | 'toggle';

export interface QAItem {
  id: string;
  question: string;
  answer: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  status: TaskStatus;
  projectId?: string;
  dueDate?: string;
  createdAt: string;
  completedAt?: string;
  tags: string[];
  // Detail fields (notion-like per-task document)
  designDecision?: string;
  backendDev?: string;
  frontendDev?: string;
  configDev?: string;
  jsonSnippet?: string;
  problemSolutions?: QAItem[];
  codeReview?: string;
  taskNotes?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  status: 'active' | 'paused' | 'done';
  createdAt: string;
  color: string;
  // Jira-like fields
  overview?: string;
  summary?: string;
  context?: string;
  technicalAnalysis?: string;
  implementationChecklist?: ChecklistItem[];
  openQuestions?: string;
  testScenarios?: string;
  localTesting?: string;
  databaseNotes?: string;
  bugLog?: BugEntry[];
  commitPR?: string;
  closureChecklist?: ChecklistItem[];
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface BugEntry {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'fixed' | 'wontfix';
  createdAt: string;
}

export interface Block {
  id: string;
  type: BlockType;
  content: string;
  checked?: boolean;    // todo blokları için
  collapsed?: boolean;  // toggle blokları için
  lang?: string;        // code blokları için dil etiketi
}

export interface Note {
  id: string;
  title: string;
  icon?: string;        // emoji simge
  cover?: string;       // kapak rengi (CSS renk değeri)
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface PlannerEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color?: string;
  taskId?: string;
  notes?: string;
}

export interface AppData {
  tasks: Task[];
  projects: Project[];
  notes: Note[];
  plannerEvents: PlannerEvent[];
}