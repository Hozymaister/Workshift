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

const PayrollPage = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [open, setOpen] = useState(false);

  const loadPayrolls = async () => {
    try {
      const [payrollRes, employeesRes] = await Promise.all([api.get('/payroll'), api.get('/employees')]);
      setPayrolls(payrollRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error('Failed to load payroll', error);
    }
  };

  useEffect(() => {
    loadPayrolls();
  }, []);

  const formik = useFormik({
    initialValues: {
      employeeId: '',
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    },
    validationSchema: Yup.object({
      employeeId: Yup.number().required('Employee is required'),
      month: Yup.number().min(1).max(12).required('Month is required'),
      year: Yup.number().min(2000).required('Year is required'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const { data } = await api.post('/payroll', values);
        setPayrolls((prev) => [data, ...prev]);
        resetForm();
        setOpen(false);
      } catch (error) {
        console.error('Failed to generate payroll', error);
      }
    },
  });

  const updateStatus = async (id, status) => {
    const { data } = await api.patch(`/payroll/${id}/status`, { status });
    setPayrolls((prev) => prev.map((item) => (item.id === id ? data : item)));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <div>
          <Typography variant="h4">Payroll</Typography>
          <Typography color="text.secondary">Generate monthly payroll summaries.</Typography>
        </div>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Generate payroll
        </Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Period</TableCell>
            <TableCell align="right">Gross</TableCell>
            <TableCell align="right">Taxes</TableCell>
            <TableCell align="right">Net</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {payrolls.map((payroll) => (
            <TableRow key={payroll.id} hover>
              <TableCell>
                {payroll.employee?.firstName ? `${payroll.employee.firstName} ${payroll.employee.lastName}` : '—'}
              </TableCell>
              <TableCell>
                {payroll.month}/{payroll.year}
              </TableCell>
              <TableCell align="right">${payroll.grossPay.toFixed(2)}</TableCell>
              <TableCell align="right">${payroll.taxes.toFixed(2)}</TableCell>
              <TableCell align="right">${payroll.netPay.toFixed(2)}</TableCell>
              <TableCell>
                <Chip label={payroll.status} color={payroll.status === 'paid' ? 'success' : 'default'} size="small" />
              </TableCell>
              <TableCell align="right">
                {payroll.status !== 'paid' && (
                  <Button size="small" onClick={() => updateStatus(payroll.id, 'paid')}>
                    Mark paid
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate payroll</DialogTitle>
        <DialogContent>
          <Box component="form" id="payroll-form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Employee"
                  name="employeeId"
                  value={formik.values.employeeId}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.employeeId && Boolean(formik.errors.employeeId)}
                  helperText={formik.touched.employeeId && formik.errors.employeeId}
                >
                  {employees.map((employee) => (
                    <MenuItem key={employee.id} value={employee.id}>
                      {employee.firstName} {employee.lastName}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Month"
                  name="month"
                  value={formik.values.month}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.month && Boolean(formik.errors.month)}
                  helperText={formik.touched.month && formik.errors.month}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Year"
                  name="year"
                  value={formik.values.year}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.year && Boolean(formik.errors.year)}
                  helperText={formik.touched.year && formik.errors.year}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="payroll-form" variant="contained">
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PayrollPage;
