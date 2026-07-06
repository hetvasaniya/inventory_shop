import { useState } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('19191919');
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.data.user, res.data.data.accessToken, res.data.data.shop, res.data.data.refreshToken);
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', bgcolor: 'background.default' }}>
      <Paper elevation={3} sx={{ p: 4, width: 400, borderRadius: 2 }}>
        <Typography variant="h5" mb={3} textAlign="center">Login to H-Mart</Typography>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Email" variant="outlined" margin="normal" value={email}  onChange={(e) => setEmail(e.target.value)} required />
          <TextField fullWidth label="Password" type="password" variant="outlined" margin="normal" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Button fullWidth type="submit" variant="contained" color="primary" sx={{ mt: 3, mb: 2, p: 1.5 }}>
            Login
          </Button>
        </form>
        <Typography textAlign="center">
          Don't have an account? <Link to="/register" style={{ color: '#1976D2' }}>Register Shop</Link>
        </Typography>
      </Paper>
    </Box>
  );
}
