import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TaskList } from './TaskList';

describe('TaskList', () => {
  let mockTasks: any[];

  beforeEach(() => {
    mockTasks = [
      {
        id: '1',
        content: 'Implement authentication system',
        status: 'pending',
        activeForm: 'Implementing authentication system',
        priority: 'high',
        duration: null,
        progress: 0
      },
      {
        id: '2',
        content: 'Write unit tests for API endpoints',
        status: 'in_progress',
        activeForm: 'Writing unit tests for API endpoints',
        priority: 'medium',
        duration: 1200,
        progress: 65
      },
      {
        id: '3',
        content: 'Update documentation',
        status: 'completed',
        activeForm: 'Updating documentation',
        priority: 'low',
        duration: 800,
        progress: 100
      },
      {
        id: '4',
        content: 'Fix navigation bug in header component',
        status: 'in_progress',
        activeForm: 'Fixing navigation bug in header component',
        priority: 'high',
        duration: 600,
        progress: 30
      },
      {
        id: '5',
        content: 'Optimize database queries',
        status: 'pending',
        activeForm: 'Optimizing database queries',
        priority: 'medium',
        duration: null,
        progress: 0
      }
    ];
  });

  describe('Given the TaskList is displayed', () => {
    describe('When rendered initially', () => {
      it('Then should show the task list title', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('TASK LIST');
      });

      it('Then should show task count summary', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('Tasks: 5');
        expect(lastFrame()).toContain('Pending: 2');
        expect(lastFrame()).toContain('In Progress: 2');
        expect(lastFrame()).toContain('Completed: 1');
      });

      it('Then should display all tasks', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('Implement authentication system');
        expect(lastFrame()).toContain('Write unit tests for API endpoints');
        expect(lastFrame()).toContain('Update documentation');
        expect(lastFrame()).toContain('Fix navigation bug');
        expect(lastFrame()).toContain('Optimize database queries');
      });

      it('Then should show task status indicators', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('⏳'); // Pending
        expect(lastFrame()).toContain('🔄'); // In Progress
        expect(lastFrame()).toContain('✅'); // Completed
      });

      it('Then should show priority indicators', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('🔴'); // High priority
        expect(lastFrame()).toContain('🟡'); // Medium priority
        expect(lastFrame()).toContain('🟢'); // Low priority
      });
    });

    describe('When displaying task items', () => {
      it('Then should show pending tasks with correct status', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('⏳ Implement authentication system');
        expect(lastFrame()).toContain('⏳ Optimize database queries');
      });

      it('Then should show in-progress tasks with progress bars', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('🔄 Write unit tests for API endpoints');
        expect(lastFrame()).toContain('[█████████████▓▓▓▓▓▓▓] 65%');
        expect(lastFrame()).toContain('🔄 Fix navigation bug in header component');
        expect(lastFrame()).toContain('[██████▓▓▓▓▓▓▓▓▓▓▓▓▓▓] 30%');
      });

      it('Then should show completed tasks with checkmarks', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('✅ Update documentation');
        expect(lastFrame()).toContain('[████████████████████] 100%');
      });

      it('Then should show task durations when available', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('(20m)'); // 1200 seconds = 20 minutes
        expect(lastFrame()).toContain('(13m)'); // 800 seconds ≈ 13 minutes
        expect(lastFrame()).toContain('(10m)'); // 600 seconds = 10 minutes
      });

      it('Then should show priority colors correctly', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        // High priority tasks should have red indicators
        expect(lastFrame()).toMatch(/🔴.*Implement authentication system/);
        expect(lastFrame()).toMatch(/🔴.*Fix navigation bug/);

        // Medium priority should have yellow
        expect(lastFrame()).toMatch(/🟡.*Write unit tests/);
        expect(lastFrame()).toMatch(/🟡.*Optimize database queries/);

        // Low priority should have green
        expect(lastFrame()).toMatch(/🟢.*Update documentation/);
      });
    });

    describe('When displaying with different layouts', () => {
      it('Then should support compact layout', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} layout="compact" />);

        expect(lastFrame()).toContain('Tasks: 5');
        // Compact layout should show fewer details
        expect(lastFrame()).not.toContain('activeForm');
      });

      it('Then should support detailed layout', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} layout="detailed" />);

        expect(lastFrame()).toContain('Implement authentication system');
        expect(lastFrame()).toContain('Write unit tests for API endpoints');
        expect(lastFrame()).toContain('Fix navigation bug in header component');
      });

      it('Then should support minimal layout', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} layout="minimal" />);

        expect(lastFrame()).toContain('⏳');
        expect(lastFrame()).toContain('🔄');
        expect(lastFrame()).toContain('✅');
        // Minimal layout should show basic status only
      });
    });

    describe('When filtering tasks', () => {
      it('Then should show only pending tasks when filtered', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} filter="pending" />);

        expect(lastFrame()).toContain('Implement authentication system');
        expect(lastFrame()).toContain('Optimize database queries');
        expect(lastFrame()).not.toContain('Write unit tests for API endpoints');
        expect(lastFrame()).not.toContain('Update documentation');
      });

      it('Then should show only in-progress tasks when filtered', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} filter="in_progress" />);

        expect(lastFrame()).toContain('Write unit tests for API endpoints');
        expect(lastFrame()).toContain('Fix navigation bug');
        expect(lastFrame()).not.toContain('Implement authentication system');
        expect(lastFrame()).not.toContain('Update documentation');
      });

      it('Then should show only completed tasks when filtered', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} filter="completed" />);

        expect(lastFrame()).toContain('Update documentation');
        expect(lastFrame()).not.toContain('Implement authentication system');
        expect(lastFrame()).not.toContain('Write unit tests for API endpoints');
      });

      it('Then should show only high priority tasks when filtered', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} filter="high_priority" />);

        expect(lastFrame()).toContain('Implement authentication system');
        expect(lastFrame()).toContain('Fix navigation bug');
        expect(lastFrame()).not.toContain('Write unit tests for API endpoints');
        expect(lastFrame()).not.toContain('Update documentation');
      });
    });

    describe('When sorting tasks', () => {
      it('Then should sort by priority when specified', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} sortBy="priority" />);

        const content = lastFrame();
        const authIndex = content.indexOf('Implement authentication system');
        const bugIndex = content.indexOf('Fix navigation bug');
        const testIndex = content.indexOf('Write unit tests');

        // High priority tasks should appear before medium priority
        expect(authIndex).toBeLessThan(testIndex);
        expect(bugIndex).toBeLessThan(testIndex);
      });

      it('Then should sort by status when specified', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} sortBy="status" />);

        const content = lastFrame();
        const completedIndex = content.indexOf('Update documentation');
        const progressIndex = content.indexOf('Write unit tests');
        const pendingIndex = content.indexOf('Implement authentication');

        // Should be ordered: completed, in_progress, pending
        expect(completedIndex).toBeLessThan(progressIndex);
        expect(progressIndex).toBeLessThan(pendingIndex);
      });

      it('Then should sort by progress when specified', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} sortBy="progress" />);

        const content = lastFrame();
        const completedIndex = content.indexOf('Update documentation'); // 100%
        const testIndex = content.indexOf('Write unit tests'); // 65%
        const bugIndex = content.indexOf('Fix navigation bug'); // 30%

        // Should be ordered by progress descending
        expect(completedIndex).toBeLessThan(testIndex);
        expect(testIndex).toBeLessThan(bugIndex);
      });
    });

    describe('When showing progress animations', () => {
      it('Then should animate progress bars for in-progress tasks', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} animated={true} />);

        expect(lastFrame()).toContain('🔄');
        expect(lastFrame()).toContain('65%');
        expect(lastFrame()).toContain('30%');
      });

      it('Then should show spinning indicators for active tasks', () => {
        const tasksWithActive = mockTasks.map(task =>
          task.id === '2' ? { ...task, isActive: true } : task
        );

        const { lastFrame } = render(<TaskList tasks={tasksWithActive} animated={true} />);

        expect(lastFrame()).toContain('⠋'); // Spinner character
      });

      it('Then should show completion animation for completed tasks', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} animated={true} />);

        expect(lastFrame()).toContain('✅');
        expect(lastFrame()).toContain('100%');
      });
    });

    describe('When displaying task messages', () => {
      it('Then should show task content as main message', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} />);

        expect(lastFrame()).toContain('Implement authentication system');
        expect(lastFrame()).toContain('Write unit tests for API endpoints');
      });

      it('Then should show active form when in progress', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} layout="detailed" />);

        expect(lastFrame()).toContain('Writing unit tests for API endpoints');
        expect(lastFrame()).toContain('Fixing navigation bug in header component');
      });

      it('Then should truncate long task messages', () => {
        const longTaskList = [{
          id: '1',
          content: 'This is a very long task description that should be truncated when displayed in the task list component because it exceeds the maximum length',
          status: 'pending',
          activeForm: 'Working on this very long task',
          priority: 'medium',
          duration: null,
          progress: 0
        }];

        const { lastFrame } = render(<TaskList tasks={longTaskList} />);

        expect(lastFrame()).toContain('...');
      });

      it('Then should show task IDs when requested', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} showIds={true} />);

        expect(lastFrame()).toContain('#1');
        expect(lastFrame()).toContain('#2');
        expect(lastFrame()).toContain('#3');
      });
    });

    describe('When handling empty states', () => {
      it('Then should show empty message when no tasks', () => {
        const { lastFrame } = render(<TaskList tasks={[]} />);

        expect(lastFrame()).toContain('No tasks found');
        expect(lastFrame()).toContain('Tasks will appear here when added');
      });

      it('Then should show filtered empty message', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} filter="completed" />);

        // Since we only have 1 completed task, if filtered differently might be empty
        const noCompletedTasks = mockTasks.filter(t => t.status === 'blocked');
        const { lastFrame: emptyFrame } = render(<TaskList tasks={noCompletedTasks} filter="completed" />);

        expect(emptyFrame()).toContain('No tasks found');
      });

      it('Then should show loading state when specified', () => {
        const { lastFrame } = render(<TaskList tasks={[]} loading={true} />);

        expect(lastFrame()).toContain('Loading tasks...');
        expect(lastFrame()).toContain('⠋'); // Spinner
      });
    });

    describe('When using interactive features', () => {
      it('Then should support task selection', () => {
        const onTaskSelect = vi.fn();
        const { lastFrame } = render(
          <TaskList tasks={mockTasks} onTaskSelect={onTaskSelect} selectedTaskId="2" />
        );

        expect(lastFrame()).toMatch(/❯.*Write unit tests for API endpoints/);
      });

      it('Then should highlight selected task', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} selectedTaskId="1" />);

        expect(lastFrame()).toMatch(/❯.*Implement authentication system/);
      });

      it('Then should show keyboard shortcuts when interactive', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} interactive={true} />);

        expect(lastFrame()).toContain('↑↓ Navigate');
        expect(lastFrame()).toContain('↵ Select');
        expect(lastFrame()).toContain('f Filter');
      });
    });

    describe('When customizing appearance', () => {
      it('Then should support custom theme colors', () => {
        const customTheme = {
          pending: 'blue',
          inProgress: 'yellow',
          completed: 'green',
          high: 'red',
          medium: 'orange',
          low: 'gray'
        };

        const { lastFrame } = render(<TaskList tasks={mockTasks} theme={customTheme} />);

        // Should still show tasks with custom styling
        expect(lastFrame()).toContain('Implement authentication system');
        expect(lastFrame()).toContain('Write unit tests for API endpoints');
      });

      it('Then should support compact spacing', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} spacing="compact" />);

        expect(lastFrame()).toContain('Tasks: 5');
        // Compact spacing should have fewer blank lines
      });

      it('Then should support wide spacing', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} spacing="wide" />);

        expect(lastFrame()).toContain('Tasks: 5');
        // Wide spacing should have more separation
      });

      it('Then should support borderless style', () => {
        const { lastFrame } = render(<TaskList tasks={mockTasks} border={false} />);

        expect(lastFrame()).toContain('TASK LIST');
        expect(lastFrame()).not.toContain('┌');
        expect(lastFrame()).not.toContain('└');
      });
    });

    describe('When showing detailed information', () => {
      it('Then should show task timestamps when available', () => {
        const tasksWithTimestamps = mockTasks.map(task => ({
          ...task,
          createdAt: '2025-09-19T10:30:00Z',
          updatedAt: '2025-09-19T11:45:00Z'
        }));

        const { lastFrame } = render(<TaskList tasks={tasksWithTimestamps} showTimestamps={true} />);

        expect(lastFrame()).toContain('Created:');
        expect(lastFrame()).toContain('Updated:');
      });

      it('Then should show task dependencies when present', () => {
        const tasksWithDeps = mockTasks.map(task =>
          task.id === '2' ? { ...task, dependencies: ['1'] } : task
        );

        const { lastFrame } = render(<TaskList tasks={tasksWithDeps} showDependencies={true} />);

        expect(lastFrame()).toContain('Depends on: #1');
      });

      it('Then should show task assignees when present', () => {
        const tasksWithAssignees = mockTasks.map(task => ({
          ...task,
          assignee: task.id === '1' ? 'Alice' : task.id === '2' ? 'Bob' : null
        }));

        const { lastFrame } = render(<TaskList tasks={tasksWithAssignees} showAssignees={true} />);

        expect(lastFrame()).toContain('Assigned: Alice');
        expect(lastFrame()).toContain('Assigned: Bob');
      });

      it('Then should show task tags when present', () => {
        const tasksWithTags = mockTasks.map(task => ({
          ...task,
          tags: task.id === '1' ? ['backend', 'security'] : task.id === '2' ? ['testing'] : []
        }));

        const { lastFrame } = render(<TaskList tasks={tasksWithTags} showTags={true} />);

        expect(lastFrame()).toContain('[backend]');
        expect(lastFrame()).toContain('[security]');
        expect(lastFrame()).toContain('[testing]');
      });
    });

    describe('When handling real-time updates', () => {
      it('Then should update display when tasks change', () => {
        const { rerender, lastFrame } = render(<TaskList tasks={mockTasks} />);

        // Update a task
        const updatedTasks = mockTasks.map(task =>
          task.id === '2' ? { ...task, progress: 80 } : task
        );

        rerender(<TaskList tasks={updatedTasks} />);

        expect(lastFrame()).toContain('[████████████████▓▓▓▓] 80%');
      });

      it('Then should show new tasks when added', () => {
        const { rerender, lastFrame } = render(<TaskList tasks={mockTasks} />);

        const newTask = {
          id: '6',
          content: 'New task added',
          status: 'pending',
          activeForm: 'Working on new task',
          priority: 'high',
          duration: null,
          progress: 0
        };

        rerender(<TaskList tasks={[...mockTasks, newTask]} />);

        expect(lastFrame()).toContain('New task added');
        expect(lastFrame()).toContain('Tasks: 6');
      });

      it('Then should animate progress changes', () => {
        const { rerender, lastFrame } = render(<TaskList tasks={mockTasks} animated={true} />);

        // Complete a task
        const completedTasks = mockTasks.map(task =>
          task.id === '2' ? { ...task, status: 'completed', progress: 100 } : task
        );

        rerender(<TaskList tasks={completedTasks} animated={true} />);

        expect(lastFrame()).toContain('✅');
        expect(lastFrame()).toContain('100%');
      });
    });
  });
});