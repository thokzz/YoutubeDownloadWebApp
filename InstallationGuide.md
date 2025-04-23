# NETFLIXTUBE Installation Guide

This guide provides detailed, step-by-step instructions for installing and running the NETFLIXTUBE video downloader application on an Ubuntu Linux system.

## Prerequisites

Before beginning the installation, ensure you have:

- Ubuntu Linux (20.04 LTS or newer)
- Sudo/root access
- Internet connection
- Basic familiarity with terminal commands

## Step 1: Install System Dependencies

First, update your package lists and install the required system dependencies:

```bash
# Update package lists
sudo apt update

# Install required system packages
sudo apt install -y python3 python3-pip python3-venv nodejs npm nginx ffmpeg git
```

## Step 2: Create Application Directory Structure

Create the necessary directories for the application:

```bash
# Create main application directories
sudo mkdir -p /scripts/downloaderapp
sudo mkdir -p /scripts/downloaderapp/backend
sudo mkdir -p /scripts/downloaderapp/frontend
sudo mkdir -p /scripts/downloaderapp/data

# Create the target directory for downloaded videos
sudo mkdir -p /mnt/VOLUMEPATH

# Set appropriate permissions
sudo chmod 777 /mnt/VOLUMEPATH
sudo chown -R $USER:$USER /scripts/downloaderapp
```

## Step 3: Clone the Repository (or Download Files)

Clone the repository (if available) or create the necessary files:

```bash
# Option 1: If you have a Git repository
git clone https://github.com/yourusername/netflixtube.git
cd netflixtube

# Copy files to appropriate locations
sudo cp -r backend/* /scripts/downloaderapp/backend/
sudo cp -r frontend/* /scripts/downloaderapp/frontend/

# Option 2: If you're creating files manually
# You'll need to create each file as shown in the following steps
```

## Step 4: Set Up Python Virtual Environment and Install Backend Dependencies

Create a Python virtual environment and install the required packages:

```bash
# Navigate to the backend directory
cd /scripts/downloaderapp/backend

# Create a virtual environment
python3 -m venv venv

# Activate the virtual environment
source venv/bin/activate

# Install required Python packages
pip install Flask==2.3.3 Flask-Cors==4.0.0 yt-dlp==2024.1.29 PyJWT==2.8.0 Werkzeug==2.3.7 gunicorn==21.2.0
```

## Step 5: Create Backend Application Files

Create the main backend application file:

```bash
# Create app.py in the backend directory
sudo nano /scripts/downloaderapp/backend/app.py
```

Paste the entire content of the `app.py` file you've seen in the uploaded documents into this file.

Next, create the startup script:

```bash
# Create startup script
sudo nano /scripts/downloaderapp/backend/start.sh

# Add the following content:
#!/bin/bash
cd /scripts/downloaderapp/backend
source venv/bin/activate
python app.py

# Make the script executable
sudo chmod +x /scripts/downloaderapp/backend/start.sh
```

## Step 6: Set Up Frontend

Install the frontend dependencies and prepare the React application:

```bash
# Navigate to the frontend directory
cd /scripts/downloaderapp/frontend

# Install dependencies
npm install

# Create necessary files and directories for React app
mkdir -p src/pages src/services public
```

Create the API service file:

```bash
# Create the API service file
mkdir -p src/services
nano src/services/api.js

# Add the following content:
import axios from 'axios';

const API_URL = '/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Authentication
export const login = (username, password) => {
  return api.post('/login', { username, password });
};

// Users
export const getUsers = () => {
  return api.get('/users');
};

export const createUser = (userData) => {
  return api.post('/users', userData);
};

export const deleteUser = (userId) => {
  return api.delete(`/users/${userId}`);
};

// Downloads
export const startDownloads = (urls, targetPaths) => {
  return api.post('/downloads', { urls, targetPaths });
};

export const getDownloads = () => {
  return api.get('/downloads');
};

export const getAllDownloads = () => {
  return api.get('/downloads/all');
};

export const getDownloadStatus = (downloadId) => {
  return api.get(`/downloads/${downloadId}`);
};

export const cancelDownload = (downloadId) => {
  return api.post(`/downloads/${downloadId}/cancel`);
};

export default api;
```

Now, create the React component files. You will need to create several files for the pages:

1. Copy the content of `Login.js`, `Dashboard.js`, `History.js`, and `Users.js` from the uploaded documents into their respective files in the `src/pages` directory.

2. Create the main App.js file:
```bash
# Create App.js
nano src/App.js
```
Copy the content of `App.js` from the uploaded documents into this file.

3. Create the main index.js file:
```bash
# Create index.js
nano src/index.js
```
Copy the content of `index.js` from the uploaded documents into this file.

4. Create the CSS files:
```bash
# Create the CSS files
nano src/App.css
nano src/index.css
```
Copy the content of `App.css` and `index.css` from the uploaded documents into these files.

## Step 7: Configure Nginx

Create an Nginx configuration file for the application:

```bash
# Create Nginx configuration file
sudo nano /etc/nginx/sites-available/video-downloader-app
```

Add the following content:

```nginx
server {
    listen 4080;
    
    root /scripts/downloaderapp/frontend/build;
    index index.html index.htm;
    
    location / {
        try_files $uri /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:4000/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site and restart Nginx:

```bash
# Create a symbolic link to enable the site
sudo ln -s /etc/nginx/sites-available/video-downloader-app /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# If the test is successful, restart Nginx
sudo systemctl restart nginx
```

## Step 8: Create Systemd Service

Create a systemd service file to run the backend:

```bash
# Create systemd service file
sudo nano /etc/systemd/system/video-downloader.service
```

Add the following content:

```ini
[Unit]
Description=Video Downloader Backend
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/scripts/downloaderapp/backend
ExecStart=/scripts/downloaderapp/backend/venv/bin/python /scripts/downloaderapp/backend/app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
# Reload systemd to recognize the new service
sudo systemctl daemon-reload

# Enable the service to start at boot
sudo systemctl enable video-downloader

# Start the service
sudo systemctl start video-downloader

# Check the service status
sudo systemctl status video-downloader
```

## Step 9: Build the Frontend

Build the React frontend application:

```bash
# Navigate to the frontend directory
cd /scripts/downloaderapp/frontend

# Build the application
npm run build
```

## Step 10: Access the Application

Open your web browser and navigate to:

```
http://localhost:4080
```

Log in with the default admin credentials:
- Username: `admin`
- Password: `admin123`

**Important:** Change the default admin password immediately after the first login for security reasons.

## Troubleshooting

### Backend Service Not Starting

If the backend service doesn't start, check the logs:

```bash
sudo journalctl -u video-downloader -n 50 --no-pager
```

Common issues include:
- Python dependencies not installed
- Permission problems in the target directory
- Port 4000 already in use

### Frontend Not Loading

If the frontend doesn't load properly:

1. Check that Nginx is running:
```bash
sudo systemctl status nginx
```

2. Check Nginx error logs:
```bash
sudo tail -f /var/log/nginx/error.log
```

### Download Failures

If downloads fail:

1. Check if yt-dlp is installed and working:
```bash
/scripts/downloaderapp/backend/venv/bin/yt-dlp --version
```

2. Verify ffmpeg installation:
```bash
ffmpeg -version
```

3. Check permissions on the target directory:
```bash
ls -la /mnt/VOLUMEPATH
```

## Updating the Application

To update the application in the future:

1. For frontend updates:
```bash
cd /scripts/downloaderapp/frontend
# Update code...
npm run build
```

2. For backend updates:
```bash
cd /scripts/downloaderapp/backend
# Update code...
sudo systemctl restart video-downloader
```

## Security Recommendations

1. Change the default admin password
2. Update the `SECRET_KEY` in app.py to a secure random value
3. Consider implementing HTTPS with Let's Encrypt
4. Set up proper file permissions
5. Implement backup strategies for the database

## Conclusion

You've successfully installed the NETFLIXTUBE video downloader application. If you encounter any issues during installation or operation, refer to the troubleshooting section or check the logs for more detailed error messages.
