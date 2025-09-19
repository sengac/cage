import type { Event } from './appStore';

// Generate mock events for development and testing
export const generateMockEvents = (count: number = 50): Event[] => {
  const eventTypes = ['ToolUse', 'UserMessage', 'AssistantMessage', 'SystemMessage', 'Error'];
  const tools = ['Read', 'Edit', 'Write', 'Bash', 'Search', 'WebFetch', 'MultiEdit'];

  return Array.from({ length: count }, (_, i) => ({
    id: `event-${i + 1}`,
    timestamp: new Date(Date.now() - (count - i) * 60000).toISOString(),
    eventType: eventTypes[Math.floor(Math.random() * eventTypes.length)],
    sessionId: `session-${Math.floor(i / 10) + 1}`,
    toolName: Math.random() > 0.3 ? tools[Math.floor(Math.random() * tools.length)] : undefined,
    arguments: {
      prompt: `Sample prompt for event ${i + 1}`,
      file_path: Math.random() > 0.5 ? `/src/components/File${i}.tsx` : undefined,
      command: Math.random() > 0.7 ? `npm run test:${i}` : undefined,
    },
    result: {
      output: `Result output for event ${i + 1}\n${Math.random() > 0.5 ? 'Success' : 'Completed with warnings'}`,
      success: Math.random() > 0.2,
      data: {
        lines: Math.floor(Math.random() * 100),
        changes: Math.floor(Math.random() * 10),
      },
    },
    executionTime: Math.floor(Math.random() * 5000),
    error: Math.random() > 0.9 ? `Error in event ${i + 1}` : undefined,
  }));
};