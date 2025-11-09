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

const ShiftsPage = () => {
  const [shifts, setShifts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projects, setProjects] = useState([]);
  const [open, setOpen] = useState(false);

  const loadData = async () => {
    try {
      const [shiftResponse, employeeResponse, projectResponse] = await Promise.all([
        api.get('/shifts'),
        api.get('/employees'),
        api.get('/projects'),
      ]);
      setShifts(shiftResponse.data);
      setEmployees(employeeResponse.data);
      setProjects(projectResponse.data);
    } catch (error) {
      console.error('Failed to load shift data', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formik = useFormik({
    initialValues: {
      title: '',
      startTime: '',
      endTime: '',
      employeeId: '',
      projectId: '',
      status: 'scheduled',
      notes: '',
    },
    validationSchema: Yup.object({
      title: Yup.string().required('Title is required'),
      startTime: Yup.string().required('Start time is required'),
      endTime: Yup.string().required('End time is required'),
      employeeId: Yup.number().required('Employee is required'),
    }),
    onSubmit: async (values, { resetForm }) => {
      try {
        const { data } = await api.post('/shifts', values);
        setShifts((prev) => [data, ...prev]);
        resetForm();
        setOpen(false);
      } catch (error) {
        console.error('Failed to create shift', error);
      }
    },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <div>
          <Typography variant="h4">Shifts</Typography>
          <Typography color="text.secondary">Plan and track work assignments.</Typography>
        </div>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Schedule shift
        </Button>
      </Box>

      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Title</TableCell>
            <TableCell>Employee</TableCell>
            <TableCell>Project</TableCell>
            <TableCell>Start</TableCell>
            <TableCell>End</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Hours</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id} hover>
              <TableCell>{shift.title}</TableCell>
              <TableCell>{shift.employee?.firstName ? `${shift.employee.firstName} ${shift.employee.lastName}` : '—'}</TableCell>
              <TableCell>{shift.project?.name || '—'}</TableCell>
              <TableCell>{new Date(shift.startTime).toLocaleString()}</TableCell>
              <TableCell>{new Date(shift.endTime).toLocaleString()}</TableCell>
              <TableCell>{shift.status}</TableCell>
              <TableCell align="right">{shift.hoursWorked?.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule shift</DialogTitle>
        <DialogContent>
          <Box component="form" id="shift-form" onSubmit={formik.handleSubmit} sx={{ mt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  name="title"
                  value={formik.values.title}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.title && Boolean(formik.errors.title)}
                  helperText={formik.touched.title && formik.errors.title}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="Start"
                  name="startTime"
                  value={formik.values.startTime}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.startTime && Boolean(formik.errors.startTime)}
                  helperText={formik.touched.startTime && formik.errors.startTime}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="datetime-local"
                  label="End"
                  name="endTime"
                  value={formik.values.endTime}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.endTime && Boolean(formik.errors.endTime)}
                  helperText={formik.touched.endTime && formik.errors.endTime}
                />
              </Grid>
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
                  <MenuItem value="scheduled">Scheduled</MenuItem>
                  <MenuItem value="in_progress">In progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  minRows={3}
                  label="Notes"
                  name="notes"
                  value={formik.values.notes}
                  onChange={formik.handleChange}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" form="shift-form" variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ShiftsPage;
