/**
 * API endpoint constants for Cage backend
 */

export const API_BASE = '/api/v1';

export const API_ENDPOINTS = {
  claude: {
    preToolUse: '/claude/hooks/pre-tool-use',
    postToolUse: '/claude/hooks/post-tool-use',
    userPromptSubmit: '/claude/hooks/user-prompt-submit',
    notification: '/claude/hooks/notification',
    stop: '/claude/hooks/stop',
    subagentStop: '/claude/hooks/subagent-stop',
    sessionStart: '/claude/hooks/session-start',
    sessionEnd: '/claude/hooks/session-end',
    preCompact: '/claude/hooks/pre-compact',
    status: '/claude/hooks/status',
    events: '/claude/events',
    eventsStream: '/claude/events/stream',
    eventsStats: '/claude/events/stats',
  },
} as const;

/**
 * Helper function to build full endpoint URL
 */
export function buildEndpointUrl(baseUrl: string, endpoint: string): string {
  // Ensure baseUrl doesn't end with slash and endpoint starts with slash
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${cleanBase}${cleanEndpoint}`;
}

/**
 * Get endpoint for a specific hook type
 */
export function getHookEndpoint(hookType: string): string | undefined {
  const hookToEndpoint: Record<string, string> = {
    PreToolUse: API_ENDPOINTS.claude.preToolUse,
    PostToolUse: API_ENDPOINTS.claude.postToolUse,
    UserPromptSubmit: API_ENDPOINTS.claude.userPromptSubmit,
    Notification: API_ENDPOINTS.claude.notification,
    Stop: API_ENDPOINTS.claude.stop,
    SubagentStop: API_ENDPOINTS.claude.subagentStop,
    SessionStart: API_ENDPOINTS.claude.sessionStart,
    SessionEnd: API_ENDPOINTS.claude.sessionEnd,
    PreCompact: API_ENDPOINTS.claude.preCompact,
  };

  return hookToEndpoint[hookType];
}
