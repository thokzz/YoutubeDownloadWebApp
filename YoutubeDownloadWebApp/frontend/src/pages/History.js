// /scripts/downloaderapp/frontend/src/pages/History.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, Box, Typography, Paper, Grid, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TablePagination, Chip, IconButton,
  AppBar, Toolbar, Menu, MenuItem, LinearProgress, CircularProgress,
  Card, CardContent
} from '@mui/material';
import { 
  AccountCircle, Dashboard as DashboardIcon, Group as GroupIcon,
  CloudDownload as CloudDownloadIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { getDownloads, getAllDownloads } from '../services/api';

const History = ({ isAdmin, onLogout }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [error, setError] = useState('');
  
  const user = localStorage.getItem('authToken') ? 
    JSON.parse(atob(localStorage.getItem('authToken').split('.')[1])) : null;

  useEffect(() => {
    fetchDownloads();
  }, [isAdmin]);

  const fetchDownloads = async () => {
    try {
      setLoading(true);
      const response = isAdmin ? await getAllDownloads() : await getDownloads();
      setDownloads(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching downloads:', error);
      setError('Failed to load download history');
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

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return '#4CAF50';
      case 'failed':
        return '#FF5252';
      case 'cancelled':
        return '#FFC107';
      default:
        return '#e50914'; // Netflix red
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
            {isAdmin && (
              <IconButton
                color="inherit"
                component={Link}
                to="/users"
                sx={{ mr: 2, color: '#d9d9d9', '&:hover': { color: '#fff' } }}
              >
                <GroupIcon />
              </IconButton>
            )}
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
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#fff', mb: 3 }}>
            Download History
          </Typography>

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
              ) : downloads.length === 0 ? (
                <Box sx={{ p: 5, textAlign: 'center' }}>
                  <Typography variant="body1" sx={{ color: '#999' }}>
                    No download history found.
                  </Typography>
                </Box>
              ) : (
                <>
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
                          {isAdmin && <TableCell>User</TableCell>}
                          <TableCell>URL</TableCell>
                          <TableCell>Target Path</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Progress</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Aspect Ratio</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {downloads
                          .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                          .map((download) => (
                            <TableRow key={download.id} sx={{ '&:hover': { bgcolor: '#222' } }}>
                              {isAdmin && <TableCell>{download.username}</TableCell>}
                              <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {download.url}
                              </TableCell>
                              <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {download.target_path}
                              </TableCell>
                              <TableCell>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: getStatusColor(download.status),
                                    fontWeight: 'medium'
                                  }}
                                >
                                  {download.status}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {download.status === 'downloading' || download.status === 'processing' ? (
                                  <Box sx={{ width: '100%', maxWidth: 100 }}>
                                    <LinearProgress 
                                      variant={download.progress < 0 ? "indeterminate" : "determinate"} 
                                      value={download.progress < 0 ? 0 : download.progress}
                                      sx={{ 
                                        height: 4, 
                                        borderRadius: 2,
                                        bgcolor: '#333',
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: '#e50914'
                                        }
                                      }}
                                    />
                                  </Box>
                                ) : (
                                  download.progress === 100 ? '100%' : '-'
                                )}
                              </TableCell>
                              <TableCell>{formatDate(download.created_at)}</TableCell>
                              <TableCell>{download.aspect_ratio || 'Unknown'}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    component="div"
                    count={downloads.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                    sx={{ 
                      color: '#ccc',
                      '.MuiTablePagination-selectIcon': { color: '#999' },
                      '.MuiTablePagination-displayedRows': { color: '#ccc' },
                      '.MuiTablePagination-actions': { color: '#ccc' }
                    }}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  );
};

export default History;
