// /scripts/downloaderapp/frontend/src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Container, Box, TextField, Button, Typography, 
  Paper, Alert, Card, CardContent 
} from '@mui/material';
import { motion } from 'framer-motion';
import { login } from '../services/api';
import { CloudDownload as CloudDownloadIcon } from '@mui/icons-material';

const Login = ({ setIsAuthenticated, setIsAdmin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await login(username, password);
      localStorage.setItem('authToken', response.data.token);
      setIsAuthenticated(true);
      setIsAdmin(response.data.is_admin);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#141414',
      }}
    >
      <Box sx={{ 
        p: 2, 
        display: 'flex', 
        alignItems: 'center',
        backgroundColor: '#000000'
      }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
          <CloudDownloadIcon sx={{ mr: 1, color: '#e50914' }} />
          <span style={{ color: '#fff' }}>NETFLIX<span style={{ color: '#e50914' }}>TUBE</span></span>
        </Typography>
      </Box>
      
      <Container component="main" maxWidth="xs" sx={{ flexGrow: 1, display: 'flex', alignItems: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ width: '100%' }}
        >
          <Card 
            sx={{ 
              width: '100%',
              backgroundColor: '#181818',
              color: '#fff',
              borderRadius: '8px',
              border: '1px solid #333',
              boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography component="h1" variant="h4" sx={{ mb: 4, fontWeight: 'bold', color: '#fff' }}>
                Sign In
              </Typography>
              
              {error && (
                <Box sx={{ mb: 3, p: 2, bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: '4px', border: '1px solid rgba(255, 0, 0, 0.3)' }}>
                  <Typography sx={{ color: '#ff5252' }}>{error}</Typography>
                </Box>
              )}
              
              <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  id="username"
                  label="Username"
                  name="username"
                  autoComplete="username"
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  InputProps={{
                    style: { 
                      borderRadius: '4px',
                      color: '#ffffff',
                      backgroundColor: '#333333'
                    }
                  }}
                  InputLabelProps={{
                    style: { color: '#cccccc' }
                  }}
                  sx={{
                    mb: 2,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#666666',
                      },
                      '&:hover fieldset': {
                        borderColor: '#999999',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#e50914',
                      },
                    },
                  }}
                />
                
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  InputProps={{
                    style: { 
                      borderRadius: '4px',
                      color: '#ffffff',
                      backgroundColor: '#333333'
                    }
                  }}
                  InputLabelProps={{
                    style: { color: '#cccccc' }
                  }}
                  sx={{
                    mb: 4,
                    '& .MuiOutlinedInput-root': {
                      '& fieldset': {
                        borderColor: '#666666',
                      },
                      '&:hover fieldset': {
                        borderColor: '#999999',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#e50914',
                      },
                    },
                  }}
                />
                
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  sx={{ 
                    mt: 1, 
                    mb: 2,
                    py: 1.2,
                    backgroundColor: '#e50914',
                    color: '#ffffff',
                    fontWeight: 'bold',
                    '&:hover': {
                      backgroundColor: '#f40612',
                      transform: 'scale(1.02)',
                      transition: 'transform 0.2s'
                    },
                    '&:disabled': {
                      backgroundColor: '#5c0408',
                      color: '#999999'
                    }
                  }}
                  disabled={loading}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Login;
