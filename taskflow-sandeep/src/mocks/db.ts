import { v4 as uuidv4 } from 'uuid';
import type { User, Project, Task } from '../types';

// Seed Data
const seedUserId = 'user-seed-001';
const seedProjectId = 'project-seed-001';
const now = new Date().toISOString();

export const db = {
  users: [
    {
      id: seedUserId,
      name: 'Test User',
      email: 'test@example.com',
      // bcrypt of "password123" — stored here as plain for mock only
      password: 'password123',
      created_at: now,
    },
  ] as (User & { password: string })[],

  projects: [
    {
      id: seedProjectId,
      name: 'Website Redesign',
      description: 'Q2 project — redesign the marketing site',
      owner_id: seedUserId,
      created_at: now,
    },
  ] as Project[],

  tasks: [
    {
      id: uuidv4(),
      title: 'Design new homepage mockup',
      description: 'Create Figma designs for the new homepage layout.',
      status: 'todo' as const,
      priority: 'high' as const,
      project_id: seedProjectId,
      assignee_id: seedUserId,
      due_date: '2026-04-30',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      title: 'Implement navigation component',
      description: 'Build the responsive nav with mobile hamburger menu.',
      status: 'in_progress' as const,
      priority: 'medium' as const,
      project_id: seedProjectId,
      assignee_id: seedUserId,
      due_date: '2026-04-22',
      created_at: now,
      updated_at: now,
    },
    {
      id: uuidv4(),
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated deployments.',
      status: 'done' as const,
      priority: 'low' as const,
      project_id: seedProjectId,
      assignee_id: undefined,
      due_date: undefined,
      created_at: now,
      updated_at: now,
    },
  ] as Task[],
};

// Helper functions
export function findUserByEmail(email: string) {
  return db.users.find((u) => u.email === email);
}

export function findUserById(id: string) {
  return db.users.find((u) => u.id === id);
}

export function createUser(name: string, email: string, password: string): User {
  const user = {
    id: uuidv4(),
    name,
    email,
    password,
    created_at: new Date().toISOString(),
  };
  db.users.push(user);
  const { password: _pw, ...publicUser } = user;
  return publicUser;
}

export function getProjectsForUser(userId: string): Project[] {
  return db.projects.filter(
    (p) =>
      p.owner_id === userId ||
      db.tasks.some((t) => t.project_id === p.id && t.assignee_id === userId)
  );
}

export function getProjectById(id: string): Project | undefined {
  return db.projects.find((p) => p.id === id);
}

export function createProject(name: string, description: string | undefined, ownerId: string): Project {
  const project: Project = {
    id: uuidv4(),
    name,
    description,
    owner_id: ownerId,
    created_at: new Date().toISOString(),
  };
  db.projects.push(project);
  return project;
}

export function updateProject(id: string, data: Partial<Pick<Project, 'name' | 'description'>>): Project | null {
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  db.projects[idx] = { ...db.projects[idx], ...data };
  return db.projects[idx];
}

export function deleteProject(id: string): boolean {
  const idx = db.projects.findIndex((p) => p.id === id);
  if (idx === -1) return false;
  db.projects.splice(idx, 1);
  db.tasks = db.tasks.filter((t) => t.project_id !== id);
  return true;
}

export function getTasksForProject(projectId: string, filters?: { status?: string; assignee?: string }): Task[] {
  let tasks = db.tasks.filter((t) => t.project_id === projectId);
  if (filters?.status) tasks = tasks.filter((t) => t.status === filters.status);
  if (filters?.assignee) tasks = tasks.filter((t) => t.assignee_id === filters.assignee);
  return tasks;
}

export function createTask(projectId: string, data: Omit<Task, 'id' | 'project_id' | 'status' | 'created_at' | 'updated_at'>): Task {
  const task: Task = {
    id: uuidv4(),
    project_id: projectId,
    status: 'todo',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...data,
  };
  db.tasks.push(task);
  return task;
}

export function updateTask(id: string, data: Partial<Task>): Task | null {
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  db.tasks[idx] = { ...db.tasks[idx], ...data, updated_at: new Date().toISOString() };
  return db.tasks[idx];
}

export function deleteTask(id: string): boolean {
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return false;
  db.tasks.splice(idx, 1);
  return true;
}

// Simple JWT-like token store (mock)
const tokenStore = new Map<string, string>(); // token -> userId

export function createToken(userId: string): string {
  const token = `mock-jwt-${userId}-${Date.now()}`;
  tokenStore.set(token, userId);
  return token;
}

export function getUserIdFromToken(token: string): string | null {
  return tokenStore.get(token) ?? null;
}
