import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function SupplierPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({
    name: '', contactPerson: '', email: '', phone: '', gstin: ''
  });

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/suppliers');
      if (res.data?.success) {
        setSuppliers(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load suppliers');
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contactPerson: '', email: '', phone: '', gstin: '' });
    setOpenDialog(true);
  };

  const handleOpenEdit = (supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      gstin: supplier.gstin || ''
    });
    setOpenDialog(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier._id}`, formData);
        toast.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers', formData);
        toast.success('Supplier created successfully');
      }
      fetchSuppliers();
      setOpenDialog(false);
    } catch (err) {
      toast.error('Failed to save supplier details');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await api.delete(`/suppliers/${id}`);
        toast.success('Supplier deleted');
        fetchSuppliers();
      } catch (err) {
        toast.error('Failed to delete supplier');
      }
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight={700}>Supplier Directory</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpenAdd}>
          Add Supplier
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Company Name</TableCell>
              <TableCell>Contact Person</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>GSTIN</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow><TableCell colSpan={6} align="center">No suppliers listed.</TableCell></TableRow>
            ) : (
              suppliers.map((supplier) => (
                <TableRow key={supplier._id}>
                  <TableCell fontWeight={600}>{supplier.name}</TableCell>
                  <TableCell>{supplier.contactPerson}</TableCell>
                  <TableCell>{supplier.phone}</TableCell>
                  <TableCell>{supplier.email}</TableCell>
                  <TableCell>{supplier.gstin || 'N/A'}</TableCell>
                  <TableCell align="center">
                    <IconButton onClick={() => handleOpenEdit(supplier)} color="primary"><Edit /></IconButton>
                    <IconButton onClick={() => handleDelete(supplier._id)} color="error"><Delete /></IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent dividers>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth name="name" label="Supplier Company Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="contactPerson" label="Contact Person" value={formData.contactPerson} onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth name="phone" label="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="email" label="Email Address" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth name="gstin" label="GSTIN" value={formData.gstin} onChange={(e) => setFormData({ ...formData, gstin: e.target.value })} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained">{editingSupplier ? 'Update' : 'Add'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
