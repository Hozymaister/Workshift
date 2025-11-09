import React, { useEffect, useState } from 'react';
import { Grid, Typography, Card, CardContent, List, ListItem, ListItemText } from '@mui/material';
import api from '../services/api';
import StatCard from '../components/StatCard';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const fetchSummary = async () => {
      try {
        const response = await api.get('/dashboard/summary');
        if (isMounted) {
          setData(response.data);
        }
      } catch (error) {
        console.error('Failed to load dashboard', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSummary();
    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return <Typography>Loading dashboard…</Typography>;
  }

  if (!data) {
    return <Typography color="error">Unable to load dashboard data.</Typography>;
  }

  const { stats, highlights } = data;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4">Overview</Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Track workforce utilisation, finances and operations at a glance.
        </Typography>
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard title="Employees" value={stats.employees} caption="Active employees" />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard title="Projects" value={stats.projects} caption="Currently in progress" />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard title="Shifts this week" value={stats.shiftsThisWeek} caption="Scheduled shifts" />
      </Grid>
      <Grid item xs={12} md={3}>
        <StatCard title="Overdue invoices" value={stats.overdueInvoices} caption="Invoices requiring action" />
      </Grid>
      <Grid item xs={12} md={6}>
        <StatCard title="Revenue" value={`$${stats.revenue.toFixed(2)}`} caption="Paid invoices" />
      </Grid>
      <Grid item xs={12} md={6}>
        <StatCard title="Payroll cost" value={`$${stats.payrollCost.toFixed(2)}`} caption="Net payroll total" />
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Recent clients</Typography>
            <List>
              {highlights.recentClients.map((client) => (
                <ListItem key={client.id} divider>
                  <ListItemText primary={client.name} secondary={client.company || client.email} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6">Recent shifts</Typography>
            <List>
              {highlights.recentShifts.map((shift) => (
                <ListItem key={shift.id} divider>
                  <ListItemText
                    primary={shift.title}
                    secondary={`${new Date(shift.startTime).toLocaleString()} → ${new Date(shift.endTime).toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default DashboardPage;
