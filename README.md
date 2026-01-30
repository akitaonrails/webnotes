# WebNotes

A simple, self-hosted markdown note-taking app built with Ruby on Rails 8.

## Features

- File-based storage (no database required)
- Nested folder organization
- CodeMirror 6 editor with markdown syntax highlighting
- Live preview panel
- Dark/Light mode
- Auto-save with debouncing
- Keyboard shortcuts

## Requirements

- Ruby 3.2+
- Node.js (for Tailwind CSS compilation in development)

## Setup

```bash
# Clone and enter directory
git clone <repo-url>
cd WebNotes

# Install dependencies
bundle install

# Start the development server
bin/dev
```

Visit `http://localhost:3000` in your browser.

## Configuration

Set the `NOTES_PATH` environment variable to customize where notes are stored:

```bash
NOTES_PATH=/path/to/your/notes bin/dev
```

Default: `./notes` directory in the app root.

## Keyboard Shortcuts

- `Ctrl+N` - New note
- `Ctrl+S` - Save now
- `Ctrl+Shift+P` - Toggle preview panel

## Production

```bash
# Build assets
bin/rails assets:precompile

# Start server
bin/rails server -e production
```

## License

MIT
