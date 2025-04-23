# Technical Documentation

This document provides detailed technical information about the NETFLIXTUBE video downloader application, including its architecture, components, and how they interact.

## System Architecture

Youtube Downloader follows a client-server architecture:

```
┌─────────────┐      HTTP/API      ┌─────────────┐
│             │◄─────Requests─────►│             │
│  React      │                    │  Flask      │      ┌─────────────┐
│  Frontend   │                    │  Backend    │◄────►│  SQLite     │
│             │                    │             │      │  Database   │
└─────────────┘                    └─────────────┘      └─────────────┘
                                         │
                                         │
                                         ▼
                                   ┌─────────────┐      ┌─────────────┐
                                   │  yt-dlp     │─────►│  Video      │
                                   │  Downloader │      │  Files      │
                                   └─────────────┘      └─────────────┘
```

### Frontend (React)

The frontend is built with React and includes:

- User authentication and session management
- Video download interface
- Download progress tracking
- History management
- User management (for admins)

### Backend (Flask)

The backend provides:

- RESTful API endpoints
- User authentication and authorization
- Video downloading via yt-dlp
- File management
- Database operations

### Database (SQLite)

The SQLite database stores:

- User information (including hashed passwords)
- Download records and history
- Video metadata

## Component Details

### Backend Components

#### Database Schema

```
users
├── id (INTEGER PRIMARY KEY)
├── username (TEXT UNIQUE)
├── password (TEXT - hashed)
├── is_admin (BOOLEAN)
└── created_at (TIMESTAMP)

downloads
├── id (TEXT PRIMARY KEY)
├── user_id (INTEGER FOREIGN KEY)
├── url (TEXT)
├── target_path (TEXT)
├── status (TEXT)
├── progress (REAL)
├── aspect_ratio (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)
```

#### API Endpoints

| Endpoint                  | Method | Description                     | Authentication |
|---------------------------|--------|---------------------------------|----------------|
| `/api/login`              | POST   | User authentication             | None           |
| `/api/users`              | GET    | Get all users                   | Admin          |
| `/api/users`              | POST   | Create new user                 | Admin          |
| `/api/users/<id>`         | DELETE | Delete a user                   | Admin          |
| `/api/downloads`          | POST   | Start video download            | User           |
| `/api/downloads`          | GET    | Get user's downloads            | User           |
| `/api/downloads/all`      | GET    | Get all downloads               | Admin          |
| `/api/downloads/<id>`     | GET    | Get download status             | User           |
| `/api/downloads/<id>/cancel` | POST | Cancel download                | User           |

#### Authentication System

The application uses JWT (JSON Web Tokens) for authentication:
1. User logs in with username/password
2. Backend verifies credentials and generates a JWT token
3. Token contains user ID, username, admin status, and expiration
4. Frontend stores the token in localStorage
5. Token is sent with each API request in the Authorization header
6. Backend validates the token for each protected endpoint

#### Download Process

When a user requests a download:

1. Frontend sends the URL, target path, and optional filename
2. Backend generates a unique download ID
3. A new record is created in the downloads table with status "queued"
4. The download starts in a separate thread
5. yt-dlp downloads the video to a temporary directory
6. ffprobe extracts video metadata (aspect ratio)
7. The file is moved to the target directory
8. The database is updated with the final status and metadata
9. Frontend polls for status updates to show progress

### Frontend Components

#### Pages

- **Login**: User authentication
- **Dashboard**: Main download interface
- **History**: Download history list
- **Users**: User management (admin only)

#### Key React Components

- **App**: Main component with routing and authentication state
- **Login**: Login form with JWT handling
- **Dashboard**: Download form and active downloads table
- **History**: Table of all past downloads
- **Users**: User management interface

#### State Management

The application uses React's built-in state management:
- `useState` for component-level state
- Props for passing data between components
- Local storage for persistent data (JWT token)

#### API Integration

The frontend communicates with the backend using Axios:
- API requests include authentication headers
- Responses are handled with promises
- Error states are managed and displayed to users

## Security Considerations

1. **Password Security**: Passwords are hashed using Werkzeug's security functions
2. **JWT Authentication**: Tokens have 24-hour expiration
3. **Role-Based Access Control**: Admin vs regular user permissions
4. **Input Validation**: URL and path validation
5. **Error Handling**: Proper error responses with appropriate HTTP status codes

## Performance Optimizations

1. **Async Processing**: Downloads run in separate threads
2. **Efficient Polling**: Status updates use efficient polling
3. **Database Indexes**: Key columns are indexed for performance
4. **Progress Updates**: Throttled progress updates to reduce database load

## Deployment Architecture

```
┌─────────────┐
│ Client      │
│ Browser     │
└─────────────┘
       ▲
       │
       ▼
┌─────────────┐
│ Nginx       │
│ Web Server  │
└─────────────┘
       ▲
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ React       │     │ Flask       │
│ Frontend    │     │ Backend     │
│ (Static)    │     │ (API)       │
└─────────────┘     └─────────────┘
                           ▲
                           │
                           ▼
                    ┌─────────────┐
                    │ SQLite      │
                    │ Database    │
                    └─────────────┘
```

### Deployment Components

1. **Nginx**: Serves static frontend files and proxies API requests
2. **React Build**: Static files from `npm run build`
3. **Flask Backend**: Runs as a systemd service
4. **SQLite Database**: File-based database
5. **Storage Volume**: Target directory for downloaded files

## Customization Guide

### Changing Theme Colors

To modify the Netflix-inspired theme:

1. Edit the color values in `frontend/src/index.css`
2. Primary change points:
   - Background: `#141414` (Netflix dark)
   - Accents: `#e50914` (Netflix red)
   - Text: `#ffffff` (white) and `#999999` (gray)

### Adding Support for New Video Sources

To add support for additional video platforms:

1. yt-dlp already supports many platforms - check their documentation
2. For platforms requiring special handling:
   - Add custom extractors to the backend's download function
   - Update frontend URL validation if needed

### Modifying User Permissions

To add more granular permissions:

1. Modify the `users` table to include additional permission flags
2. Update backend decorators to check for specific permissions
3. Modify frontend to show/hide elements based on permissions

## Troubleshooting

### Common Issues

1. **Download Failures**:
   - Check yt-dlp version compatibility with the video platform
   - Verify write permissions to the target directory
   - Check for URL format issues

2. **Authentication Problems**:
   - Verify JWT secret key
   - Check token expiration
   - Ensure proper token format in requests

3. **File Storage Issues**:
   - Verify path permissions
   - Check available disk space
   - Ensure target directories exist

### Logs

- Backend logs: Systemd journal (`journalctl -u video-downloader.service`)
- Application logs: Standard output of the Flask application
- Nginx logs: `/var/log/nginx/access.log` and `/var/log/nginx/error.log`

## Future Development

### Planned Features

1. **Download Queue Management**: Priority and scheduling
2. **User Preferences**: Default download settings
3. **Email Notifications**: When downloads complete
4. **Video Preview**: Thumbnails and metadata preview
5. **Advanced Filters**: For history and downloads
6. **Mobile App**: React Native version

### API Expansion

1. **Statistics Endpoints**: Usage statistics and trends
2. **Batch Operations**: Bulk download and management
3. **Public API**: For integration with other services

## Conclusion

This technical documentation provides an overview of the NETFLIXTUBE application architecture, components, and functionality. For implementation details, refer to the source code and comments within each file.
