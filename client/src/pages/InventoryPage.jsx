import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Checkbox,
  Tooltip,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  WarningAmber,
  CheckCircle,
  ErrorOutline,
  ShoppingCart,
  Layers,
  Storefront,
  Warning,
} from '@mui/icons-material';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../hooks/useProducts';
import { useCreateBulkPurchaseOrders } from '../hooks/usePurchaseOrders';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function InventoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Suppliers List
  const [suppliers, setSuppliers] = useState([]);

  // Selected Products for Bulk Restock
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Unassigned Supplier Alert Dialog
  const [openUnassignedDialog, setOpenUnassignedDialog] = useState(false);
  const [unassignedProduct, setUnassignedProduct] = useState(null);

  // Bulk PO Success Dialog
  const [openBulkSuccessDialog, setOpenBulkSuccessDialog] = useState(false);
  const [createdBulkOrders, setCreatedBulkOrders] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Groceries',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    unit: 'pcs',
    minStockLevel: 10,
    targetStockLevel: 50,
    gstRate: 18,
    hsnCode: '',
    expiryDate: '',
    supplier: '',
  });

  const { data: productsData, isLoading } = useProducts({ search, category });
  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const deleteMutation = useDeleteProduct();
  const bulkPOMutation = useCreateBulkPurchaseOrders();

  // Load suppliers for dropdown
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await api.get('/suppliers');
        if (res.data?.success) {
          setSuppliers(res.data.data);
        }
      } catch (err) {
        console.error('Failed to load suppliers');
      }
    };
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'Groceries',
      costPrice: '',
      sellingPrice: '',
      stock: '',
      unit: 'pcs',
      minStockLevel: 10,
      targetStockLevel: 50,
      gstRate: 18,
      hsnCode: '',
      expiryDate: '',
      supplier: '',
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
      targetStockLevel: product.targetStockLevel || 50,
      gstRate: product.gstRate || 18,
      hsnCode: product.hsnCode || '',
      expiryDate: product.expiryDate ? product.expiryDate.split('T')[0] : '',
      supplier: product.supplier?._id || product.supplier || '',
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
      stock: parseInt(formData.stock, 10),
      minStockLevel: parseInt(formData.minStockLevel, 10),
      targetStockLevel: parseInt(formData.targetStockLevel, 10) || 50,
      gstRate: parseInt(formData.gstRate, 10),
      supplier: formData.supplier || null,
    };

    if (editingProduct) {
      updateMutation.mutate(
        { id: editingProduct._id, data: payload },
        {
          onSuccess: () => handleCloseDialog(),
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => handleCloseDialog(),
      });
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(id);
    }
  };

  // Single Item Restock Click
  const handleSingleRestock = (product) => {
    if (!product.supplier || !product.supplier._id) {
      setUnassignedProduct(product);
      setOpenUnassignedDialog(true);
      return;
    }

    navigate('/purchase-orders', {
      state: {
        tab: 1,
        preselectedSupplierId: product.supplier._id || product.supplier,
        preselectedProductId: product._id,
      },
    });
  };

  // Select/Deselect product for bulk restock
  const handleToggleSelectProduct = (productId) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  // Select all products
  const handleSelectAllProducts = () => {
    if (!productsData?.data) return;
    if (selectedProductIds.length === productsData.data.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(productsData.data.map((p) => p._id));
    }
  };

  // Bulk Restock Handler
  const handleBulkRestock = () => {
    if (selectedProductIds.length === 0) {
      toast.error('Please select at least one product to restock.');
      return;
    }

    const selectedProducts = productsData?.data?.filter((p) =>
      selectedProductIds.includes(p._id)
    );

    const unassigned = selectedProducts.filter((p) => !p.supplier);
    if (unassigned.length > 0) {
      toast.error(
        `Cannot restock: ${unassigned.length} product(s) do not have a supplier assigned. Please assign suppliers first.`
      );
      return;
    }

    const items = selectedProducts.map((p) => ({
      productId: p._id,
      purchasePrice: p.costPrice,
    }));

    bulkPOMutation.mutate(
      { items },
      {
        onSuccess: (res) => {
          setSelectedProductIds([]);
          setCreatedBulkOrders(res.data || []);
          setOpenBulkSuccessDialog(true);
        },
      }
    );
  };

  const getStockStatus = (stock, minLevel) => {
    if (stock === 0)
      return (
        <Chip
          icon={<ErrorOutline />}
          label="Out of Stock"
          color="error"
          variant="outlined"
          size="small"
        />
      );
    if (stock <= minLevel)
      return (
        <Chip
          icon={<WarningAmber />}
          label="Low Stock"
          color="warning"
          variant="outlined"
          size="small"
        />
      );
    return (
      <Chip
        icon={<CheckCircle />}
        label="In Stock"
        color="success"
        variant="outlined"
        size="small"
      />
    );
  };

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            Inventory Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage product catalog, stock levels, suppliers, and purchase order restocking.
          </Typography>
        </Box>

        <Box display="flex" gap={1.5} flexWrap="wrap">
          {selectedProductIds.length > 0 && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<Layers />}
              onClick={handleBulkRestock}
              disabled={bulkPOMutation.isPending}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              {bulkPOMutation.isPending ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                `Bulk Restock (${selectedProductIds.length})`
              )}
            </Button>
          )}

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAdd}
            sx={{ fontWeight: 600, borderRadius: 2 }}
          >
            Add Product
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #1976D2' }}>
            <CardContent>
              <Typography color="text.secondary" variant="body2" fontWeight={600}>
                Total Products
              </Typography>
              <Typography variant="h4" fontWeight={800}>
                {productsData?.data?.length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #FF9800' }}>
            <CardContent>
              <Typography color="warning.main" variant="body2" fontWeight={700}>
                Low Stock Items
              </Typography>
              <Typography variant="h4" fontWeight={800} color="warning.main">
                {productsData?.data?.filter((p) => p.stock <= p.minStockLevel && p.stock > 0)
                  .length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: 'background.paper', borderLeft: '4px solid #F44336' }}>
            <CardContent>
              <Typography color="error.main" variant="body2" fontWeight={700}>
                Out of Stock
              </Typography>
              <Typography variant="h4" fontWeight={800} color="error.main">
                {productsData?.data?.filter((p) => p.stock === 0).length || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters & Table */}
      <Paper sx={{ p: 2, borderRadius: 2 }}>
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
            size="small"
          />
          <FormControl sx={{ minWidth: 170 }} size="small">
            <InputLabel>Category</InputLabel>
            <Select
              value={category}
              label="Category"
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="">All Categories</MenuItem>
              <MenuItem value="Groceries">Groceries</MenuItem>
              <MenuItem value="Dairy">Dairy</MenuItem>
              <MenuItem value="Beverages">Beverages</MenuItem>
              <MenuItem value="Snacks">Snacks</MenuItem>
              <MenuItem value="Personal Care">Personal Care</MenuItem>
              <MenuItem value="Household">Household</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={40}>
                  <Checkbox
                    checked={
                      productsData?.data?.length > 0 &&
                      selectedProductIds.length === productsData.data.length
                    }
                    indeterminate={
                      selectedProductIds.length > 0 &&
                      selectedProductIds.length < (productsData?.data?.length || 0)
                    }
                    onChange={handleSelectAllProducts}
                  />
                </TableCell>
                <TableCell>SKU / Barcode</TableCell>
                <TableCell>Product Name</TableCell>
                <TableCell>Supplier</TableCell>
                <TableCell align="right">Cost Price</TableCell>
                <TableCell align="right">Selling Price</TableCell>
                <TableCell align="center">Stock Levels</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={30} />
                    <Typography variant="body2" color="text.secondary" mt={1}>
                      Loading products...
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : productsData?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                    No products found.
                  </TableCell>
                </TableRow>
              ) : (
                productsData?.data?.map((product) => (
                  <TableRow
                    key={product._id}
                    hover
                    sx={{
                      bgcolor: selectedProductIds.includes(product._id)
                        ? 'action.hover'
                        : 'inherit',
                    }}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedProductIds.includes(product._id)}
                        onChange={() => handleToggleSelectProduct(product._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {product.sku}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.barcode}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {product.category}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {product.supplier?.name ? (
                        <Typography variant="body2" fontWeight={600} color="primary.main">
                          {product.supplier.name}
                        </Typography>
                      ) : (
                        <Chip
                          label="No Supplier"
                          size="small"
                          color="default"
                          variant="outlined"
                          sx={{ fontSize: '0.7rem' }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">₹{product.costPrice?.toFixed(2)}</TableCell>
                    <TableCell align="right">₹{product.sellingPrice?.toFixed(2)}</TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" fontWeight={700}>
                        {product.stock} {product.unit}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        Min: {product.minStockLevel || 10} | Target: {product.targetStockLevel || 50}
                      </Typography>
                    </TableCell>
                    <TableCell>{getStockStatus(product.stock, product.minStockLevel)}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Create Restock PO">
                          <Button
                            size="small"
                            variant="outlined"
                            color="warning"
                            startIcon={<ShoppingCart fontSize="small" />}
                            onClick={() => handleSingleRestock(product)}
                            sx={{
                              py: 0.3,
                              px: 1,
                              textTransform: 'none',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                            }}
                          >
                            Restock
                          </Button>
                        </Tooltip>
                        <Tooltip title="Edit Product">
                          <IconButton
                            onClick={() => handleOpenEdit(product)}
                            color="primary"
                            size="small"
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Product">
                          <IconButton
                            onClick={() => handleDelete(product._id)}
                            color="error"
                            size="small"
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Add / Edit Product Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{editingProduct ? 'Edit Product' : 'Add New Product'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="name"
                  label="Product Name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Category</InputLabel>
                  <Select
                    name="category"
                    value={formData.category}
                    label="Category"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="Groceries">Groceries</MenuItem>
                    <MenuItem value="Dairy">Dairy</MenuItem>
                    <MenuItem value="Beverages">Beverages</MenuItem>
                    <MenuItem value="Snacks">Snacks</MenuItem>
                    <MenuItem value="Personal Care">Personal Care</MenuItem>
                    <MenuItem value="Household">Household</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Supplier / Vendor</InputLabel>
                  <Select
                    name="supplier"
                    value={formData.supplier}
                    label="Supplier / Vendor"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="">-- Select Supplier --</MenuItem>
                    {suppliers.map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Unit of Measurement</InputLabel>
                  <Select
                    name="unit"
                    value={formData.unit}
                    label="Unit of Measurement"
                    onChange={handleInputChange}
                  >
                    <MenuItem value="pcs">Pieces (pcs)</MenuItem>
                    <MenuItem value="kg">Kilogram (kg)</MenuItem>
                    <MenuItem value="g">Gram (g)</MenuItem>
                    <MenuItem value="l">Liter (l)</MenuItem>
                    <MenuItem value="ml">Milliliter (ml)</MenuItem>
                    <MenuItem value="box">Box</MenuItem>
                    <MenuItem value="pack">Pack</MenuItem>
                    <MenuItem value="dozen">Dozen</MenuItem>
                    <MenuItem value="pair">Pair</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="costPrice"
                  label="Purchase / Cost Price (₹)"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={formData.costPrice}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="sellingPrice"
                  label="Selling Price (₹)"
                  type="number"
                  inputProps={{ step: '0.01' }}
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="stock"
                  label="Current Stock"
                  type="number"
                  value={formData.stock}
                  onChange={handleInputChange}
                  required
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="minStockLevel"
                  label="Min Stock Alert Level"
                  type="number"
                  value={formData.minStockLevel}
                  onChange={handleInputChange}
                  helperText="Triggers Low Stock warning"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  name="targetStockLevel"
                  label="Target Stock Level"
                  type="number"
                  value={formData.targetStockLevel}
                  onChange={handleInputChange}
                  helperText="Suggested restocking target"
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>GST Rate (%)</InputLabel>
                  <Select
                    name="gstRate"
                    value={formData.gstRate}
                    label="GST Rate (%)"
                    onChange={handleInputChange}
                  >
                    <MenuItem value={0}>0%</MenuItem>
                    <MenuItem value={5}>5%</MenuItem>
                    <MenuItem value={12}>12%</MenuItem>
                    <MenuItem value={18}>18%</MenuItem>
                    <MenuItem value={28}>28%</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="hsnCode"
                  label="HSN Code"
                  value={formData.hsnCode}
                  onChange={handleInputChange}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  name="expiryDate"
                  label="Expiry Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formData.expiryDate}
                  onChange={handleInputChange}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingProduct ? 'Update Product' : 'Add Product'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* SUPPLIER NOT ASSIGNED ALERT DIALOG */}
      <Dialog
        open={openUnassignedDialog}
        onClose={() => setOpenUnassignedDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Warning color="warning" />
          <Typography variant="h6" fontWeight={700}>
            Supplier Not Assigned
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body1" mb={1.5}>
            <strong>{unassignedProduct?.name}</strong> does not have an assigned supplier.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This product cannot be added to a supplier purchase order until a supplier is assigned in its product settings.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenUnassignedDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              setOpenUnassignedDialog(false);
              if (unassignedProduct) {
                handleOpenEdit(unassignedProduct);
              }
            }}
          >
            Assign Supplier Now
          </Button>
        </DialogActions>
      </Dialog>

      {/* BULK RESTOCK SUCCESS DIALOG */}
      <Dialog
        open={openBulkSuccessDialog}
        onClose={() => setOpenBulkSuccessDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircle color="success" />
          <Typography variant="h6" fontWeight={700}>
            Purchase Orders Generated Successfully!
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Products have been automatically separated and grouped into separate purchase orders per supplier:
          </Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Supplier</TableCell>
                  <TableCell align="center">Products</TableCell>
                  <TableCell align="right">Grand Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {createdBulkOrders.map((bo) => (
                  <TableRow key={bo._id}>
                    <TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {bo.poNumber}
                    </TableCell>
                    <TableCell>{bo.supplier?.name}</TableCell>
                    <TableCell align="center">{bo.items?.length}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ₹{bo.grandTotal?.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenBulkSuccessDialog(false)}>Close</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ShoppingCart />}
            onClick={() => {
              setOpenBulkSuccessDialog(false);
              navigate('/purchase-orders');
            }}
          >
            View All Purchase Orders
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
