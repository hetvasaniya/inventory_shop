import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';

export default function ConfusionMatrixCard({
  matrix = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ],
  classNames = ['Low Risk', 'Medium Risk', 'High Risk'],
  modelName = 'Random Forest Classifier',
}) {
  const theme = useTheme();

  // Find max value in matrix for shading
  let maxCell = 1;
  matrix.forEach((row) => {
    row.forEach((val) => {
      if (val > maxCell) maxCell = val;
    });
  });

  return (
    <Card sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Classification Confusion Matrix (3×3)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Evaluated on test split using {modelName}. Rows indicate Ground Truth; Columns indicate Model Prediction.
          </Typography>
        </Box>

        <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', width: '30%' }}>
                  Actual \ Predicted
                </TableCell>
                {classNames.map((name, i) => (
                  <TableCell key={i} align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                    Pred: {name.replace(' Risk', '')}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {matrix.map((row, actualIdx) => (
                <TableRow key={actualIdx}>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: 'action.hover' }}>
                    Actual: {classNames[actualIdx].replace(' Risk', '')}
                  </TableCell>
                  {row.map((val, predIdx) => {
                    const isDiagonal = actualIdx === predIdx;
                    const intensity = Math.min(1, val / maxCell);
                    const cellBg = isDiagonal
                      ? alpha(theme.palette.success.main, 0.15 + intensity * 0.35)
                      : val > 0
                      ? alpha(theme.palette.error.main, 0.1 + intensity * 0.3)
                      : 'transparent';

                    return (
                      <Tooltip
                        key={predIdx}
                        title={`Actual: ${classNames[actualIdx]} | Predicted: ${classNames[predIdx]} | Count: ${val}`}
                      >
                        <TableCell
                          align="center"
                          sx={{
                            fontWeight: isDiagonal ? 800 : 500,
                            fontSize: '0.9rem',
                            bgcolor: cellBg,
                            color: isDiagonal
                              ? theme.palette.mode === 'dark' ? '#6EE7B7' : '#047857'
                              : val > 0
                              ? theme.palette.mode === 'dark' ? '#FCA5A5' : '#B91C1C'
                              : 'text.secondary',
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          {val}
                        </TableCell>
                      </Tooltip>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha(theme.palette.success.main, 0.5) }} />
            <Typography variant="caption" color="text.secondary">Correct Predictions (Diagonal)</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: alpha(theme.palette.error.main, 0.4) }} />
            <Typography variant="caption" color="text.secondary">Misclassifications</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
