# 🕷️ Arachne Chat UI - Startup Guide

## Quick Start (3 Commands)

```bash
# 1. Start OpenCode server (from your project folder)
cd ~/Documents/dev/arachne
opencode serve --port 4096

# 2. Start Arachne dashboard (new terminal)
cd ~/Documents/dev/arachne/packages/dashboard
bun run dev

# 3. Open browser
open http://localhost:3000
```

**Login password:** Check your `OPENCODE_SERVER_PASSWORD` or use: `arachne-dev-2026`

---

## Full Production Setup

### 1. Prerequisites

- **Bun** installed (`curl -fsSL https://bun.sh/install | bash`)
- **OpenCode** installed (`npm install -g @opencode-ai/cli`)
- **Git** (to clone the repository)

### 2. Installation

```bash
# Clone the repository into your project folder
cd ~/my-project
git clone <arachne-repo-url> arachne
cd arachne

# Install dependencies
bun install
```

### 3. Configuration

Create `packages/dashboard/.env.local`:

```bash
# OpenCode API URL (default: http://localhost:4096)
OPENCODE_API_URL=http://localhost:4096

# OpenCode server password (matches your OPENCODE_SERVER_PASSWORD)
OPENCODE_SERVER_PASSWORD=your-password-here
```

### 4. Start Services

**Terminal 1 - OpenCode Server (Headless):**
```bash
cd ~/my-project  # Your project directory
export OPENCODE_SERVER_PASSWORD="your-password-here"
opencode serve --port 4096
```

**Terminal 2 - Arachne Dashboard:**
```bash
cd ~/my-project/arachne/packages/dashboard
bun run dev
```

**Terminal 3 - Voice Server (Optional - Not Yet Implemented):**
```bash
# Future feature - tap-to-dictate and full-duplex voice
# Will be available on port 3200
```

### 5. Access Arachne

1. Open browser: **http://localhost:3000**
2. You'll be redirected to `/login`
3. Enter your `OPENCODE_SERVER_PASSWORD`
4. Click "Connect"
5. Start chatting!

---

## Features

### ✅ Working Now

- **Text Chat** with streaming responses
- **Session Management** (create, switch, delete)
- **Basic Auth** with httpOnly cookies
- **Responsive Design** (mobile + desktop)
- **Dark Theme** with indigo accent
- **Connection Status** indicator
- **PWA Support** (manifest.json for mobile)

### ⏳ Coming Soon (Voice Features)

- **Tap-to-Dictate**: Mic button → whisper.cpp → text in input
- **Full-Duplex Voice**: Gemini Live style voice mode
- Voice server implementation needed (port 3200)

---

## Typical User Workflow

### For End Users:

1. **Start in project folder:**
   ```bash
   cd ~/my-awesome-project
   ```

2. **Clone Arachne:**
   ```bash
   git clone <arachne-repo> arachne
   cd arachne && bun install
   ```

3. **Start OpenCode headless:**
   ```bash
   cd ~/my-awesome-project  # Back to project root
   export OPENCODE_SERVER_PASSWORD="my-secure-password"
   opencode serve --port 4096
   ```

4. **Start Arachne:**
   ```bash
   cd ~/my-awesome-project/arachne/packages/dashboard
   bun run dev
   ```

5. **Access:** http://localhost:3000 and login with your password

---

## Architecture

```
Browser (localhost:3000)
    ↓ HTTP/SSE
Next.js Dashboard (port 3000)
    ↓ @opencode-ai/sdk
OpenCode Server (port 4096) ← Running in your project directory
```

**Auth Flow:**
- Password → httpOnly cookie → Basic Auth to OpenCode
- No JWT, no custom auth, just Basic Auth passthrough

**Message Flow:**
- Browser → `/api/sessions/{id}/prompt` → OpenCode SDK → OpenCode Server
- Response streams back via SSE from `/api/events`

---

## Troubleshooting

### "Failed to create session"
- **Check:** Is OpenCode running on port 4096?
- **Test:** `curl http://localhost:4096/session`
- **Fix:** Start OpenCode with `opencode serve --port 4096`

### "Invalid password"
- **Check:** Does your password match `OPENCODE_SERVER_PASSWORD`?
- **Test:** `echo $OPENCODE_SERVER_PASSWORD`
- **Fix:** Export the same password in both terminals

### "Connection lost" indicator
- OpenCode server stopped or crashed
- Check OpenCode logs
- Restart: `opencode serve --port 4096`

### Voice features don't work
- Voice server not implemented yet
- Mic buttons will show errors
- Coming in future update

---

## Development

### Build for Production

```bash
cd packages/dashboard
bun run build
bun run start  # Runs on port 3000
```

### Run Tests

```bash
cd packages/dashboard
bun test  # 26 tests should pass
```

### Check Build

```bash
bun run build  # Should exit 0 with no errors
```

---

## Environment Variables

### Dashboard (.env.local)

```bash
# OpenCode API endpoint
OPENCODE_API_URL=http://localhost:4096

# OpenCode password (for server-side auth)
OPENCODE_SERVER_PASSWORD=your-password

# Voice server URL (future)
NEXT_PUBLIC_VOICE_WS_URL=ws://localhost:3200
```

---

## Ports

| Service | Port | Status |
|---------|------|--------|
| Dashboard | 3000 | ✅ Working |
| OpenCode Server | 4096 | ✅ Working |
| Voice Server | 3200 | ⏳ Not implemented |

---

## Security

- **httpOnly cookies** prevent XSS attacks
- **Basic Auth** over HTTPS in production
- **No password in localStorage** (server-side only)
- **Middleware protection** on all routes except /login

---

## What's Next

1. **Voice Server Implementation**
   - WebSocket server on port 3200
   - Whisper.cpp integration for STT
   - Kokoro TTS for voice responses
   - VAD for speech detection

2. **Enhanced Features**
   - Markdown rendering
   - Code syntax highlighting
   - Message editing/regeneration
   - Tool output visualization

3. **Deployment**
   - Docker compose setup
   - Production nginx config
   - HTTPS/SSL setup
   - Environment-specific configs

---

**Arachne is ready to chat! 🕷️**
