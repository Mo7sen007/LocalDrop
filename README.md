# LocalDrop

**LocalDrop** is a lightweight, cross-platform file sharing application that enables fast and secure file transfers over your local network — no internet, Bluetooth, or cloud services required.

Built with Go and Gin, LocalDrop provides a simple web interface for uploading and downloading files between devices on the same network.

---

##  Features

-  **Easy File Sharing** - Upload files from any device on your local network
-  **Simple Downloads** - Access files through a clean web interface
-  **PIN Protection** - Optional PIN codes for secure file downloads
-  **Admin Dashboard** - Manage files and control access (optional authentication)
-  **Lightweight** - Fast, efficient, and minimal resource usage
-  **Cross-Platform** - Works on Windows, macOS, and Linux
-  **Any Device** - Access from browsers on phones, tablets, or computers
-  **No Internet Required** - Works completely offline over LAN or hotspot

---

##  Installation

### Option 1: Install via Go (Recommended)

Make sure you have [Go 1.18+](https://golang.org/doc/install) installed.

```bash
go install github.com/Mo7sen007/LocalDrop@latest
```

This will install `localdrop` to your `$GOPATH/bin` directory. Make sure this directory is in your system PATH.

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/Mo7sen007/LocalDrop.git
cd LocalDrop

# Build the binary
go build -o localdrop

# Optional: Install to GOPATH
go install
```

### Option 3: Download Pre-built Binaries

Download the latest release for your platform from the [Releases](https://github.com/Mo7sen007/LocalDrop/releases) page.

---

##  Quick Start

### Start the Server

```bash
# Default mode (runs in background on port 8080)
localdrop start

# Debug mode (runs in foreground with console output)
localdrop start --debug

# Custom port
localdrop start --port 3000

# Enable admin authentication
localdrop start --auth
```

### Access the Interface

Once started, open your browser and navigate to:
- **Download page**: `http://localhost:8080`
- **Upload/Admin page**: `http://localhost:8080/dashboard`

Other devices on your network can access it using your machine's IP address:
```
http://192.168.1.100:8080
```

### Find Your IP Address

**Windows:**
```powershell
ipconfig
```

**macOS/Linux:**
```bash
ifconfig
# or
ip addr show
```

### Stop the Server

```bash
localdrop stop
```

---

##  Usage

### Basic Commands

```bash
# Start server
localdrop start

# Start with debug output
localdrop start -d

# Start with authentication enabled
localdrop start --auth

# Stop server
localdrop stop

# Check version
localdrop --version

# Get help
localdrop --help
```

### Admin Management

When authentication is enabled, you'll need to create admin accounts:

```bash
# Add a new admin user
localdrop addadmin

# List all admin users
localdrop listadmin
```

### Configuration

LocalDrop stores its data in your system's config directory:

- **Windows**: `C:\Users\<YourName>\AppData\Roaming\localdrop\`
- **macOS**: `~/Library/Application Support/localdrop/`
- **Linux**: `~/.config/localdrop/`

Directory structure:
```
localdrop/
├── logs/
│   └── localdrop.log          # Server logs
├── storage/
│   ├── files/                 # Uploaded files
│   ├── listOfFiles.json       # File metadata
│   └── adminList.json         # Admin credentials
└── localdrop.pid              # Process ID (when running)
```

---

##  Security

- **PIN Protection**: Set optional PIN codes when uploading files to restrict downloads
- **Admin Authentication**: Enable `--auth` flag to require login for uploads and file management
- **Local Network Only**: Server only accessible on your local network by default
- **No Cloud Storage**: All files stay on your machine

---

##  Use Cases

- **Office/Home Network**: Share files quickly between computers
- **Mobile Hotspot**: Create a hotspot and share files with nearby devices
- **Classroom/Workshop**: Distribute materials to students without internet
- **Team Collaboration**: Quick file exchange during meetings
- **Event Sharing**: Share photos/videos with attendees on local WiFi

---

##  Development

### Project Structure

```
LocalDrop/
├── cmd/                    # CLI commands
├── internal/
│   ├── handlers/          # HTTP request handlers
│   ├── middleware/        # Authentication middleware
│   ├── models/            # Data models
│   ├── paths/             # Path configuration
│   ├── services/          # Business logic
│   ├── storage/           # Data persistence
│   └── static/            # Web UI (embedded)
├── main.go
└── README.md
```

### Building

```bash
# Build for current platform
go build -o localdrop

# Build for Windows
GOOS=windows GOARCH=amd64 go build -o localdrop.exe

# Build for Linux
GOOS=linux GOARCH=amd64 go build -o localdrop

# Build for macOS
GOOS=darwin GOARCH=amd64 go build -o localdrop
```

### Running Tests

```bash
go test ./...
```

---

##  Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

##  License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

##  Troubleshooting

### Server won't start
```bash
# Run in debug mode to see errors
localdrop start --debug
```

### Can't access from other devices
- Make sure devices are on the same network
- Check firewall settings (allow port 8080)
- Verify your IP address with `ipconfig` or `ifconfig`

### Port already in use
```bash
# Use a different port
localdrop start --port 3000
```

### Files not uploading
- Check available disk space
- Verify file size (default limit: 8MB per file)
- Check logs: Look in config directory's `logs/localdrop.log`

---

## 📧 Contact

Amir Boujneh - [@Mo7sen007](https://github.com/Mo7sen007)

Project Link: [https://github.com/Mo7sen007/LocalDrop](https://github.com/Mo7sen007/LocalDrop)

---

## ⭐ Show Your Support

If you find this project useful, please consider giving it a star on GitHub!