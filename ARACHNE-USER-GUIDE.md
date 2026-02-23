# Arachne Chat UI — Complete User Guide

This document covers every feature and interaction available in Arachne Chat UI. It serves as the reference for testing and quality assurance.

---

## Table of Contents

1. [Setup & Launch](#1-setup--launch)
2. [Login](#2-login)
3. [Chat Interface Overview](#3-chat-interface-overview)
4. [Sending Messages](#4-sending-messages)
5. [Receiving Responses](#5-receiving-responses)
6. [Session Management](#6-session-management)
7. [Connection Status](#7-connection-status)
8. [Voice Input (Tap-to-Dictate)](#8-voice-input-tap-to-dictate)
9. [Voice Mode (Full-Duplex)](#9-voice-mode-full-duplex)
10. [Mobile / Responsive Layout](#10-mobile--responsive-layout)
11. [Keyboard Shortcuts](#11-keyboard-shortcuts)
12. [Error Handling & Recovery](#12-error-handling--recovery)
13. [Logout](#13-logout)

---

## 1. Setup & Launch

### Prerequisites
- Bun installed
- OpenCode CLI installed (`@opencode-ai/cli`)
- A project directory where OpenCode will operate

### Steps

**Terminal 1 — Start OpenCode headless server:**
```bash
cd ~/your-project-directory
export OPENCODE_SERVER_PASSWORD="your-password"
opencode serve --port 4096
```

**Terminal 2 — Start Arachne dashboard:**
```bash
cd ~/your-project-directory/arachne/packages/dashboard
bun run dev
```

**Browser:**
Open http://localhost:3000

### Expected Result
- Browser redirects to `/login` page
- Login form is displayed with a password field and "Connect" button

---

## 2. Login

### How to Login
1. Navigate to http://localhost:3000
2. You are automatically redirected to `/login`
3. Enter the same password you set as `OPENCODE_SERVER_PASSWORD`
4. Click **"Connect"** or press **Enter**

### Expected Result
- On success: Redirected to `/chat` with the chat interface visible
- On failure: Error message displayed ("Invalid password" or similar)

### Session Persistence
- Your login is stored as an httpOnly cookie (30-day expiry)
- Refreshing the page does not require re-login
- Opening a new tab does not require re-login

### Failure Modes
| Symptom | Cause | Fix |
|---------|-------|-----|
| "Invalid password" | Password mismatch | Verify `OPENCODE_SERVER_PASSWORD` env var matches |
| Spinning / no response | OpenCode server not running | Start `opencode serve --port 4096` |
| Network error | Wrong port or firewall | Check OPENCODE_API_URL in .env.local |

---

## 3. Chat Interface Overview

After login, the chat interface has these regions:

### Desktop Layout (≥1024px wide)
```
┌──────────────┬──────────────────────────────────┐
│  Session     │  Header Bar                       │
│  Sidebar     │  [Arachne Chat]  [Connection ●]  │
│              ├──────────────────────────────────┤
│  + New Chat  │                                   │
│  ─────────── │  Message Area                     │
│  Session 1 ▪ │  (scrollable)                     │
│  Session 2   │                                   │
│  Session 3   │                                   │
│              ├──────────────────────────────────┤
│              │  [🎤] [Message input...    ] [↑]  │
└──────────────┴──────────────────────────────────┘
                                          [🎙 Voice FAB]
```

### Mobile Layout (<1024px wide)
```
┌──────────────────────────────────┐
│  [☰] Arachne Chat  [Connection] │
├──────────────────────────────────┤
│                                  │
│  Message Area                    │
│  (scrollable)                    │
│                                  │
├──────────────────────────────────┤
│  [🎤] [Message input...    ] [↑] │
└──────────────────────────────────┘
                          [🎙 Voice FAB]
```

### UI Elements
- **Session Sidebar** (desktop: always visible, mobile: hamburger menu)
- **Header Bar** with title and connection status indicator
- **Message Area** showing conversation history and streaming responses
- **Input Bar** with mic button, text input, and send/stop button
- **Voice FAB** (Floating Action Button) in bottom-right corner

---

## 4. Sending Messages

### Text Input
1. Click the text input area (auto-focused on page load)
2. Type your message
3. Press **Enter** to send (or click the **↑** send button)
4. For multi-line input: press **Shift+Enter** to add a new line

### Expected Behavior
- Your message appears immediately in the chat as a user bubble (right-aligned, primary color)
- The input field clears instantly after sending
- The send button becomes disabled while a response is streaming
- The message area auto-scrolls to show your new message

### Input Features
- **Auto-resize**: The input grows taller as you type more lines (up to ~6 lines / 144px)
- **Disabled during streaming**: Cannot send while assistant is responding
- **Empty check**: Send button is disabled when input is empty

### Failure Modes
| Symptom | Cause | Fix |
|---------|-------|-----|
| Message doesn't appear | No active session | Create a new chat session |
| "Failed to send" | OpenCode server down | Check connection status indicator |
| Input disabled permanently | Streaming state stuck | Refresh the page |

---

## 5. Receiving Responses

### Streaming Responses
After sending a message:
1. The assistant's response streams in character-by-character
2. A streaming bubble appears (left-aligned, card background) with a blinking cursor
3. When the response completes, the cursor disappears
4. The stop button (⏹) is available during streaming to abort

### Tool Usage Display
When the assistant uses a tool (file read, search, etc.):
- A "Using tool: [tool_name]..." indicator appears below the messages
- This disappears when the tool completes
- The assistant's text response follows

### Stop Generation
- During streaming, the send button changes to a red **⏹** stop button
- Click it to abort the current response
- The partial response remains visible

### Auto-Scroll
- The message area automatically scrolls to the bottom as new content arrives
- This applies to both new messages and streaming text

### Message Format
- Messages are displayed as plain text with `whitespace-pre-wrap` (preserves formatting)
- No markdown rendering in this version
- User messages: right-aligned, primary background
- Assistant messages: left-aligned, card background
- Each bubble shows the sender ("You" or "Assistant") and timestamp

---

## 6. Session Management

### What is a Session?
A session is a conversation thread with the OpenCode assistant. Each session has its own message history and context.

### Auto-Creation
- On first login, if no sessions exist, one is automatically created
- You're automatically redirected to the newest session

### Create New Session
1. Click **"+ New Chat"** button in the sidebar
2. A new session is created and immediately selected
3. The message area clears, showing "Send a message to start chatting"

### Switch Between Sessions
1. Click any session in the sidebar
2. The message area loads that session's history
3. The URL updates to include `?session={id}`
4. Active session is highlighted with a background color

### Delete a Session
1. Hover over a session in the sidebar
2. A 🗑️ (trash) icon appears on the right
3. Click the trash icon
4. Confirm the deletion in the browser dialog
5. If deleting the active session, the next session is auto-selected
6. If no sessions remain, a new one is auto-created

### Session Display
- Sessions are sorted by most recently updated
- Each session shows its title (or "Untitled") and relative time ("Just now", "5 min ago", etc.)
- The active session has a highlighted background

### URL Routing
- Sharing a URL like `http://localhost:3000/chat?session=abc123` will open that specific session
- If the session doesn't exist, the most recent session is selected

---

## 7. Connection Status

### Indicator Location
Top-right corner of the header bar.

### States
| Indicator | Meaning |
|-----------|---------|
| 🟢 (green dot, no text) | Connected to OpenCode server |
| 🟡 "Connecting..." (amber, pulsing) | Initial connection or reconnecting |
| 🔴 "Disconnected" (red) | Cannot reach OpenCode server |

### Behavior
- Checks connection every 30 seconds by pinging `/api/auth`
- If the server stops, status updates to "Disconnected" within 30 seconds
- When reconnected, status returns to green

### What to Do When Disconnected
1. Check that `opencode serve` is still running in your terminal
2. Restart the OpenCode server if needed
3. The connection status will update automatically — no page refresh needed

---

## 8. Voice Input (Tap-to-Dictate)

### Location
Microphone button (🎤) on the left side of the input bar.

### How to Use
1. Click the **🎤** mic button
2. The button turns red (⏺) indicating recording
3. Speak your message
4. Recording stops automatically when speech ends (via VAD — Voice Activity Detection)
5. Transcription appears in the text input
6. Edit if needed, then press Enter to send

### Requirements
- Voice server must be running on port 3200 (future feature)
- Browser microphone permission must be granted

### Current Status
- **Voice server is not yet implemented** — the mic button will silently fail
- No error messages shown when voice server is unavailable (graceful degradation)
- The button is fully wired and will work once the voice server is online

---

## 9. Voice Mode (Full-Duplex)

### Location
Floating Action Button (FAB) — circular microphone button in the bottom-right corner.

### How to Use
1. Click the **voice FAB** (bottom-right circle)
2. The voice overlay opens (full-screen or modal)
3. Speak naturally — the system listens and responds with voice
4. Click **close** or the X button to exit voice mode

### Overlay Features
- Shows connection state
- Displays transcription of your speech
- Shows assistant's text response
- Mute/unmute toggle
- Close button

### Current Status
- **Voice server is not yet implemented** — clicking the FAB will briefly open then close the overlay
- Graceful degradation: no error states, just silent close
- Will work once voice server is running on port 3200

---

## 10. Mobile / Responsive Layout

### Breakpoint
- **≥1024px**: Desktop layout with persistent sidebar
- **<1024px**: Mobile layout with hamburger menu

### Mobile-Specific Features
1. **Hamburger Menu (☰)**: Top-left button opens the session sidebar as a slide-over sheet
2. **Sheet Navigation**: Tap a session to switch, tap outside to close
3. **Full-Width Chat**: Message area uses the full screen width
4. **Same Input Bar**: Mic, text input, and send button at the bottom

### Touch Interactions
- All buttons are touch-friendly (minimum tap targets)
- Swipe/scroll through messages
- Auto-scroll on new content

---

## 11. Keyboard Shortcuts

| Shortcut | Action | Context |
|----------|--------|---------|
| **Enter** | Send message | In text input |
| **Shift+Enter** | New line | In text input |
| **Enter** or **Space** | Select session | When session item is focused |

### Tab Navigation
- Tab through: sidebar → header → message area → input → buttons
- Session items are keyboard-accessible (role="button" with tabIndex)
- Delete buttons appear on hover/focus within sessions

---

## 12. Error Handling & Recovery

### Connection Lost During Chat
- Message sending will fail with an error
- The connection indicator shows "Disconnected"
- SSE stream auto-reconnects (up to 5 retries, 3 seconds apart)
- Once the server is back, streaming resumes automatically

### Session Creation Fails
- If the initial auto-create fails, it won't retry infinitely
- Click "+ New Chat" manually to retry
- Check that OpenCode server is running

### Message Send Fails
- Your optimistic message still appears in the chat
- The error is caught silently — the streaming response simply won't arrive
- Send another message once the connection is restored

### Voice Features Unavailable
- Mic button and Voice FAB silently fail — no error popups
- When voice server becomes available, buttons work immediately

### General Recovery Steps
1. Check the connection status indicator
2. Verify OpenCode server is running: `curl http://localhost:4096/session`
3. If disconnected, restart: `opencode serve --port 4096`
4. Refresh the browser page only as a last resort

---

## 13. Logout

### How to Logout
1. (Currently no visible logout button in the UI)
2. Navigate to `/login` manually or clear your cookies
3. The auth cookie will be cleared

### Session Cleanup
- Logging out clears your httpOnly auth cookie
- Your chat sessions persist on the server — they'll be available on next login
- No data is lost on logout

---

## Feature Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| Text Chat | ✅ Working | Send + streaming response |
| Optimistic UI | ✅ Working | Messages appear instantly |
| Session Create | ✅ Working | Via "+ New Chat" button |
| Session Switch | ✅ Working | Click in sidebar |
| Session Delete | ✅ Working | Hover → trash icon → confirm |
| Auto-Create Session | ✅ Working | On first login |
| Connection Status | ✅ Working | 30s polling |
| SSE Streaming | ✅ Working | Auto-reconnect (5 retries) |
| Tool Use Display | ✅ Working | Shows tool name during use |
| Stop Generation | ✅ Working | Red stop button |
| Multi-line Input | ✅ Working | Shift+Enter |
| Auto-resize Input | ✅ Working | Grows to ~6 lines |
| Mobile Layout | ✅ Working | Hamburger sidebar |
| Login Auth | ✅ Working | httpOnly cookie |
| Keyboard Navigation | ✅ Working | Tab, Enter, Space |
| Tap-to-Dictate | ⏳ Pending | Needs voice server |
| Full-Duplex Voice | ⏳ Pending | Needs voice server |
| Markdown Rendering | ⏳ Planned | Phase 2 feature |
| Code Highlighting | ⏳ Planned | Phase 2 feature |
| Message Edit/Regen | ⏳ Planned | Future feature |
| Logout Button | ⏳ Missing | Manual navigation only |

---

## Testing Checklist

Use this checklist to verify all functionality:

### Login Flow
- [ ] Navigate to / → redirected to /login
- [ ] Enter wrong password → error shown
- [ ] Enter correct password → redirected to /chat
- [ ] Refresh page → still logged in (cookie persists)
- [ ] Open new tab → still logged in

### Chat — Sending
- [ ] Type message → send button enables
- [ ] Click send → message appears instantly (optimistic)
- [ ] Press Enter → sends message
- [ ] Press Shift+Enter → adds newline (doesn't send)
- [ ] Input clears after send
- [ ] Input disabled during streaming

### Chat — Receiving
- [ ] Assistant response streams in character by character
- [ ] Streaming cursor (blinking) visible during stream
- [ ] Message area auto-scrolls during stream
- [ ] Stop button appears during streaming
- [ ] Click stop → streaming aborts
- [ ] After stream completes, messages persist on refetch

### Sessions
- [ ] New Chat button creates a session
- [ ] New session is selected and message area clears
- [ ] Click different session → messages change
- [ ] URL updates with ?session=id
- [ ] Hover session → delete icon appears
- [ ] Delete session → confirm dialog → session removed
- [ ] Delete active session → next session auto-selected
- [ ] First load with no sessions → auto-creates one

### Connection
- [ ] Green dot when connected
- [ ] Amber + "Connecting..." on initial load
- [ ] Red + "Disconnected" when server stops
- [ ] Auto-recovers when server restarts

### Mobile
- [ ] Sidebar hidden on small screens
- [ ] Hamburger menu (☰) visible
- [ ] Click hamburger → sidebar slides in
- [ ] Select session → sidebar closes
- [ ] All features work on mobile width

### Voice (Graceful Degradation)
- [ ] Mic button click → no error shown (silent fail)
- [ ] Voice FAB click → overlay briefly opens then closes (no error)
- [ ] No console errors from voice features

### Keyboard
- [ ] Tab through all interactive elements
- [ ] Enter/Space on session items → selects session
- [ ] Enter in input → sends message
