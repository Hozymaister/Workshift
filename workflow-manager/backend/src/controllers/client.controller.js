import { validationResult } from 'express-validator';
import {
  createClient,
  listClients,
  getClient,
  updateClient,
  deleteClient,
} from '../services/client.service.js';

export const create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const client = await createClient(req.body);
    res.status(201).json(client);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const list = async (_req, res) => {
  const clients = await listClients();
  res.json(clients);
};

export const get = async (req, res) => {
  const client = await getClient(req.params.id);
  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }
  res.json(client);
};

export const update = async (req, res) => {
  const client = await updateClient(req.params.id, req.body);
  if (!client) {
    return res.status(404).json({ message: 'Client not found' });
  }
  res.json(client);
};

export const remove = async (req, res) => {
  const deleted = await deleteClient(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: 'Client not found' });
  }
  res.status(204).send();
};
