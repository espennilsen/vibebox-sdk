# VibeCode Quickstart & Validation Guide

**Purpose**: Validate that VibeCode implementation meets all functional requirements from spec.md
**Audience**: Developers, QA testers, stakeholders
**Duration**: ~30 minutes for full validation

## Prerequisites

- VibeCode backend running on `http://localhost:3000`
- VibeCode frontend running on `http://localhost:5173`
- Docker daemon accessible (for backend)
- PostgreSQL database initialized with schema
- Test user account or OAuth provider configured

---

## Validation Scenarios

### Scenario 1: User Registration & Authentication
**Validates**: FR-025, FR-026, FR-029, FR-030, FR-031

**Steps**:
1. Navigate to `http://localhost:5173`
2. Click "Sign Up" button
3. Enter email: `test@vibecode.dev`, password: `SecurePassword123!`, display name: `Test User`
4. Submit registration form
5. Verify redirect to dashboard with welcome message
6. Verify profile icon appears in top-right corner

**Expected Results**:
- ✅ Registration succeeds with 201 status
- ✅ JWT access token and refresh token received
- ✅ Dashboard displays with empty state message
- ✅ Profile dropdown shows user email and display name

**Alternative**: OAuth Login
1. Click "Sign in with GitHub" button
2. Complete GitHub OAuth flow
3. Verify redirect to dashboard

---

### Scenario 2: Create Team & Invite Member
**Validates**: FR-028, Team multi-tenancy

**Steps**:
1. From dashboard, click "Create Team" button
2. Enter team name: `Acme Corp`, slug: `acme-corp`, description: `Dev team`
3. Submit form
4. Verify team created and appears in teams list
5. Click on team to view team page
6. Click "Invite Member" button
7. Enter email: `member@vibecode.dev`, role: `developer`
8. Submit invitation
9. Verify member appears in team members list with "Pending" status

**Expected Results**:
- ✅ Team created with 201 status
- ✅ Current user is team admin
- ✅ Invitation sent (email or notification)
- ✅ Team page displays correctly

---

### Scenario 3: Create Project
**Validates**: FR-007, FR-009

**Steps**:
1. From dashboard, click "New Project" button
2. Enter project name: `My Web App`, slug: `my-web-app`, description: `React application`
3. Select owner: `Personal` (or choose team if available)
4. Submit form
5. Verify project created and appears in projects list
6. Click on project to view project page

**Expected Results**:
- ✅ Project created with 201 status
- ✅ Project appears in sidebar and dashboard
- ✅ Project page displays with empty environments message

---

### Scenario 4: Create Development Environment
**Validates**: FR-001, FR-006

**Steps**:
1. From project page, click "Create Environment" button
2. Fill environment wizard:
   - Name: `Development`
   - Slug: `dev`
   - Base image: `node:20`
   - Ports: Add `3000` → `3000` (TCP)
   - Environment variables: Add `NODE_ENV` = `development`
   - Extensions: Select `ms-python.python`, `dbaeumer.vscode-eslint`
3. Submit form
4. Verify environment created with status "stopped"
5. Verify environment card appears in project page

**Expected Results**:
- ✅ Environment created with 201 status
- ✅ Environment status shows "stopped"
- ✅ Configuration saved (ports, env vars visible on detail page)
- ✅ Selected extensions marked for installation

---

### Scenario 5: Start Environment & View Logs
**Validates**: FR-002, FR-005, FR-010, FR-011, FR-012

**Steps**:
1. From environment card, click "Start" button
2. Observe status change: `stopped` → `starting` → `running`
3. Verify log viewer automatically appears
4. Observe container startup logs streaming in real-time
5. Verify timestamps appear on each log line
6. Verify log lines have color coding (stdout vs stderr)
7. Scroll up in log viewer and verify historical logs loaded

**Expected Results**:
- ✅ Environment starts successfully within 5 seconds
- ✅ Status updates in real-time (WebSocket connection)
- ✅ Logs stream continuously with timestamps
- ✅ No log lines dropped or duplicated
- ✅ Log viewer scrollbar indicates more historical logs available

---

### Scenario 6: Install VS Code Extension
**Validates**: FR-014, FR-015, FR-017, FR-018

**Steps**:
1. From running environment detail page, click "Extensions" tab
2. Verify 2 extensions show status "pending" or "installing"
3. Wait for installations to complete (status changes to "installed")
4. Click "Add Extension" button
5. Search for `ms-python.python`
6. Click "Install" on search result
7. Verify extension status changes: `pending` → `installing` → `installed`
8. Verify extension appears in installed extensions list

**Expected Results**:
- ✅ Initial extensions from environment creation are installed
- ✅ Extension search returns relevant results
- ✅ Installation completes successfully within 30 seconds
- ✅ Extension status updates in real-time
- ✅ Installed extensions list is accurate

---

### Scenario 7: Open Embedded Terminal
**Validates**: FR-022, FR-023, FR-024

**Steps**:
1. From running environment detail page, click "Terminal" tab
2. Verify terminal emulator loads and connects
3. Type command: `node --version` + Enter
4. Verify Node.js version output appears
5. Type command: `pwd` + Enter
6. Verify working directory path appears
7. Test terminal features:
   - Copy text: Select text and Ctrl+C/Cmd+C
   - Paste text: Ctrl+V/Cmd+V
   - Resize: Drag window edge or adjust browser width
8. Type `exit` and verify terminal reconnects

**Expected Results**:
- ✅ Terminal connects within 2 seconds
- ✅ Commands execute and output appears correctly
- ✅ ANSI colors and formatting work
- ✅ Copy/paste works as expected
- ✅ Terminal resizes without breaking layout
- ✅ Terminal reconnects after `exit`

---

### Scenario 8: Manage tmux Session
**Validates**: FR-019, FR-020, FR-021

**Steps**:
1. From environment detail page, click "Sessions" tab
2. Verify auto-created session appears (type: `shell`, status: `active`)
3. Click "Create Session" button
4. Select type: `tmux`, name: `dev-session`
5. Submit form
6. Verify tmux session created and appears in sessions list
7. Click "Attach" button on tmux session
8. Verify terminal connects to tmux session (shows tmux status bar at bottom)

**Expected Results**:
- ✅ Auto-created session visible on environment start
- ✅ New tmux session created successfully
- ✅ Sessions list updates in real-time
- ✅ Can attach to tmux session from UI
- ✅ Tmux status bar visible in terminal

---

### Scenario 9: Stop Environment
**Validates**: FR-003

**Steps**:
1. From environment detail page, click "Stop" button
2. Observe status change: `running` → `stopping` → `stopped`
3. Verify log stream disconnects gracefully (shows "Environment stopped" message)
4. Verify terminal closes with message "Environment stopped"
5. Verify sessions list shows all sessions as "terminated"

**Expected Results**:
- ✅ Environment stops within 10 seconds
- ✅ Status updates in real-time
- ✅ WebSocket connections close gracefully
- ✅ UI shows appropriate "stopped" state
- ✅ No error messages in console

---

### Scenario 10: Environment Restart & Session Recovery
**Validates**: FR-037, FR-021 (session recovery)

**Steps**:
1. Start environment again (click "Start" button)
2. Observe environment returns to "running" status
3. Check sessions list - verify sessions are recreated
4. Click "Terminal" tab and verify new terminal session connects
5. Check logs - verify container startup logs appear
6. Verify tmux session can be recreated manually if needed

**Expected Results**:
- ✅ Environment restarts successfully
- ✅ Sessions recreated automatically (shell session)
- ✅ Terminal connects to new session
- ✅ tmux sessions require manual recreation (by design)
- ✅ Logs show clean startup

---

### Scenario 11: Filter Environments by Project
**Validates**: FR-008

**Steps**:
1. Create second project: `Backend API`
2. Create environment in second project: `API Development`
3. Navigate to dashboard
4. Verify both projects visible in sidebar
5. Click on first project - verify only first project's environments shown
6. Click on second project - verify only second project's environments shown
7. Click "All Environments" - verify all environments from all projects shown

**Expected Results**:
- ✅ Project filtering works correctly
- ✅ Environment counts accurate per project
- ✅ "All Environments" view shows everything
- ✅ Filter state persists on page refresh

---

### Scenario 12: Collaborative Access (Team Environment)
**Validates**: FR-028 (multi-user collaboration)

**Setup**: Requires two user accounts or browser sessions

**Steps**:
1. User A creates team-owned project and environment
2. User A starts environment and opens terminal
3. User A invites User B to team as "developer"
4. User B accepts invitation and navigates to team project
5. User B clicks on same environment
6. User B observes environment status "running" (real-time sync)
7. User B opens terminal
8. User A types command in terminal
9. User B observes command echo in their terminal (shared tmux session)

**Expected Results**:
- ✅ User B can see team environments
- ✅ Status syncs in real-time between users
- ✅ Both users can access same environment
- ✅ Terminal sessions can be shared (tmux)
- ✅ Logs visible to both users

---

### Scenario 13: Delete Environment
**Validates**: FR-004

**Steps**:
1. From environment detail page, click "Delete" button
2. Confirm deletion in modal dialog
3. Verify environment removed from project page
4. Verify Docker container deleted (backend verifies via dockerode)
5. Attempt to access deleted environment by URL
6. Verify 404 error or redirect to project page

**Expected Results**:
- ✅ Environment deleted successfully
- ✅ Docker container removed
- ✅ Database record removed
- ✅ UI updates immediately
- ✅ No orphaned resources

---

### Scenario 14: Error Handling - Port Conflict
**Validates**: FR-036

**Steps**:
1. Create first environment with port mapping `8080` → `8080`
2. Start first environment successfully
3. Create second environment with same port mapping `8080` → `8080`
4. Attempt to start second environment
5. Verify error message displayed: "Port 8080 already in use"
6. Verify environment status changes to "error"
7. Verify error details visible in environment detail page

**Expected Results**:
- ✅ First environment starts successfully
- ✅ Second environment fails to start
- ✅ Clear error message displayed
- ✅ Environment status shows "error"
- ✅ User can edit port mapping and retry

---

### Scenario 15: Log Retention & Cleanup
**Validates**: FR-013

**Setup**: Requires logs older than 7 days (or configured retention period)

**Steps**:
1. Query API for logs from stopped environment: `GET /api/v1/environments/{id}/logs?since=8_days_ago`
2. Verify no logs returned (cleaned up)
3. Query logs from last 6 days
4. Verify logs returned successfully
5. Check database log entry count
6. Verify total log size per environment < 20MB

**Expected Results**:
- ✅ Logs older than 7 days deleted
- ✅ Recent logs retained
- ✅ Log rotation enforced at 20MB per environment
- ✅ Cleanup runs automatically (cron job)

---

## Performance Validation

### API Response Times
**Validates**: FR-032 (sub-second API response)

**Test**: Use browser DevTools Network tab or `curl` with timing

```bash
# List environments
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/v1/environments

# Expected: < 1000ms
```

**Endpoints to Test**:
- `GET /environments`: < 500ms (without log data)
- `POST /environments`: < 1000ms (container creation excluded)
- `POST /environments/{id}/start`: < 2000ms (container startup excluded)
- `GET /environments/{id}/logs`: < 500ms (100 log lines)

### Dashboard Load Time
**Validates**: FR-032 (sub-second UI response)

**Steps**:
1. Open browser DevTools Performance tab
2. Navigate to dashboard
3. Measure "First Contentful Paint" and "Time to Interactive"

**Expected**:
- First Contentful Paint: < 1000ms
- Time to Interactive: < 2000ms

### WebSocket Latency
**Validates**: Real-time log streaming

**Steps**:
1. Open environment with running container
2. In terminal, run: `for i in {1..100}; do echo "Line $i"; done`
3. Observe log viewer

**Expected**:
- ✅ All 100 lines appear within 2 seconds
- ✅ No lines dropped or out of order
- ✅ Latency < 100ms per log line

---

## Security Validation

### Authentication Required
**Steps**:
1. Open private/incognito browser window
2. Attempt to access `http://localhost:5173/dashboard`
3. Verify redirect to login page
4. Attempt API call without token: `curl http://localhost:3000/api/v1/environments`
5. Verify 401 Unauthorized response

### Authorization Enforcement
**Steps**:
1. User A creates personal project and environment
2. User B attempts to access User A's environment via API
3. Verify 403 Forbidden response
4. User B attempts to access via URL
5. Verify redirect or 404 error

### SQL Injection Prevention
**Steps**:
1. Create project with name: `Test'; DROP TABLE users; --`
2. Verify project created successfully (name stored as-is)
3. Query database directly to confirm `users` table still exists
4. Search for project via API with SQL injection attempt in query param
5. Verify no error and database integrity maintained

---

## Cleanup

After completing validation:

```bash
# Stop all test environments
curl -X POST http://localhost:3000/api/v1/environments/{id}/stop

# Delete test data
curl -X DELETE http://localhost:3000/api/v1/projects/{id}

# Or use UI to delete projects (cascades to environments)
```

---

## Validation Checklist

### Core Functionality
- [ ] User registration and login work
- [ ] OAuth login (GitHub/Google) works
- [ ] Teams can be created and members invited
- [ ] Projects can be created (personal and team-owned)
- [ ] Environments can be created with custom config
- [ ] Environments start and stop successfully
- [ ] Status updates in real-time
- [ ] Logs stream correctly with timestamps

### Extensions & Sessions
- [ ] Extensions install successfully
- [ ] Extensions appear in installed list
- [ ] Sessions auto-created on environment start
- [ ] Manual tmux sessions can be created
- [ ] Sessions terminate on environment stop

### Terminal & Interactivity
- [ ] Embedded terminal connects and works
- [ ] Commands execute correctly
- [ ] Copy/paste works
- [ ] Terminal resizes properly
- [ ] ANSI colors render correctly

### Multi-User & Collaboration
- [ ] Team members can see shared environments
- [ ] Status syncs between users in real-time
- [ ] Collaborative terminal access works (tmux)

### Error Handling
- [ ] Port conflicts detected and reported
- [ ] Invalid input rejected with clear errors
- [ ] Docker daemon errors handled gracefully
- [ ] Network interruptions handled (reconnect)

### Performance
- [ ] API response times < 1s
- [ ] Dashboard loads in < 2s
- [ ] Log streaming latency < 100ms
- [ ] No memory leaks over extended use

### Security
- [ ] Authentication required for all routes
- [ ] Authorization enforced (users can't access others' resources)
- [ ] SQL injection prevented
- [ ] XSS prevention in log viewer and terminal

---

## Troubleshooting

### Environment fails to start
- Check Docker daemon is running: `docker ps`
- Check backend logs for errors
- Verify port availability: `netstat -an | grep <port>`
- Check database connection

### Logs not streaming
- Verify WebSocket connection in browser DevTools (Network → WS)
- Check for CORS errors in console
- Verify environment is running status
- Try refreshing browser

### Terminal not connecting
- Verify container has shell available (`/bin/bash` or `/bin/sh`)
- Check WebSocket connection
- Verify no firewall blocking WS traffic
- Check backend logs for exec errors

### Performance issues
- Check Docker resource usage: `docker stats`
- Verify PostgreSQL query performance
- Check for memory leaks in browser DevTools
- Monitor backend process CPU/memory

---

## Success Criteria

✅ **Implementation is validated** when:
- All 15 validation scenarios pass
- All checklist items checked
- Performance targets met
- Security tests pass
- No critical bugs found

**Next Steps**: Proceed to production deployment or additional testing phases.
