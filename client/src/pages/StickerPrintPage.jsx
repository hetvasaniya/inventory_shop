import { useState } from 'react';
import {
  Box, Typography, Paper, TextField, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Autocomplete, Grid, Chip
} from '@mui/material';
import { Delete, Add, Remove, QrCode, Print } from '@mui/icons-material';
import { useProducts } from '../hooks/useProducts';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function StickerPrintPage() {
  const [printQueue, setPrintQueue] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: searchProducts } = useProducts({ search: searchQuery });

  const addProductToQueue = (product) => {
    const existingIndex = printQueue.findIndex(item => item._id === product._id);
    if (existingIndex > -1) {
      const updated = [...printQueue];
      updated[existingIndex].quantity += 1;
      setPrintQueue(updated);
    } else {
      setPrintQueue([...printQueue, { ...product, quantity: 12 }]); // Default to 12 stickers (1 sheet row)
    }
  };

  const updateQuantity = (index, delta) => {
    const updated = [...printQueue];
    const newQty = updated[index].quantity + delta;
    if (newQty < 1) return;
    updated[index].quantity = newQty;
    setPrintQueue(updated);
  };

  const removeProduct = (index) => {
    setPrintQueue(printQueue.filter((_, i) => i !== index));
  };

  const handleGenerateStickers = async () => {
    if (printQueue.length === 0) {
      toast.error('Print queue is empty!');
      return;
    }

    setIsGenerating(true);
    try {
      const payload = {
        products: printQueue.map(item => ({
          productId: item._id,
          quantity: item.quantity
        }))
      };

      const res = await api.post('/barcode/generate-stickers', payload, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `barcode-stickers-${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Barcode stickers PDF generated successfully!');
      setPrintQueue([]);
    } catch (err) {
      toast.error('Failed to generate barcode stickers PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} mb={3}>Barcode Sticker Generator</Typography>

      <Grid container spacing={3}>
        {/* Left - Selection */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" fontWeight={700} mb={2}>Select Products to Print</Typography>
            <Autocomplete
              options={searchProducts?.data || []}
              getOptionLabel={(option) => `${option.name} (${option.barcode})`}
              onInputChange={(_, value) => setSearchQuery(value)}
              onChange={(_, value) => value && addProductToQueue(value)}
              renderInput={(params) => <TextField {...params} label="Search Product..." />}
            />
            <Typography variant="body2" color="text.secondary" mt={2}>
              Search by product name, SKU, or barcode to add it to the print queue.
            </Typography>
          </Paper>
        </Grid>

        {/* Right - Queue */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>Print Queue</Typography>
              <Button
                variant="contained"
                startIcon={<Print />}
                onClick={handleGenerateStickers}
                disabled={isGenerating || printQueue.length === 0}
              >
                {isGenerating ? 'Generating...' : 'Generate A4 PDF'}
              </Button>
            </Box>

            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Product Details</TableCell>
                    <TableCell align="center">Barcode</TableCell>
                    <TableCell align="center">Sticker Quantity</TableCell>
                    <TableCell align="center">Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {printQueue.length === 0 ? (
                    <TableRow><TableCell colSpan={4} align="center">No products added to queue.</TableCell></TableRow>
                  ) : (
                    printQueue.map((item, index) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <Typography fontWeight={600} size="small">{item.name}</Typography>
                          <Typography variant="caption" color="text.secondary">SKU: {item.sku}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip icon={<QrCode fontSize="small" />} label={item.barcode} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell align="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IconButton onClick={() => updateQuantity(index, -1)} size="small"><Remove /></IconButton>
                            <Typography mx={1} variant="body2">{item.quantity}</Typography>
                            <IconButton onClick={() => updateQuantity(index, 1)} size="small"><Add /></IconButton>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <IconButton onClick={() => removeProduct(index)} color="error"><Delete /></IconButton>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
