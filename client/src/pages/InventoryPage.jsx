import { useState } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  FormControl, InputLabel, Chip, InputAdornment, Grid, Card, CardContent
} from '@mui/material';
import { Add, Edit, Delete, Search, WarningAmber, CheckCircle, ErrorOutline } from '@mui/icons-material';
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../hooks/useProducts';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '', category: '', costPrice: '', sellingPrice: '', stock: '',
    unit: 'pcs', minStockLevel: 10, gstRate: 18, hsnCode: '', expiryDate: ''
  });

  const { data: productsData, isLoading } = useProducts({ search, category });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '', category: 'Groceries', costPrice: '', sellingPrice: '', stock: '',
      unit: 'pcs', minStockLevel: 10, gstRate: 18, hsnCode: '', expiryDate: ''
    });
    setOpenDialog(true);
  };

  const handleOpenEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stock: product.stock,
      unit: product.unit || 'pcs',
      minStockLevel: product.minStockLevel || 10,
      gstRate: product.gstRate || 18,
      hsnCode: product.hsnCode || '',
      expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      stock: parseInt(formData.stock),
      minStockLevel: parseInt(formData.minStockLevel),
      gstRate: parseInt(formData.gstRate)
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct._id, data: payload }, {
        onSuccess: () => handleCloseDialog()
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => handleCloseDialog()
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  const getStockStatus = (stock, minLevel) => {
    if (stock === 0) return <Chip icon={<ErrorOutline />} label="Out of Stock" color="error" variant="outlined" size="small" />;
    if (stock <= minLevel) return <Chip icon={<WarningAmber />} label="Low Stock" color="warning" variant="outlined" size="small" />;
    return <Chip icon={<CheckCircle />} label="In Stock" color="success" variant="outlined" size="small" />;
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Inventory Management</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          Add Product
        </Button>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #1976D2' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Total Products</Typography>
              <Typography variant="h4" fontWeight={700}>{productsData?.data?.length || 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #FF9800' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Low Stock Items</Typography>
              <Typography variant="h4" fontWeight={700}>
                {productsData?.data?.filter(p => p.stock <= p.minStockLevel && p.stock > 0).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #F44336' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2">Out of Stock</Typography>
              <Typography variant="h4" fontWeight={700}>
                {productsData?.data?.filter(p => p.stock === 0).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Table */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextField
            fullWidth
            placeholder="Search by SKU, Name or Barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Category</InputLabel>
            <Select value={category} label="Category" onChange={(e) => setCategory(e.target.value)}>
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="Groceries">Groceries</MenuItem>
              <MenuItem value="Dairy">Dairy</MenuItem>
              <MenuItem value="Beverages">Beverages</MenuItem>
              <MenuItem value="Snacks">Snacks</MenuItem>
              <MenuItem value="Personal Care">Personal Care</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>SKU / Barcode</TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Cost Price</TableCell>
                <TableCell align="right">Selling Price</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} align="center">Loading products...</TableCell></TableRow>
              ) : productsData?.data?.length === 0 ? (
                <TableRow><TableCell colSpan={8} align="center">No products found.</TableCell></TableRow>
              ) : (
                productsData?.data?.map((product) => (
                  <TableRow key={product._id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{product.sku}</Typography>
                      <Typography variant="caption" color="text.secondary">{product.barcode}</Typography>
                    </TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell align="right">₹{product.costPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{product.sellingPrice.toFixed(2)}</TableCell>
                    <TableCell align="right">
                      {product.stock} {product.unit}
                    </TableCell>
                    <TableCell>{getStockStatus(product.stock, product.minStockLevel)}</TableCell>
                    <TableCell align="center">
                      <IconButton onClick={() => handleOpenEdit(product)} color="primary"><Edit /></IconButton>
                      <IconButton onClick={() => handleDelete(product._id)} color="error"><Delete /></IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add / Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="name" label="Product Name" value={formData.name} onChange={handleInputChange} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select name="category" value={formData.category} label="Category" onChange={handleInputChange} required>
                    <MenuItem value="Groceries">Groceries</MenuItem>
                    <MenuItem value="Dairy">Dairy</MenuItem>
                    <MenuItem value="Beverages">Beverages</MenuItem>
                    <MenuItem value="Snacks">Snacks</MenuItem>
                    <MenuItem value="Personal Care">Personal Care</MenuItem>
                    <MenuItem value="Household">Household</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth name="costPrice" label="Cost Price" type="number" inputProps={{ step: "0.01" }} value={formData.costPrice} onChange={handleInputChange} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth name="sellingPrice" label="Selling Price" type="number" inputProps={{ step: "0.01" }} value={formData.sellingPrice} onChange={handleInputChange} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth name="stock" label="Initial Stock" type="number" value={formData.stock} onChange={handleInputChange} required />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Unit</InputLabel>
                  <Select name="unit" value={formData.unit} label="Unit" onChange={handleInputChange}>
                    <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                    <MenuItem value="kg">Kilogram (kg)</MenuItem>
                    <MenuItem value="g">Gram (g)</MenuItem>
                    <MenuItem value="l">Liter (l)</MenuItem>
                    <MenuItem value="ml">Milliliter (ml)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField fullWidth name="minStockLevel" label="Min Stock Alert Level" type="number" value={formData.minStockLevel} onChange={handleInputChange} />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>GST Rate (%)</InputLabel>
                  <Select name="gstRate" value={formData.gstRate} label="GST Rate (%)" onChange={handleInputChange}>
                    <MenuItem value={0}>0%</MenuItem>
                    <MenuItem value={5}>5%</MenuItem>
                    <MenuItem value={12}>12%</MenuItem>
                    <MenuItem value={18}>18%</MenuItem>
                    <MenuItem value={28}>28%</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="hsnCode" label="HSN Code" value={formData.hsnCode} onChange={handleInputChange} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="expiryDate" label="Expiry Date" type="date" InputLabelProps={{ shrink: true }} value={formData.expiryDate} onChange={handleInputChange} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
