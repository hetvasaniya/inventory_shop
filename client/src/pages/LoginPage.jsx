import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  InputAdornment,
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Close as CloseIcon,
  LockReset as LockResetIcon,
  MarkEmailRead as EmailIcon,
  Key as KeyIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('123123123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Forgot Password Modal State
  const [openForgotDialog, setOpenForgotDialog] = useState(false);
  const [resetStep, setResetStep] = useState(1); // 1: Email, 2: Code, 3: New Passwords
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Handle standard login
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(
        res.data.data.user,
        res.data.data.accessToken,
        res.data.data.shop,
        res.data.data.refreshToken
      );
      toast.success('Logged in successfully');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  // Open Forgot Password Dialog
  const handleOpenForgotDialog = () => {
    setResetEmail(email || '');
    setResetCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetStep(1);
    setResetError('');
    setOpenForgotDialog(true);
  };

  // Close Forgot Password Dialog
  const handleCloseForgotDialog = () => {
    setOpenForgotDialog(false);
    setResetError('');
  };

  // Step 1: Send 6-digit Code to Email
  const handleSendCode = async (e) => {
    e.preventDefault();
    setResetError('');

    if (!resetEmail || !resetEmail.includes('@')) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: resetEmail });
      toast.success(res.data.message || '6-digit verification code sent to your email.');
      setResetStep(2);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to send verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 2: Verify 6-digit OTP Code
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setResetError('');

    if (!resetCode || resetCode.trim().length !== 6) {
      setResetError('Verification code must be exactly 6 digits.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.post('/auth/verify-code', {
        email: resetEmail,
        code: resetCode.trim(),
      });
      toast.success(res.data.message || 'Code verified successfully.');
      setResetStep(3);
    } catch (err) {
      setResetError(err.response?.data?.message || 'Invalid or expired verification code.');
    } finally {
      setResetLoading(false);
    }
  };

  // Step 3: Set New Password & Confirm
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');

    if (!newPassword || newPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('New password and confirm password do not match.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: resetEmail,
        code: resetCode.trim(),
        newPassword,
        confirmPassword,
      });

      toast.success(res.data.message || 'Password reset successfully!');
      setEmail(resetEmail);
      setPassword('');
      handleCloseForgotDialog();
    } catch (err) {
      setResetError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const steps = ['Enter Email', 'Verify 6-Digit Code', 'Set New Password'];

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%',
        bgcolor: 'background.default',
        p: 2,
        boxSizing: 'border-box',
      }}
    >
      <Paper elevation={4} sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 420, borderRadius: 3, boxSizing: 'border-box' }}>
        <Box textAlign="center" mb={3}>
          <Typography variant="h4" fontWeight={800} color="primary.main" gutterBottom sx={{ letterSpacing: -0.5 }}>
            BizGrow
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Business Growth, Billing & Inventory Management
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email Address"
            variant="outlined"
            margin="normal"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Password"
            type={showPassword ? 'text' : 'password'}
            variant="outlined"
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1, mb: 1 }}>
            <Button
              variant="text"
              color="primary"
              size="small"
              onClick={handleOpenForgotDialog}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Forgot Password?
            </Button>
          </Box>

          <Button
            fullWidth
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{ mt: 1, mb: 2, p: 1.5, fontSize: '1rem', fontWeight: 600, borderRadius: 2 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Login'}
          </Button>
        </form>

        <Typography textAlign="center" color="text.secondary" variant="body2">
          Don't have an account?{' '}
          <Link to="/register" style={{ color: '#1976D2', fontWeight: 600, textDecoration: 'none' }}>
            Register Shop
          </Link>
        </Typography>
      </Paper>

      {/* Forgot Password Multi-Step Dialog */}
      <Dialog
        open={openForgotDialog}
        onClose={handleCloseForgotDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <LockResetIcon color="primary" fontSize="large" />
            <Typography variant="h6" fontWeight={700}>
              Reset Password
            </Typography>
          </Box>
          <IconButton onClick={handleCloseForgotDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ py: 3 }}>
          {/* Stepper Progress */}
          <Stepper activeStep={resetStep - 1} alternativeLabel sx={{ mb: 3 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {resetError && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
              {resetError}
            </Alert>
          )}

          {/* STEP 1: Email Address Input */}
          {resetStep === 1 && (
            <form onSubmit={handleSendCode}>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Please enter your registered Gmail or email address. We will send you a <strong>6-digit verification code</strong>.
              </Typography>
              <TextField
                fullWidth
                label="Registered Email Address"
                variant="outlined"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                placeholder="name@gmail.com"
                required
                autoFocus
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <EmailIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={resetLoading}
                sx={{ mt: 3, py: 1.4, borderRadius: 2, fontWeight: 600 }}
              >
                {resetLoading ? <CircularProgress size={24} color="inherit" /> : 'Send 6-Digit Code'}
              </Button>
            </form>
          )}

          {/* STEP 2: Enter 6-Digit OTP Code */}
          {resetStep === 2 && (
            <form onSubmit={handleVerifyCode}>
              <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2 }}>
                A 6-digit verification code has been sent to <strong>{resetEmail}</strong>.
              </Alert>

              <Typography variant="body2" color="text.secondary" mb={2}>
                Enter the 6-digit code received in your email:
              </Typography>

              <TextField
                fullWidth
                label="6-Digit Verification Code"
                variant="outlined"
                value={resetCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setResetCode(val);
                }}
                placeholder="123456"
                required
                autoFocus
                inputProps={{
                  maxLength: 6,
                  style: { letterSpacing: 8, fontSize: '1.4rem', fontWeight: 'bold', textAlign: 'center' },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <KeyIcon color="action" />
                    </InputAdornment>
                  ),
                }}
              />

              <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
                <Button
                  size="small"
                  variant="text"
                  onClick={() => setResetStep(1)}
                  disabled={resetLoading}
                  sx={{ textTransform: 'none' }}
                >
                  ← Change Email
                </Button>
                <Button
                  size="small"
                  variant="text"
                  onClick={handleSendCode}
                  disabled={resetLoading}
                  sx={{ textTransform: 'none', fontWeight: 600 }}
                >
                  Resend Code
                </Button>
              </Box>

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={resetLoading || resetCode.length !== 6}
                sx={{ mt: 3, py: 1.4, borderRadius: 2, fontWeight: 600 }}
              >
                {resetLoading ? <CircularProgress size={24} color="inherit" /> : 'Verify Code'}
              </Button>
            </form>
          )}

          {/* STEP 3: Enter New Password Twice */}
          {resetStep === 3 && (
            <form onSubmit={handleResetPassword}>
              <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2.5, borderRadius: 2 }}>
                Code verified! Enter your new password twice below for security.
              </Alert>

              <TextField
                fullWidth
                label="New Password"
                type={showNewPassword ? 'text' : 'password'}
                variant="outlined"
                margin="normal"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                helperText="Password must be at least 6 characters long."
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end">
                        {showNewPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showConfirmPassword ? 'text' : 'password'}
                variant="outlined"
                margin="normal"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                error={confirmPassword.length > 0 && confirmPassword !== newPassword}
                helperText={
                  confirmPassword.length > 0 && confirmPassword !== newPassword
                    ? 'Passwords do not match'
                    : 'Re-enter your new password to verify'
                }
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end">
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                color="primary"
                disabled={
                  resetLoading ||
                  !newPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmPassword
                }
                sx={{ mt: 3, py: 1.4, borderRadius: 2, fontWeight: 600 }}
              >
                {resetLoading ? <CircularProgress size={24} color="inherit" /> : 'Reset Password'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
