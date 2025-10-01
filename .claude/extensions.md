# VibeBox VS Code Extension Management

> **Task T192**: Extension installation, registry management, and troubleshooting

## 📋 Overview

VibeBox provides seamless VS Code extension management for your development environments. Install, update, and manage extensions directly from the VibeBox dashboard without manually configuring VS Code Server.

## 🎯 What are VS Code Extensions?

VS Code extensions add functionality to your development environment:

- **Language Support**: Python, Go, Rust, etc.
- **Linting & Formatting**: ESLint, Prettier, Black
- **Git Integration**: GitLens, Git Graph
- **Debugging**: Language-specific debuggers
- **Themes**: Color themes and icon packs
- **Productivity**: Code snippets, IntelliSense enhancements

## 🚀 Installing Extensions

### Via VibeBox UI

**During Environment Creation**:

1. Navigate to project
2. Click "Create Environment"
3. Go to "Extensions" step in wizard
4. Search for extensions
5. Click "Add" for desired extensions
6. Complete environment creation
7. Extensions auto-install when environment starts

**In Running Environment**:

1. Navigate to environment
2. Click "Extensions" tab
3. Click "Add Extension"
4. Search VS Code Marketplace
5. Click "Install" on desired extension
6. Wait for installation to complete

### Via API

```bash
# Install extension
curl -X POST http://localhost:3000/api/v1/environments/{environmentId}/extensions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"extensionId":"ms-python.python"}'
```

**Response**:
```json
{
  "id": "install-uuid",
  "environmentId": "env-uuid",
  "extension": {
    "extensionId": "ms-python.python",
    "name": "Python",
    "publisher": "ms-python"
  },
  "status": "pending",
  "createdAt": "2025-10-01T12:00:00.000Z"
}
```

## 📦 Popular Extensions

### Language Support

**Python**:
```
ms-python.python           # Python language support
ms-python.vscode-pylance   # Fast, feature-rich Python support
```

**JavaScript/TypeScript**:
```
dbaeumer.vscode-eslint     # ESLint integration
esbenp.prettier-vscode     # Prettier code formatter
```

**Go**:
```
golang.go                  # Go language support
```

**Rust**:
```
rust-lang.rust-analyzer    # Rust language server
```

**Docker**:
```
ms-azuretools.vscode-docker  # Docker support
```

### Productivity

```
eamodio.gitlens            # Enhanced Git integration
mhutchie.git-graph         # Git graph visualization
formulahendry.code-runner  # Run code snippets
gruntfuggly.todo-tree      # TODO comment tracking
```

### Themes

```
github.github-vscode-theme      # GitHub theme
dracula-theme.theme-dracula     # Dracula theme
pkief.material-icon-theme       # Material icon theme
```

## 🔍 Searching for Extensions

### Via VibeBox UI

Search supports:
- **Extension name**: "Python", "ESLint"
- **Publisher**: "ms-python", "dbaeumer"
- **Functionality**: "linting", "debugging"

### Via VS Code Marketplace

Browse: https://marketplace.visualstudio.com/vscode

Find extension ID in URL:
```
https://marketplace.visualstudio.com/items?itemName=ms-python.python
                                                       ^^^^^^^^^^^^^^^
                                                       Extension ID
```

## 📊 Extension Status

Extensions can have the following statuses:

| Status | Description | Action |
|--------|-------------|--------|
| `pending` | Queued for installation | Wait |
| `installing` | Currently being installed | Wait |
| `installed` | Successfully installed | Ready to use |
| `failed` | Installation failed | Retry or check logs |
| `uninstalling` | Being removed | Wait |

### Monitoring Installation

**Via UI**:
- Check "Extensions" tab
- Real-time status updates
- Error messages if failed

**Via API**:
```bash
# Get installed extensions
curl http://localhost:3000/api/v1/environments/{environmentId}/extensions \
  -H "Authorization: Bearer $TOKEN"
```

## 🗑️ Uninstalling Extensions

### Via VibeBox UI

1. Navigate to environment "Extensions" tab
2. Find extension in installed list
3. Click "Uninstall"
4. Confirm removal
5. Wait for uninstallation to complete

### Via API

```bash
# Uninstall extension
curl -X DELETE http://localhost:3000/api/v1/environments/{environmentId}/extensions/{extensionInstallId} \
  -H "Authorization: Bearer $TOKEN"
```

## 🔄 Updating Extensions

**Automatic Updates**: Extensions auto-update when new versions are available (configurable)

**Manual Update**:
1. Uninstall old version
2. Install latest version

**Coming Soon**: Dedicated update button in UI

## 🏢 Custom Extension Registry

VibeBox supports custom (non-marketplace) extensions for:
- **Internal tools**: Company-specific extensions
- **Private extensions**: Not published to marketplace
- **Custom forks**: Modified public extensions

### Adding Custom Extension

**Via API**:

```bash
# 1. Register custom extension in catalog
curl -X POST http://localhost:3000/api/v1/extensions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "extensionId": "mycompany.internal-tool",
    "name": "Internal Tool",
    "version": "1.0.0",
    "publisher": "mycompany",
    "isCustom": true,
    "downloadUrl": "https://internal.example.com/extensions/internal-tool-1.0.0.vsix"
  }'

# 2. Install in environment (same as marketplace extension)
curl -X POST http://localhost:3000/api/v1/environments/{environmentId}/extensions \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"extensionId":"mycompany.internal-tool"}'
```

### Custom Extension Requirements

**VSIX File Format**:
- Extensions must be packaged as `.vsix` files
- Use `vsce package` to create VSIX

**Download URL**:
- Must be accessible from environment
- HTTPS recommended
- Support authentication if needed

## ⚙️ Extension Configuration

### Workspace Settings

Extensions can be configured via environment variables:

```bash
# Set via VibeBox API
curl -X POST http://localhost:3000/api/v1/environments/{environmentId}/variables \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "key": "VSCODE_PYTHON_PATH",
    "value": "/usr/local/bin/python3.11"
  }'
```

### Settings.json

Create `.vscode/settings.json` in your environment's workspace:

```json
{
  "python.defaultInterpreterPath": "/usr/local/bin/python3.11",
  "eslint.enable": true,
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## 🔐 Extension Security

### Trusted Extensions

VibeBox allows extensions from:
- ✅ Official VS Code Marketplace
- ✅ Verified publishers
- ✅ Custom registry (admin-configured)

### Security Considerations

**Extension Permissions**:
- Extensions run inside environment container
- Isolated from other environments
- No access to host system

**Best Practices**:
- Only install extensions you trust
- Review publisher and ratings
- Check download count
- Read extension documentation

## 📈 Extension Performance

### Resource Impact

Extensions can affect environment performance:

**CPU Usage**: Language servers, linters
**Memory Usage**: IntelliSense, indexing
**Startup Time**: Many extensions = slower start

### Performance Tips

1. **Install only what you need**: Remove unused extensions
2. **Disable heavy extensions**: When not actively developing
3. **Use language-specific environments**: Don't install Python extensions in Go environment
4. **Monitor resource usage**: Via environment dashboard

## 🐛 Troubleshooting

### Extension Installation Failed

**Possible Causes**:
- Network connectivity issues
- Invalid extension ID
- Version compatibility
- Insufficient disk space

**Solutions**:

1. **Check extension ID**:
   ```bash
   # Verify extension exists
   curl "https://marketplace.visualstudio.com/items?itemName=ms-python.python"
   ```

2. **Retry installation**:
   Uninstall and reinstall

3. **Check logs**:
   Environment logs show installation errors

4. **Check disk space**:
   Environment storage limit reached?

### Extension Not Working

**Solutions**:

1. **Reload environment**: Restart environment
2. **Check extension requirements**: Some extensions need specific base images
3. **Verify configuration**: Check environment variables and settings.json
4. **Update extension**: Try latest version

### Extension Conflicts

**Symptoms**:
- Slow performance
- Errors in output
- Features not working

**Solutions**:
- Disable conflicting extensions
- Use one formatter/linter per language
- Check extension documentation for known conflicts

### Custom Extension Not Found

**Solutions**:

1. **Verify download URL**: Accessible from environment?
2. **Check authentication**: Download URL requires auth?
3. **Validate VSIX**: Valid extension package?

## 💡 Best Practices

### Extension Organization

**By Environment Type**:

```
# Frontend Environment
- ESLint
- Prettier
- React snippets
- Tailwind CSS IntelliSense

# Backend Environment
- Python
- Pylance
- Docker
- Database clients

# DevOps Environment
- Docker
- Kubernetes
- Terraform
- YAML
```

### Extension Sets (Templates)

Create environment templates with pre-configured extensions:

**Web Development Template**:
```
- dbaeumer.vscode-eslint
- esbenp.prettier-vscode
- bradlc.vscode-tailwindcss
- formulahendry.auto-rename-tag
```

**Python Data Science Template**:
```
- ms-python.python
- ms-python.vscode-pylance
- ms-toolsai.jupyter
- ms-toolsai.vscode-jupyter-cell-tags
```

### Version Management

**Pin versions** for reproducible environments:
- Document extension versions
- Use same versions across team
- Test updates in staging environment first

## 📚 Extension Development

### Creating Custom Extensions

VibeBox supports custom extension development:

1. **Develop locally**: Use VS Code Extension Generator
2. **Package**: `vsce package`
3. **Upload**: To your extension registry
4. **Register**: Add to VibeBox catalog
5. **Install**: In your environments

**Resources**:
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Extension Samples](https://github.com/microsoft/vscode-extension-samples)

### Publishing to Marketplace

For public extensions:

1. Create publisher account
2. Package extension: `vsce package`
3. Publish: `vsce publish`
4. Extension appears in VibeBox search

## 🔗 Related Documentation

- **[Quick Start Guide](./quick_start.md)** - Environment setup
- **[API Reference](./api_reference.md)** - Extension API endpoints
- **[FAQ](./faq.md)** - Common questions
- **[Troubleshooting](./faq.md#extension-issues)** - Extension problems

---

## Quick Reference

### Common Extension IDs

```
# Languages
ms-python.python                  # Python
golang.go                         # Go
rust-lang.rust-analyzer           # Rust
ms-vscode.cpptools                # C/C++

# Linting/Formatting
dbaeumer.vscode-eslint            # ESLint
esbenp.prettier-vscode            # Prettier
ms-python.black-formatter         # Black (Python)

# Git
eamodio.gitlens                   # GitLens
mhutchie.git-graph                # Git Graph

# Docker/Kubernetes
ms-azuretools.vscode-docker       # Docker
ms-kubernetes-tools.vscode-kubernetes-tools  # Kubernetes

# Productivity
gruntfuggly.todo-tree             # TODO tracking
streetsidesoftware.code-spell-checker  # Spell checker
```

### Installation Commands

```bash
# Install extension
POST /api/v1/environments/{id}/extensions
{"extensionId": "ms-python.python"}

# List installed
GET /api/v1/environments/{id}/extensions

# Uninstall
DELETE /api/v1/environments/{id}/extensions/{installId}

# Search marketplace
GET /api/v1/extensions?query=python
```

---

**Extend your environment, extend your productivity!** 🧩
