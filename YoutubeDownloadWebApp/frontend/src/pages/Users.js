// /scripts/downloaderapp/frontend/src/pages/Users.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, Box, Typography, Paper, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, IconButton, Button, Dialog, 
  DialogTitle, DialogContent, DialogActions, TextField, Chip, Switch, FormControlLabel,
  AppBar, Toolbar, Menu, MenuItem, CircularProgress, Card, CardContent
} from '@mui/material';
import { 
  AccountCircle, Delete as DeleteIcon, Add as AddIcon,
  Dashboard as DashboardIcon, History as HistoryIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { getUsers, createUser, deleteUser } from '../services/api';

const Users = ({ onLogout }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', is_admin: false });
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  
  const user = localStorage.getItem('authToken') ? 
    JSON.parse(atob(localStorage.getItem('authToken').split('.')[1])) : null;
  const currentUserId = user?.user_id;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      setUsers(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleOpenDialog = () => {
    setNewUser({ username: '', password: '', is_admin: false });
    setDialogError('');
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value, checked } = e.target;
    setNewUser({
      ...newUser,
      [name]: name === 'is_admin' ? checked : value
    });
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.password) {
      setDialogError('Please enter both username and password');
      return;
    }

    try {
      await createUser(newUser);
      handleCloseDialog();
      fetchUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      setDialogError(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (userId === currentUserId) {
      return; // Cannot delete yourself
    }

    try {
      await deleteUser(userId);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Box sx={{ flexGrow: 1, bgcolor: '#141414', minHeight: '100vh' }}>
      <AppBar position="static" sx={{ bgcolor: '#000000', boxShadow: 'none' }}>
        <Toolbar>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <CloudDownloadIcon sx={{ mr: 1, color: '#e50914' }} />
            <span>NETFLIX<span style={{ color: '#e50914' }}>TUBE</span></span>
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              component={Link}
              to="/dashboard"
              sx={{ mr: 2, color: '#d9d9d9', '&:hover': { color: '#fff' } }}
            >
              <DashboardIcon />
            </IconButton>
            <IconButton
              color="inherit"
              component={Link}
              to="/history"
              sx={{ mr: 2, color: '#d9d9d9', '&:hover': { color: '#fff' } }}
            >
              <HistoryIcon />
            </IconButton>
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
              sx={{ color: '#d9d9d9', '&:hover': { color: '#fff' } }}
            >
              <AccountCircle />
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
              sx={{ 
                '& .MuiPaper-root': { 
                  bgcolor: '#141414', 
                  color: '#fff',
                  border: '1px solid #333'
                } 
              }}
            >
              {user && <MenuItem disabled sx={{ color: '#ccc' }}>{user.username}</MenuItem>}
              <MenuItem onClick={onLogout} sx={{ '&:hover': { bgcolor: '#333' } }}>Logout</MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#fff' }}>
              Manage Users
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenDialog}
              sx={{ 
                bgcolor: '#e50914', 
                color: '#fff',
                '&:hover': { 
                  bgcolor: '#f40612',
                  transform: 'scale(1.05)',
                },
                borderRadius: '4px'
              }}
            >
              Add User
            </Button>
          </Box>

          {error && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: '4px', border: '1px solid rgba(255, 0, 0, 0.3)' }}>
              <Typography color="error">{error}</Typography>
            </Box>
          )}

          <Card sx={{ 
            bgcolor: '#181818', 
            border: '1px solid #333',
            borderRadius: '6px' 
          }}>
            <CardContent sx={{ p: 0 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                  <CircularProgress sx={{ color: '#e50914' }} />
                </Box>
              ) : users.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ color: '#999' }}>
                    No users found.
                  </Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ 
                        bgcolor: '#141414',
                        '& th': { 
                          color: '#ccc', 
                          fontWeight: 'bold', 
                          py: 2,
                          borderBottom: '2px solid #333'
                        } 
                      }}>
                        <TableCell>Username</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Created At</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {users.map((userItem) => (
                        <TableRow key={userItem.id} sx={{ '&:hover': { bgcolor: '#222' } }}>
                          <TableCell>{userItem.username}</TableCell>
                          <TableCell>
                            <Chip 
                              label={userItem.is_admin ? 'Admin' : 'User'} 
                              sx={{ 
                                bgcolor: userItem.is_admin ? '#e50914' : '#333',
                                color: '#fff',
                                fontWeight: 'medium'
                              }}
                              size="small" 
                            />
                          </TableCell>
                          <TableCell>{formatDate(userItem.created_at)}</TableCell>
                          <TableCell align="right">
                            <IconButton
                              onClick={() => handleDeleteUser(userItem.id)}
                              disabled={userItem.id === currentUserId}
                              title={userItem.id === currentUserId ? "Cannot delete yourself" : "Delete user"}
                              sx={{ 
                                color: '#e50914',
                                '&.Mui-disabled': {
                                  color: '#5c0408'
                                }
                              }}
                            >
                              <DeleteIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </Container>

      <Dialog 
        open={openDialog} 
        onClose={handleCloseDialog}
        PaperProps={{
          style: {
            backgroundColor: '#181818',
            borderRadius: '8px',
            border: '1px solid #333',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #333', fontWeight: 'bold' }}>
          Add New User
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          {dialogError && (
            <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: '4px', border: '1px solid rgba(255, 0, 0, 0.3)' }}>
              <Typography color="error">{dialogError}</Typography>
            </Box>
          )}
          <TextField
            autoFocus
            margin="dense"
            id="username"
            name="username"
            label="Username"
            type="text"
            fullWidth
            variant="outlined"
            value={newUser.username}
            onChange={handleInputChange}
            sx={{ 
              mb: 2, 
              mt: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#666',
                },
                '&:hover fieldset': {
                  borderColor: '#999',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#e50914',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#ccc'
              },
              '& .MuiInputBase-input': {
                color: '#fff'
              }
            }}
          />
          <TextField
            margin="dense"
            id="password"
            name="password"
            label="Password"
            type="password"
            fullWidth
            variant="outlined"
            value={newUser.password}
            onChange={handleInputChange}
            sx={{ 
              mb: 2,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#666',
                },
                '&:hover fieldset': {
                  borderColor: '#999',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#e50914',
                },
              },
              '& .MuiInputLabel-root': {
                color: '#ccc'
              },
              '& .MuiInputBase-input': {
                color: '#fff'
              }
            }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={newUser.is_admin}
                onChange={handleInputChange}
                name="is_admin"
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#e50914',
                    '&:hover': {
                      backgroundColor: 'rgba(229, 9, 20, 0.08)'
                    }
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#e50914'
                  }
                }}
              />
            }
            label="Admin privileges"
            sx={{ color: '#ccc' }}
          />
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ color: '#ccc' }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleCreateUser} 
            variant="contained"
            sx={{ 
              bgcolor: '#e50914', 
              color: '#fff',
              '&:hover': { bgcolor: '#f40612' },
              borderRadius: '4px'
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
