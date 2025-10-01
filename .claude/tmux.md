# VibeBox tmux Session Management Guide

> **Task T191**: tmux session management, tips, and best practices

## 📋 Overview

tmux is a powerful terminal multiplexer that allows you to create, manage, and share persistent terminal sessions within VibeBox environments. This guide covers how to use tmux effectively with VibeBox.

## 🎯 What is tmux?

**tmux** (terminal multiplexer) enables:
- **Multiple windows**: Run multiple programs in one terminal
- **Session persistence**: Sessions survive disconnections
- **Window splitting**: Split terminal into panes
- **Session sharing**: Multiple users can attach to same session
- **Detach/attach**: Leave sessions running in background

## 🚀 Getting Started with tmux in VibeBox

### Creating a tmux Session

**Via VibeBox UI**:
1. Navigate to your environment
2. Click "Sessions" tab
3. Click "Create Session"
4. Select session type: **tmux**
5. Enter session name (e.g., "dev-session")
6. Click "Create"

**Via Terminal**:
```bash
# Create a new tmux session
tmux new -s dev-session

# Or from VibeBox API
curl -X POST http://localhost:3000/api/v1/environments/{environmentId}/sessions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"sessionType":"tmux","sessionName":"dev-session"}'
```

### Listing Sessions

**Via VibeBox UI**:
Check the "Sessions" tab in your environment

**Via tmux**:
```bash
# List all tmux sessions
tmux ls

# Output example:
# dev-session: 1 windows (created Wed Oct  1 12:00:00 2025)
# test-session: 2 windows (created Wed Oct  1 13:00:00 2025)
```

### Attaching to a Session

**Via VibeBox UI**:
1. Go to "Sessions" tab
2. Find your tmux session
3. Click "Attach"
4. Terminal opens attached to session

**Via tmux**:
```bash
# Attach to named session
tmux attach -t dev-session

# Or shorthand
tmux a -t dev-session

# Attach to last session
tmux attach
```

### Detaching from a Session

**Inside tmux**:
Press: `Ctrl+b` then `d`

Your session continues running in the background.

## ⌨️ Essential tmux Key Bindings

### Prefix Key

All tmux commands start with the **prefix key**: `Ctrl+b`

### Basic Commands

| Command | Action |
|---------|--------|
| `Ctrl+b d` | Detach from session |
| `Ctrl+b c` | Create new window |
| `Ctrl+b w` | List windows |
| `Ctrl+b n` | Next window |
| `Ctrl+b p` | Previous window |
| `Ctrl+b 0-9` | Switch to window number |
| `Ctrl+b ,` | Rename window |
| `Ctrl+b &` | Kill window |

### Pane Management

| Command | Action |
|---------|--------|
| `Ctrl+b %` | Split vertically |
| `Ctrl+b "` | Split horizontally |
| `Ctrl+b →/←/↑/↓` | Navigate panes |
| `Ctrl+b x` | Kill pane |
| `Ctrl+b z` | Zoom/unzoom pane |
| `Ctrl+b {` | Swap pane left |
| `Ctrl+b }` | Swap pane right |

### Session Management

| Command | Action |
|---------|--------|
| `Ctrl+b s` | List sessions |
| `Ctrl+b $` | Rename session |
| `Ctrl+b (` | Previous session |
| `Ctrl+b )` | Next session |

## 🎨 Common tmux Workflows

### Workflow 1: Development with Multiple Panes

```bash
# Start tmux
tmux new -s dev

# Split horizontally for logs
Ctrl+b "

# Navigate to top pane
Ctrl+b ↑

# Split vertically for editor
Ctrl+b %

# Now you have:
# +--------+--------+
# | Editor | Tests  |
# +--------+--------+
# |    Logs         |
# +-----------------+
```

### Workflow 2: Multiple Projects

```bash
# Session for frontend
tmux new -s frontend
# Run: npm run dev

# Detach
Ctrl+b d

# Session for backend
tmux new -s backend
# Run: npm run dev

# Switch between them
tmux attach -t frontend
tmux attach -t backend
```

### Workflow 3: Pair Programming

```bash
# User 1: Create session
tmux new -s pair-programming

# User 2: Attach to same session (in VibeBox)
# Both users now see the same terminal!
```

## 🔧 Advanced Features

### Named Windows

```bash
# Create window with name
Ctrl+b c
Ctrl+b , "backend-server" Enter

Ctrl+b c
Ctrl+b , "frontend-dev" Enter

Ctrl+b c
Ctrl+b , "database" Enter

# Now you can easily identify windows
```

### Copy Mode (Scrollback)

```bash
# Enter copy mode
Ctrl+b [

# Navigate with arrow keys or Page Up/Down
# Search: / (forward) or ? (backward)
# Copy text: Space (start) → Enter (end)

# Exit copy mode
q

# Paste
Ctrl+b ]
```

### Resize Panes

```bash
# Enter resize mode
Ctrl+b :resize-pane -D 5  # Down 5 lines
Ctrl+b :resize-pane -U 5  # Up 5 lines
Ctrl+b :resize-pane -L 5  # Left 5 columns
Ctrl+b :resize-pane -R 5  # Right 5 columns

# Or hold Ctrl+b and use arrows
Ctrl+b Ctrl+↑/↓/←/→
```

### Synchronize Panes

Run the same command in all panes:

```bash
# Enable synchronization
Ctrl+b :setw synchronize-panes on

# Type commands - they run in all panes!

# Disable synchronization
Ctrl+b :setw synchronize-panes off
```

## 🎯 VibeBox-Specific Features

### Auto-Created Sessions

When you start an environment, VibeBox automatically creates:
- **Default shell session** (session_type: shell)
- You can manually create additional tmux sessions

### Session Persistence

**Important**: tmux sessions are tied to the environment container.

- ✅ **Persist across**: WebSocket disconnections, browser refreshes
- ❌ **Do NOT persist across**: Environment restarts (stop/start)

**Best Practice**: Use environment variables and startup scripts to recreate your workspace.

### Session Monitoring

VibeBox tracks:
- Last activity time
- Session status (starting, active, idle, terminated)
- Idle timeout (default: 30 minutes)

**Idle sessions** are automatically cleaned up after timeout.

### Multi-User Collaboration

Multiple VibeBox users can attach to the same tmux session:

1. User A creates environment and tmux session
2. User B (team member) navigates to same environment
3. User B clicks "Attach" on the tmux session
4. Both users share the same terminal!

## 📝 Configuration

### Custom tmux Config

Create `.tmux.conf` in your environment:

```bash
# ~/.tmux.conf

# Change prefix to Ctrl+a (optional)
unbind C-b
set -g prefix C-a
bind C-a send-prefix

# Enable mouse support
set -g mouse on

# Increase history limit
set -g history-limit 10000

# Start window numbering at 1
set -g base-index 1
setw -g pane-base-index 1

# Reload config
bind r source-file ~/.tmux.conf \; display "Config reloaded!"

# Better split commands
bind | split-window -h
bind - split-window -v

# Vim-style pane navigation
bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

# Status bar customization
set -g status-bg colour235
set -g status-fg colour136
set -g status-left '#[fg=green]Session: #S'
set -g status-right '#[fg=yellow]%Y-%m-%d %H:%M'
```

### Applying Configuration

```bash
# Inside tmux
Ctrl+b :source-file ~/.tmux.conf
```

## 💡 Tips & Best Practices

### Naming Conventions

Use descriptive session names:
- ✅ `backend-dev`, `frontend-build`, `db-migration`
- ❌ `session1`, `test`, `abc`

### Window Organization

Organize windows by function:
```
0: editor    # Your code editor
1: server    # Development server
2: tests     # Test runner
3: db        # Database console
4: logs      # Log tailing
```

### Save Your Layout

Create a script to recreate your layout:

```bash
#!/bin/bash
# setup-dev-env.sh

# Create session
tmux new-session -d -s dev

# Window 0: Editor
tmux rename-window 'editor'
tmux send-keys 'nvim .' C-m

# Window 1: Server
tmux new-window -n 'server'
tmux send-keys 'npm run dev' C-m

# Window 2: Tests
tmux new-window -n 'tests'
tmux send-keys 'npm run test:watch' C-m

# Attach to session
tmux attach -t dev
```

### Use Panes Efficiently

**Split by task**:
- Top-left: Editor
- Top-right: Tests
- Bottom: Server logs

**Not by randomness!**

### Detach Often

Don't keep tmux attached when not actively using it:
- Detach and let it run
- Attach when you need it
- Reduces terminal clutter

### Clean Up

Delete sessions you're not using:

```bash
# Kill specific session
tmux kill-session -t old-session

# Kill all sessions except current
tmux kill-session -a
```

## 🐛 Troubleshooting

### tmux: command not found

tmux might not be installed in the base image.

**Solution**: Install tmux in your environment:

```bash
# For Debian/Ubuntu
apt-get update && apt-get install -y tmux

# For Alpine
apk add tmux

# For CentOS/RHEL
yum install -y tmux
```

**Better**: Use a base image with tmux pre-installed.

### Session Not Persisting

tmux sessions are container-specific. When environment restarts, sessions are lost.

**Solution**: Use a startup script or environment variable to recreate your setup.

### Can't Attach to Session

Error: "session not found"

**Possible causes**:
- Session was terminated
- Environment was restarted
- Session name typo

**Solution**: List sessions with `tmux ls` to verify.

### Panes Too Small

**Solution**: Resize panes or zoom current pane:

```bash
# Zoom current pane (full screen)
Ctrl+b z

# Zoom again to unzoom
Ctrl+b z
```

## 📚 Additional Resources

### tmux Cheat Sheets

- [Official tmux Documentation](https://github.com/tmux/tmux/wiki)
- [tmux Cheat Sheet](https://tmuxcheatsheet.com/)

### Related VibeBox Documentation

- **[Quick Start Guide](./quick_start.md)** - Environment setup
- **[API Reference](./api_reference.md)** - Session API endpoints
- **[FAQ](./faq.md)** - Common questions

---

## Quick Reference Card

```
┌─ tmux Quick Reference ─────────────────────────┐
│ Prefix: Ctrl+b                                 │
├────────────────────────────────────────────────┤
│ Sessions                                       │
│  d        Detach from session                  │
│  s        List sessions                        │
│  $        Rename session                       │
├────────────────────────────────────────────────┤
│ Windows                                        │
│  c        Create new window                    │
│  ,        Rename window                        │
│  n/p      Next/Previous window                 │
│  0-9      Switch to window number              │
│  &        Kill window                          │
├────────────────────────────────────────────────┤
│ Panes                                          │
│  %        Split vertically                     │
│  "        Split horizontally                   │
│  →←↑↓     Navigate panes                       │
│  x        Kill pane                            │
│  z        Zoom/unzoom pane                     │
├────────────────────────────────────────────────┤
│ Other                                          │
│  [        Enter copy mode                      │
│  ]        Paste                                │
│  ?        Show all key bindings                │
└────────────────────────────────────────────────┘
```

---

**Master tmux, master your workflow!** 🚀
