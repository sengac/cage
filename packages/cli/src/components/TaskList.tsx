import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { ResizeAwareList } from './ResizeAwareList';
import { useTheme } from '../hooks/useTheme';
import { useSafeInput } from '../hooks/useSafeInput';

export interface Task {
  id: string;
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  activeForm: string;
  priority: 'high' | 'medium' | 'low';
  duration: number | null;
  progress: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  dependencies?: string[];
  assignee?: string;
  tags?: string[];
}

export interface TaskListProps {
  tasks: Task[];
  layout?: 'compact' | 'detailed' | 'minimal';
  filter?: 'pending' | 'in_progress' | 'completed' | 'high_priority' | 'all';
  sortBy?: 'priority' | 'status' | 'progress' | 'created' | 'updated';
  animated?: boolean;
  showIds?: boolean;
  loading?: boolean;
  onTaskSelect?: (taskId: string) => void;
  selectedTaskId?: string;
  interactive?: boolean;
  theme?: Record<string, string>;
  spacing?: 'compact' | 'normal' | 'wide';
  border?: boolean;
  showTimestamps?: boolean;
  showDependencies?: boolean;
  showAssignees?: boolean;
  showTags?: boolean;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  layout = 'compact',
  filter = 'all',
  sortBy = 'created',
  animated = false,
  showIds = false,
  loading = false,
  onTaskSelect,
  selectedTaskId,
  interactive = false,
  spacing = 'normal',
  border = true,
  showTimestamps = false,
  showDependencies = false,
  showAssignees = false,
  showTags = false
}) => {
  const [spinnerIndex, setSpinnerIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const spinnerChars = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  const appTheme = useTheme();

  // Animate spinner for loading and active tasks
  useEffect(() => {
    if (loading || animated) {
      const interval = setInterval(() => {
        setSpinnerIndex(prev => (prev + 1) % spinnerChars.length);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [loading, animated]);

  const getStatusIcon = (task: Task): string => {
    if (task.isActive && animated) {
      return spinnerChars[spinnerIndex];
    }

    switch (task.status) {
      case 'pending':
        return '⏳';
      case 'in_progress':
        return '🔄';
      case 'completed':
        return '✅';
      case 'blocked':
        return '🚫';
      default:
        return '❓';
    }
  };

  const getPriorityIcon = (priority: string): string => {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '⚪';
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m`;
  };

  const createProgressBar = (progress: number, width: number = 20): string => {
    const filled = Math.floor((progress / 100) * width);
    const empty = width - filled;
    return '█'.repeat(filled) + '▓'.repeat(empty);
  };

  const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const filterTasks = (tasks: Task[]): Task[] => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending');
      case 'in_progress':
        return tasks.filter(task => task.status === 'in_progress');
      case 'completed':
        return tasks.filter(task => task.status === 'completed');
      case 'high_priority':
        return tasks.filter(task => task.priority === 'high');
      default:
        return tasks;
    }
  };

  const sortTasks = (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'status':
          const statusOrder = { completed: 0, in_progress: 1, pending: 2, blocked: 3 };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'progress':
          return b.progress - a.progress;
        case 'created':
          return new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime();
        case 'updated':
          return new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime();
        default:
          return 0;
      }
    });
  };

  const processedTasks = sortTasks(filterTasks(tasks));

  // Handle keyboard navigation when interactive
  useSafeInput((input, key) => {
    if (!interactive) return;

    if (key.escape) {
      // Let parent handle escape
      return;
    }

    if (key.return && processedTasks.length > 0) {
      const selectedTask = processedTasks[selectedIndex];
      if (selectedTask && onTaskSelect) {
        onTaskSelect(selectedTask.id);
      }
    }
  });

  const getTaskCounts = () => {
    return {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      blocked: tasks.filter(t => t.status === 'blocked').length
    };
  };

  const formatTimestamp = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  const renderTaskItem = (task: Task, _index: number, isSelected: boolean) => {
    const prefix = isSelected ? '❯ ' : '  ';
    const statusIcon = getStatusIcon(task);
    const priorityIcon = getPriorityIcon(task.priority);
    const textColor = isSelected ? appTheme.ui.hover : appTheme.ui.text;

    const taskContent = layout === 'minimal'
      ? truncateText(task.content, 30)
      : layout === 'compact'
      ? truncateText(task.content, 50)
      : task.content;

    // For simple layout, just return Text (ResizeAwareList will wrap it)
    if (layout === 'minimal') {
      return (
        <Text color={textColor}>
          {prefix}{showIds && `#${task.id} `}{priorityIcon} {statusIcon} {taskContent}
          {task.duration && ` (${formatDuration(task.duration)})`}
        </Text>
      );
    }

    // For complex layouts, we need Box with Text
    return (
      <Box flexDirection="column" marginBottom={spacing === 'wide' ? 1 : 0}>
        <Box flexDirection="row">
          <Text color={textColor}>
            {prefix}
            {showIds && `#${task.id} `}
            {priorityIcon} {statusIcon} {taskContent}
            {task.duration && ` (${formatDuration(task.duration)})`}
          </Text>
        </Box>

        {/* Progress bar for in-progress and completed tasks */}
        {(task.status === 'in_progress' || task.status === 'completed') && layout !== 'minimal' && (
          <Box marginLeft={prefix.length + (showIds ? task.id.length + 2 : 0) + 4}>
            <Text>
              [{createProgressBar(task.progress)}] {task.progress}%
            </Text>
          </Box>
        )}

        {/* Active form in detailed layout */}
        {layout === 'detailed' && task.status === 'in_progress' && (
          <Box marginLeft={prefix.length + (showIds ? task.id.length + 2 : 0) + 4}>
            <Text color={appTheme.ui.textMuted}>{task.activeForm}</Text>
          </Box>
        )}

        {/* Additional details */}
        {showTimestamps && (task.createdAt || task.updatedAt) && (
          <Box marginLeft={prefix.length + (showIds ? task.id.length + 2 : 0) + 4} flexDirection="column">
            {task.createdAt && <Text color={appTheme.ui.textMuted}>Created: {formatTimestamp(task.createdAt)}</Text>}
            {task.updatedAt && <Text color={appTheme.ui.textMuted}>Updated: {formatTimestamp(task.updatedAt)}</Text>}
          </Box>
        )}

        {showDependencies && task.dependencies && task.dependencies.length > 0 && (
          <Box marginLeft={prefix.length + (showIds ? task.id.length + 2 : 0) + 4}>
            <Text color={appTheme.ui.textMuted}>Depends on: {task.dependencies.map(dep => `#${dep}`).join(', ')}</Text>
          </Box>
        )}

        {showAssignees && task.assignee && (
          <Box marginLeft={prefix.length + (showIds ? task.id.length + 2 : 0) + 4}>
            <Text color={appTheme.ui.textMuted}>Assigned: {task.assignee}</Text>
          </Box>
        )}

        {showTags && task.tags && task.tags.length > 0 && (
          <Box marginLeft={prefix.length + (showIds ? task.id.length + 2 : 0) + 4}>
            <Text color={appTheme.ui.textMuted}>{task.tags.map(tag => `[${tag}]`).join(' ')}</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderContent = (): JSX.Element => {
    if (loading) {
      return (
        <Box flexDirection="column" alignItems="center" justifyContent="center">
          <Text>{spinnerChars[spinnerIndex]} Loading tasks...</Text>
        </Box>
      );
    }

    if (processedTasks.length === 0) {
      return (
        <Box flexDirection="column" alignItems="center" justifyContent="center">
          <Text>No tasks found</Text>
          <Text color="gray">Tasks will appear here when added</Text>
        </Box>
      );
    }

    const counts = getTaskCounts();

    return (
      <Box flexDirection="column">
        {/* Header */}
        <Box justifyContent="center" marginBottom={1}>
          <Text bold color="cyan">TASK LIST</Text>
        </Box>

        {/* Summary */}
        <Box marginBottom={1} flexDirection="row" justifyContent="space-between">
          <Text>Tasks: {counts.total}</Text>
          <Box>
            <Text>Pending: {counts.pending}</Text>
            <Text> | In Progress: {counts.inProgress}</Text>
            <Text> | Completed: {counts.completed}</Text>
          </Box>
        </Box>

        {/* Task items */}
        <ResizeAwareList
          items={processedTasks}
          renderItem={renderTaskItem}
          onSelect={(task) => {
            if (onTaskSelect) {
              onTaskSelect(task.id);
            }
          }}
          onFocus={(_, index) => setSelectedIndex(index)}
          keyExtractor={(task) => task.id}
          emptyMessage="No tasks found"
          showScrollbar={true}
          enableWrapAround={false}
          testMode={interactive}
          initialIndex={selectedTaskId ? processedTasks.findIndex(t => t.id === selectedTaskId) : 0}
          heightOffset={12}  // Account for header, summary, and interactive shortcuts
          maxHeight={15}  // Limit to 15 items max
        />

        {/* Interactive shortcuts */}
        {interactive && (
          <Box
            borderStyle="single"
            borderColor="gray"
            padding={1}
            marginTop={1}
          >
            <Text color="gray">
              ↑↓ Navigate  ↵ Select  f Filter  s Sort  ESC Back
            </Text>
          </Box>
        )}
      </Box>
    );
  };

  if (border) {
    return (
      <Box
        borderStyle="single"
        borderColor="cyan"
        padding={1}
      >
        {renderContent()}
      </Box>
    );
  }

  return renderContent();
};