import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';

const InvoicesPage = () => {
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);

  const loadInvoices = async () => {
    try {
      const [invoiceRes, clientRes, projectRes] = await Promise.all([
        api.get('/invoices'),
        api.get('/clients'),
        api.get('/projects'),
      ]);
      setInvoices(invoiceRes.data);
      setClients(clientRes.data);
      setProjects(projectRes.data);
    } catch (error) {
      console.error('Failed to load invoices', error);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const formik = useFormik({
    initialValues: {
      number: '',
      issueDate: '',
      dueDate: '',
      amount: 0,
      status: 'draft',
      clientId: '',
      projectId: '',
    },
    validationSchema: Yup.object({
      number: Yup.string().required('Number is required'),
      issueDate: Yup.string().required('Issue date is required'),
      dueDate: Yup.string().required('Due date is required'),
      amount: Yup.number().min(0).required('Amount is required'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const { data } = await api.post('/invoices', values);
        setInvoices((prev) => [data, ...prev]);
        resetForm();
        setOpen(false);
      } catch (error) {
        console.error('Failed to create invoice', error);
      }
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <div>
          <Typography variant="h4">Invoices</Typography>
          <Typography color="text.secondary">Manage billing and payment statuses.</Typography>
        </div>
        <Button variant="contained" onClick={() => setOpen(true)}>
          New invoice
        </Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Number</TableCell>
            <TableCell>Client</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>Issue date</TableCell>
            <TableCell>Due date</TableCell>
            <TableCell align="right">Amount</TableCell>
            <TableCell>Status</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {invoices.map((invoice) => (
            <TableRow key={invoice.id} hover>
              <TableCell>{invoice.number}</TableCell>
              <TableCell>{invoice.client?.name || '—'}</TableCell>
              <TableCell>{invoice.project?.name || '—'}</TableCell>
              <TableCell>{invoice.issueDate}</TableCell>
              <TableCell>{invoice.dueDate}</TableCell>
              <TableCell align="right">${invoice.amount.toFixed(2)}</TableCell>
              <TableCell>
                <Chip label={invoice.status} color={invoice.status === 'paid' ? 'success' : invoice.status === 'overdue' ? 'error' : 'default'} size="small" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>New invoice</DialogTitle>
        <DialogContent>
          <Box component="form" id="invoice-form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Number"
                  name="number"
                  value={formik.values.number}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.number && Boolean(formik.errors.number)}
                  helperText={formik.touched.number && formik.errors.number}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Issue date"
                  name="issueDate"
                  value={formik.values.issueDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.issueDate && Boolean(formik.errors.issueDate)}
                  helperText={formik.touched.issueDate && formik.errors.issueDate}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="date"
                  label="Due date"
                  name="dueDate"
                  value={formik.values.dueDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.dueDate && Boolean(formik.errors.dueDate)}
                  helperText={formik.touched.dueDate && formik.errors.dueDate}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  type="number"
                  label="Amount"
                  name="amount"
                  value={formik.values.amount}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.amount && Boolean(formik.errors.amount)}
                  helperText={formik.touched.amount && formik.errors.amount}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Client"
                  name="clientId"
                  value={formik.values.clientId}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">No client</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Project"
                  name="projectId"
                  value={formik.values.projectId}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">No project</MenuItem>
                  {projects.map((project) => (
                    <MenuItem key={project.id} value={project.id}>
                      {project.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Status"
                  name="status"
                  value={formik.values.status}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="sent">Sent</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="invoice-form" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvoicesPage;
