import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Task, TaskStatus, User } from '../../types';
import TaskCard from './TaskCard';

interface Props {
  status: TaskStatus;
  tasks: Task[];
  members: User[];
  onAddTask: (status: TaskStatus) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

const COLUMN_CONFIG: Record<TaskStatus, { label: string; dotColor: string; emoji: string }> = {
  todo: { label: 'To Do', dotColor: '#6366f1', emoji: '📋' },
  in_progress: { label: 'In Progress', dotColor: '#f59e0b', emoji: '⚡' },
  done: { label: 'Done', dotColor: '#22c55e', emoji: '✅' },
};

export default function KanbanColumn({ status, tasks, members, onAddTask, onEditTask, onDeleteTask }: Props) {
  const config = COLUMN_CONFIG[status];

  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });

  return (
    <div className="kanban-column">
      <div className="kanban-column-header">
        <div className="kanban-column-title">
          <span className="kanban-dot" style={{ background: config.dotColor }} />
          {config.emoji} {config.label}
        </div>
        <span className="kanban-count">{tasks.length}</span>
      </div>

      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={`kanban-tasks ${isOver ? 'drop-over' : ''}`}
          aria-label={`${config.label} column with ${tasks.length} tasks`}
          id={`kanban-col-${status}`}
        >
          {tasks.length === 0 && (
            <div style={{
              padding: '20px 0',
              textAlign: 'center',
              color: 'var(--text-tertiary)',
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 28, opacity: 0.4 }}>{config.emoji}</span>
              <span>No tasks here yet</span>
            </div>
          )}

          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              members={members}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      </SortableContext>

      <button
        className="kanban-add-task"
        onClick={() => onAddTask(status)}
        id={`add-task-${status}-btn`}
        aria-label={`Add task to ${config.label}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Add task
      </button>
    </div>
  );
}
