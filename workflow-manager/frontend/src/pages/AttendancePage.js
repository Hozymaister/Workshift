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
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';

const AttendancePage = () => {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [open, setOpen] = useState(false);

  const loadAttendance = async () => {
    try {
      const [attendanceRes, employeesRes, shiftsRes] = await Promise.all([
        api.get('/attendance'),
        api.get('/employees'),
        api.get('/shifts'),
      ]);
      setRecords(attendanceRes.data);
      setEmployees(employeesRes.data);
      setShifts(shiftsRes.data);
    } catch (error) {
      console.error('Failed to load attendance', error);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  const formik = useFormik({
    initialValues: {
      employeeId: '',
      shiftId: '',
      checkIn: '',
      checkOut: '',
      status: 'present',
    },
    validationSchema: Yup.object({
      employeeId: Yup.number().required('Employee is required'),
      checkIn: Yup.string().required('Check-in is required'),
      checkOut: Yup.string(),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const { data } = await api.post('/attendance', values);
        setRecords((prev) => [data, ...prev]);
        resetForm();
        setOpen(false);
      } catch (error) {
        console.error('Failed to create attendance record', error);
      }
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <div>
          <Typography variant="h4">Attendance</Typography>
          <Typography color="text.secondary">Track employee check-ins and worked hours.</Typography>
        </div>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Add record
        </Button>
      </Box>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Employee</TableCell>
            <TableCell>Shift</TableCell>
            <TableCell>Check-in</TableCell>
            <TableCell>Check-out</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Hours</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id} hover>
              <TableCell>
                {record.employee?.firstName ? `${record.employee.firstName} ${record.employee.lastName}` : '—'}
              </TableCell>
              <TableCell>{record.shift?.title || '—'}</TableCell>
              <TableCell>{new Date(record.checkIn).toLocaleString()}</TableCell>
              <TableCell>{record.checkOut ? new Date(record.checkOut).toLocaleString() : '—'}</TableCell>
              <TableCell>{record.status}</TableCell>
              <TableCell align="right">{record.hoursWorked?.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add attendance</DialogTitle>
        <DialogContent>
          <Box component="form" id="attendance-form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
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
              <Grid item xs={12}>
                <TextField
                  select
                  fullWidth
                  label="Shift"
                  name="shiftId"
                  value={formik.values.shiftId}
                  onChange={formik.handleChange}
                >
                  <MenuItem value="">No shift</MenuItem>
                  {shifts.map((shift) => (
                    <MenuItem key={shift.id} value={shift.id}>
                      {shift.title}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Check-in"
                  name="checkIn"
                  value={formik.values.checkIn}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.checkIn && Boolean(formik.errors.checkIn)}
                  helperText={formik.touched.checkIn && formik.errors.checkIn}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Check-out"
                  name="checkOut"
                  value={formik.values.checkOut}
                  onChange={formik.handleChange}
                />
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
                  <MenuItem value="present">Present</MenuItem>
                  <MenuItem value="late">Late</MenuItem>
                  <MenuItem value="excused">Excused</MenuItem>
                  <MenuItem value="absent">Absent</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="attendance-form" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendancePage;
