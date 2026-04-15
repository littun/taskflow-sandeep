import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core';
import '@dnd-kit/sortable';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Project, Task, TaskStatus, User } from '../types';
import KanbanColumn from '../components/tasks/KanbanColumn';
import TaskCard from '../components/tasks/TaskCard';
import TaskModal from '../components/tasks/TaskModal';
import { db } from '../mocks/db';

const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'done'];

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authFetch, user } = useAuth();
  const { addToast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter state
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState('all');

  // Task modal
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');

  // DnD — store original status before drag so handleDragEnd compares correctly
  const dragOriginStatus = useRef<TaskStatus | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  // Load project + tasks
  const fetchProject = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await authFetch(`/projects/${id}`);
      if (res.status === 404) { setError('Project not found.'); setIsLoading(false); return; }
      if (!res.ok) throw new Error('Failed to load project');
      const data = await res.json();
      setProject(data);
      setTasks(data.tasks ?? []);
      // Collect unique members from task assignees + current user
      const userIds = new Set<string>([user!.id]);
      (data.tasks ?? []).forEach((t: Task) => { if (t.assignee_id) userIds.add(t.assignee_id); });
      const mems = db.users
        .filter((u) => userIds.has(u.id))
        .map(({ password: _pw, ...u }) => u as User);
      setMembers(mems);
    } catch {
      setError('Something went wrong loading the project.');
    } finally {
      setIsLoading(false);
    }
  }, [id, authFetch, user]);

  useEffect(() => { fetchProject(); }, [fetchProject]);

  // Filtered task list per column
  const getColumnTasks = (status: TaskStatus) => {
    return tasks.filter((t) => {
      if (t.status !== status) return false;
      if (filterAssignee !== 'all' && t.assignee_id !== filterAssignee) return false;
      return true;
    });
  };

  // CREATE TASK
  const handleCreateTask = async (data: Partial<Task> & { title: string }) => {
    const res = await authFetch(`/projects/${id}/tasks`, {
      method: 'POST',
      body: JSON.stringify({ ...data, status: newTaskStatus }),
    });
    if (!res.ok) throw await res.json();
    const task = await res.json();
    setTasks((prev) => [...prev, task]);
    // Update members if new assignee
    if (task.assignee_id && !members.find((m) => m.id === task.assignee_id)) {
      const found = db.users.find((u) => u.id === task.assignee_id);
      if (found) {
        const { password: _pw, ...m } = found;
        setMembers((prev) => [...prev, m as User]);
      }
    }
    addToast('Task created!', 'success');
  };

  // EDIT TASK
  const handleEditTask = async (data: Partial<Task> & { title: string }) => {
    if (!editingTask) return;
    const res = await authFetch(`/tasks/${editingTask.id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) throw await res.json();
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    addToast('Task updated!', 'success');
  };

  // DELETE TASK
  const handleDeleteTask = async (taskId: string) => {
    const prev = tasks;
    // Optimistic remove
    setTasks((t) => t.filter((x) => x.id !== taskId));
    const res = await authFetch(`/tasks/${taskId}`, { method: 'DELETE' });
    if (!res.ok) {
      setTasks(prev); // revert
      addToast('Failed to delete task', 'error');
      return;
    }
    addToast('Task deleted', 'info');
  };

  // DND HANDLERS
  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
    // Snapshot original status so handleDragEnd knows if col actually changed
    dragOriginStatus.current = task?.status ?? null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const overId = String(over.id);

    // Detect if we're over a column drop zone
    const overColStatus = STATUSES.find((s) => `col-${s}` === overId);
    if (!overColStatus) return;

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask || draggedTask.status === overColStatus) return;

    // Optimistic status update
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id ? { ...t, status: overColStatus } : t
      )
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const originalStatus = dragOriginStatus.current;
    dragOriginStatus.current = null;
    setActiveTask(null);
    if (!over) {
      // Dropped outside — revert any optimistic change
      if (originalStatus) {
        setTasks((prev) =>
          prev.map((t) => t.id === active.id ? { ...t, status: originalStatus } : t)
        );
      }
      return;
    }

    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) return;

    const overId = String(over.id);
    const overColStatus = STATUSES.find((s) => `col-${s}` === overId);
    const overTask = tasks.find((t) => t.id === overId);
    const targetStatus: TaskStatus = overColStatus ?? overTask?.status ?? draggedTask.status;

    // Apply final status (may already be set by handleDragOver, but ensure it's correct)
    setTasks((prev) =>
      prev.map((t) =>
        t.id === draggedTask.id ? { ...t, status: targetStatus } : t
      )
    );

    // Only call API if the column actually changed from the original
    if (originalStatus && targetStatus !== originalStatus) {
      const snapshot = tasks.map((t) =>
        t.id === draggedTask.id ? { ...t, status: originalStatus } : t
      );
      try {
        const res = await authFetch(`/tasks/${draggedTask.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ status: targetStatus }),
        });
        if (!res.ok) throw new Error();
        addToast(`Moved to "${targetStatus.replace('_', ' ')}"`, 'success');
      } catch {
        setTasks(snapshot); // revert on error
        addToast('Failed to update task status', 'error');
      }
    }
  };

  // Modal open helpers
  const openCreateTask = (status: TaskStatus) => {
    setEditingTask(null);
    setNewTaskStatus(status);
    setTaskModalOpen(true);
  };

  const openEditTask = (task: Task) => {
    setEditingTask(task);
    setTaskModalOpen(true);
  };

  // --- RENDER ---
  if (isLoading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-primary" />
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading project…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <div className="empty-state">
          <div className="empty-state-icon">😕</div>
          <div className="empty-state-title">Oops!</div>
          <p className="empty-state-desc">{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/projects')}>
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === 'done').length;
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="page-wrapper">
      {/* Back button */}
      <button className="project-back-btn" onClick={() => navigate('/projects')} id="back-to-projects-btn">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        All Projects
      </button>

      {/* Project header */}
      <div className="page-header">
        <div style={{ flex: 1 }}>
          <h1 className="page-title">{project?.name}</h1>
          {project?.description && (
            <p className="page-subtitle">{project.description}</p>
          )}

          {/* Progress bar */}
          {totalTasks > 0 && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                flex: 1, maxWidth: 240, height: 6, background: 'var(--bg-tertiary)',
                borderRadius: 3, overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: 'var(--accent-gradient)',
                  borderRadius: 3,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                {doneTasks}/{totalTasks} done · {progress}%
              </span>
            </div>
          )}
        </div>

        <button
          className="btn btn-primary"
          onClick={() => openCreateTask('todo')}
          id="create-task-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Task
        </button>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>Filter:</span>

        {/* Status filter */}
        {(['all', 'todo', 'in_progress', 'done'] as const).map((s) => (
          <button
            key={s}
            className={`filter-chip ${filterStatus === s ? 'active' : ''}`}
            onClick={() => setFilterStatus(s)}
            id={`filter-status-${s}`}
          >
            {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}

        {members.length > 0 && (
          <>
            <div style={{ width: 1, height: 20, background: 'var(--border-default)', margin: '0 4px' }} />
            <select
              className="form-select"
              style={{ width: 'auto', padding: '6px 28px 6px 10px', fontSize: 13 }}
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              id="filter-assignee-select"
            >
              <option value="all">All Assignees</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </>
        )}
      </div>

      {/* Kanban board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className={`kanban-board ${filterStatus !== 'all' ? 'kanban-filtered' : ''}`}
          style={filterStatus !== 'all' ? { gridTemplateColumns: '1fr', maxWidth: 480 } : undefined}
        >
          {STATUSES.filter((s) => filterStatus === 'all' || filterStatus === s).map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={getColumnTasks(status)}
              members={members}
              onAddTask={openCreateTask}
              onEditTask={openEditTask}
              onDeleteTask={handleDeleteTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div style={{ transform: 'rotate(2deg)' }}>
              <TaskCard
                task={activeTask}
                members={members}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      <TaskModal
        isOpen={taskModalOpen}
        task={editingTask}
        members={members}
        defaultStatus={newTaskStatus}
        onClose={() => { setTaskModalOpen(false); setEditingTask(null); }}
        onSubmit={editingTask ? handleEditTask : handleCreateTask}
      />
    </div>
  );
}
