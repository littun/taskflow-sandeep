import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { Project } from '../types';
import ProjectModal from '../components/projects/ProjectModal';
import { format } from 'date-fns';

function SkeletonCard() {
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="skeleton" style={{ height: 14, width: '70%', borderRadius: 4 }} />
          <div className="skeleton" style={{ height: 11, width: '50%', borderRadius: 4 }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 12, width: '90%', borderRadius: 4 }} />
      <div className="skeleton" style={{ height: 12, width: '60%', borderRadius: 4 }} />
    </div>
  );
}

const PROJECT_EMOJIS = ['🚀', '🎯', '💡', '🛠️', '🌟', '📦', '🎨', '⚡', '🔥', '🌈'];

function getEmoji(name: string) {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % PROJECT_EMOJIS.length;
  return PROJECT_EMOJIS[idx];
}

export default function ProjectsPage() {
  const { authFetch, user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await authFetch('/projects');
      if (!res.ok) throw new Error('Failed to load projects');
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch {
      setError('Failed to load projects. Please refresh.');
    } finally {
      setIsLoading(false);
    }
  }, [authFetch]);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreateProject = async (name: string, description: string) => {
    const res = await authFetch('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description: description || undefined }),
    });
    if (!res.ok) throw await res.json();
    const project = await res.json();
    setProjects((prev) => [project, ...prev]);
    addToast('Project created!', 'success');
  };

  const handleEditProject = async (name: string, description: string) => {
    if (!editingProject) return;
    const res = await authFetch(`/projects/${editingProject.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name, description: description || undefined }),
    });
    if (!res.ok) throw await res.json();
    const updated = await res.json();
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    addToast('Project updated!', 'success');
    setEditingProject(null);
  };

  const handleDeleteProject = async (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`Delete "${project.name}" and all its tasks? This cannot be undone.`)) return;
    const res = await authFetch(`/projects/${project.id}`, { method: 'DELETE' });
    if (!res.ok) { addToast('Failed to delete project', 'error'); return; }
    setProjects((prev) => prev.filter((p) => p.id !== project.id));
    addToast('Project deleted', 'info');
  };

  const openEdit = (e: React.MouseEvent, project: Project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProject(null);
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Projects</h1>
          <p className="page-subtitle">
            Welcome back, <strong>{user?.name?.split(' ')[0]}</strong> — manage your work below
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
          id="create-project-btn"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Project
        </button>
      </div>

      {/* Error state */}
      {error && !isLoading && (
        <div className="auth-error" role="alert" style={{ marginBottom: 24 }}>
          <span>⚠</span> {error}
          <button className="btn btn-ghost btn-sm" onClick={fetchProjects} style={{ marginLeft: 'auto' }}>
            Retry
          </button>
        </div>
      )}

      {/* Loading skeletons */}
      {isLoading && (
        <div className="projects-grid">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && projects.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">🗂️</div>
          <div className="empty-state-title">No projects yet</div>
          <p className="empty-state-desc">
            Create your first project to start organising tasks and collaborating with your team.
          </p>
          <button className="btn btn-primary" onClick={() => setModalOpen(true)} id="empty-create-project-btn">
            Create your first project
          </button>
        </div>
      )}

      {/* Projects grid */}
      {!isLoading && projects.length > 0 && (
        <div className="projects-grid">
          {projects.map((project) => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="project-card card-hover"
              id={`project-card-${project.id}`}
              aria-label={`Open project: ${project.name}`}
            >
              <div className="project-card-header">
                <div className="project-icon">{getEmoji(project.name)}</div>
                <div className="project-card-actions">
                  <button
                    className="btn-icon"
                    onClick={(e) => openEdit(e, project)}
                    aria-label={`Edit project: ${project.name}`}
                    id={`edit-project-${project.id}`}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon"
                    onClick={(e) => handleDeleteProject(e, project)}
                    aria-label={`Delete project: ${project.name}`}
                    id={`delete-project-${project.id}`}
                    title="Delete"
                    style={{ color: '#ef4444' }}
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div>
                <div className="project-name">{project.name}</div>
                {project.description ? (
                  <div className="project-description">{project.description}</div>
                ) : (
                  <div className="project-description" style={{ fontStyle: 'italic', opacity: 0.5 }}>
                    No description
                  </div>
                )}
              </div>

              <div className="project-meta">
                <div className="project-meta-item">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  {format(new Date(project.created_at), 'MMM d, yyyy')}
                </div>
                {project.owner_id === user?.id && (
                  <div className="project-meta-item" style={{ marginLeft: 'auto' }}>
                    <span className="badge" style={{ background: 'rgba(124,58,237,0.12)', color: 'var(--accent-secondary)', border: '1px solid rgba(124,58,237,0.2)', fontSize: 10 }}>
                      Owner
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}

          {/* Add new project card */}
          <button
            className="project-add-card"
            onClick={() => setModalOpen(true)}
            id="add-project-card-btn"
            aria-label="Create new project"
          >
            <div className="project-add-icon">+</div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>New Project</span>
          </button>
        </div>
      )}

      <ProjectModal
        isOpen={modalOpen}
        title={editingProject ? 'Edit Project' : 'New Project'}
        defaultName={editingProject?.name ?? ''}
        defaultDescription={editingProject?.description ?? ''}
        onClose={closeModal}
        onSubmit={editingProject ? handleEditProject : handleCreateProject}
      />
    </div>
  );
}
