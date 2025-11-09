import { Invoice, Client, Project } from '../models/index.js';

export const createInvoice = (payload) => Invoice.create(payload);

export const listInvoices = () =>
  Invoice.findAll({
    include: [
      { model: Client, as: 'client' },
      { model: Project, as: 'project' },
    ],
    order: [['issueDate', 'DESC']],
  });

export const getInvoice = (id) =>
  Invoice.findByPk(id, {
    include: [
      { model: Client, as: 'client' },
      { model: Project, as: 'project' },
    ],
  });

export const updateInvoice = async (id, data) => {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) {
    return null;
  }
  await invoice.update(data);
  return invoice;
};

export const deleteInvoice = async (id) => {
  const invoice = await Invoice.findByPk(id);
  if (!invoice) {
    return false;
  }
  await invoice.destroy();
  return true;
};
