import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import api from '../services/api';

const ReportsPage = () => {
  const [filters, setFilters] = useState({ startDate: '', endDate: '' });
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const runReport = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/reports/summary', filters);
      setReport(data);
    } catch (error) {
      console.error('Failed to generate report', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1 }}>
        Reports
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Analyse productivity, utilisation and finances over any period.
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Start date"
            name="startDate"
            value={filters.startDate}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            type="date"
            label="End date"
            name="endDate"
            value={filters.endDate}
            onChange={handleChange}
          />
        </Grid>
        <Grid item xs={12} md={3} sx={{ display: 'flex', alignItems: 'center' }}>
          <Button variant="contained" onClick={runReport} disabled={loading}>
            {loading ? 'Generating…' : 'Generate report'}
          </Button>
        </Grid>
      </Grid>

      {report && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Shifts</Typography>
                <Typography variant="body2">{report.metrics.shifts.count} shifts</Typography>
                <Typography variant="body2">{report.metrics.shifts.totalHours.toFixed(2)} hours scheduled</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6">Attendance</Typography>
                <Typography variant="body2">{report.metrics.attendance.count} records</Typography>
                <Typography variant="body2">{report.metrics.attendance.totalHours.toFixed(2)} hours logged</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Payroll</Typography>
                <Typography variant="body2">Gross: ${report.metrics.payroll.gross.toFixed(2)}</Typography>
                <Typography variant="body2">Taxes: ${report.metrics.payroll.taxes.toFixed(2)}</Typography>
                <Typography variant="body2">Net: ${report.metrics.payroll.net.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Invoices</Typography>
                <Typography variant="body2">Total: ${report.metrics.invoices.total.toFixed(2)}</Typography>
                <Typography variant="body2">Paid: ${report.metrics.invoices.paid.toFixed(2)}</Typography>
                <Typography variant="body2">Overdue: ${report.metrics.invoices.overdue.toFixed(2)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6">Projects</Typography>
                <Typography variant="body2">{report.metrics.projects} active in range</Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ReportsPage;
