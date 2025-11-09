import React from 'react';
import { Card, CardContent, Typography } from '@mui/material';

const StatCard = ({ title, value, caption }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ mt: 1 }}>
        {value}
      </Typography>
      {caption && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          {caption}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export default StatCard;
