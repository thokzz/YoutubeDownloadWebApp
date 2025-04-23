Video Downloader Web App



This Web App is a sleek, Netflix-inspired web application that allows users to download videos from YouTube, TikTok, and Facebook. Built by someone with no coding background using AI assistance, this project demonstrates how modern AI tools enable non-developers to create sophisticated web applications.



## ✨ Features

- **Modern Netflix-inspired UI**: Dark theme with red accents, micro-animations, and responsive design
- **User Authentication**: Admin and regular user roles with secure password protection
- **Multi-Source Downloads**: Download videos from YouTube, TikTok, and Facebook
- **File Management**: Specify custom target paths and filenames
- **Progress Tracking**: Real-time download progress with status updates
- **Download History**: Keep track of all past downloads
- **User Management**: Admin interface for creating and managing user accounts
- **Video Metadata**: Automatically detects video aspect ratio

## 📥 YouTube Download Web App Screenshots

### 🔐 Login Page
![Login Page](https://github.com/thokzz/YoutubeDownloadWebApp/blob/main/YoutubeDownloadWebApp/assets/YTDownloader%20Login%20Page.png?raw=true)

### 🏠 Main Page
![Main Page](https://github.com/thokzz/YoutubeDownloadWebApp/blob/main/YoutubeDownloadWebApp/assets/YTDownloader%20Main%20Page.png?raw=true)

### ⬇️ Download Page
![Download Page](https://github.com/thokzz/YoutubeDownloadWebApp/blob/main/YoutubeDownloadWebApp/assets/YTDownloader%20Download%20Page.png?raw=true)

### 📦 Downloading File
![Downloading File](https://github.com/thokzz/YoutubeDownloadWebApp/blob/main/YoutubeDownloadWebApp/assets/YTDownloader%20Downloading%20File.png?raw=true)

### 🗂️ Download History
![Download History](https://github.com/thokzz/YoutubeDownloadWebApp/blob/main/YoutubeDownloadWebApp/assets/YTDownloader%20DL%20History.png?raw=true)


## 🛠️ Technology Stack

- **Frontend**: React, Material-UI, Framer Motion
- **Backend**: Flask (Python)
- **Video Processing**: yt-dlp, ffmpeg
- **Authentication**: JWT tokens
- **Database**: SQLite

## 📋 Prerequisites

- Ubuntu Linux (tested on LTS 24.02)
- Python 3.8+
- Node.js and npm
- Nginx
- ffmpeg (for video processing)

## 🚀 Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/netflixtube.git
cd netflixtube
```

### Step 2: Create Directory Structure

```bash
mkdir -p /scripts/downloaderapp
mkdir -p /scripts/downloaderapp/backend
mkdir -p /scripts/downloaderapp/frontend
mkdir -p /scripts/downloaderapp/data
mkdir -p /mnt/VOLUMEPATH
chmod 777 /mnt/VOLUMEPATH
```

### Step 3: Install Dependencies

```bash
# System dependencies
sudo apt update
sudo apt install -y python3 python3-pip nodejs npm nginx ffmpeg

# Python packages
pip3 install Flask==2.3.3 Flask-Cors==4.0.0 yt-dlp==2024.1.29 pyjwt==2.8.0 werkzeug==2.3.7 gunicorn==21.2.0

# Frontend dependencies
cd /scripts/downloaderapp/frontend
npm install
```

### Step 4: Copy Source Files

Copy all the backend and frontend files to their respective directories:

```bash
# Copy backend files
cp -r backend/* /scripts/downloaderapp/backend/

# Copy frontend files
cp -r frontend/* /scripts/downloaderapp/frontend/
```

### Step 5: Configure Nginx

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/video-downloader-app
```

Add the following configuration:

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
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/video-downloader-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 6: Create Systemd Service

Create a service file for the backend:

```bash
sudo nano /etc/systemd/system/video-downloader.service
```

Add the following:

```ini
[Unit]
Description=Video Downloader Backend
After=network.target

[Service]
User=root
Group=root
WorkingDirectory=/scripts/downloaderapp/backend
ExecStart=/usr/bin/python3 /scripts/downloaderapp/backend/app.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl enable video-downloader
sudo systemctl start video-downloader
```

### Step 7: Build the Frontend

```bash
cd /scripts/downloaderapp/frontend
npm run build
```

### Step 8: Access the Application

Open your browser and navigate to:
http://localhost:4080

Log in with the default admin credentials:
- Username: `admin`
- Password: `admin123`

## 📱 How to Use

1. **Log in**: Use the provided admin credentials
2. **Add New User**: Create additional users with or without admin privileges
3. **Download Videos**:
   - Click "Add Download"
   - Enter a video URL (YouTube, TikTok, or Facebook)
   - Specify the target path (folder location)
   - Optionally provide a custom filename
   - Click "Start Downloads"
4. **Monitor Progress**: Watch real-time progress in the downloads table
5. **View History**: Check download history in the History section
6. **Manage Users**: Add or remove users (admin only)

## 🔒 Security Considerations

- Change the default admin password immediately
- Update the `SECRET_KEY` in app.py for production use
- Consider implementing HTTPS for secure connections
- Implement rate limiting for production environments
- Regularly back up the database file

## 🛠️ Customization

You can customize this application by:
- Modifying the color scheme in index.css
- Adding support for additional video sources in the backend
- Extending the user management features
- Adding analytics or additional metadata extraction
- Implementing additional file format options

## 💡 Created with AI Assistance, Zero Coding Experience

This entire project was built by someone with zero coding experience, using AI tools (ChatGPT 4.0 and Claude 3.7 Sonnet) to generate all the necessary code. The process involved:

- Describing the desired functionality to the AI
- Refining the generated code through iterative feedback
- Troubleshooting issues with AI assistance
- Implementing visual design changes based on preferences
- Deploying the application with AI-provided instructions

This project demonstrates how modern AI tools enable individuals without traditional programming skills to create sophisticated web applications. No previous knowledge of Python, JavaScript, React, or web development was required.

## 📄 License

This project is available under the MIT License.

## 🙏 Acknowledgements

- Created with assistance from ChatGPT 4.0 and Claude 3.7 Sonnet
- Uses yt-dlp for video downloading
- UI inspired by Netflix
- Built with Flask and React
- Special thanks to the developers of all the open-source libraries used in this project
