import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', password: '', shopName: '', gstin: '', address: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await api.post('/auth/register', formData);
    console.log("SUCCESS:", res);
    toast.success("Registration successful");
    navigate("/login");
  } catch (error) {
    console.log("ERROR:", error);
    console.log("STATUS:", error.response?.status);
    console.log("DATA:", error.response?.data);

    alert(JSON.stringify(error.response?.data, null, 2));

    toast.error(error.response?.data?.message || "Registration failed");
  }
};

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default', py: 4 }}>
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 500, borderRadius: 2 }}>
        <Typography variant="h5" mb={3} textAlign="center">Register Shop</Typography>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth name="shopName" label="Shop Name" variant="outlined" margin="normal" value={formData.shopName} onChange={handleChange} required />
          <TextField fullWidth name="gstin" label="GST Number" variant="outlined" margin="normal" value={formData.gstin} onChange={handleChange} required />
          <TextField fullWidth name="address" label="Shop Address" variant="outlined" margin="normal" value={formData.address} onChange={handleChange} required />
          
          <Typography variant="subtitle1" mt={2} mb={1}>Owner Details</Typography>
          <TextField fullWidth name="name" label="Owner Name" variant="outlined" margin="normal" value={formData.name} onChange={handleChange} required />
          <TextField fullWidth name="email" label="Email" type="email" variant="outlined" margin="normal" value={formData.email} onChange={handleChange} required />
          <TextField fullWidth name="phone" label="Phone" variant="outlined" margin="normal" value={formData.phone} onChange={handleChange} required />
          <TextField fullWidth name="password" label="Password" type="password" variant="outlined" margin="normal" value={formData.password} onChange={handleChange} required />
          
          <Button fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 3, mb: 2, p: 1.5 }}>
            Register
          </Button>
        </form>
        <Typography textAlign="center">
          Already have an account? <Link to="/login" style={{ color: '#1976D2' }}>Login</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
