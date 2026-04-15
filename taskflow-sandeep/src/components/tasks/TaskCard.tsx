import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast, parseISO } from 'date-fns';
import type { Task, User } from '../../types';

interface Props {
  task: Task;
  members: User[];
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
};

export default function TaskCard({ task, members, onEdit, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const assignee = members.find((m) => m.id === task.assignee_id);
  const initials = assignee
    ? assignee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : null;

  const isOverdue =
    task.due_date && task.status !== 'done' && isPast(parseISO(task.due_date));

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(task);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Delete "${task.title}"?`)) {
      onDelete(task.id);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`task-card ${isDragging ? 'dragging' : ''}`}
      aria-label={`Task: ${task.title}`}
      data-task-id={task.id}
      {...attributes}
      {...listeners}
    >
      {/* Priority side bar */}
      <div className={`task-card-priority-bar ${task.priority}`} />

      {/* Title */}
      <div className="task-card-title">{task.title}</div>

      {/* Description */}
      {task.description && (
        <div className="task-card-desc">{task.description}</div>
      )}

      {/* Footer */}
      <div className="task-card-footer">
        <div className="task-card-meta">
          {/* Priority badge */}
          <span className={`badge badge-${task.priority}`}>
            {PRIORITY_LABELS[task.priority]}
          </span>

          {/* Due date */}
          {task.due_date && (
            <span className={`task-due-date ${isOverdue ? 'overdue' : ''}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {format(parseISO(task.due_date), 'MMM d')}
            </span>
          )}

          {/* Assignee avatar */}
          {assignee && (
            <div className="task-assignee-avatar" title={assignee.name}>
              {initials}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="task-card-actions">
          <button
            className="btn-icon"
            onClick={handleEdit}
            aria-label={`Edit task: ${task.title}`}
            id={`edit-task-${task.id}`}
            style={{ fontSize: 13 }}
          >
            ✏️
          </button>
          <button
            className="btn-icon"
            onClick={handleDelete}
            aria-label={`Delete task: ${task.title}`}
            id={`delete-task-${task.id}`}
            style={{ fontSize: 13 }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}
