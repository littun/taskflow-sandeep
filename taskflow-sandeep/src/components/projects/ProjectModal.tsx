import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  title: string;
  defaultName?: string;
  defaultDescription?: string;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
}

export default function ProjectModal({ isOpen, title, defaultName = '', defaultDescription = '', onClose, onSubmit }: Props) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState(defaultDescription);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDescription(defaultDescription);
      setError('');
    }
  }, [isOpen, defaultName, defaultDescription]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Project name is required'); return; }
    setError('');
    setIsLoading(true);
    try {
      await onSubmit(name.trim(), description.trim());
      onClose();
    } catch {
      setError('Failed to save project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} onKeyDown={handleKeyDown}>
      <div className="modal-panel">
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal" id="modal-close-btn">✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="auth-error" role="alert">
                <span>⚠</span> {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="project-name-input">Project Name *</label>
              <input
                id="project-name-input"
                type="text"
                className={`form-input ${error && !name.trim() ? 'input-error' : ''}`}
                placeholder="e.g. Website Redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="project-description-input">Description</label>
              <textarea
                id="project-description-input"
                className="form-textarea"
                placeholder="What is this project about? (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} id="modal-cancel-btn">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isLoading} id="modal-submit-btn">
              {isLoading ? (
                <><span className="spinner" style={{ width: 14, height: 14 }} /> Saving…</>
              ) : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
