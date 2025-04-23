Video Downloader Web App
Show Image
NETFLIXTUBE is a sleek, Netflix-inspired web application that allows users to download videos from YouTube, TikTok, and Facebook. The application features user authentication, download tracking, file management, and a beautiful dark-themed UI.
Show Image
Show Image
Features

Modern Netflix-inspired UI: Dark theme with red accents, micro-animations, and responsive design
User Authentication: Admin and regular user roles with secure password protection
Multi-Source Downloads: Download videos from YouTube, TikTok, and Facebook
File Management: Specify custom target paths and filenames
Progress Tracking: Real-time download progress with status updates
Download History: Keep track of all past downloads
User Management: Admin interface for creating and managing user accounts
Video Metadata: Automatically detects video aspect ratio

Demo

NETFLIXTUBE consists of:

Backend: A Flask (Python) application that handles authentication, video downloading via yt-dlp, and file management
Frontend: A React application with Material-UI components styled to resemble Netflix
Database: SQLite database for storing users and download history

When a user requests a video download, the application:

Downloads the highest quality MP4 version available
Extracts video metadata (including aspect ratio)
Moves the file to the user-specified location
Provides real-time progress updates throughout the process

Installation
Prerequisites

Ubuntu Linux (tested on LTS 24.02)
Python 3.8+
Node.js and npm
Nginx
ffmpeg (for video processing)
