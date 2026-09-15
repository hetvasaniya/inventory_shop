import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  Tabs,
  Tab,
  Checkbox,
  Tooltip,
  Divider,
  Alert,
  CircularProgress,
  Stack,
  Autocomplete,
} from '@mui/material';
import {
  Add,
  Search,
  Visibility,
  CheckCircle,
  WarningAmber,
  ErrorOutline,
  LocalShipping,
  ShoppingCart,
  Delete,
  Cancel,
  Inventory,
  ReceiptLong,
  Print,
  PictureAsPdf,
  ArrowBack,
  AssignmentTurnedIn,
  Storefront,
  Phone,
  Email,
  LocationOn,
} from '@mui/icons-material';
import PurchaseOrderPreviewModal from '../components/PurchaseOrderPreviewModal';
import {
  usePurchaseOrders,
  usePurchaseOrder,
  useSupplierStockAnalysis,
  useCreatePurchaseOrder,
  useReceivePurchaseOrder,
  useCancelPurchaseOrder,
} from '../hooks/usePurchaseOrders';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function PurchaseOrdersPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Tab State: 0 = List, 1 = Create PO
  const [currentTab, setCurrentTab] = useState(location.state?.tab || 0);

  // Suppliers list for dropdowns
  const [suppliers, setSuppliers] = useState([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);

  // Selected supplier in PO Builder
  const [selectedSupplierId, setSelectedSupplierId] = useState(
    location.state?.preselectedSupplierId || ''
  );

  // Filters for PO List
  const [searchFilter, setSearchFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected PO for View Details
  const [selectedPOId, setSelectedPOId] = useState(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);

  // PO Document Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewPOData, setPreviewPOData] = useState(null);
  const [isDraftPreview, setIsDraftPreview] = useState(false);

  // Receiving Modal State
  const [openReceiveDialog, setOpenReceiveDialog] = useState(false);
  const [receivingItems, setReceivingItems] = useState({});
  const [receivingNotes, setReceivingNotes] = useState('');

  // PO Creation Form State
  // items map: productId -> { product, name, sku, unit, currentStock, orderQty, purchasePrice, gstRate, isSelected }
  const [orderItemsMap, setOrderItemsMap] = useState({});
  const [deliveryCharges, setDeliveryCharges] = useState('0');
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [openAddProductDialog, setOpenAddProductDialog] = useState(false);
  const [manualProductToAdd, setManualProductToAdd] = useState(null);

  // Queries & Mutations
  const { data: poListData, isLoading: isLoadingPOs } = usePurchaseOrders({
    search: searchFilter,
    supplier: supplierFilter || undefined,
    status: statusFilter !== 'All' ? statusFilter : undefined,
  });

  const { data: stockAnalysisData, isLoading: isLoadingAnalysis } =
    useSupplierStockAnalysis(selectedSupplierId);

  const { data: singlePODetails, isLoading: isLoadingSinglePO } =
    usePurchaseOrder(selectedPOId);

  const createPOMutation = useCreatePurchaseOrder();
  const receivePOMutation = useReceivePurchaseOrder();
  const cancelPOMutation = useCancelPurchaseOrder();

  // Load suppliers list
  useEffect(() => {
    const fetchSuppliers = async () => {
      setLoadingSuppliers(true);
      try {
        const res = await api.get('/suppliers');
        if (res.data?.success) {
          setSuppliers(res.data.data);
        }
      } catch (err) {
        toast.error('Failed to load suppliers list');
      } finally {
        setLoadingSuppliers(false);
      }
    };
    fetchSuppliers();
  }, []);

  // When stock analysis loads for selected supplier, auto-populate low & out of stock items
  useEffect(() => {
    if (stockAnalysisData?.data) {
      const { lowStockProducts, outOfStockProducts, inStockProducts } =
        stockAnalysisData.data;

      const newMap = {};

      // Auto-include Out of Stock items
      outOfStockProducts.forEach((p) => {
        const orderQty = p.suggestedQty || p.targetStockLevel || 50;
        newMap[p._id] = {
          productId: p._id,
          name: p.name,
          sku: p.sku || '',
          unit: p.unit || 'pcs',
          currentStock: p.stock,
          minStockLevel: p.minStockLevel || 10,
          targetStockLevel: p.targetStockLevel || 50,
          suggestedQty: p.suggestedQty || orderQty,
          orderQty: orderQty,
          purchasePrice: p.costPrice || 0,
          gstRate: p.gstRate || 0,
          stockStatus: 'OUT_OF_STOCK',
          isSelected: true,
        };
      });

      // Auto-include Low Stock items
      lowStockProducts.forEach((p) => {
        const orderQty = p.suggestedQty || Math.max(1, (p.targetStockLevel || 50) - p.stock);
        newMap[p._id] = {
          productId: p._id,
          name: p.name,
          sku: p.sku || '',
          unit: p.unit || 'pcs',
          currentStock: p.stock,
          minStockLevel: p.minStockLevel || 10,
          targetStockLevel: p.targetStockLevel || 50,
          suggestedQty: p.suggestedQty || orderQty,
          orderQty: orderQty,
          purchasePrice: p.costPrice || 0,
          gstRate: p.gstRate || 0,
          stockStatus: 'LOW_STOCK',
          isSelected: true,
        };
      });

      // If preselected product passed from Inventory restock button
      if (location.state?.preselectedProductId) {
        const preId = location.state.preselectedProductId;
        const matchingNormal = inStockProducts.find((p) => p._id === preId);
        if (matchingNormal && !newMap[preId]) {
          newMap[preId] = {
            productId: matchingNormal._id,
            name: matchingNormal.name,
            sku: matchingNormal.sku || '',
            unit: matchingNormal.unit || 'pcs',
            currentStock: matchingNormal.stock,
            minStockLevel: matchingNormal.minStockLevel || 10,
            targetStockLevel: matchingNormal.targetStockLevel || 50,
            suggestedQty: Math.max(1, (matchingNormal.targetStockLevel || 50) - matchingNormal.stock),
            orderQty: Math.max(1, (matchingNormal.targetStockLevel || 50) - matchingNormal.stock),
            purchasePrice: matchingNormal.costPrice || 0,
            gstRate: matchingNormal.gstRate || 0,
            stockStatus: 'IN_STOCK',
            isSelected: true,
          };
        }
      }

      setOrderItemsMap(newMap);
    } else {
      setOrderItemsMap({});
    }
  }, [stockAnalysisData, location.state]);

  // Handle supplier change in PO builder
  const handleSupplierChange = (e) => {
    setSelectedSupplierId(e.target.value);
    setOrderItemsMap({});
  };

  // Toggle selection of product in order
  const handleToggleSelect = (productId) => {
    setOrderItemsMap((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        isSelected: !prev[productId].isSelected,
      },
    }));
  };

  // Update order quantity
  const handleOrderQtyChange = (productId, val) => {
    const qty = Math.max(1, parseInt(val, 10) || 1);
    setOrderItemsMap((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        orderQty: qty,
      },
    }));
  };

  // Update purchase price
  const handlePriceChange = (productId, val) => {
    const price = Math.max(0, parseFloat(val) || 0);
    setOrderItemsMap((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        purchasePrice: price,
      },
    }));
  };

  // Remove product from current PO list only (does NOT delete from inventory)
  const handleRemoveItem = (productId) => {
    setOrderItemsMap((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
    toast.success('Item removed from this purchase order.');
  };

  // Select/Unselect All helpers
  const handleSelectAll = (select = true) => {
    setOrderItemsMap((prev) => {
      const updated = {};
      Object.keys(prev).forEach((id) => {
        updated[id] = { ...prev[id], isSelected: select };
      });
      return updated;
    });
  };

  const handleSelectByStatus = (status) => {
    setOrderItemsMap((prev) => {
      const updated = {};
      Object.keys(prev).forEach((id) => {
        if (prev[id].stockStatus === status) {
          updated[id] = { ...prev[id], isSelected: true };
        } else {
          updated[id] = { ...prev[id] };
        }
      });
      return updated;
    });
  };

  // Add a normal stock product manually
  const handleAddManualProduct = () => {
    if (!manualProductToAdd) return;
    const p = manualProductToAdd;
    const defaultQty = Math.max(1, (p.targetStockLevel || 50) - p.stock);

    setOrderItemsMap((prev) => ({
      ...prev,
      [p._id]: {
        productId: p._id,
        name: p.name,
        sku: p.sku || '',
        unit: p.unit || 'pcs',
        currentStock: p.stock,
        minStockLevel: p.minStockLevel || 10,
        targetStockLevel: p.targetStockLevel || 50,
        suggestedQty: defaultQty,
        orderQty: defaultQty,
        purchasePrice: p.costPrice || 0,
        gstRate: p.gstRate || 0,
        stockStatus: 'IN_STOCK',
        isSelected: true,
      },
    }));

    setManualProductToAdd(null);
    setOpenAddProductDialog(false);
    toast.success(`${p.name} added to purchase order.`);
  };

  // Filter selected items for final calculations
  const selectedItems = Object.values(orderItemsMap).filter((item) => item.isSelected);

  const subtotal = selectedItems.reduce((acc, item) => {
    return acc + item.orderQty * item.purchasePrice;
  }, 0);

  const gstTotal = selectedItems.reduce((acc, item) => {
    const base = item.orderQty * item.purchasePrice;
    return acc + (base * (item.gstRate || 0)) / 100;
  }, 0);

  const parsedDeliveryCharges = Math.max(0, parseFloat(deliveryCharges) || 0);
  const grandTotal = subtotal + gstTotal + parsedDeliveryCharges;
  const totalQuantity = selectedItems.reduce((acc, item) => acc + item.orderQty, 0);

  // Submit and Generate Purchase Order
  const handleGeneratePO = () => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier.');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one product to order.');
      return;
    }

    const payload = {
      supplier: selectedSupplierId,
      items: selectedItems.map((item) => ({
        product: item.productId,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        currentStock: item.currentStock,
        orderQty: item.orderQty,
        purchasePrice: item.purchasePrice,
        gstRate: item.gstRate,
      })),
      deliveryCharges: parsedDeliveryCharges,
      expectedDeliveryDate: expectedDeliveryDate || null,
      notes: orderNotes,
      status: 'Pending',
    };

    createPOMutation.mutate(payload, {
      onSuccess: () => {
        // Reset builder and switch to list tab
        setSelectedSupplierId('');
        setOrderItemsMap({});
        setDeliveryCharges('0');
        setExpectedDeliveryDate('');
        setOrderNotes('');
        setCurrentTab(0);
      },
    });
  };

  // Open Document Preview Modal from existing PO
  const handleOpenPreviewFromPO = (po) => {
    setPreviewPOData(po);
    setIsDraftPreview(false);
    setPreviewModalOpen(true);
  };

  // Open Document Preview Modal for Draft PO in Builder
  const handleOpenDraftPreview = () => {
    const supplierObj =
      suppliers.find((s) => s._id === selectedSupplierId) ||
      stockAnalysisData?.data?.supplier;

    if (!supplierObj) {
      toast.error('Please select a supplier first.');
      return;
    }

    if (selectedItems.length === 0) {
      toast.error('Please select at least one product to preview.');
      return;
    }

    const draftPO = {
      poNumber: 'PO-DRAFT-' + new Date().getTime().toString().slice(-4),
      supplier: supplierObj,
      items: selectedItems.map((item) => ({
        product: item.productId,
        name: item.name,
        sku: item.sku,
        unit: item.unit,
        currentStock: item.currentStock,
        orderQty: item.orderQty,
        purchasePrice: item.purchasePrice,
        gstRate: item.gstRate,
        totalAmount:
          item.orderQty * item.purchasePrice +
          (item.orderQty * item.purchasePrice * (item.gstRate || 0)) / 100,
      })),
      subtotal,
      gstTotal,
      deliveryCharges: parsedDeliveryCharges,
      grandTotal,
      expectedDeliveryDate: expectedDeliveryDate || null,
      notes: orderNotes,
      status: 'Draft',
      orderDate: new Date().toISOString(),
    };

    setPreviewPOData(draftPO);
    setIsDraftPreview(true);
    setPreviewModalOpen(true);
  };

  // Open Details Modal
  const handleOpenDetails = (poId) => {
    setSelectedPOId(poId);
    setOpenDetailDialog(true);
  };


  // Open Receive Modal
  const handleOpenReceive = (po) => {
    setSelectedPOId(po._id);
    const initialReceiving = {};
    po.items.forEach((item) => {
      const remaining = item.orderQty - (item.receivedQty || 0);
      initialReceiving[item.product?._id || item.product] = remaining > 0 ? remaining : 0;
    });
    setReceivingItems(initialReceiving);
    setReceivingNotes('');
    setOpenReceiveDialog(true);
  };

  // Submit Stock Receiving
  const handleConfirmReceive = () => {
    const po = singlePODetails?.data || poListData?.data?.find((p) => p._id === selectedPOId);
    if (!po) return;

    const receiptItems = [];
    Object.keys(receivingItems).forEach((pId) => {
      const qty = parseInt(receivingItems[pId], 10);
      if (qty > 0) {
        receiptItems.push({
          product: pId,
          quantityReceived: qty,
        });
      }
    });

    if (receiptItems.length === 0) {
      toast.error('Please enter a valid quantity to receive for at least one product.');
      return;
    }

    receivePOMutation.mutate(
      {
        id: selectedPOId,
        data: {
          receiptItems,
          notes: receivingNotes,
        },
      },
      {
        onSuccess: () => {
          setOpenReceiveDialog(false);
          setOpenDetailDialog(false);
        },
      }
    );
  };

  // Cancel PO
  const handleCancelPO = (poId) => {
    if (window.confirm('Are you sure you want to cancel this Purchase Order?')) {
      cancelPOMutation.mutate(poId, {
        onSuccess: () => {
          setOpenDetailDialog(false);
        },
      });
    }
  };

  // Status Badge Helper
  const getStatusChip = (status) => {
    switch (status) {
      case 'Received':
        return <Chip label="Received" color="success" size="small" icon={<CheckCircle />} />;
      case 'Partially Received':
        return <Chip label="Partially Received" color="info" size="small" icon={<Inventory />} />;
      case 'Ordered':
      case 'Confirmed':
      case 'Shipped':
        return <Chip label={status} color="primary" size="small" icon={<LocalShipping />} />;
      case 'Pending':
        return <Chip label="Pending" color="warning" size="small" icon={<WarningAmber />} />;
      case 'Cancelled':
        return <Chip label="Cancelled" color="error" size="small" icon={<Cancel />} />;
      default:
        return <Chip label={status || 'Draft'} size="small" />;
    }
  };

  // Analysis lists from backend
  const outOfStockItems = Object.values(orderItemsMap).filter(
    (i) => i.stockStatus === 'OUT_OF_STOCK'
  );
  const lowStockItems = Object.values(orderItemsMap).filter(
    (i) => i.stockStatus === 'LOW_STOCK'
  );
  const inStockItems = Object.values(orderItemsMap).filter(
    (i) => i.stockStatus === 'IN_STOCK'
  );

  return (
    <Box>
      {/* Header */}
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
            Purchase Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Smart supplier-based inventory restocking and purchase order management.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5 }}>
          {currentTab === 0 ? (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setCurrentTab(1)}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Create Purchase Order
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => setCurrentTab(0)}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Back to Orders List
            </Button>
          )}
        </Box>
      </Box>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, val) => setCurrentTab(val)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            label="All Purchase Orders"
            icon={<ReceiptLong />}
            iconPosition="start"
            sx={{ fontWeight: 600 }}
          />
          <Tab
            label="Create Purchase Order (Smart Restock)"
            icon={<ShoppingCart />}
            iconPosition="start"
            sx={{ fontWeight: 600 }}
          />
        </Tabs>
      </Paper>

      {/* TAB 0: ALL PURCHASE ORDERS LIST */}
      {currentTab === 0 && (
        <Box>
          {/* Filters Row */}
          <Paper sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  placeholder="Search PO ID, Supplier or notes..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                  }}
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Supplier</InputLabel>
                  <Select
                    value={supplierFilter}
                    label="Filter by Supplier"
                    onChange={(e) => setSupplierFilter(e.target.value)}
                  >
                    <MenuItem value="">All Suppliers</MenuItem>
                    {suppliers.map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Status</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Filter by Status"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="All">All Statuses</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Ordered">Ordered</MenuItem>
                    <MenuItem value="Partially Received">Partially Received</MenuItem>
                    <MenuItem value="Received">Received</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* Orders Table */}
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>PO Number</TableCell>
                  <TableCell>Supplier Name</TableCell>
                  <TableCell align="center">Products</TableCell>
                  <TableCell align="center">Total Qty</TableCell>
                  <TableCell align="right">Grand Total</TableCell>
                  <TableCell>Order Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoadingPOs ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <CircularProgress size={30} />
                      <Typography variant="body2" color="text.secondary" mt={1}>
                        Loading purchase orders...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : poListData?.data?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" fontWeight={600} color="text.secondary">
                        No purchase orders found.
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setCurrentTab(1)}
                        sx={{ mt: 1.5 }}
                      >
                        Create First Purchase Order
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  poListData?.data?.map((po) => {
                    const totalQty = po.items.reduce((acc, i) => acc + i.orderQty, 0);
                    return (
                      <TableRow key={po._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary.main">
                            {po.poNumber}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {po.supplier?.name || 'N/A'}
                          </Typography>
                          {po.supplier?.phone && (
                            <Typography variant="caption" color="text.secondary">
                              📞 {po.supplier.phone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">{po.items.length}</TableCell>
                        <TableCell align="center">{totalQty}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{po.grandTotal?.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {new Date(po.orderDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>{getStatusChip(po.status)}</TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={1} justifyContent="center">
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => handleOpenDetails(po._id)}
                              >
                                <Visibility fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Preview & Print PO Document">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => handleOpenPreviewFromPO(po)}
                              >
                                <Print fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            {po.status !== 'Received' && po.status !== 'Cancelled' && (
                              <Tooltip title="Receive Stock">
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  startIcon={<AssignmentTurnedIn fontSize="small" />}
                                  onClick={() => handleOpenReceive(po)}
                                  sx={{ py: 0.3, px: 1, textTransform: 'none', fontSize: '0.75rem' }}
                                >
                                  Receive
                                </Button>
                              </Tooltip>
                            )}

                            {po.status !== 'Received' && po.status !== 'Cancelled' && (
                              <Tooltip title="Cancel Order">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleCancelPO(po._id)}
                                >
                                  <Cancel fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* TAB 1: CREATE PURCHASE ORDER (SMART RESTOCK BUILDER) */}
      {currentTab === 1 && (
        <Box>
          {/* Supplier Selection Card */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight={700} mb={2} color="primary.main">
              Step 1: Select Supplier
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth required>
                  <InputLabel>Choose Supplier</InputLabel>
                  <Select
                    value={selectedSupplierId}
                    label="Choose Supplier"
                    onChange={handleSupplierChange}
                  >
                    {suppliers.map((s) => (
                      <MenuItem key={s._id} value={s._id}>
                        {s.name} {s.contactPerson ? `(${s.contactPerson})` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {stockAnalysisData?.data?.supplier && (
                <Grid item xs={12} sm={6}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: 'action.hover',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <Storefront color="primary" />
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700}>
                        {stockAnalysisData.data.supplier.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {stockAnalysisData.data.supplier.phone && `📞 ${stockAnalysisData.data.supplier.phone} `}
                        {stockAnalysisData.data.supplier.email && `✉️ ${stockAnalysisData.data.supplier.email}`}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Supplier Stock Analysis Metrics Banner */}
          {selectedSupplierId && (
            <Box mb={3}>
              {isLoadingAnalysis ? (
                <Box textAlign="center" py={3}>
                  <CircularProgress size={28} />
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Analyzing supplier inventory and stock levels...
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Grid container spacing={2} mb={3}>
                    <Grid item xs={12} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #1976D2', bgcolor: 'background.paper' }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            TOTAL SUPPLIER PRODUCTS
                          </Typography>
                          <Typography variant="h5" fontWeight={800}>
                            {stockAnalysisData?.data?.summary?.totalProducts || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #D32F2F', bgcolor: 'background.paper' }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="caption" color="error.main" fontWeight={700}>
                            🔴 OUT OF STOCK
                          </Typography>
                          <Typography variant="h5" fontWeight={800} color="error.main">
                            {stockAnalysisData?.data?.summary?.outOfStockCount || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #ED6C02', bgcolor: 'background.paper' }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="caption" color="warning.main" fontWeight={700}>
                            🟠 LOW STOCK ITEMS
                          </Typography>
                          <Typography variant="h5" fontWeight={800} color="warning.main">
                            {stockAnalysisData?.data?.summary?.lowStockCount || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>

                    <Grid item xs={12} sm={3}>
                      <Card sx={{ borderLeft: '4px solid #2E7D32', bgcolor: 'background.paper' }}>
                        <CardContent sx={{ py: 1.5 }}>
                          <Typography variant="caption" color="success.main" fontWeight={700}>
                            🟢 IN STOCK
                          </Typography>
                          <Typography variant="h5" fontWeight={800} color="success.main">
                            {stockAnalysisData?.data?.summary?.inStockCount || 0}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>

                  {/* Selection Buttons Toolbar */}
                  <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Typography variant="subtitle2" fontWeight={700} mr={1}>
                      Quick Select:
                    </Typography>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      onClick={() => handleSelectByStatus('OUT_OF_STOCK')}
                    >
                      Select All Out of Stock ({outOfStockItems.length})
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="warning"
                      onClick={() => handleSelectByStatus('LOW_STOCK')}
                    >
                      Select All Low Stock ({lowStockItems.length})
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => handleSelectAll(true)}
                    >
                      Select All Items
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      color="secondary"
                      onClick={() => handleSelectAll(false)}
                    >
                      Unselect All
                    </Button>

                    <Box sx={{ flexGrow: 1 }} />

                    <Button
                      variant="contained"
                      color="secondary"
                      size="small"
                      startIcon={<Add />}
                      onClick={() => setOpenAddProductDialog(true)}
                    >
                      + Add Other Supplier Product
                    </Button>
                  </Paper>

                  {/* OUT OF STOCK SECTION */}
                  {outOfStockItems.length > 0 && (
                    <Paper sx={{ p: 2.5, mb: 3, border: '1px solid #FFCDD2', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <ErrorOutline color="error" />
                        <Typography variant="h6" fontWeight={700} color="error.main">
                          Out of Stock Products (Stock = 0)
                        </Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width={50}>Select</TableCell>
                              <TableCell>Product Name / SKU</TableCell>
                              <TableCell align="center">Current Stock</TableCell>
                              <TableCell align="center">Target Stock</TableCell>
                              <TableCell align="center">Suggested Qty</TableCell>
                              <TableCell align="center" width={140}>Order Qty</TableCell>
                              <TableCell align="right">Purchase Price</TableCell>
                              <TableCell align="center" width={60}>Remove</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {outOfStockItems.map((item) => (
                              <TableRow key={item.productId} hover sx={{ bgcolor: item.isSelected ? 'action.hover' : 'inherit' }}>
                                <TableCell>
                                  <Checkbox
                                    checked={item.isSelected}
                                    onChange={() => handleToggleSelect(item.productId)}
                                    color="error"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    SKU: {item.sku || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip label="0 (Out of Stock)" color="error" size="small" />
                                </TableCell>
                                <TableCell align="center">{item.targetStockLevel} {item.unit}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                  {item.suggestedQty}
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={item.orderQty}
                                    onChange={(e) => handleOrderQtyChange(item.productId, e.target.value)}
                                    inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 'bold' } }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={item.purchasePrice}
                                    onChange={(e) => handlePriceChange(item.productId, e.target.value)}
                                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                                    sx={{ width: 110 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveItem(item.productId)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* LOW STOCK SECTION */}
                  {lowStockItems.length > 0 && (
                    <Paper sx={{ p: 2.5, mb: 3, border: '1px solid #FFE082', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <WarningAmber color="warning" />
                        <Typography variant="h6" fontWeight={700} color="warning.dark">
                          Low Stock Products (Stock ≤ Min Stock)
                        </Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width={50}>Select</TableCell>
                              <TableCell>Product Name / SKU</TableCell>
                              <TableCell align="center">Current Stock</TableCell>
                              <TableCell align="center">Min Stock</TableCell>
                              <TableCell align="center">Target Stock</TableCell>
                              <TableCell align="center">Suggested Qty</TableCell>
                              <TableCell align="center" width={140}>Order Qty</TableCell>
                              <TableCell align="right">Purchase Price</TableCell>
                              <TableCell align="center" width={60}>Remove</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {lowStockItems.map((item) => (
                              <TableRow key={item.productId} hover sx={{ bgcolor: item.isSelected ? 'action.hover' : 'inherit' }}>
                                <TableCell>
                                  <Checkbox
                                    checked={item.isSelected}
                                    onChange={() => handleToggleSelect(item.productId)}
                                    color="warning"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    SKU: {item.sku || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip label={`${item.currentStock} ${item.unit}`} color="warning" size="small" />
                                </TableCell>
                                <TableCell align="center">{item.minStockLevel} {item.unit}</TableCell>
                                <TableCell align="center">{item.targetStockLevel} {item.unit}</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700, color: 'primary.main' }}>
                                  {item.suggestedQty}
                                </TableCell>
                                <TableCell align="center">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={item.orderQty}
                                    onChange={(e) => handleOrderQtyChange(item.productId, e.target.value)}
                                    inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 'bold' } }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={item.purchasePrice}
                                    onChange={(e) => handlePriceChange(item.productId, e.target.value)}
                                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                                    sx={{ width: 110 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveItem(item.productId)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* MANUALLY ADDED / NORMAL IN STOCK ITEMS */}
                  {inStockItems.length > 0 && (
                    <Paper sx={{ p: 2.5, mb: 3, border: '1px solid #C8E6C9', borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <CheckCircle color="success" />
                        <Typography variant="h6" fontWeight={700} color="success.dark">
                          Additional Normal Stock Products
                        </Typography>
                      </Box>
                      <TableContainer>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell width={50}>Select</TableCell>
                              <TableCell>Product Name / SKU</TableCell>
                              <TableCell align="center">Current Stock</TableCell>
                              <TableCell align="center">Target Stock</TableCell>
                              <TableCell align="center" width={140}>Order Qty</TableCell>
                              <TableCell align="right">Purchase Price</TableCell>
                              <TableCell align="center" width={60}>Remove</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {inStockItems.map((item) => (
                              <TableRow key={item.productId} hover sx={{ bgcolor: item.isSelected ? 'action.hover' : 'inherit' }}>
                                <TableCell>
                                  <Checkbox
                                    checked={item.isSelected}
                                    onChange={() => handleToggleSelect(item.productId)}
                                    color="success"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" fontWeight={600}>
                                    {item.name}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    SKU: {item.sku || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell align="center">
                                  <Chip label={`${item.currentStock} ${item.unit}`} color="success" variant="outlined" size="small" />
                                </TableCell>
                                <TableCell align="center">{item.targetStockLevel} {item.unit}</TableCell>
                                <TableCell align="center">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={item.orderQty}
                                    onChange={(e) => handleOrderQtyChange(item.productId, e.target.value)}
                                    inputProps={{ min: 1, style: { textAlign: 'center', fontWeight: 'bold' } }}
                                  />
                                </TableCell>
                                <TableCell align="right">
                                  <TextField
                                    type="number"
                                    size="small"
                                    value={item.purchasePrice}
                                    onChange={(e) => handlePriceChange(item.productId, e.target.value)}
                                    inputProps={{ min: 0, step: 0.01, style: { textAlign: 'right' } }}
                                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                                    sx={{ width: 110 }}
                                  />
                                </TableCell>
                                <TableCell align="center">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleRemoveItem(item.productId)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </Paper>
                  )}

                  {/* Empty state if no items at all */}
                  {Object.keys(orderItemsMap).length === 0 && (
                    <Alert severity="info" sx={{ mb: 3 }}>
                      No low-stock or out-of-stock items detected for this supplier. You can click <strong>+ Add Other Supplier Product</strong> above to manually order products.
                    </Alert>
                  )}

                  {/* FINAL SELECTED PURCHASE ORDER SUMMARY CARD */}
                  <Paper sx={{ p: 3, borderRadius: 2, bgcolor: 'background.paper', border: '2px solid', borderColor: 'primary.main' }}>
                    <Typography variant="h5" fontWeight={800} mb={2} color="primary.main">
                      Purchase Order Summary
                    </Typography>

                    <Grid container spacing={3}>
                      <Grid item xs={12} md={7}>
                        <TableContainer sx={{ maxHeight: 240 }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Product</TableCell>
                                <TableCell align="center">Qty</TableCell>
                                <TableCell align="right">Unit Price</TableCell>
                                <TableCell align="right">GST %</TableCell>
                                <TableCell align="right">Total</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {selectedItems.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={5} align="center" sx={{ py: 2, color: 'text.secondary' }}>
                                    No products selected for this order. Check products above.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                selectedItems.map((item) => {
                                  const base = item.orderQty * item.purchasePrice;
                                  const tax = (base * (item.gstRate || 0)) / 100;
                                  const lineTotal = base + tax;
                                  return (
                                    <TableRow key={item.productId}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell align="center">{item.orderQty} {item.unit}</TableCell>
                                      <TableCell align="right">₹{item.purchasePrice.toFixed(2)}</TableCell>
                                      <TableCell align="right">{item.gstRate}%</TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                                        ₹{lineTotal.toFixed(2)}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </TableContainer>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Expected Delivery Date"
                              type="date"
                              InputLabelProps={{ shrink: true }}
                              value={expectedDeliveryDate}
                              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              fullWidth
                              label="Delivery / Shipping Charges"
                              type="number"
                              value={deliveryCharges}
                              onChange={(e) => setDeliveryCharges(e.target.value)}
                              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                              size="small"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <TextField
                              fullWidth
                              label="Order Notes / Instructions for Supplier"
                              placeholder="e.g. Please deliver to warehouse back entrance."
                              value={orderNotes}
                              onChange={(e) => setOrderNotes(e.target.value)}
                              size="small"
                            />
                          </Grid>
                        </Grid>
                      </Grid>

                      {/* Right Side Totals Card */}
                      <Grid item xs={12} md={5}>
                        <Box sx={{ p: 2.5, bgcolor: 'action.hover', borderRadius: 2 }}>
                          <Typography variant="h6" fontWeight={700} mb={2}>
                            Cost Breakdown
                          </Typography>

                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography color="text.secondary">Total Products Selected:</Typography>
                            <Typography fontWeight={700}>{selectedItems.length}</Typography>
                          </Box>

                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography color="text.secondary">Total Quantity to Order:</Typography>
                            <Typography fontWeight={700}>{totalQuantity}</Typography>
                          </Box>

                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography color="text.secondary">Subtotal (Pre-tax):</Typography>
                            <Typography fontWeight={600}>₹{subtotal.toFixed(2)}</Typography>
                          </Box>

                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography color="text.secondary">GST / Tax Amount:</Typography>
                            <Typography fontWeight={600}>₹{gstTotal.toFixed(2)}</Typography>
                          </Box>

                          <Box display="flex" justifyContent="space-between" mb={1}>
                            <Typography color="text.secondary">Delivery Charges:</Typography>
                            <Typography fontWeight={600}>₹{parsedDeliveryCharges.toFixed(2)}</Typography>
                          </Box>

                          <Divider sx={{ my: 1.5 }} />

                          <Box display="flex" justifyContent="space-between" mb={3}>
                            <Typography variant="h5" fontWeight={800}>
                              Grand Total:
                            </Typography>
                            <Typography variant="h5" fontWeight={800} color="primary.main">
                              ₹{grandTotal.toFixed(2)}
                            </Typography>
                          </Box>

                          <Button
                            fullWidth
                            variant="outlined"
                            color="primary"
                            size="medium"
                            startIcon={<Print />}
                            onClick={handleOpenDraftPreview}
                            disabled={selectedItems.length === 0}
                            sx={{ mb: 1.5, py: 1.2, fontWeight: 700, borderRadius: 2 }}
                          >
                            Preview & Print PO Document
                          </Button>

                          <Button
                            fullWidth
                            variant="contained"
                            size="large"
                            startIcon={<ShoppingCart />}
                            onClick={handleGeneratePO}
                            disabled={createPOMutation.isPending || selectedItems.length === 0}
                            sx={{ py: 1.5, fontWeight: 700, fontSize: '1rem', borderRadius: 2 }}
                          >
                            {createPOMutation.isPending ? (
                              <CircularProgress size={24} color="inherit" />
                            ) : (
                              'Generate Purchase Order'
                            )}
                          </Button>

                        </Box>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              )}
            </Box>
          )}

          {/* Dialog: Add Other Product from Supplier */}
          <Dialog
            open={openAddProductDialog}
            onClose={() => setOpenAddProductDialog(false)}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Add Supplier Product to Purchase Order</DialogTitle>
            <DialogContent dividers>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Select an in-stock product from <strong>{stockAnalysisData?.data?.supplier?.name}</strong> to add to this order:
              </Typography>
              <Autocomplete
                options={
                  stockAnalysisData?.data?.allProducts?.filter(
                    (p) => !orderItemsMap[p._id]
                  ) || []
                }
                getOptionLabel={(option) => `${option.name} (${option.sku || 'No SKU'}) - Current Stock: ${option.stock} ${option.unit || 'pcs'}`}
                value={manualProductToAdd}
                onChange={(_, val) => setManualProductToAdd(val)}
                renderInput={(params) => <TextField {...params} label="Select Product" />}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenAddProductDialog(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleAddManualProduct}
                disabled={!manualProductToAdd}
              >
                Add to Order
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      )}

      {/* PO DETAILS MODAL */}
      <Dialog
        open={openDetailDialog}
        onClose={() => setOpenDetailDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <ShoppingCart color="primary" />
            <Box>
              <Typography variant="h6" fontWeight={800}>
                Purchase Order {singlePODetails?.data?.poNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Created on {singlePODetails?.data?.orderDate && new Date(singlePODetails.data.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Typography>
            </Box>
          </Box>
          <Box>{singlePODetails?.data && getStatusChip(singlePODetails.data.status)}</Box>
        </DialogTitle>

        <DialogContent dividers>
          {isLoadingSinglePO ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={30} />
            </Box>
          ) : !singlePODetails?.data ? (
            <Typography>No details found.</Typography>
          ) : (
            <Box>
              {/* Supplier & Order Info Cards */}
              <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: 'action.hover', height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
                      Supplier Information
                    </Typography>
                    <Typography variant="body1" fontWeight={700}>
                      {singlePODetails.data.supplier?.name}
                    </Typography>
                    {singlePODetails.data.supplier?.contactPerson && (
                      <Typography variant="body2" color="text.secondary">
                        Contact: {singlePODetails.data.supplier.contactPerson}
                      </Typography>
                    )}
                    {singlePODetails.data.supplier?.phone && (
                      <Typography variant="body2" color="text.secondary">
                        📞 {singlePODetails.data.supplier.phone}
                      </Typography>
                    )}
                    {singlePODetails.data.supplier?.email && (
                      <Typography variant="body2" color="text.secondary">
                        ✉️ {singlePODetails.data.supplier.email}
                      </Typography>
                    )}
                    {singlePODetails.data.supplier?.gstin && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        GSTIN: {singlePODetails.data.supplier.gstin}
                      </Typography>
                    )}
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Paper sx={{ p: 2, bgcolor: 'action.hover', height: '100%' }}>
                    <Typography variant="subtitle2" fontWeight={700} color="primary.main" gutterBottom>
                      Order Information
                    </Typography>
                    <Typography variant="body2">
                      <strong>PO Number:</strong> {singlePODetails.data.poNumber}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Created By:</strong> {singlePODetails.data.createdBy?.name || 'Shop Admin'}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Expected Delivery:</strong>{' '}
                      {singlePODetails.data.expectedDeliveryDate
                        ? new Date(singlePODetails.data.expectedDeliveryDate).toLocaleDateString('en-IN')
                        : 'Not specified'}
                    </Typography>
                    {singlePODetails.data.notes && (
                      <Typography variant="body2" color="text.secondary" mt={0.5}>
                        <strong>Notes:</strong> {singlePODetails.data.notes}
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              </Grid>

              {/* Items Table */}
              <Typography variant="h6" fontWeight={700} mb={1.5}>
                Ordered Products
              </Typography>
              <TableContainer component={Paper} sx={{ mb: 3 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product Name</TableCell>
                      <TableCell align="center">Stock at Order</TableCell>
                      <TableCell align="center">Ordered Qty</TableCell>
                      <TableCell align="center">Received Qty</TableCell>
                      <TableCell align="right">Purchase Price</TableCell>
                      <TableCell align="right">GST %</TableCell>
                      <TableCell align="right">Total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {singlePODetails.data.items.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {item.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SKU: {item.sku || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">{item.currentStock} {item.unit}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 700 }}>
                          {item.orderQty} {item.unit}
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${item.receivedQty || 0} / ${item.orderQty}`}
                            color={
                              (item.receivedQty || 0) >= item.orderQty
                                ? 'success'
                                : (item.receivedQty || 0) > 0
                                ? 'warning'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">₹{item.purchasePrice.toFixed(2)}</TableCell>
                        <TableCell align="right">{item.gstRate}%</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          ₹{item.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Totals Summary */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
                <Box sx={{ width: 280 }}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography color="text.secondary">Subtotal:</Typography>
                    <Typography>₹{singlePODetails.data.subtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography color="text.secondary">GST / Tax:</Typography>
                    <Typography>₹{singlePODetails.data.gstTotal.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography color="text.secondary">Delivery Charges:</Typography>
                    <Typography>₹{singlePODetails.data.deliveryCharges.toFixed(2)}</Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="h6" fontWeight={800}>Grand Total:</Typography>
                    <Typography variant="h6" fontWeight={800} color="primary.main">
                      ₹{singlePODetails.data.grandTotal.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Receipt History Log */}
              {singlePODetails.data.receiptHistory?.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} color="success.main" mb={1}>
                    Receiving / Stock Update History
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Date</TableCell>
                          <TableCell>Received By</TableCell>
                          <TableCell>Items Received</TableCell>
                          <TableCell>Notes</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {singlePODetails.data.receiptHistory.map((rh, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {new Date(rh.receiptDate).toLocaleString('en-IN')}
                            </TableCell>
                            <TableCell>{rh.receivedBy?.name || 'Staff'}</TableCell>
                            <TableCell>
                              {rh.items.map((i, iIdx) => (
                                <Typography key={iIdx} variant="caption" display="block">
                                  • {i.name}: <strong>+{i.quantityReceived} units</strong>
                                </Typography>
                              ))}
                            </TableCell>
                            <TableCell>{rh.notes || '-'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>

          {singlePODetails?.data && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<Print />}
              onClick={() => handleOpenPreviewFromPO(singlePODetails.data)}
            >
              Preview & Print PO
            </Button>
          )}

          {singlePODetails?.data &&
            singlePODetails.data.status !== 'Received' &&
            singlePODetails.data.status !== 'Cancelled' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<Cancel />}
                onClick={() => handleCancelPO(singlePODetails.data._id)}
              >
                Cancel PO
              </Button>
            )}


          {singlePODetails?.data &&
            singlePODetails.data.status !== 'Received' &&
            singlePODetails.data.status !== 'Cancelled' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<AssignmentTurnedIn />}
                onClick={() => handleOpenReceive(singlePODetails.data)}
              >
                Receive Stock
              </Button>
            )}
        </DialogActions>
      </Dialog>

      {/* RECEIVE STOCK DIALOG (FULL OR PARTIAL) */}
      <Dialog
        open={openReceiveDialog}
        onClose={() => setOpenReceiveDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentTurnedIn color="success" />
          <Typography variant="h6" fontWeight={700}>
            Receive Goods & Update Inventory
          </Typography>
        </DialogTitle>

        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 2 }}>
            Entering delivered quantities will automatically increment your product stock in real time. Duplicate receiving is prevented.
          </Alert>

          {singlePODetails?.data && (
            <Box>
              <TableContainer sx={{ mb: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="center">Ordered</TableCell>
                      <TableCell align="center">Already Received</TableCell>
                      <TableCell align="center" width={120}>Receiving Now</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {singlePODetails.data.items.map((item) => {
                      const pId = item.product?._id || item.product;
                      const remaining = item.orderQty - (item.receivedQty || 0);
                      return (
                        <TableRow key={item._id}>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {item.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Current Stock: {item.product?.stock ?? item.currentStock} {item.unit}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{item.orderQty} {item.unit}</TableCell>
                          <TableCell align="center">{item.receivedQty || 0} {item.unit}</TableCell>
                          <TableCell align="center">
                            <TextField
                              type="number"
                              size="small"
                              disabled={remaining <= 0}
                              value={receivingItems[pId] ?? remaining}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                setReceivingItems((prev) => ({
                                  ...prev,
                                  [pId]: isNaN(val) ? 0 : Math.min(val, remaining),
                                }));
                              }}
                              inputProps={{
                                min: 0,
                                max: remaining,
                                style: { textAlign: 'center', fontWeight: 'bold' },
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              <TextField
                fullWidth
                label="Delivery Receipt Notes"
                placeholder="e.g. Delivered by driver in good condition with invoice #1234."
                value={receivingNotes}
                onChange={(e) => setReceivingNotes(e.target.value)}
                size="small"
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenReceiveDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<AssignmentTurnedIn />}
            onClick={handleConfirmReceive}
            disabled={receivePOMutation.isPending}
          >
            {receivePOMutation.isPending ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              'Confirm Stock Receipt & Update Inventory'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PURCHASE ORDER PREVIEW & PRINT MODAL */}
      <PurchaseOrderPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        poData={previewPOData}
        isDraft={isDraftPreview}
      />
    </Box>
  );
}

