import { http, HttpResponse } from 'msw';
import {
  findUserByEmail,
  createUser,
  createToken,
  getUserIdFromToken,
  getProjectsForUser,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  getTasksForProject,
  createTask,
  updateTask,
  deleteTask,
} from './db';

const BASE = 'http://localhost:4000';

function getAuthUserId(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  return getUserIdFromToken(token);
}

export const handlers = [
  // POST /auth/register
  http.post(`${BASE}/auth/register`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string; password?: string };
    const fields: Record<string, string> = {};
    if (!body.name) fields.name = 'is required';
    if (!body.email) fields.email = 'is required';
    if (!body.password) fields.password = 'is required';
    if (Object.keys(fields).length > 0) {
      return HttpResponse.json({ error: 'validation failed', fields }, { status: 400 });
    }
    const existing = findUserByEmail(body.email!);
    if (existing) {
      return HttpResponse.json({ error: 'validation failed', fields: { email: 'already in use' } }, { status: 400 });
    }
    const user = createUser(body.name!, body.email!, body.password!);
    const token = createToken(user.id);
    return HttpResponse.json({ token, user }, { status: 201 });
  }),

  // POST /auth/login
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };
    const fields: Record<string, string> = {};
    if (!body.email) fields.email = 'is required';
    if (!body.password) fields.password = 'is required';
    if (Object.keys(fields).length > 0) {
      return HttpResponse.json({ error: 'validation failed', fields }, { status: 400 });
    }
    const userRecord = findUserByEmail(body.email!);
    if (!userRecord || userRecord.password !== body.password) {
      return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    const token = createToken(userRecord.id);
    const { password: _pw, ...user } = userRecord;
    return HttpResponse.json({ token, user }, { status: 200 });
  }),

  // GET /projects
  http.get(`${BASE}/projects`, ({ request }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const projects = getProjectsForUser(userId);
    return HttpResponse.json({ projects });
  }),

  // POST /projects
  http.post(`${BASE}/projects`, async ({ request }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = (await request.json()) as { name?: string; description?: string };
    if (!body.name) {
      return HttpResponse.json({ error: 'validation failed', fields: { name: 'is required' } }, { status: 400 });
    }
    const project = createProject(body.name, body.description, userId);
    return HttpResponse.json(project, { status: 201 });
  }),

  // GET /projects/:id
  http.get(`${BASE}/projects/:id`, ({ request, params }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const project = getProjectById(params.id as string);
    if (!project) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    const tasks = getTasksForProject(params.id as string);
    return HttpResponse.json({ ...project, tasks });
  }),

  // PATCH /projects/:id
  http.patch(`${BASE}/projects/:id`, async ({ request, params }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const project = getProjectById(params.id as string);
    if (!project) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    if (project.owner_id !== userId) return HttpResponse.json({ error: 'forbidden' }, { status: 403 });
    const body = (await request.json()) as { name?: string; description?: string };
    const updated = updateProject(params.id as string, body);
    return HttpResponse.json(updated);
  }),

  // DELETE /projects/:id
  http.delete(`${BASE}/projects/:id`, ({ request, params }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const project = getProjectById(params.id as string);
    if (!project) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    if (project.owner_id !== userId) return HttpResponse.json({ error: 'forbidden' }, { status: 403 });
    deleteProject(params.id as string);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /projects/:id/tasks
  http.get(`${BASE}/projects/:id/tasks`, ({ request, params }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const url = new URL(request.url);
    const status = url.searchParams.get('status') ?? undefined;
    const assignee = url.searchParams.get('assignee') ?? undefined;
    const tasks = getTasksForProject(params.id as string, { status, assignee });
    return HttpResponse.json({ tasks });
  }),

  // POST /projects/:id/tasks
  http.post(`${BASE}/projects/:id/tasks`, async ({ request, params }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = (await request.json()) as { title?: string; description?: string; priority?: string; assignee_id?: string; due_date?: string };
    if (!body.title) {
      return HttpResponse.json({ error: 'validation failed', fields: { title: 'is required' } }, { status: 400 });
    }
    const task = createTask(params.id as string, {
      title: body.title,
      description: body.description,
      priority: (body.priority as any) || 'medium',
      assignee_id: body.assignee_id,
      due_date: body.due_date,
    });
    return HttpResponse.json(task, { status: 201 });
  }),

  // PATCH /tasks/:id
  http.patch(`${BASE}/tasks/:id`, async ({ request, params }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;
    const updated = updateTask(params.id as string, body as any);
    if (!updated) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    return HttpResponse.json(updated);
  }),

  // DELETE /tasks/:id
  http.delete(`${BASE}/tasks/:id`, ({ request, params }) => {
    const userId = getAuthUserId(request);
    if (!userId) return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
    const deleted = deleteTask(params.id as string);
    if (!deleted) return HttpResponse.json({ error: 'not found' }, { status: 404 });
    return new HttpResponse(null, { status: 204 });
  }),
];
