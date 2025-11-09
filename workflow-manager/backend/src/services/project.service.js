import { Project, Client, Shift } from '../models/index.js';

export const createProject = (payload) => Project.create(payload);

export const listProjects = () =>
  Project.findAll({
    include: [{ model: Client, as: 'client' }, { model: Shift, as: 'projectShifts' }],
  });

export const getProject = (id) =>
  Project.findByPk(id, {
    include: [{ model: Client, as: 'client' }, { model: Shift, as: 'projectShifts' }],
  });

export const updateProject = async (id, data) => {
  const project = await Project.findByPk(id);
  if (!project) {
    return null;
  }
  await project.update(data);
  return project;
};

export const deleteProject = async (id) => {
  const project = await Project.findByPk(id);
  if (!project) {
    return false;
  }
  await project.destroy();
  return true;
};
