// /scripts/downloaderapp/frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, Box, Typography, TextField, Button, Paper, Grid, 
  AppBar, Toolbar, IconButton, Menu, MenuItem, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Tooltip, Chip, Collapse, Card, CardContent
} from '@mui/material';
import { 
  AccountCircle, History as HistoryIcon, Group as GroupIcon,
  Add as AddIcon, Delete as DeleteIcon, Info as InfoIcon,
  KeyboardArrowDown as KeyboardArrowDownIcon, KeyboardArrowUp as KeyboardArrowUpIcon,
  CloudDownload as CloudDownloadIcon, Cancel as CancelIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { startDownloads, getDownloadStatus, cancelDownload } from '../services/api';

const Dashboard = ({ isAdmin, onLogout }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [urls, setUrls] = useState(['']);
  const [targetPaths, setTargetPaths] = useState(['']);
  const [fileNames, setFileNames] = useState(['']);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState([]);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  
  const user = localStorage.getItem('authToken') ? 
    JSON.parse(atob(localStorage.getItem('authToken').split('.')[1])) : null;

  useEffect(() => {
    // Poll for active downloads status
    if (activeDownloads.length > 0) {
      const interval = setInterval(() => {
        updateDownloadStatus();
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [activeDownloads]);

  const updateDownloadStatus = async () => {
    try {
      const updatedDownloads = [...activeDownloads];
      let allCompleted = true;
      
      for (let i = 0; i < updatedDownloads.length; i++) {
        const download = updatedDownloads[i];
        if (download.status !== 'completed' && download.status !== 'failed' && download.status !== 'cancelled') {
          const response = await getDownloadStatus(download.id);
          updatedDownloads[i] = { ...download, ...response.data };
          
          if (response.data.status !== 'completed' && response.data.status !== 'failed' && response.data.status !== 'cancelled') {
            allCompleted = false;
          }
        }
      }
      
      setActiveDownloads(updatedDownloads);
      
      if (allCompleted && updatedDownloads.length > 0) {
        setIsDownloading(false);
        setSuccessMessage('All downloads completed!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error updating download status:', error);
    }
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleUrlChange = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleTargetPathChange = (index, value) => {
    const newPaths = [...targetPaths];
    newPaths[index] = value;
    setTargetPaths(newPaths);
  };

  const handleFileNameChange = (index, value) => {
    const newFileNames = [...fileNames];
    newFileNames[index] = value;
    setFileNames(newFileNames);
  };

  const addRow = () => {
    if (urls.length < 15) {
      setUrls([...urls, '']);
      setTargetPaths([...targetPaths, '']);
      setFileNames([...fileNames, '']);
    }
  };

  const removeRow = (index) => {
    const newUrls = [...urls];
    const newPaths = [...targetPaths];
    const newFileNames = [...fileNames];
    
    newUrls.splice(index, 1);
    newPaths.splice(index, 1);
    newFileNames.splice(index, 1);
    
    setUrls(newUrls);
    setTargetPaths(newPaths);
    setFileNames(newFileNames);
  };

  const handleDownload = async () => {
    setError('');
    setSuccessMessage('');
    
    const validRows = urls.map((url, index) => ({
      url,
      targetPath: targetPaths[index],
      fileName: fileNames[index]
    })).filter(row => row.url && row.targetPath);
    
    if (validRows.length === 0) {
      setError('Please enter at least one URL with a target path');
      return;
    }
    
    try {
      setIsDownloading(true);
      
      // Prepare paths for the backend
      const downloadUrls = validRows.map(row => row.url);
      const downloadPaths = validRows.map(row => {
        // Construct the final path by combining target path and filename (if provided)
        // Ensure path doesn't end with trailing slash
        const path = row.targetPath.endsWith('/') ? row.targetPath.slice(0, -1) : row.targetPath;
        
        // If filename is provided, append it to the path
        if (row.fileName && row.fileName.trim()) {
          return `${path}/${row.fileName.trim()}.mp4`;
        }
        // Otherwise just use the path (backend will append original filename)
        return path;
      });
      
      const response = await startDownloads(downloadUrls, downloadPaths);
      
      const downloadIds = response.data.download_ids;
      const newActiveDownloads = downloadIds.map((id, index) => ({
        id,
        url: downloadUrls[index],
        target_path: downloadPaths[index],
        file_name: validRows[index].fileName || 'Original',
        status: 'queued',
        progress: 0,
        timestamp: new Date().toISOString(),
        aspect_ratio: 'Unknown' // Will be updated after download
      }));
      
      setActiveDownloads(prev => [...newActiveDownloads, ...prev]);
      
      // Clear form after successful submission
      setUrls(['']);
      setTargetPaths(['']);
      setFileNames(['']);
      setShowAddForm(false);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to start download');
      setIsDownloading(false);
    }
  };

  const handleCancelDownload = async (downloadId) => {
    try {
      await cancelDownload(downloadId);
      updateDownloadStatus();
    } catch (error) {
      console.error('Error cancelling download:', error);
    }
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

  const getStatusText = (status) => {
    switch (status) {
      case 'queued':
        return 'Queued';
      case 'downloading':
        return 'Downloading';
      case 'processing':
        return 'Processing';
      case 'moving':
        return 'Moving File';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const toggleAddForm = () => {
    setShowAddForm(!showAddForm);
  };

  const getPathAndFilename = (fullPath) => {
    if (!fullPath) return { path: '', filename: '' };
    
    // Check if the path ends with .mp4
    if (fullPath.endsWith('.mp4')) {
      const lastSlashIndex = fullPath.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        const path = fullPath.substring(0, lastSlashIndex);
        const filename = fullPath.substring(lastSlashIndex + 1, fullPath.length - 4); // Remove .mp4
        return { path, filename };
      }
    }
    
    return { path: fullPath, filename: 'Original' };
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
            <Button 
              color="inherit" 
              component={Link} 
              to="/history" 
              startIcon={<HistoryIcon />}
              sx={{ mx: 1, color: '#d9d9d9', '&:hover': { color: '#fff' } }}
            >
              History
            </Button>
            {isAdmin && (
              <Button 
                color="inherit" 
                component={Link} 
                to="/users" 
                startIcon={<GroupIcon />}
                sx={{ mx: 1, color: '#d9d9d9', '&:hover': { color: '#fff' } }}
              >
                Users
              </Button>
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
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', color: '#fff' }}>
                Video Downloads
              </Typography>
              <Box>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={toggleAddForm}
                  sx={{ 
                    mr: 1, 
                    bgcolor: '#e50914', 
                    '&:hover': { bgcolor: '#f40612' },
                    borderRadius: '4px'
                  }}
                >
                  {showAddForm ? 'Hide Form' : 'Add Download'}
                </Button>
                <Button 
                  size="small" 
                  onClick={handleOpenDialog}
                  sx={{ color: '#999', '&:hover': { color: '#fff' } }}
                >
                  <InfoIcon sx={{ mr: 0.5, fontSize: '1rem' }} />
                  Help
                </Button>
              </Box>
            </Box>

            {error && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(255, 0, 0, 0.1)', borderRadius: '4px', border: '1px solid rgba(255, 0, 0, 0.3)' }}>
                <Typography color="error">{error}</Typography>
              </Box>
            )}

            {successMessage && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'rgba(76, 175, 80, 0.1)', borderRadius: '4px', border: '1px solid rgba(76, 175, 80, 0.3)' }}>
                <Typography sx={{ color: '#4CAF50' }}>{successMessage}</Typography>
              </Box>
            )}

            <Collapse in={showAddForm}>
              <Card sx={{ 
                mb: 4, 
                bgcolor: '#181818', 
                border: '1px solid #333',
                borderRadius: '6px',
                overflow: 'visible'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: '#fff', fontWeight: 'bold' }}>
                    Add New Downloads
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#999', mb: 3 }}>
                    Enter URLs from YouTube, TikTok, or Facebook (maximum 5 at a time).
                  </Typography>
                  
                  {urls.map((url, index) => (
                    <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="Video URL"
                          variant="outlined"
                          value={url}
                          onChange={(e) => handleUrlChange(index, e.target.value)}
                          disabled={isDownloading}
                          placeholder="Enter YouTube, TikTok, or Facebook URL"
                          size="small"
                          required
                          InputProps={{
                            style: { borderRadius: '4px' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#333',
                              },
                              '&:hover fieldset': {
                                borderColor: '#666',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#e50914',
                              },
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={3}>
                        <TextField
                          fullWidth
                          label="Target Path"
                          variant="outlined"
                          value={targetPaths[index]}
                          onChange={(e) => handleTargetPathChange(index, e.target.value)}
                          disabled={isDownloading}
                          placeholder="e.g., videos/youtube"
                          size="small"
                          required
                          InputProps={{
                            style: { borderRadius: '4px' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#333',
                              },
                              '&:hover fieldset': {
                                borderColor: '#666',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#e50914',
                              },
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={4}>
                        <TextField
                          fullWidth
                          label="File Name"
                          variant="outlined"
                          value={fileNames[index]}
                          onChange={(e) => handleFileNameChange(index, e.target.value)}
                          disabled={isDownloading}
                          placeholder="Leave blank to keep original name"
                          size="small"
                          helperText={
                            <span style={{ color: '#999' }}>.mp4 will be added automatically</span>
                          }
                          InputProps={{
                            style: { borderRadius: '4px' }
                          }}
                          sx={{
                            '& .MuiOutlinedInput-root': {
                              '& fieldset': {
                                borderColor: '#333',
                              },
                              '&:hover fieldset': {
                                borderColor: '#666',
                              },
                              '&.Mui-focused fieldset': {
                                borderColor: '#e50914',
                              },
                            },
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} md={1} sx={{ display: 'flex', alignItems: 'center' }}>
                        {index > 0 && (
                          <IconButton 
                            color="error" 
                            onClick={() => removeRow(index)} 
                            disabled={isDownloading}
                            sx={{ color: '#e50914' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Grid>
                    </Grid>
                  ))}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                    <Button
                      variant="outlined"
                      onClick={addRow}
                      disabled={isDownloading || urls.length >= 15}
                      startIcon={<AddIcon />}
                      sx={{ 
                        borderColor: '#666',
                        color: '#ccc',
                        '&:hover': {
                          borderColor: '#e50914',
                          color: '#e50914',
                          bgcolor: 'rgba(229, 9, 20, 0.1)'
                        },
                        '&.Mui-disabled': {
                          borderColor: '#333',
                          color: '#666'
                        }
                      }}
                    >
                      Add Another URL
                    </Button>
                    
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleDownload} 
                      disabled={isDownloading}
                      sx={{ 
                        bgcolor: '#e50914', 
                        '&:hover': { 
                          bgcolor: '#f40612',
                          transform: 'scale(1.05)',
                          transition: 'transform 0.2s'
                        },
                        '&.Mui-disabled': {
                          bgcolor: '#5c0408',
                          color: '#999'
                        }
                      }}
                    >
                      {isDownloading ? 'Downloading...' : 'Start Downloads'}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Collapse>

            <Card sx={{ 
              bgcolor: '#181818', 
              border: '1px solid #333',
              borderRadius: '6px' 
            }}>
              <CardContent sx={{ p: 0 }}>
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
                        <TableCell>URL</TableCell>
                        <TableCell>Target Path</TableCell>
                        <TableCell>File Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Timestamp</TableCell>
                        <TableCell>Aspect Ratio</TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeDownloads.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                            <Typography variant="body2" color="#999">
                              No downloads yet. Click "Add Download" to get started.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeDownloads.map((download, index) => {
                          const { path, filename } = getPathAndFilename(download.target_path);
                          const isActive = ['downloading', 'processing', 'queued', 'moving'].includes(download.status);
                          
                          return (
                            <TableRow 
                              key={download.id}
                              sx={{ 
                                '&:hover': { bgcolor: '#222' },
                                transition: 'background-color 0.2s'
                              }}
                            >
                              <TableCell sx={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Tooltip title={download.url}>
                                  <Typography variant="body2" noWrap>
                                    {download.url}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                              <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Tooltip title={path}>
                                  <Typography variant="body2" noWrap>
                                    {path}
                                  </Typography>
                                </Tooltip>
                              </TableCell>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Typography variant="body2">
                                    {download.file_name || filename}
                                  </Typography>
                                  {(download.file_name || filename) !== 'Original' && (
                                    <Typography variant="caption" color="#999" sx={{ ml: 0.5 }}>
                                      .mp4
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      color: getStatusColor(download.status),
                                      fontWeight: 'medium',
                                      mb: 0.5
                                    }}
                                  >
                                    {getStatusText(download.status)}
                                  </Typography>
                                  {isActive && (
                                    <LinearProgress 
                                      variant={download.progress < 0 ? "indeterminate" : "determinate"} 
                                      value={download.progress < 0 ? 0 : download.progress} 
                                      sx={{ 
                                        height: 4, 
                                        borderRadius: 2, 
                                        width: '100%',
                                        bgcolor: '#333',
                                        '& .MuiLinearProgress-bar': {
                                          bgcolor: '#e50914'
                                        }
                                      }}
                                    />
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell>{formatTimestamp(download.timestamp)}</TableCell>
                              <TableCell>{download.aspect_ratio || 'Unknown'}</TableCell>
                              <TableCell align="center">
                                {isActive && (
                                  <IconButton 
                                    color="error" 
                                    size="small"
                                    onClick={() => handleCancelDownload(download.id)}
                                    sx={{ color: '#e50914', '&:hover': { bgcolor: 'rgba(229, 9, 20, 0.1)' } }}
                                  >
                                    <CancelIcon />
                                  </IconButton>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Box>
        </motion.div>
      </Container>

      <Dialog open={openDialog} onClose={handleCloseDialog}
        PaperProps={{
          style: {
            backgroundColor: '#181818',
            borderRadius: '8px',
            border: '1px solid #333',
            maxWidth: '500px'
          }
        }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #333', color: '#fff', fontWeight: 'bold' }}>
          Download Help
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <DialogContentText sx={{ color: '#ccc' }}>
            To download videos, you need to provide:
          </DialogContentText>
          
          <Typography variant="subtitle1" sx={{ mt: 3, fontWeight: 'bold', color: '#fff' }}>
            1. Video URL <span style={{ color: '#e50914' }}>*</span>
          </Typography>
          <Box sx={{ mt: 1, mb: 1, p: 2, backgroundColor: '#0a0a0a', borderRadius: '4px', border: '1px solid #333' }}>
            <Typography variant="body2" fontFamily="monospace" noWrap sx={{ color: '#ccc' }}>
              https://www.youtube.com/watch?v=example
            </Typography>
          </Box>
          <DialogContentText sx={{ mb: 2, color: '#999' }}>
            The URL of the video you want to download from YouTube, TikTok, or Facebook.
          </DialogContentText>
          
          <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold', color: '#fff' }}>
            2. Target Path <span style={{ color: '#e50914' }}>*</span>
          </Typography>
          <Box sx={{ mt: 1, mb: 1, p: 2, backgroundColor: '#0a0a0a', borderRadius: '4px', border: '1px solid #333' }}>
            <Typography variant="body2" fontFamily="monospace" noWrap sx={{ color: '#ccc' }}>
              videos/youtube
            </Typography>
          </Box>
          <DialogContentText sx={{ mb: 2, color: '#999' }}>
            The directory where you want to save the video (under /mnt/VOLUMEPATH/).
          </DialogContentText>
          
          <Typography variant="subtitle1" sx={{ mt: 2, fontWeight: 'bold', color: '#fff' }}>
            3. File Name <span style={{ color: '#999', fontWeight: 'normal' }}>(optional)</span>
          </Typography>
          <Box sx={{ mt: 1, mb: 1, p: 2, backgroundColor: '#0a0a0a', borderRadius: '4px', border: '1px solid #333' }}>
            <Typography variant="body2" fontFamily="monospace" noWrap sx={{ color: '#ccc' }}>
              my-custom-video-name
            </Typography>
          </Box>
          <DialogContentText sx={{ color: '#999' }}>
            If provided, this will be used as the name for the downloaded file, with .mp4 extension automatically added.
            If left blank, the original filename from the source will be used.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ borderTop: '1px solid #333', p: 2 }}>
          <Button 
            onClick={handleCloseDialog} 
            sx={{ 
              color: '#fff', 
              bgcolor: '#e50914', 
              '&:hover': { bgcolor: '#f40612' },
              px: 3,
              borderRadius: '4px'
            }}
          >
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
