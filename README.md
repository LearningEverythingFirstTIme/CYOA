# CYOA Platform

A reusable platform for interactive fiction / choose your own adventure stories.

## Quick Start

```bash
# Install dependencies
npm install

# Build stories
npm run build

# Start dev server
npm run dev
```

## Creating a New Story

```bash
npm run new-story my-story
```

This creates `stories/my-story/story.md` from the template.

## Story Format

Stories are written in Markdown with a simple syntax:

```markdown
---
id: my-story
title: My Story
author: Your Name
description: A short description
theme: default
---

# start
**Location:** Starting Location

Your story begins here. Use *italics* and **bold**.

- [First choice → node_a]
- [Second choice → node_b]

# node_a
**Location:** Location A

More story content...

- [Continue → ending_good]

# ending_good {ending}
**Location:** ENDING: THE GOOD END
**Theme:** Reflection on the ending

Your ending content here.
```

### Story Structure

- **Frontmatter** (`---`): Metadata (title, author, theme, etc.)
- **Nodes** (`# node_id`): Story sections
- **Location** (`**Location:**`): Displayed header for the node
- **Choices** (`- [Text → next_node]`): Navigation options
- **Endings** (`{ending}` flag): Terminal nodes

## Themes

Available themes:
- `default` - Clean, minimal styling
- `blade-runner` - Cyberpunk noir aesthetic

To create a custom theme, add a CSS file to `src/themes/`.

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Author    │────▶│  Markdown   │────▶│   Parser    │
│  Writes in  │     │   Format    │     │  (build)    │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                                │
                                                ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│    User     │◀────│    HTML     │◀────│    JSON     │
│   Reads     │     │   Engine    │     │   Output    │
└─────────────┘     └─────────────┘     └─────────────┘
```

## Deployment

### GitHub Pages

```bash
npm run deploy
```

### Netlify/Vercel

Connect your repository. Build command: `npm run build`, output directory: `dist`.

## Project Structure

```
cyoa-platform/
├── stories/              # Story source files
│   ├── _template/        # Template for new stories
│   └── silence-bureau/   # Example story
├── src/
│   ├── engine/           # Story-agnostic engine
│   └── themes/           # CSS themes
├── parser/               # Markdown parser
├── scripts/              # Build tools
└── dist/                 # Generated output
```

## License

MIT
