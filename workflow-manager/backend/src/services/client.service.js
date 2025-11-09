import { Client, Project, Invoice } from '../models/index.js';

export const createClient = (payload) => Client.create(payload);

export const listClients = () =>
  Client.findAll({
    include: [
      { model: Project, as: 'projects' },
      { model: Invoice, as: 'invoices' },
    ],
  });

export const getClient = (id) =>
  Client.findByPk(id, {
    include: [
      { model: Project, as: 'projects' },
      { model: Invoice, as: 'invoices' },
    ],
  });

export const updateClient = async (id, data) => {
  const client = await Client.findByPk(id);
  if (!client) {
    return null;
  }
  await client.update(data);
  return client;
};

export const deleteClient = async (id) => {
  const client = await Client.findByPk(id);
  if (!client) {
    return false;
  }
  await client.destroy();
  return true;
};
