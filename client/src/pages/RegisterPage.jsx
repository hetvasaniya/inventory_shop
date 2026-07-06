import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Divider,
  CircularProgress,
} from '@mui/material';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    shopName: '',
    gstin: '',
    address: '',
  });

  // fieldErrors: object mapping field name → error message string
  // e.g. { email: "An account with this email already exists." }
  const [fieldErrors, setFieldErrors] = useState({});

  // Top-level error banner (for non-field errors like network failure)
  const [bannerError, setBannerError] = useState('');

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear the per-field error as soon as the user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  /**
   * Parse the server error response into a { fieldName: message } map.
   * The server may return:
   *   - errors: [ { field, message } ]           — array form (validation)
   *   - field + message at top level              — single-field 409 (duplicate)
   */
  const parseServerErrors = (data) => {
    if (!data) return {};

    const map = {};

    // Array of field errors (from validation middleware or pre-flight check)
    if (Array.isArray(data.errors)) {
      data.errors.forEach(({ field, message }) => {
        if (field) map[field] = message;
      });
    }

    // Single field duplicate (from duplicate check — 409 response)
    if (data.field && data.message && Object.keys(map).length === 0) {
      map[data.field] = data.message;
    }

    return map;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});
    setBannerError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', formData);
      toast.success('Registration successful! Please log in.');
      navigate('/login');
    } catch (error) {
      const status = error.response?.status;
      const data = error.response?.data;

      console.log('[REGISTER ERROR] Status:', status);
      console.log('[REGISTER ERROR] Data:', data);

      if (data) {
        const parsed = parseServerErrors(data);

        if (Object.keys(parsed).length > 0) {
          // We have field-level errors — highlight the specific fields
          setFieldErrors(parsed);

          // Also show a toast pointing to the first problem
          const firstMsg = Object.values(parsed)[0];
          toast.error(firstMsg);
        } else {
          // Non-field error (e.g. server crash, unknown error)
          const msg = data.message || 'Registration failed. Please try again.';
          setBannerError(msg);
          toast.error(msg);
        }
      } else {
        // No response body at all (network error, server down, CORS, etc.)
        const msg =
          status === 409
            ? 'A record with the same details already exists. Try a different email or GSTIN.'
            : error.message || 'Network error. Please check your connection.';
        setBannerError(msg);
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper: whether a field has an error
  const err = (field) => Boolean(fieldErrors[field]);
  const helperText = (field) => fieldErrors[field] || '';

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: 'background.default',
        py: 4,
      }}
    >
      <Paper elevation={3} sx={{ p: 4, width: '100%', maxWidth: 520, borderRadius: 2 }}>
        <Typography variant="h5" mb={1} textAlign="center" fontWeight={700}>
          Register Shop
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" mb={3}>
          Create your shop account to get started
        </Typography>

        {/* Top-level error banner */}
        {bannerError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>Registration Failed</AlertTitle>
            {bannerError}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Shop Details ── */}
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Shop Details
          </Typography>

          <TextField
            fullWidth
            id="register-shopName"
            name="shopName"
            label="Shop Name *"
            variant="outlined"
            margin="normal"
            value={formData.shopName}
            onChange={handleChange}
            error={err('shopName')}
            helperText={helperText('shopName')}
            disabled={loading}
          />

          <TextField
            fullWidth
            id="register-gstin"
            name="gstin"
            label="GSTIN (optional)"
            variant="outlined"
            margin="normal"
            value={formData.gstin}
            onChange={handleChange}
            error={err('gstin')}
            helperText={
              fieldErrors.gstin ||
              'Format: 22AAAAA0000A1Z5 — leave blank if not registered for GST'
            }
            inputProps={{ maxLength: 16, style: { textTransform: 'uppercase' } }}
            disabled={loading}
            // NOTE: gstin is intentionally NOT required — the backend accepts empty value
          />

          <TextField
            fullWidth
            id="register-address"
            name="address"
            label="Shop Address"
            variant="outlined"
            margin="normal"
            value={formData.address}
            onChange={handleChange}
            error={err('address')}
            helperText={helperText('address')}
            disabled={loading}
          />

          <Divider sx={{ my: 2 }} />

          {/* ── Owner Details ── */}
          <Typography variant="subtitle2" color="text.secondary" mb={1}>
            Owner Details
          </Typography>

          <TextField
            fullWidth
            id="register-name"
            name="name"
            label="Owner Name *"
            variant="outlined"
            margin="normal"
            value={formData.name}
            onChange={handleChange}
            error={err('name')}
            helperText={helperText('name')}
            disabled={loading}
          />

          <TextField
            fullWidth
            id="register-email"
            name="email"
            label="Email *"
            type="email"
            variant="outlined"
            margin="normal"
            value={formData.email}
            onChange={handleChange}
            error={err('email')}
            helperText={
              fieldErrors.email || ''
            }
            disabled={loading}
          />

          <TextField
            fullWidth
            id="register-phone"
            name="phone"
            label="Phone"
            variant="outlined"
            margin="normal"
            value={formData.phone}
            onChange={handleChange}
            error={err('phone')}
            helperText={helperText('phone') || '10-digit Indian mobile number'}
            disabled={loading}
          />

          <TextField
            fullWidth
            id="register-password"
            name="password"
            label="Password *"
            type="password"
            variant="outlined"
            margin="normal"
            value={formData.password}
            onChange={handleChange}
            error={err('password')}
            helperText={helperText('password') || 'Minimum 6 characters'}
            disabled={loading}
          />

          <Button
            fullWidth
            id="register-submit"
            type="submit"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            sx={{ mt: 3, mb: 2, p: 1.5 }}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {loading ? 'Registering…' : 'Register'}
          </Button>
        </form>

        <Typography textAlign="center" variant="body2">
          Already have an account?{' '}
          <Link to="/login" style={{ color: '#1976D2', fontWeight: 600 }}>
            Login
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}
