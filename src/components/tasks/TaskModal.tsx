import React, { useState, useEffect } from 'react';
import type { Task, TaskStatus, TaskPriority, User } from '../../types';

interface Props {
  isOpen: boolean;
  task?: Task | null;        // null = create mode
  members: User[];
  defaultStatus?: TaskStatus;
  onClose: () => void;
  onSubmit: (data: Partial<Task> & { title: string }) => Promise<void>;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#ef4444' },
];

const STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
];

export default function TaskModal({ isOpen, task, members, defaultStatus = 'todo', onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [assigneeId, setAssigneeId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = Boolean(task);

  useEffect(() => {
    if (isOpen) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description ?? '');
        setStatus(task.status);
        setPriority(task.priority);
        setAssigneeId(task.assignee_id ?? '');
        setDueDate(task.due_date ?? '');
      } else {
        setTitle('');
        setDescription('');
        setStatus(defaultStatus);
        setPriority('medium');
        setAssigneeId('');
        setDueDate('');
      }
      setErrors({});
    }
  }, [isOpen, task, defaultStatus]);

  if (!isOpen) return null;

  const validate = () => {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = 'Title is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setIsLoading(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        assignee_id: assigneeId || undefined,
        due_date: dueDate || undefined,
      });
      onClose();
    } catch {
      setErrors({ global: 'Failed to save task. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Edit task' : 'Create new task'}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close" id="task-modal-close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.global && (
              <div className="auth-error" role="alert"><span>⚠</span> {errors.global}</div>
            )}

            {/* Title */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-title-input">Title *</label>
              <input
                id="task-title-input"
                type="text"
                className={`form-input ${errors.title ? 'input-error' : ''}`}
                placeholder="What needs to be done?"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
              {errors.title && <span className="form-error">⚠ {errors.title}</span>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label" htmlFor="task-description-input">Description</label>
              <textarea
                id="task-description-input"
                className="form-textarea"
                placeholder="Add more context (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            {/* Status + Priority row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="task-status-select">Status</label>
                <select
                  id="task-status-select"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-priority-select">Priority</label>
                <select
                  id="task-priority-select"
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Assignee + Due Date row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="task-assignee-select">Assignee</label>
                <select
                  id="task-assignee-select"
                  className="form-select"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="task-due-date-input">Due Date</label>
                <input
                  id="task-due-date-input"
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
              </div>
            </div>

            {/* Priority visual indicator */}
            <div style={{ display: 'flex', gap: 8 }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 8,
                    border: `2px solid ${priority === p.value ? p.color : 'var(--border-default)'}`,
                    background: priority === p.value ? `${p.color}18` : 'var(--bg-input)',
                    color: priority === p.value ? p.color : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 700,
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                  }}
                  id={`priority-${p.value}-btn`}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} id="task-modal-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading} id="task-modal-submit-btn">
              {isLoading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              ) : isEditing ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
