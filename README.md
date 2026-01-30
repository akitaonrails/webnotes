# WebNotes

A simple, feature-rich, self-hosted markdown note-taking app built with Ruby on Rails 8. Designed for blog writers and anyone who wants a clean, distraction-free writing environment with their notes stored locally.

## Why WebNotes?

- **No database** - Notes are plain markdown files on your filesystem
- **Self-hosted** - Your data stays on your machine or server
- **Docker-ready** - One command to start writing
- **Blog-friendly** - Perfect for drafting posts with live preview

## Features

### Editor
- Clean, distraction-free writing interface
- Syntax highlighting for markdown
- Auto-save with visual feedback
- Typewriter mode (keeps cursor centered)
- Customizable fonts and sizes
- Multiple color themes (light/dark variants)

### Organization
- Nested folder structure
- Drag and drop files and folders
- Quick file finder (`Ctrl+P`)
- Full-text search with regex support (`Ctrl+Shift+F`)

### Preview
- Live markdown preview panel
- Synchronized scrolling
- Zoom controls
- GitHub-flavored markdown support

### Media
- **Images**: Browse local images, search web (Bing), Google Images, or Pinterest
- **Videos**: Embed YouTube videos with search, or local video files
- **Tables**: Visual table editor
- **Code blocks**: Language selection with autocomplete

### Integrations
- AWS S3 for image hosting (optional)
- YouTube API for video search (optional)
- Google Custom Search for image search (optional)

## Quick Start with Docker

The fastest way to get started:

```bash
# Create a directory for your notes
mkdir -p ~/notes

# Run WebNotes
docker run -d \
  -p 3000:80 \
  -v ~/notes:/rails/notes \
  --name webnotes \
  akitaonrails/webnotes:latest

# Open http://localhost:3000
```

Or use Docker Compose (recommended):

```bash
# Clone the repo
git clone https://github.com/akitaonrails/webnotes.git
cd webnotes

# Start with your notes directory
NOTES_PATH=~/notes docker compose up -d

# Open http://localhost:3000
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NOTES_PATH` | Directory where notes are stored | `./notes` |
| `IMAGES_PATH` | Directory for local images | (disabled) |
| `SECRET_KEY_BASE` | Rails secret key (required in production) | - |

### Optional: Image Hosting (AWS S3)

To upload images to S3 instead of using local paths:

| Variable | Description |
|----------|-------------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_REGION` | AWS region (e.g., `us-east-1`) |

### Optional: YouTube Search

To enable YouTube video search in the video dialog:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable "YouTube Data API v3"
3. Create an API key under Credentials

| Variable | Description |
|----------|-------------|
| `YOUTUBE_API_KEY` | Your YouTube Data API key |

### Optional: Google Image Search

To enable Google Images tab (in addition to the free Bing/web search):

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project and enable "Custom Search API"
3. Create an API key under Credentials
4. Go to [Programmable Search Engine](https://programmablesearchengine.google.com/)
5. Create a search engine with "Search the entire web" enabled
6. Enable "Image search" in settings
7. Copy the Search Engine ID (cx value)

| Variable | Description |
|----------|-------------|
| `GOOGLE_API_KEY` | Your Google API key |
| `GOOGLE_CSE_ID` | Your Custom Search Engine ID |

Note: Google Custom Search has a free tier of 100 queries/day.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+S` | Save now |
| `Ctrl+P` | Find file by name |
| `Ctrl+Shift+F` | Search in file contents |
| `Ctrl+E` | Toggle sidebar |
| `Ctrl+B` | Toggle typewriter mode |
| `Ctrl+Shift+P` | Toggle preview panel |
| `F1` | Markdown help |

## Self-Hosting

### Home Server with Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  webnotes:
    image: akitaonrails/webnotes:latest
    container_name: webnotes
    restart: unless-stopped
    ports:
      - "3000:80"
    volumes:
      - ./notes:/rails/notes
      - ./images:/rails/images  # optional
    environment:
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
      - NOTES_PATH=/rails/notes
      - IMAGES_PATH=/rails/images
      # Add optional keys as needed
      # - YOUTUBE_API_KEY=${YOUTUBE_API_KEY}
      # - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      # - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      # - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      # - AWS_REGION=${AWS_REGION}
```

Generate a secret key:

```bash
# Generate and save to .env
echo "SECRET_KEY_BASE=$(openssl rand -hex 64)" >> .env

# Start
docker compose up -d
```

### Exposing to the Internet with Cloudflare Tunnel

For secure remote access without opening ports:

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/

2. Authenticate:
   ```bash
   cloudflared tunnel login
   ```

3. Create a tunnel:
   ```bash
   cloudflared tunnel create webnotes
   ```

4. Add to your `docker-compose.yml`:
   ```yaml
   services:
     webnotes:
       # ... existing config ...

     cloudflared:
       image: cloudflare/cloudflared:latest
       container_name: cloudflared
       restart: unless-stopped
       command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
       environment:
         - CLOUDFLARE_TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}
       depends_on:
         - webnotes
   ```

5. Configure the tunnel in Cloudflare Zero Trust dashboard to point to `http://webnotes:80`

6. Add your tunnel token to `.env`:
   ```bash
   CLOUDFLARE_TUNNEL_TOKEN=your-tunnel-token
   ```

7. Access via your configured domain (e.g., `notes.yourdomain.com`)

**Security Note**: Consider adding Cloudflare Access policies to restrict who can access your notes.

## Development

### Requirements

- Ruby 3.4+
- Node.js 20+ (for Tailwind CSS)
- Bundler

### Setup

```bash
# Clone the repository
git clone https://github.com/akitaonrails/webnotes.git
cd webnotes

# Install Ruby dependencies
bundle install

# Start development server (includes Tailwind watcher)
bin/dev
```

Visit `http://localhost:3000`

### Running Tests

```bash
# Run all tests
bin/rails test

# Run specific test file
bin/rails test test/controllers/notes_controller_test.rb

# Run with verbose output
bin/rails test -v
```

### Project Structure

```
app/
├── controllers/
│   ├── notes_controller.rb    # Note CRUD operations
│   ├── folders_controller.rb  # Folder management
│   ├── images_controller.rb   # Image browsing & S3 upload
│   └── youtube_controller.rb  # YouTube search API
├── services/
│   ├── notes_service.rb       # File system operations
│   └── images_service.rb      # Image handling & S3
├── javascript/
│   └── controllers/
│       ├── app_controller.js  # Main Stimulus controller
│       └── theme_controller.js # Theme management
└── views/
    └── notes/
        └── index.html.erb     # Single-page app
```

### Building Docker Image

```bash
# Build locally
docker build -t webnotes .

# Run locally
docker run -p 3000:80 -v $(pwd)/notes:/rails/notes webnotes
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`bin/rails test`)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request
