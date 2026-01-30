# WebNotes

A simple, feature-rich, self-hosted markdown note-taking app built with Ruby on Rails 8. Designed for blog writers and anyone who wants a clean, distraction-free writing environment with their notes stored locally.

[![GitHub](https://img.shields.io/badge/GitHub-akitaonrails%2Fwebnotes-blue?logo=github)](https://github.com/akitaonrails/webnotes)

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
- Typewriter mode for focused writing (cursor stays centered)
- Customizable fonts and sizes
- Multiple color themes (light/dark variants)

### Organization
- Nested folder structure
- Drag and drop files and folders
- Quick file finder (`Ctrl+P`)
- Full-text search with regex support (`Ctrl+Shift+F`)
- **Hugo blog post support** - Create posts with proper directory structure

### Preview
- Live markdown preview panel
- Synchronized scrolling (including typewriter mode)
- Zoom controls
- GitHub-flavored markdown support

### Media
- **Images**: Browse local images, search web (DuckDuckGo), Google Images, or Pinterest
- **Videos**: Embed YouTube videos with search, or local video files
- **Tables**: Visual table editor with drag-and-drop rows/columns
- **Code blocks**: Language selection with autocomplete

### Integrations
- AWS S3 for image hosting (optional)
- YouTube API for video search (optional)
- Google Custom Search for image search (optional)

## Quick Start

Add this function to your `~/.bashrc` or `~/.zshrc`:

```bash
wn() {
  docker run --rm -p 3000:80 \
    -v "$(realpath "${1:-.}")":/rails/notes \
    akitaonrails/webnotes:latest
}
```

Then reload your shell and run:

```bash
# Open current directory as notes
wn .

# Or open a specific directory
wn ~/my-blog/content

# Open http://localhost:3000
```

Press `Ctrl+C` to stop.

### With Optional Features

For S3 image uploads and YouTube search, export the environment variables first:

```bash
wn() {
  docker run --rm -p 3000:80 \
    -v "$(realpath "${1:-.}")":/rails/notes \
    ${IMAGES_PATH:+-v "$(realpath "$IMAGES_PATH")":/rails/images -e IMAGES_PATH=/rails/images} \
    ${AWS_ACCESS_KEY_ID:+-e AWS_ACCESS_KEY_ID="$AWS_ACCESS_KEY_ID"} \
    ${AWS_SECRET_ACCESS_KEY:+-e AWS_SECRET_ACCESS_KEY="$AWS_SECRET_ACCESS_KEY"} \
    ${AWS_S3_BUCKET:+-e AWS_S3_BUCKET="$AWS_S3_BUCKET"} \
    ${AWS_REGION:+-e AWS_REGION="$AWS_REGION"} \
    ${YOUTUBE_API_KEY:+-e YOUTUBE_API_KEY="$YOUTUBE_API_KEY"} \
    ${GOOGLE_API_KEY:+-e GOOGLE_API_KEY="$GOOGLE_API_KEY"} \
    ${GOOGLE_CSE_ID:+-e GOOGLE_CSE_ID="$GOOGLE_CSE_ID"} \
    akitaonrails/webnotes:latest
}
```

Then set your keys in `~/.bashrc` or `~/.zshrc`:

```bash
# Optional: Local images directory
export IMAGES_PATH=~/Pictures

# Optional: S3 for image hosting
export AWS_ACCESS_KEY_ID=your-key
export AWS_SECRET_ACCESS_KEY=your-secret
export AWS_S3_BUCKET=your-bucket
export AWS_REGION=us-east-1

# Optional: YouTube video search
export YOUTUBE_API_KEY=your-youtube-api-key

# Optional: Google image search
export GOOGLE_API_KEY=your-google-api-key
export GOOGLE_CSE_ID=your-search-engine-id
```

### Running in Background

To run as a persistent service:

```bash
# Start in background
docker run -d --name webnotes -p 3000:80 \
  -v ~/notes:/rails/notes \
  --restart unless-stopped \
  akitaonrails/webnotes:latest

# Stop
docker stop webnotes

# Start again
docker start webnotes

# Remove
docker rm -f webnotes
```

### Using Docker Compose

For a more permanent setup, create a `docker-compose.yml`:

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
    environment:
      - SECRET_KEY_BASE=${SECRET_KEY_BASE}
```

```bash
# Generate secret and start
echo "SECRET_KEY_BASE=$(openssl rand -hex 64)" > .env
docker compose up -d
```

## Configuration

WebNotes uses a `.webnotes` configuration file in your notes directory. This file is automatically created on first run with all options commented out as documentation.

### The .webnotes File

When you open a notes directory for the first time, WebNotes creates a `.webnotes` configuration file with all available options commented out. You can uncomment and modify any setting:

```ini
# UI Settings
theme = gruvbox
editor_font = fira-code
editor_font_size = 16
preview_zoom = 100
sidebar_visible = true
typewriter_mode = false

# Local images path
images_path = /home/user/Pictures

# AWS S3 (overrides environment variables)
aws_access_key_id = your-key
aws_secret_access_key = your-secret
aws_s3_bucket = your-bucket
aws_region = us-east-1

# API Keys
youtube_api_key = your-youtube-key
google_api_key = your-google-key
google_cse_id = your-cse-id
```

**Priority order:** File settings override environment variables, which override defaults.

This means you can:
- Set global defaults via environment variables
- Override per-folder using `.webnotes` (e.g., different AWS bucket for different projects)
- UI changes (theme, font) are automatically saved to the file

### Editing .webnotes in the App

The `.webnotes` file appears in the explorer panel with a gear icon. You can click it to edit directly in WebNotes:

- The toolbar and preview panel are hidden when editing config files (they only appear for markdown files)
- Changes are auto-saved like any other file
- **Live reload**: When you save `.webnotes`, the UI immediately applies your changes (theme, font, etc.)

### Available Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `theme` | string | (system) | Color theme: light, dark, gruvbox, tokyo-night, etc. |
| `editor_font` | string | cascadia-code | Editor font family |
| `editor_font_size` | integer | 14 | Font size in pixels (8-32) |
| `preview_zoom` | integer | 100 | Preview zoom percentage (50-200) |
| `sidebar_visible` | boolean | true | Show explorer panel on startup |
| `typewriter_mode` | boolean | false | Enable typewriter mode on startup |
| `images_path` | string | - | Local images directory path |
| `aws_access_key_id` | string | - | AWS access key for S3 |
| `aws_secret_access_key` | string | - | AWS secret key for S3 |
| `aws_s3_bucket` | string | - | S3 bucket name |
| `aws_region` | string | - | AWS region |
| `youtube_api_key` | string | - | YouTube Data API key |
| `google_api_key` | string | - | Google API key |
| `google_cse_id` | string | - | Google Custom Search Engine ID |

### Environment Variables

Environment variables serve as global defaults. They're useful for Docker deployments or when you want the same configuration across all notes directories.

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

**In-app setup:** You can also configure this directly in the `.webnotes` file:
```ini
youtube_api_key = your-youtube-api-key
```

When not configured, the YouTube Search tab shows setup instructions with a link to this documentation.

### Optional: Google Image Search

To enable Google Images tab (in addition to the free web search):

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

**In-app setup:** You can also configure this directly in the `.webnotes` file:
```ini
google_api_key = your-google-api-key
google_cse_id = your-custom-search-engine-id
```

When not configured, the Google Images tab shows setup instructions with a link to this documentation.

Note: Google Custom Search has a free tier of 100 queries/day.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New note |
| `Ctrl+S` | Save now |
| `Ctrl+P` | Find file by path |
| `Ctrl+Shift+F` | Search in file contents |
| `Ctrl+E` | Toggle sidebar |
| `Ctrl+B` | Toggle typewriter mode |
| `Ctrl+Shift+P` | Toggle preview panel |
| `F1` | Markdown help |

## Typewriter Mode

Typewriter mode (`Ctrl+B`) is designed for focused, distraction-free writing:

**Normal mode (default):**
- Explorer panel visible on the left
- Preview panel hidden
- Editor uses normal scrolling

**Typewriter mode:**
- Explorer panel hidden
- Preview panel opens automatically
- Cursor stays centered in the middle of the editor
- As you type, the text scrolls to keep your writing position fixed
- Preview panel syncs with typewriter position

This mimics the experience of a typewriter where your typing position stays constant on the page, reducing eye movement and helping maintain focus during long writing sessions.

## Hugo Blog Post Support

WebNotes includes built-in support for creating Hugo-compatible blog posts. When you click the "New Note" button (or press `Ctrl+N`), you can choose between:

- **Empty Document** - A plain markdown file
- **Hugo Blog Post** - A properly structured Hugo post

### Hugo Post Structure

When you create a Hugo blog post with a title like "My Amazing Post Title", WebNotes will:

1. Create the directory structure: `YYYY/MM/DD/my-amazing-post-title/`
2. Create `index.md` inside with Hugo frontmatter:

```yaml
---
title: "My Amazing Post Title"
slug: "my-amazing-post-title"
date: 2026-01-30T14:30:00-0300
draft: true
tags:
-
---
```

### Slug Generation

The slug is automatically generated from the title:
- Converts to lowercase
- Replaces accented characters (a→a, e→e, c→c, n→n, etc.)
- Removes special characters
- Replaces spaces with hyphens

Examples:
- "Conexao a Internet" → `conexao-a-internet`
- "What's New in 2026?" → `whats-new-in-2026`
- "Codigo & Programacao" → `codigo-programacao`

## Themes

WebNotes supports multiple color themes:

- **Light** - Clean light theme
- **Dark** - Standard dark theme
- **Gruvbox** - Retro groove color scheme
- **Tokyo Night** - Vibrant night theme
- **Solarized Light/Dark** - Classic color schemes
- **Nord** - Arctic, north-bluish color palette
- **Cappuccino** - Warm coffee tones
- **Osaka** - Japanese-inspired colors
- **Hackerman** - Matrix-style green on black

Change themes from the dropdown in the top-right corner. Your preference is saved to the `.webnotes` file.

## Remote Access with Cloudflare Tunnel

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
│   ├── youtube_controller.rb  # YouTube search API
│   └── config_controller.rb   # .webnotes configuration
├── models/
│   ├── note.rb                # Note ActiveModel
│   ├── folder.rb              # Folder ActiveModel
│   └── config.rb              # Configuration management
├── services/
│   ├── notes_service.rb       # File system operations
│   └── images_service.rb      # Image handling & S3
├── javascript/
│   └── controllers/
│       ├── app_controller.js          # Main Stimulus controller
│       ├── theme_controller.js        # Theme management
│       └── table_editor_controller.js # Table editing
└── views/
    └── notes/
        ├── index.html.erb     # Single-page app
        ├── _header.html.erb   # Top bar with GitHub link
        ├── _sidebar.html.erb  # File explorer
        ├── _editor_panel.html.erb
        ├── _preview_panel.html.erb
        └── dialogs/           # Modal dialogs
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
