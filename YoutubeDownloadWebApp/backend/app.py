import os
import time
import sqlite3
import json
import uuid
import logging
import threading
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import jwt
import yt_dlp
from functools import wraps

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='../frontend/build')
CORS(app)

# Configuration
DATABASE = '/scripts/downloaderapp/data/video_downloader.db'
SECRET_KEY = 'your_secret_key'  # Change this in production
DOWNLOAD_DIR = '/tmp/downloads'
TARGET_DIR = '/mnt/VOLUMEPATH'

# Create directories with error handling
try:
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    logger.info(f"Download directory created/verified: {DOWNLOAD_DIR}")
except Exception as e:
    logger.error(f"Error creating download directory: {str(e)}")

try:
    os.makedirs(TARGET_DIR, exist_ok=True)
    logger.info(f"Target directory created/verified: {TARGET_DIR}")
    # Test if writable
    test_file = os.path.join(TARGET_DIR, ".test_write_permission")
    with open(test_file, 'w') as f:
        f.write("test")
    os.remove(test_file)
    logger.info(f"Target directory is writable: {TARGET_DIR}")
except Exception as e:
    logger.warning(f"Target directory issue: {str(e)}")
    try:
        # Try fixing permissions
        os.chmod(TARGET_DIR, 0o777)
        logger.info(f"Attempted to fix permissions on: {TARGET_DIR}")
    except Exception as perm_error:
        logger.error(f"Failed to fix permissions on: {TARGET_DIR} - {str(perm_error)}")

# Initialize database
def init_db():
    logger.info("Initializing database")
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    # Users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    
    # Check if aspect_ratio column exists in downloads table
    cursor.execute("PRAGMA table_info(downloads)")
    columns = cursor.fetchall()
    column_names = [column[1] for column in columns]
    
    # Create or alter downloads table
    if 'downloads' not in [table[0] for table in cursor.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]:
        # Create downloads table with aspect_ratio column
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS downloads (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            url TEXT NOT NULL,
            target_path TEXT NOT NULL,
            status TEXT NOT NULL,
            progress REAL DEFAULT 0,
            aspect_ratio TEXT DEFAULT 'Unknown',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
        ''')
    elif 'aspect_ratio' not in column_names:
        # Add aspect_ratio column to existing downloads table
        cursor.execute('ALTER TABLE downloads ADD COLUMN aspect_ratio TEXT DEFAULT "Unknown"')
        logger.info("Added aspect_ratio column to downloads table")
    
    # Create admin user if not exists
    cursor.execute("SELECT id FROM users WHERE username = 'admin'")
    if not cursor.fetchone():
        admin_password = generate_password_hash('admin123')  # Change this default password
        cursor.execute("INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)",
                      ('admin', admin_password, True))
        logger.info("Admin user created")
    
    conn.commit()
    conn.close()
    logger.info("Database initialization complete")

# Active downloads tracking
active_downloads = {}

# Token required decorator
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401
        
        if token.startswith('Bearer '):
            token = token[7:]
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user_id = data['user_id']
        except:
            return jsonify({'message': 'Token is invalid!'}), 401
            
        return f(current_user_id, *args, **kwargs)
    
    return decorated

# Admin required decorator
def admin_required(f):
    @wraps(f)
    def decorated(current_user_id, *args, **kwargs):
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute("SELECT is_admin FROM users WHERE id = ?", (current_user_id,))
        user = cursor.fetchone()
        conn.close()
        
        if not user or not user[0]:
            return jsonify({'message': 'Admin privileges required!'}), 403
            
        return f(current_user_id, *args, **kwargs)
    
    return decorated

# Progress hook for yt-dlp
def progress_hook(d, download_id):
    if d['status'] == 'downloading':
        if 'total_bytes' in d and d['total_bytes'] > 0:
            progress = (d['downloaded_bytes'] / d['total_bytes']) * 100
        elif 'total_bytes_estimate' in d and d['total_bytes_estimate'] > 0:
            progress = (d['downloaded_bytes'] / d['total_bytes_estimate']) * 100
        else:
            progress = -1  # Indeterminate
            
        update_download_status(download_id, 'downloading', progress)
    elif d['status'] == 'finished':
        update_download_status(download_id, 'processing', 100)

# Update download status in the database
def update_download_status(download_id, status, progress=0):
    logger.info(f"Updating status for {download_id}: {status} ({progress}%)")
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE downloads SET status = ?, progress = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (status, progress, download_id)
    )
    conn.commit()
    conn.close()

# Download function to run in a separate thread


def download_video(download_id, url, target_path):
    temp_dir = os.path.join(DOWNLOAD_DIR, download_id)
    try:
        logger.info(f"DOWNLOAD START: ID={download_id}, URL={url}, TARGET={target_path}")
        
        # Create temp directory
        os.makedirs(temp_dir, exist_ok=True)
        logger.info(f"TEMP DIR CREATED: {temp_dir}")
        
        # Set yt-dlp options
        ydl_opts = {
            'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
            'merge_output_format': 'mp4',
            'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
            'progress_hooks': [lambda d: progress_hook(d, download_id)],
        }
        
        # Start download
        update_download_status(download_id, 'downloading', 0)
        logger.info(f"STATUS UPDATED: downloading")
        
        # Download the video
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            logger.info(f"DOWNLOAD STARTED WITH YT-DLP")
            info = ydl.extract_info(url, download=True)
            filename = ydl.prepare_filename(info)
            logger.info(f"DOWNLOAD COMPLETED: {filename}")
            
            # Check if file exists
            if not os.path.exists(filename):
                # Try with mp4 extension
                mp4_filename = f"{filename.rsplit('.', 1)[0]}.mp4"
                if os.path.exists(mp4_filename):
                    filename = mp4_filename
                    logger.info(f"USING MP4 FILENAME: {filename}")
        
        # Verify file exists
        if not os.path.exists(filename):
            logger.error(f"ERROR: FILE NOT FOUND AT {filename}")
            files = os.listdir(temp_dir)
            logger.error(f"FILES IN TEMP DIR: {files}")
            raise FileNotFoundError(f"Downloaded file not found at {filename}")
        
        # Get video aspect ratio using ffprobe
        aspect_ratio = "Unknown"
        try:
            import subprocess
            result = subprocess.run(
                ['ffprobe', '-v', 'error', '-select_streams', 'v:0', 
                 '-show_entries', 'stream=width,height', '-of', 'csv=s=x:p=0', filename],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            if result.stdout:
                width, height = result.stdout.strip().split('x')
                if width and height:
                    # Calculate aspect ratio and simplify
                    import math
                    gcd = math.gcd(int(width), int(height))
                    aspect_w = int(width) // gcd
                    aspect_h = int(height) // gcd
                    aspect_ratio = f"{aspect_w}:{aspect_h}"
                    logger.info(f"DETECTED ASPECT RATIO: {aspect_ratio} ({width}x{height})")
        except Exception as e:
            logger.warning(f"Could not determine aspect ratio: {str(e)}")
        
        # Store aspect ratio in database
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE downloads SET aspect_ratio = ? WHERE id = ?",
            (aspect_ratio, download_id)
        )
        conn.commit()
        conn.close()
        
        # Check file size
        file_size = os.path.getsize(filename)
        logger.info(f"FILE SIZE: {file_size} bytes")
        
        # Get original filename from the downloaded file
        original_filename = os.path.basename(filename)
        logger.info(f"ORIGINAL FILENAME: {original_filename}")
        
        # Determine target location based on path type
        if target_path.endswith('.mp4'):
            # User provided a full filename
            target_file = os.path.join(TARGET_DIR, target_path)
            logger.info(f"User provided specific filename: {target_path}")
        else:
            # User provided a directory - append original filename
            if not target_path.endswith('/'):
                target_path += '/'
            target_file = os.path.join(TARGET_DIR, target_path, original_filename)
            logger.info(f"User provided directory path: {target_path}, appending original filename: {original_filename}")
        
        logger.info(f"TARGET FILE PATH: {target_file}")
        
        # Create target directory
        target_dir = os.path.dirname(target_file)
        logger.info(f"CREATING TARGET DIR: {target_dir}")
        os.makedirs(target_dir, exist_ok=True)
        
        # Check if target dir exists
        if not os.path.isdir(target_dir):
            logger.error(f"ERROR: TARGET DIR NOT CREATED: {target_dir}")
            raise OSError(f"Failed to create target directory: {target_dir}")
        
        # Check permissions
        try:
            test_file = os.path.join(target_dir, ".test_write_permission")
            with open(test_file, 'w') as f:
                f.write("test")
            os.remove(test_file)
            logger.info(f"TARGET DIR IS WRITABLE: {target_dir}")
        except Exception as e:
            logger.warning(f"WARNING: TARGET DIR NOT WRITABLE: {target_dir}, Error: {str(e)}")
            logger.info(f"ATTEMPTING TO FIX PERMISSIONS ON: {target_dir}")
            os.chmod(target_dir, 0o777)
        
        # Move file
        update_download_status(download_id, 'moving', 100)
        logger.info(f"STATUS UPDATED: moving")
        logger.info(f"MOVING FILE: {filename} -> {target_file}")
        
        import shutil
        shutil.copy2(filename, target_file)
        logger.info(f"FILE COPIED SUCCESSFULLY")
        
        # Verify copied file
        if os.path.exists(target_file):
            copied_size = os.path.getsize(target_file)
            logger.info(f"COPIED FILE SIZE: {copied_size} bytes")
            
            if copied_size == file_size:
                logger.info(f"FILE SIZES MATCH")
            else:
                logger.warning(f"WARNING: FILE SIZES DON'T MATCH: {file_size} vs {copied_size}")
        else:
            logger.error(f"ERROR: COPIED FILE NOT FOUND AT {target_file}")
            raise FileNotFoundError(f"Copied file not found at {target_file}")
        
        # Clean up original file
        os.remove(filename)
        logger.info(f"ORIGINAL FILE REMOVED")
        
        # Update status to completed
        update_download_status(download_id, 'completed', 100)
        logger.info(f"STATUS UPDATED: completed")
        logger.info(f"DOWNLOAD PROCESS COMPLETE")
        
    except Exception as e:
        logger.error(f"ERROR IN DOWNLOAD: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        update_download_status(download_id, 'failed', 0)
        logger.info(f"STATUS UPDATED: failed")
    finally:
        # Clean up
        if download_id in active_downloads:
            del active_downloads[download_id]
        
        # Remove temp directory
        if os.path.exists(temp_dir):
            try:
                import shutil
                shutil.rmtree(temp_dir)
                logger.info(f"TEMP DIR REMOVED: {temp_dir}")
            except Exception as e:
                logger.error(f"FAILED TO REMOVE TEMP DIR: {str(e)}")

# Routes
@app.route('/api/login', methods=['POST'])
def login():
    auth = request.get_json()
    
    if not auth or not auth.get('username') or not auth.get('password'):
        return jsonify({'message': 'Could not verify'}), 401
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, password, is_admin FROM users WHERE username = ?", (auth.get('username'),))
    user = cursor.fetchone()
    conn.close()
    
    if not user or not check_password_hash(user[2], auth.get('password')):
        return jsonify({'message': 'Invalid credentials'}), 401
    
    token = jwt.encode({
        'user_id': user[0],
        'username': user[1],
        'is_admin': user[3],
        'exp': datetime.utcnow().timestamp() + 24 * 3600  # 24 hour expiry
    }, SECRET_KEY)
    
    return jsonify({'token': token, 'username': user[1], 'is_admin': user[3]})

@app.route('/api/users', methods=['GET'])
@token_required
@admin_required
def get_users(current_user_id):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, is_admin, created_at FROM users")
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(users)

@app.route('/api/users', methods=['POST'])
@token_required
@admin_required
def create_user(current_user_id):
    data = request.get_json()
    
    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    hashed_password = generate_password_hash(data.get('password'))
    is_admin = data.get('is_admin', False)
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    try:
        cursor.execute(
            "INSERT INTO users (username, password, is_admin) VALUES (?, ?, ?)",
            (data.get('username'), hashed_password, is_admin)
        )
        conn.commit()
        user_id = cursor.lastrowid
        conn.close()
        
        return jsonify({'id': user_id, 'username': data.get('username'), 'is_admin': is_admin}), 201
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({'message': 'Username already exists'}), 409

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
@admin_required
def delete_user(current_user_id, user_id):
    if user_id == current_user_id:
        return jsonify({'message': 'Cannot delete yourself'}), 400
    
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    
    return jsonify({'message': 'User deleted'})

@app.route('/api/downloads', methods=['POST'])
@token_required
def start_download(current_user_id):
    data = request.get_json()
    
    if not data or not data.get('urls') or not data.get('targetPaths'):
        return jsonify({'message': 'Missing required fields'}), 400
    
    urls = data.get('urls')
    target_paths = data.get('targetPaths')
    
    logger.info(f"Download request received: {urls} -> {target_paths}")
    
    if len(urls) != len(target_paths) or len(urls) > 5:
        logger.warning(f"Invalid request: {len(urls)} URLs, {len(target_paths)} paths")
        return jsonify({'message': 'Invalid number of URLs or target paths'}), 400
    
    download_ids = []
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    for i, url in enumerate(urls):
        download_id = str(uuid.uuid4())
        target_path = target_paths[i]
        
        logger.info(f"Creating download job {download_id}: {url} -> {target_path}")
        
        cursor.execute(
            "INSERT INTO downloads (id, user_id, url, target_path, status) VALUES (?, ?, ?, ?, ?)",
            (download_id, current_user_id, url, target_path, 'queued')
        )
        
        # Start download in a separate thread
        download_thread = threading.Thread(
            target=download_video, 
            args=(download_id, url, target_path)
        )
        download_thread.daemon = True
        download_thread.start()
        
        active_downloads[download_id] = download_thread
        download_ids.append(download_id)
    
    conn.commit()
    conn.close()
    
    return jsonify({'download_ids': download_ids})

@app.route('/api/downloads', methods=['GET'])
@token_required
def get_downloads(current_user_id):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT d.*, u.username 
        FROM downloads d 
        JOIN users u ON d.user_id = u.id 
        WHERE d.user_id = ? 
        ORDER BY d.created_at DESC
    """, (current_user_id,))
    
    downloads = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(downloads)

@app.route('/api/downloads/all', methods=['GET'])
@token_required
@admin_required
def get_all_downloads(current_user_id):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT d.*, u.username 
        FROM downloads d 
        JOIN users u ON d.user_id = u.id 
        ORDER BY d.created_at DESC
    """)
    
    downloads = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return jsonify(downloads)

@app.route('/api/downloads/<download_id>', methods=['GET'])
@token_required
def get_download_status(current_user_id, download_id):
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT * FROM downloads WHERE id = ? AND user_id = ?",
        (download_id, current_user_id)
    )
    
    download = cursor.fetchone()
    conn.close()
    
    if not download:
        return jsonify({'message': 'Download not found'}), 404
    
    return jsonify(dict(download))

@app.route('/api/downloads/<download_id>/cancel', methods=['POST'])
@token_required
def cancel_download(current_user_id, download_id):
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT status FROM downloads WHERE id = ? AND user_id = ?",
        (download_id, current_user_id)
    )
    
    download = cursor.fetchone()
    
    if not download:
        conn.close()
        return jsonify({'message': 'Download not found'}), 404
    
    if download[0] in ['completed', 'failed', 'cancelled']:
        conn.close()
        return jsonify({'message': 'Download already finished or cancelled'}), 400
    
    # Update status to cancelled
    cursor.execute(
        "UPDATE downloads SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (download_id,)
    )
    
    conn.commit()
    conn.close()
    
    # Thread will detect cancellation on next progress update
    return jsonify({'message': 'Download cancelled'})

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=4000)
