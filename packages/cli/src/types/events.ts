// Event type definitions for the CLI

export interface BaseEvent {
  id: string;
  type: string;
  timestamp: string;
  sessionId?: string;
}

export interface EditEvent extends BaseEvent {
  type: 'edit';
  filename: string;
  oldContent?: string;
  newContent?: string;
  diff?: string;
}

export interface BashEvent extends BaseEvent {
  type: 'bash';
  command: string;
  output?: string;
  error?: string;
  exitCode: number;
  duration?: number;
  workingDirectory?: string;
}

export interface ReadEvent extends BaseEvent {
  type: 'read';
  filename: string;
  content?: string;
}

export interface WriteEvent extends BaseEvent {
  type: 'write';
  filename: string;
  content: string;
}

export type HookEvent = EditEvent | BashEvent | ReadEvent | WriteEvent;
