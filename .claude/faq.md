# VibeBox FAQ - Frequently Asked Questions

> **Task T194**: Common questions and troubleshooting guide

## 📋 General Questions

### What is VibeBox?

VibeBox is a production-ready developer dashboard that enables teams to create, manage, and collaborate on Docker-based development environments through a unified web interface.

**Key Features**:
- Docker-based isolated environments
- Real-time log streaming and terminal access
- VS Code extension management
- Team collaboration with role-based access
- tmux session support
- WebSocket-powered live updates

---

### How is VibeBox different from other solutions?

| Feature | VibeBox | Gitpod | GitHub Codespaces |
|---------|---------|--------|-------------------|
| Self-hosted | ✅ Yes | ❌ No | ❌ No |
| On-premise deployment | ✅ Yes | ❌ No | ❌ No |
| Custom Docker images | ✅ Yes | ✅ Yes | ⚠️ Limited |
| Team management | ✅ Full RBAC | ⚠️ Basic | ⚠️ Basic |
| Cost | Free (self-hosted) | Usage-based | Usage-based |
| Offline support | ✅ Yes | ❌ No | ❌ No |

---

### What does "vibe coded" mean?

**VibeBox was built using**:
- **Claude Code**: Anthropic's AI coding assistant
- **Spec Kit**: Contract-first development framework

This means the entire codebase was designed and implemented following Spec Kit principles with Claude Code's assistance, ensuring:
- Clean architecture
- Comprehensive documentation
- Test-driven development
- Contract-first API design

---

## 🚀 Getting Started

### What are the system requirements?

**Minimum**:
- Node.js 20+
- Docker
- PostgreSQL 16
- 8GB RAM
- 10GB disk space

**Recommended**:
- Node.js 20+
- Docker with 16GB allocated
- PostgreSQL 16
- 16GB RAM
- 50GB disk space (for multiple environments)

---

### How do I install VibeBox?

See the [Quick Start Guide](./quick_start.md) for detailed installation instructions.

**Quick version**:
```bash
# Clone repository
git clone <repository-url>
cd vibebox

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env

# Setup database
cd backend && npm run migrate && cd ..

# Start
npm run dev
```

---

### Can I use VibeBox without Docker?

No, Docker is a core requirement. VibeBox uses Docker containers to provide isolated development environments.

However, you can run VibeBox itself without Docker Compose by running backend and frontend separately:
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

---

## 🐳 Environment Management

### How many environments can I create?

**Default Limits**:
- 10 concurrent environments per user
- 1,000+ total environments per installation
- Configurable via backend settings

**Resource Limits Per Environment**:
- CPU: 0.1 to 8.0 cores (default: 2.0)
- Memory: 512MB to 16GB (default: 4GB)
- Storage: 1GB to 100GB (default: 20GB)

---

### What Docker images can I use?

Any public Docker image from Docker Hub or custom registries:

**Popular Choices**:
- `node:20` - Node.js development
- `python:3.11` - Python development
- `golang:1.21` - Go development
- `rust:latest` - Rust development
- Custom images with pre-installed tools

**Custom Images**: Build and push to your registry, then use in VibeBox

---

### How do I share an environment with my team?

**Option 1: Team-Owned Project**
1. Create a team
2. Create project owned by team
3. Create environment in project
4. All team members can access

**Option 2: Individual Sharing** (coming soon)
- Share individual environment with specific users

---

### Can I access my environment from outside VibeBox?

Yes, via port mappings:

1. Add port mapping when creating environment (e.g., 3000 → 3000)
2. Access via `http://localhost:3000` or server IP

**SSH Access**: Configure SSH keys in user profile for direct container access

---

## 🔧 Technical Questions

### What database does VibeBox use?

**PostgreSQL 16** for all metadata:
- User accounts and teams
- Projects and environments
- Sessions and extensions
- Log entries (with retention)

**Why PostgreSQL?**:
- ACID compliance
- JSON/JSONB support
- Row-level security
- Excellent performance

---

### How are logs stored?

**Storage**:
- PostgreSQL database (configurable)
- 7-day retention (default)
- 20MB per environment limit

**Streaming**:
- Real-time via WebSocket
- Historical via REST API

**Cleanup**:
- Automatic daily cleanup
- FIFO rotation when size limit reached

---

### What authentication methods are supported?

**Current**:
- Email/Password (bcrypt-hashed)
- OAuth (GitHub, Google)

**Coming Soon**:
- SAML/SSO
- LDAP/Active Directory
- Multi-factor authentication (MFA)

---

### Is VibeBox production-ready?

**Yes**, VibeBox is designed for production use with:
- Comprehensive error handling
- Security best practices
- Performance optimization
- Automated testing (contract, integration, E2E)

**However**, as with any self-hosted solution:
- Configure security properly (.env secrets, TLS, etc.)
- Regular backups of PostgreSQL database
- Monitor resource usage
- Keep dependencies updated

---

## 🐛 Troubleshooting

### Environment fails to start

**Common Causes**:

1. **Port conflict**:
   - Error: "Port already in use"
   - Solution: Change host port or stop conflicting service

2. **Invalid Docker image**:
   - Error: "Image not found"
   - Solution: Verify image exists on Docker Hub

3. **Resource limits**:
   - Error: "Out of memory"
   - Solution: Increase environment memory limit or host resources

4. **Docker daemon not running**:
   - Error: "Cannot connect to Docker daemon"
   - Solution: Start Docker service

**Debugging**:
```bash
# Check Docker daemon
docker ps

# Check environment logs
# Via UI: Environment → Logs tab

# Check VibeBox backend logs
docker-compose logs backend
```

---

### Logs not streaming

**Possible Causes**:
- WebSocket connection failed
- Environment not running
- Firewall blocking WS traffic
- Browser extensions interfering

**Solutions**:
1. **Check WebSocket**: Browser DevTools → Network → WS
2. **Restart environment**: Stop and start again
3. **Check firewall**: Allow WebSocket connections
4. **Try different browser**: Rule out extension conflicts

---

### Terminal not connecting

**Solutions**:

1. **Verify environment is running**
2. **Check base image has shell**:
   ```bash
   # Test if shell exists
   docker exec <container_id> /bin/bash -c "echo test"
   ```
3. **Try different shell**:
   - `/bin/bash`
   - `/bin/sh`
   - `/bin/zsh`

4. **Check WebSocket logs** (browser console)

---

### Extension installation failed

**Common Causes**:
- Network connectivity
- Invalid extension ID
- Version incompatibility
- Disk space

**Solutions**:
1. **Verify extension ID**:
   ```
   https://marketplace.visualstudio.com/items?itemName=<extensionId>
   ```
2. **Check disk space**: Environment storage limit
3. **Retry**: Uninstall and reinstall
4. **Check logs**: Environment logs show errors

---

### Database connection failed

**Solutions**:

1. **Verify PostgreSQL is running**:
   ```bash
   psql -h <host> -U vibebox -d vibebox_dev -c "SELECT 1"
   ```

2. **Check DATABASE_URL** in `.env`:
   ```
   DATABASE_URL="postgresql://vibebox:password@host:5432/vibebox_dev?schema=public"
   ```

3. **Check network connectivity**:
   ```bash
   telnet <db_host> 5432
   ```

4. **Check PostgreSQL logs**

---

### Performance is slow

**Possible Causes**:
- Too many concurrent environments
- Insufficient host resources
- Large log volume
- Inefficient queries

**Solutions**:

1. **Reduce concurrent environments**: Stop unused ones
2. **Increase host resources**: More CPU/RAM
3. **Clean up logs**: Export and delete old logs
4. **Monitor resources**:
   ```bash
   # Docker stats
   docker stats

   # VibeBox metrics
   # Via UI: Dashboard → System Metrics
   ```

---

## 🔐 Security Questions

### Is my data secure?

**Yes**, VibeBox implements multiple security layers:

**Authentication**:
- Bcrypt password hashing
- JWT with short expiry (15 min)
- Refresh token rotation

**Authorization**:
- Role-based access control (RBAC)
- Row-level security in PostgreSQL
- Team-based permissions

**Data Protection**:
- Environment variables encrypted (AES-256)
- TLS in production (configure reverse proxy)
- Docker container isolation

**Best Practices**:
- Use strong JWT secrets
- Enable TLS/SSL
- Regular security updates
- Backup database regularly

---

### Can I use VibeBox in production for my company?

**Yes**, VibeBox is MIT licensed and can be used commercially.

**Recommendations for Production**:
- Deploy behind reverse proxy (nginx, Caddy)
- Enable TLS/SSL
- Configure OAuth for easier authentication
- Set up database backups
- Monitor system resources
- Review security settings in `.env`

---

### How do I report a security vulnerability?

**DO NOT** create a public GitHub issue.

**Instead**:
- Email: security@vibebox.dev
- Include: Description, reproduction steps, impact assessment
- We'll respond within 48 hours

See [Security Policy](../SECURITY.md) for details.

---

## 🎓 Usage Questions

### Can multiple users work in the same environment?

**Yes**, via tmux sessions:

1. User A creates environment and tmux session
2. User B (team member) navigates to same environment
3. User B attaches to same tmux session
4. Both users see the same terminal in real-time

Perfect for:
- Pair programming
- Debugging sessions
- Teaching/mentoring

---

### How do I backup my environment?

**Configuration Backup**:
- Environment settings stored in database
- Export via API or UI

**Data Backup**:
- Docker volumes persist across restarts
- Manual backup:
  ```bash
  docker cp <container_id>:/path/to/data ./backup
  ```

**Full Backup Strategy**:
1. Backup PostgreSQL database
2. Export environment configurations
3. Backup Docker volumes (if needed)

---

### Can I import existing Docker Compose projects?

**Not directly**, but you can:

1. Use same Docker image from docker-compose.yml
2. Add same environment variables
3. Add same port mappings
4. Install required extensions

**Coming Soon**: docker-compose.yml import wizard

---

## 📚 Additional Resources

- **[Quick Start Guide](./quick_start.md)** - Setup instructions
- **[API Reference](./api_reference.md)** - API documentation
- **[Development Workflow](./dev_workflow.md)** - Contributing guide
- **[tmux Guide](./tmux.md)** - Session management
- **[Extensions Guide](./extensions.md)** - VS Code extensions
- **[Logs Guide](./logs.md)** - Log management

---

## 📞 Still Need Help?

- **GitHub Issues**: [Open an issue](https://github.com/vibebox/vibebox/issues)
- **GitHub Discussions**: [Ask the community](https://github.com/vibebox/vibebox/discussions)
- **Email**: support@vibebox.dev

---

**Can't find your question?** Open a GitHub discussion and we'll add it to this FAQ!
