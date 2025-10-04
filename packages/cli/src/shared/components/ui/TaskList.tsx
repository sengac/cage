import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { LayoutAwareList } from './LayoutAwareList';
import { useTheme } from '../../../core/theme/useTheme';
import { useSafeInput } from '../../hooks/useSafeInput';

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
  showTags = false,
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
    return text.length > maxLength
      ? text.substring(0, maxLength) + '...'
      : text;
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
          const statusOrder = {
            completed: 0,
            in_progress: 1,
            pending: 2,
            blocked: 3,
          };
          return statusOrder[a.status] - statusOrder[b.status];
        case 'progress':
          return b.progress - a.progress;
        case 'created':
          return (
            new Date(a.createdAt || '').getTime() -
            new Date(b.createdAt || '').getTime()
          );
        case 'updated':
          return (
            new Date(b.updatedAt || '').getTime() -
            new Date(a.updatedAt || '').getTime()
          );
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
      blocked: tasks.filter(t => t.status === 'blocked').length,
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

    const taskContent =
      layout === 'minimal'
        ? truncateText(task.content, 30)
        : layout === 'compact'
          ? truncateText(task.content, 50)
          : task.content;

    // Build the main display line
    let displayText = `${prefix}`;
    if (showIds) displayText += `#${task.id} `;
    displayText += `${priorityIcon} ${statusIcon} ${taskContent}`;
    if (task.duration) displayText += ` (${formatDuration(task.duration)})`;

    // Add progress bar inline for in-progress and completed tasks (except minimal layout)
    if (
      (task.status === 'in_progress' || task.status === 'completed') &&
      layout !== 'minimal'
    ) {
      displayText += ` [${createProgressBar(task.progress)}] ${task.progress}%`;
    }

    // For minimal and compact layouts, return single line
    if (layout !== 'detailed') {
      return <Text color={textColor}>{displayText}</Text>;
    }

    // For detailed layout, build multi-line display
    const lines = [displayText];

    // Add active form for in-progress tasks
    if (task.status === 'in_progress' && task.activeForm) {
      lines.push(`    ${task.activeForm}`);
    }

    // Add timestamps if enabled
    if (showTimestamps) {
      if (task.createdAt) {
        lines.push(`    Created: ${formatTimestamp(task.createdAt)}`);
      }
      if (task.updatedAt) {
        lines.push(`    Updated: ${formatTimestamp(task.updatedAt)}`);
      }
    }

    // Add dependencies if enabled
    if (showDependencies && task.dependencies && task.dependencies.length > 0) {
      lines.push(
        `    Depends on: ${task.dependencies.map(dep => `#${dep}`).join(', ')}`
      );
    }

    // Add assignee if enabled
    if (showAssignees && task.assignee) {
      lines.push(`    Assigned: ${task.assignee}`);
    }

    // Add tags if enabled
    if (showTags && task.tags && task.tags.length > 0) {
      lines.push(`    ${task.tags.map(tag => `[${tag}]`).join(' ')}`);
    }

    // Join all lines with newlines and return as single Text component
    return <Text color={textColor}>{lines.join('\n')}</Text>;
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
          <Text bold color="cyan">
            TASK LIST
          </Text>
        </Box>

        {/* Summary */}
        <Box
          marginBottom={1}
          flexDirection="row"
          justifyContent="space-between"
        >
          <Text>Tasks: {counts.total}</Text>
          <Box>
            <Text>Pending: {counts.pending}</Text>
            <Text> | In Progress: {counts.inProgress}</Text>
            <Text> | Completed: {counts.completed}</Text>
          </Box>
        </Box>

        {/* Task items */}
        <LayoutAwareList
          items={processedTasks}
          renderItem={renderTaskItem}
          onSelect={task => {
            if (onTaskSelect) {
              onTaskSelect(task.id);
            }
          }}
          onFocus={(_, index) => setSelectedIndex(index)}
          keyExtractor={task => task.id}
          emptyMessage="No tasks found"
          showScrollbar={true}
          enableWrapAround={false}
          testMode={interactive}
          initialIndex={
            selectedTaskId
              ? processedTasks.findIndex(t => t.id === selectedTaskId)
              : 0
          }
          localHeightOffset={4} // Header (1) + Summary (1) + margins (2)
          maxHeight={15} // Limit to 15 items max
        />
      </Box>
    );
  };

  if (border) {
    return (
      <Box borderStyle="single" borderColor="cyan" padding={1}>
        {renderContent()}
      </Box>
    );
  }

  return renderContent();
};
