import { validationResult } from 'express-validator';
import {
  createProject,
  listProjects,
  getProject,
  updateProject,
  deleteProject,
} from '../services/project.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const project = await createProject(req.body);
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const list = async (_req, res) => {
  const projects = await listProjects();
  res.json(projects);
};

export const get = async (req, res) => {
  const project = await getProject(req.params.id);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  res.json(project);
};

export const update = async (req, res) => {
  const project = await updateProject(req.params.id, req.body);
  if (!project) {
    return res.status(404).json({ message: 'Project not found' });
  }
  res.json(project);
};

export const remove = async (req, res) => {
  const deleted = await deleteProject(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Project not found' });
  }
  res.status(204).send();
};
