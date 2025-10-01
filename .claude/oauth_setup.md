# OAuth Provider Setup Guide

## Overview

### Why OAuth for VibeBox?

VibeBox uses OAuth 2.0 to provide secure, passwordless authentication through popular developer platforms. OAuth offers several benefits:

- **Enhanced Security**: No password storage or management required
- **Developer Experience**: Single sign-on with platforms developers already use
- **Trust**: Leverages established identity providers
- **Profile Data**: Automatically imports user display name and avatar
- **Reduced Friction**: One-click authentication for new users

### Supported Providers

VibeBox currently supports three OAuth providers:

1. **GitHub** - Recommended for developer tools (most detailed setup below)
2. **Google** - Broad compatibility for teams
3. **GitLab** - Open-source alternative to GitHub

### OAuth Flow Architecture

```
┌──────────┐                                    ┌───────────────┐
│  User    │                                    │   OAuth       │
│  Browser │                                    │   Provider    │
└────┬─────┘                                    └───────┬───────┘
     │                                                  │
     │ 1. Click "Login with GitHub"                    │
     │────────────────────────────────────────────────▶│
     │                                                  │
     │ 2. Redirect to provider login                   │
     │◀────────────────────────────────────────────────│
     │                                                  │
     │ 3. User authorizes VibeBox                      │
     │────────────────────────────────────────────────▶│
     │                                                  │
     │ 4. Redirect to callback with code               │
     │◀────────────────────────────────────────────────│
     │                                                  │
┌────▼─────┐                                           │
│ VibeBox  │  5. Exchange code for access token       │
│ Backend  │──────────────────────────────────────────▶│
└────┬─────┘                                           │
     │        6. Return access token                   │
     │◀────────────────────────────────────────────────│
     │                                                  │
     │ 7. Fetch user profile                           │
     │────────────────────────────────────────────────▶│
     │                                                  │
     │ 8. Return profile data                          │
     │◀────────────────────────────────────────────────│
     │                                                  │
     │ 9. Create/update user & generate JWT            │
     │                                                  │
┌────▼─────┐                                           │
│  User    │ 10. Return JWT tokens                     │
│  Browser │◀────────────────────────────────────────  │
└──────────┘                                           │
```

### Security Considerations

- **HTTPS Required**: OAuth callbacks must use HTTPS in production (except localhost)
- **Client Secret Protection**: Never expose client secrets in frontend code or version control
- **CSRF Protection**: OAuth state parameter prevents cross-site request forgery
- **Token Storage**: JWT tokens are stored in browser localStorage (consider httpOnly cookies for enhanced security)
- **Scope Minimization**: Request only the minimum OAuth scopes necessary

---

## GitHub OAuth Setup

### Step-by-Step GitHub App Creation

#### 1. Navigate to GitHub Developer Settings

1. Log in to GitHub
2. Click your profile picture (top-right) → **Settings**
3. Scroll down to **Developer settings** (left sidebar, near bottom)
4. Click **OAuth Apps** → **New OAuth App**

#### 2. Configure OAuth Application

Fill in the following fields:

| Field | Value (Development) | Value (Production) |
|-------|--------------------|--------------------|
| **Application name** | `VibeBox (Dev)` | `VibeBox` |
| **Homepage URL** | `http://localhost:5173` | `https://your-domain.com` |
| **Application description** | `VibeBox development environment manager (local dev)` | `Docker-based development environment management platform` |
| **Authorization callback URL** | `http://localhost:3000/api/v1/auth/oauth/github/callback` | `https://your-domain.com/api/v1/auth/oauth/github/callback` |

**Important Notes**:
- The callback URL must match exactly (including trailing slashes or lack thereof)
- For development, `http://localhost` is allowed without HTTPS
- For production, HTTPS is required
- You can register multiple callback URLs by creating separate OAuth apps

#### 3. Register Application

1. Click **Register application**
2. You'll be taken to the app settings page
3. **Client ID** is displayed immediately - copy this value
4. Click **Generate a new client secret**
5. **Client Secret** is shown once - copy this immediately (you cannot view it again)

**Screenshot Description**: The settings page shows a section titled "Client secrets" with a button labeled "Generate a new client secret". Below that, there's a "Client ID" field with a long alphanumeric string like `Iv1.a1b2c3d4e5f6g7h8`.

#### 4. Required Permissions/Scopes

VibeBox requires the following OAuth scopes from GitHub:

| Scope | Purpose | Required |
|-------|---------|----------|
| `user:email` | Access user's email address for account creation | Yes |
| `read:user` | Read user profile data (display name, avatar) | Yes |

**Note**: These scopes are automatically requested by the OAuth flow. No additional configuration needed in GitHub.

#### 5. Environment Variable Setup

Add the following to your `/workspace/.env` file:

```bash
# GitHub OAuth Configuration
GITHUB_CLIENT_ID="Iv1.a1b2c3d4e5f6g7h8"
GITHUB_CLIENT_SECRET="your-github-client-secret-here"
GITHUB_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/github/callback"
```

**Security Warning**: Never commit `.env` files to version control. Verify it's in `.gitignore`:

```bash
grep "^\.env$" .gitignore
```

#### 6. Testing the Integration

**Backend Test** (verify redirect):

```bash
# Start the backend server
cd /workspace/backend
npm run dev

# In another terminal, test the OAuth initiation endpoint
curl -i http://localhost:3000/api/v1/auth/oauth/github
```

Expected response:
```
HTTP/1.1 302 Found
Location: https://github.com/login/oauth/authorize?client_id=Iv1...&redirect_uri=http://localhost...&scope=user:email,read:user&state=...
```

**Frontend Test** (full flow):

1. Start both backend and frontend:
   ```bash
   cd /workspace
   npm run dev
   ```

2. Open browser to `http://localhost:5173`

3. Click "Login with GitHub" button

4. You should be redirected to GitHub's authorization page

5. Click "Authorize" to grant permissions

6. You should be redirected back to VibeBox and logged in

7. Check browser DevTools → Application → Local Storage:
   - `accessToken` should be present
   - `refreshToken` should be present

#### 7. Common Issues and Troubleshooting

##### Issue: "The redirect_uri MUST match the registered callback URL for this application"

**Cause**: Callback URL mismatch between GitHub settings and your environment variable.

**Solution**:
1. Compare the URLs character-by-character
2. Check for trailing slashes: `/callback` vs `/callback/`
3. Verify protocol: `http://` vs `https://`
4. Ensure port numbers match: `:3000` vs `:8000`

##### Issue: "Bad verification code" or "Invalid client_id"

**Cause**: Client ID or Client Secret is incorrect.

**Solution**:
1. Verify `GITHUB_CLIENT_ID` in `.env` matches GitHub OAuth app
2. Regenerate Client Secret in GitHub settings
3. Update `GITHUB_CLIENT_SECRET` in `.env`
4. Restart backend server: `npm run dev`

##### Issue: OAuth flow completes but no user data returned

**Cause**: GitHub account has private email address.

**Solution**:
GitHub users can make their email private. VibeBox handles this by:
1. Requesting `user:email` scope (grants access to private emails)
2. Fetching primary verified email from GitHub API
3. If no email found, authentication fails with clear error message

**Debugging Steps**:
```bash
# Check GitHub API response manually
curl -H "Authorization: Bearer <github-access-token>" \
  https://api.github.com/user/emails
```

##### Issue: "404 Not Found" when accessing OAuth endpoint

**Cause**: OAuth routes not registered or backend not running.

**Solution**:
1. Verify backend is running: `curl http://localhost:3000/health`
2. Check route registration in `/workspace/backend/src/api/routes/auth.routes.ts`
3. Verify FastifyPassport is configured in `/workspace/backend/src/server.ts`

##### Issue: CORS errors in browser console

**Cause**: Frontend origin not allowed by backend CORS policy.

**Solution**:
1. Update CORS configuration in backend to allow `http://localhost:5173`
2. Ensure credentials are included in fetch requests
3. Check browser Network tab for preflight OPTIONS requests

#### 8. Production Deployment Notes

When deploying to production:

1. **Create separate GitHub OAuth App** for production:
   - Use production domain in callback URL
   - Use HTTPS for all URLs
   - Generate new client secret (don't reuse dev secret)

2. **Update environment variables**:
   ```bash
   GITHUB_CLIENT_ID="<production-client-id>"
   GITHUB_CLIENT_SECRET="<production-client-secret>"
   GITHUB_CALLBACK_URL="https://yourdomain.com/api/v1/auth/oauth/github/callback"
   ```

3. **Enable additional security**:
   - Restrict OAuth app to organization members only (if applicable)
   - Enable IP allowlisting in GitHub settings
   - Monitor OAuth app usage in GitHub analytics

---

## Google OAuth Setup

### Step-by-Step Google Cloud Console Setup

#### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** (top navigation bar) → **New Project**
3. Enter project details:
   - **Project name**: `VibeBox` (or `VibeBox Dev` for development)
   - **Organization**: Select your organization or leave as "No organization"
   - **Location**: Keep default
4. Click **Create**

#### 2. Enable Google+ API

1. In the left sidebar, navigate to **APIs & Services** → **Library**
2. Search for "Google+ API" (used for profile data)
3. Click **Google+ API** → **Enable**

**Note**: Google+ was deprecated but the API is still required for OAuth profile access.

#### 3. Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Select **User Type**:
   - **Internal**: Only users in your Google Workspace organization (if applicable)
   - **External**: Any Google account user (recommended for VibeBox)
3. Click **Create**

**Fill in OAuth consent screen details**:

| Field | Value |
|-------|-------|
| **App name** | `VibeBox` |
| **User support email** | Your email address |
| **App logo** | (Optional) Upload VibeBox logo (120x120px) |
| **Application home page** | `http://localhost:5173` (dev) or `https://yourdomain.com` (prod) |
| **Application privacy policy link** | (Optional but recommended) |
| **Application terms of service link** | (Optional) |
| **Authorized domains** | `localhost` (dev) or `yourdomain.com` (prod) |
| **Developer contact information** | Your email address |

4. Click **Save and Continue**

#### 4. Configure Scopes

1. On the **Scopes** page, click **Add or Remove Scopes**
2. Select the following scopes:

| Scope | Description | Required |
|-------|-------------|----------|
| `.../auth/userinfo.email` | View your email address | Yes |
| `.../auth/userinfo.profile` | View your basic profile info | Yes |

**Note**: These are non-sensitive scopes and don't require Google verification for production use.

3. Click **Update** → **Save and Continue**

#### 5. Add Test Users (External User Type Only)

If you selected "External" user type and haven't published the app:

1. Click **Add Users**
2. Enter email addresses of users who should be able to test OAuth (including your own)
3. Click **Save and Continue**

**Note**: In production, you'll need to submit the app for verification or publish it to allow all users.

#### 6. Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Application type**: **Web application**
4. Configure web client:

| Field | Value (Development) | Value (Production) |
|-------|--------------------|--------------------|
| **Name** | `VibeBox Web Client (Dev)` | `VibeBox Web Client` |
| **Authorized JavaScript origins** | `http://localhost:5173` | `https://yourdomain.com` |
| **Authorized redirect URIs** | `http://localhost:3000/api/v1/auth/oauth/google/callback` | `https://yourdomain.com/api/v1/auth/oauth/google/callback` |

5. Click **Create**

6. **Copy credentials**:
   - **Client ID**: Looks like `123456789-abcdefg.apps.googleusercontent.com`
   - **Client Secret**: Looks like `GOCSPX-abcd1234efgh5678`

#### 7. Required Scopes

VibeBox requests these scopes during OAuth:

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/userinfo.email` | User's email address |
| `https://www.googleapis.com/auth/userinfo.profile` | Display name and avatar URL |

#### 8. Environment Variable Setup

Add to `/workspace/.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcd1234efgh5678"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/google/callback"
```

#### 9. Testing the Integration

**Initiate OAuth flow**:

```bash
# Test redirect endpoint
curl -i http://localhost:3000/api/v1/auth/oauth/google
```

Expected response:
```
HTTP/1.1 302 Found
Location: https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=email+profile&response_type=code
```

**Full integration test**:

1. Open `http://localhost:5173` in browser
2. Click "Login with Google"
3. Select Google account
4. Grant permissions
5. Verify redirect back to VibeBox with active session

#### 10. Common Issues

##### Issue: "Error 401: invalid_client"

**Cause**: Client ID or Client Secret mismatch.

**Solution**:
1. Verify credentials in Google Cloud Console → Credentials
2. Update `.env` file with correct values
3. Restart backend server

##### Issue: "Error 400: redirect_uri_mismatch"

**Cause**: Callback URL not registered in Google Cloud Console.

**Solution**:
1. Go to Google Cloud Console → Credentials → OAuth Client
2. Add exact callback URL to "Authorized redirect URIs"
3. Wait 5-10 minutes for changes to propagate
4. Retry OAuth flow

##### Issue: "Access blocked: This app's request is invalid"

**Cause**: Authorized JavaScript origin not configured.

**Solution**:
1. Add `http://localhost:5173` (or production domain) to "Authorized JavaScript origins"
2. Ensure no trailing slashes in origins

##### Issue: "403: access_denied" or "This app isn't verified"

**Cause**: App is in testing mode with external user type.

**Solution**:
- For development: Add user email to test users list
- For production: Submit app for Google verification (required for sensitive scopes only)

---

## GitLab OAuth Setup

### Step-by-Step GitLab Application Creation

#### 1. Navigate to GitLab Applications

**For GitLab.com** (SaaS):
1. Log in to [GitLab.com](https://gitlab.com)
2. Click your profile picture (top-right) → **Settings**
3. In left sidebar, click **Applications**

**For Self-Hosted GitLab**:
1. Log in to your GitLab instance
2. Click your profile picture → **Settings**
3. In left sidebar, click **Applications**

#### 2. Create New Application

Click **Add new application** and fill in:

| Field | Value (Development) | Value (Production) |
|-------|--------------------|--------------------|
| **Name** | `VibeBox (Dev)` | `VibeBox` |
| **Redirect URI** | `http://localhost:3000/api/v1/auth/oauth/gitlab/callback` | `https://yourdomain.com/api/v1/auth/oauth/gitlab/callback` |
| **Confidential** | ✅ Checked | ✅ Checked |
| **Scopes** | ✅ `read_user` | ✅ `read_user` |

**Important**: `Confidential` must be enabled for server-side OAuth flows.

#### 3. Register Application

1. Click **Save application**
2. You'll see the application details page with:
   - **Application ID**: Copy this (e.g., `a1b2c3d4e5f6...`)
   - **Secret**: Copy this immediately (shown only once)
   - **Callback URL**: Verify it matches your configuration

#### 4. Required Scopes

| Scope | Purpose | Required |
|-------|---------|----------|
| `read_user` | Read user profile, email, and basic information | Yes |

**Note**: `read_user` is the minimal scope needed for authentication. It provides:
- User ID
- Username
- Email address
- Display name
- Avatar URL

#### 5. Environment Variable Setup

Add to `/workspace/.env`:

```bash
# GitLab OAuth Configuration
GITLAB_CLIENT_ID="a1b2c3d4e5f6g7h8i9j0"
GITLAB_CLIENT_SECRET="your-gitlab-secret-here"
GITLAB_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/gitlab/callback"

# For self-hosted GitLab, also set:
GITLAB_URL="https://gitlab.yourcompany.com"  # Default: https://gitlab.com
```

#### 6. Testing the Integration

**Test OAuth redirect**:

```bash
curl -i http://localhost:3000/api/v1/auth/oauth/gitlab
```

Expected response:
```
HTTP/1.1 302 Found
Location: https://gitlab.com/oauth/authorize?client_id=...&redirect_uri=...&response_type=code&scope=read_user
```

**Full flow test**:

1. Navigate to `http://localhost:5173`
2. Click "Login with GitLab"
3. Authorize VibeBox
4. Verify successful authentication and user profile display

#### 7. Common Issues

##### Issue: "The redirect URI included is not valid"

**Cause**: Redirect URI mismatch.

**Solution**:
1. Go to GitLab → Settings → Applications
2. Verify **Redirect URI** matches exactly
3. Check for typos, trailing slashes, port numbers
4. Update and save

##### Issue: "401 Unauthorized" when exchanging code for token

**Cause**: Client secret is incorrect or application is not confidential.

**Solution**:
1. Verify `GITLAB_CLIENT_SECRET` in `.env`
2. Regenerate secret in GitLab if needed
3. Ensure **Confidential** checkbox is enabled

##### Issue: "Access denied" for self-hosted GitLab

**Cause**: Application not approved by GitLab admin.

**Solution**:
- For self-hosted GitLab with approval required:
  1. Contact GitLab administrator
  2. Request approval for your OAuth application
  3. Admin can approve in **Admin Area** → **Applications**

---

## Configuration Reference

### All Required Environment Variables

Create or update `/workspace/.env` with the following:

```bash
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Database Configuration
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATABASE_URL="postgresql://vibeboxuser:secure_password_here@localhost:5432/vibebox_dev?schema=public"
DATABASE_URL_TEST="postgresql://vibeboxuser:secure_password_here@localhost:5432/vibebox_test?schema=public"

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Backend Configuration
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BACKEND_PORT=3000
NODE_ENV=development

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Frontend Configuration
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# JWT Configuration
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="your-jwt-secret-here-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-here-min-32-chars"

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Encryption Configuration
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your-encryption-key-here-exactly-32-chars"

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GitHub OAuth (Optional)
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITHUB_CLIENT_ID="Iv1.a1b2c3d4e5f6g7h8"
GITHUB_CLIENT_SECRET="your-github-client-secret"
GITHUB_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/github/callback"

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Google OAuth (Optional)
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GOOGLE_CLIENT_ID="123456789-abcdefg.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abcd1234efgh5678"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/google/callback"

#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# GitLab OAuth (Optional)
#━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GITLAB_CLIENT_ID="a1b2c3d4e5f6g7h8i9j0"
GITLAB_CLIENT_SECRET="your-gitlab-secret"
GITLAB_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/gitlab/callback"
GITLAB_URL="https://gitlab.com"  # Or self-hosted instance URL
```

### Example .env File for Development

```bash
# Development configuration with all OAuth providers
DATABASE_URL="postgresql://vibeboxuser:devpassword123@localhost:5432/vibebox_dev?schema=public"
DATABASE_URL_TEST="postgresql://vibeboxuser:devpassword123@localhost:5432/vibebox_test?schema=public"

BACKEND_PORT=3000
NODE_ENV=development
FRONTEND_PORT=5173
VITE_API_URL=http://localhost:3000

JWT_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6"
JWT_REFRESH_SECRET="z6y5x4w3v2u1t0s9r8q7p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1"
ENCRYPTION_KEY="01234567890123456789012345678901"

GITHUB_CLIENT_ID="Iv1.abc123def456"
GITHUB_CLIENT_SECRET="github_client_secret_abc123"
GITHUB_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/github/callback"

GOOGLE_CLIENT_ID="123456789-abc123.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-abc123def456"
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/google/callback"

GITLAB_CLIENT_ID="abc123def456"
GITLAB_CLIENT_SECRET="gitlab_secret_abc123"
GITLAB_CALLBACK_URL="http://localhost:3000/api/v1/auth/oauth/gitlab/callback"
GITLAB_URL="https://gitlab.com"
```

### Production vs Development Differences

| Aspect | Development | Production |
|--------|-------------|------------|
| **Protocol** | `http://` allowed for localhost | `https://` required |
| **Secrets** | Can be simpler for testing | Must be cryptographically random (32+ chars) |
| **OAuth Apps** | Use separate "Dev" apps | Use dedicated production apps |
| **Callback URLs** | `localhost` with port numbers | Production domain without port |
| **CORS** | Allow `http://localhost:5173` | Restrict to production domain only |
| **Secret Storage** | `.env` file locally | Secret manager (AWS Secrets Manager, Vault, etc.) |
| **JWT Expiry** | Longer for convenience (15m/7d) | Shorter for security (5m/1d) |

### Multiple Provider Configuration

All three OAuth providers can be enabled simultaneously. Users can choose their preferred provider:

**Backend**: Providers are auto-detected based on environment variables:
- If `GITHUB_CLIENT_ID` exists, GitHub OAuth is enabled
- If `GOOGLE_CLIENT_ID` exists, Google OAuth is enabled
- If `GITLAB_CLIENT_ID` exists, GitLab OAuth is enabled

**Frontend**: OAuth buttons are shown dynamically based on enabled providers.

**Account Linking**: Users are matched by email address:
- If user logs in with GitHub (`user@example.com`)
- Then logs in with Google (same `user@example.com`)
- Both OAuth providers link to the same VibeBox account

---

## Testing OAuth Locally

### Using ngrok for Local Testing

OAuth providers require valid callback URLs. During development, use [ngrok](https://ngrok.com) to create a public HTTPS tunnel to your local backend:

#### 1. Install ngrok

```bash
# macOS
brew install ngrok

# Linux
snap install ngrok

# Or download from https://ngrok.com/download
```

#### 2. Create ngrok Account

1. Sign up at [https://ngrok.com/signup](https://ngrok.com/signup)
2. Get your auth token from dashboard
3. Configure ngrok:
   ```bash
   ngrok config add-authtoken <your-auth-token>
   ```

#### 3. Start ngrok Tunnel

```bash
# Tunnel backend port 3000
ngrok http 3000
```

Output:
```
Session Status                online
Account                       your-account (Plan: Free)
Version                       3.3.0
Region                        United States (us)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

#### 4. Update OAuth Application Callback URLs

Add the ngrok URL to your OAuth app settings:

**GitHub**:
- Callback URL: `https://abc123.ngrok.io/api/v1/auth/oauth/github/callback`

**Google**:
- Authorized redirect URI: `https://abc123.ngrok.io/api/v1/auth/oauth/google/callback`
- Authorized JavaScript origin: `https://abc123.ngrok.io`

**GitLab**:
- Redirect URI: `https://abc123.ngrok.io/api/v1/auth/oauth/gitlab/callback`

#### 5. Update Environment Variables

```bash
# Update callback URLs in .env
GITHUB_CALLBACK_URL="https://abc123.ngrok.io/api/v1/auth/oauth/github/callback"
GOOGLE_CALLBACK_URL="https://abc123.ngrok.io/api/v1/auth/oauth/google/callback"
GITLAB_CALLBACK_URL="https://abc123.ngrok.io/api/v1/auth/oauth/gitlab/callback"

# Update frontend API URL
VITE_API_URL="https://abc123.ngrok.io"
```

#### 6. Test OAuth Flow

1. Access frontend through ngrok: `https://abc123.ngrok.io`
2. Click OAuth login button
3. Complete authorization with provider
4. Verify successful authentication

**Note**: ngrok free tier URLs change on each restart. For persistent URLs, upgrade to paid plan.

### Debugging OAuth Issues

#### Enable Verbose Logging

Add to `/workspace/backend/src/services/auth.service.ts`:

```typescript
console.log('OAuth Profile Received:', profile);
console.log('User Lookup by Email:', profile.email);
console.log('User Created/Updated:', user);
```

#### Check Network Requests

1. Open browser DevTools → Network tab
2. Filter by "oauth" or "auth"
3. Inspect redirect chain:
   - Initial redirect to provider
   - Provider authorization page
   - Callback with authorization code
   - Token exchange
   - User data fetch
   - JWT token generation

#### Inspect Callback Parameters

The OAuth callback URL receives these parameters:

**Success**:
```
http://localhost:3000/api/v1/auth/oauth/github/callback?code=abc123def456&state=xyz789
```

**Error**:
```
http://localhost:3000/api/v1/auth/oauth/github/callback?error=access_denied&error_description=User%20denied%20access
```

#### Test with curl

**Simulate OAuth callback** (after getting code from provider):

```bash
curl -X GET "http://localhost:3000/api/v1/auth/oauth/github/callback?code=YOUR_AUTH_CODE&state=YOUR_STATE"
```

#### Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `redirect_uri_mismatch` | Callback URL doesn't match registered URL | Update OAuth app settings |
| `invalid_client` | Client ID/secret incorrect | Verify environment variables |
| `access_denied` | User canceled authorization | Normal user behavior, no action needed |
| `invalid_grant` | Authorization code expired or already used | Restart OAuth flow |
| `invalid_request` | Missing required parameter | Check OAuth URL construction |

---

## Security Best Practices

### 1. Client Secret Management

**Never expose client secrets**:
- ❌ Don't commit to version control
- ❌ Don't include in frontend code
- ❌ Don't log in application logs
- ❌ Don't share in screenshots or documentation

**Secure storage**:
- ✅ Store in environment variables
- ✅ Use secret managers in production (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rotate secrets periodically
- ✅ Use different secrets for dev/staging/prod

**Secret rotation procedure**:
1. Generate new secret in OAuth provider settings
2. Update environment variables with new secret
3. Restart application
4. Delete old secret after verifying new one works

### 2. Callback URL Restrictions

**Principle**: Only allow trusted callback URLs to prevent authorization code theft.

**Configuration**:
- Register exact callback URLs (including protocol, domain, path)
- Don't use wildcards in production
- Use separate OAuth apps for each environment
- Avoid URL shorteners or redirects

**Example attack prevented by strict callback URLs**:
```
Attacker registers OAuth app with callback: http://evil.com/steal
User clicks malicious link: https://github.com/login/oauth/authorize?client_id=ATTACKER_ID&redirect_uri=http://evil.com/steal
Authorization code sent to attacker's server
```

### 3. CORS Configuration

**Backend CORS setup** (`/workspace/backend/src/server.ts`):

```typescript
import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: [
    'http://localhost:5173', // Development frontend
    'https://yourdomain.com', // Production frontend
  ],
  credentials: true, // Allow cookies/auth headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

**Never use** in production:
```typescript
origin: '*' // ❌ Allows any domain to make requests
credentials: true // ❌ Combined with origin: '*' is a security risk
```

### 4. CSRF Protection

**State Parameter**: VibeBox uses OAuth `state` parameter to prevent CSRF attacks.

**How it works**:
1. Generate random state value before redirect
2. Store state in session or encrypted cookie
3. Include state in OAuth authorization URL
4. Provider echoes state back in callback
5. Verify received state matches stored state

**Implementation** (handled by Passport.js):

```typescript
// Passport automatically generates and verifies state parameter
passport.authenticate('github', {
  session: false,
  state: crypto.randomBytes(32).toString('hex'),
});
```

### 5. Token Storage

**Current implementation**: JWT tokens stored in browser localStorage.

**Pros**:
- Simple implementation
- Accessible from JavaScript
- Persists across page reloads

**Cons**:
- Vulnerable to XSS attacks
- Can't use httpOnly flag

**Recommended production enhancement**: Store tokens in httpOnly cookies.

**Migration to httpOnly cookies**:

```typescript
// Backend: Set JWT as httpOnly cookie
reply.setCookie('accessToken', jwt, {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: 'strict',
  maxAge: 900, // 15 minutes
  path: '/',
});

// Frontend: No localStorage needed, browser automatically sends cookie
// Token is included in all requests to same domain
```

### 6. Scope Minimization

**Principle**: Request only the minimum OAuth scopes necessary.

**VibeBox required scopes**:

| Provider | Scopes | Data Accessed |
|----------|--------|---------------|
| GitHub | `user:email`, `read:user` | Email, display name, avatar |
| Google | `userinfo.email`, `userinfo.profile` | Email, display name, avatar |
| GitLab | `read_user` | Email, display name, avatar |

**Avoid**:
- `repo` (GitHub) - Grants access to all repositories
- `admin:org` (GitHub) - Grants organization admin rights
- `https://www.googleapis.com/auth/drive` (Google) - Grants Drive access

**Audit scopes regularly**: Review OAuth scopes every 6 months and remove unused ones.

---

## FAQ

### Can users link multiple OAuth providers to one account?

**Yes**, users can link multiple OAuth providers to a single VibeBox account.

**How it works**:
1. User logs in with GitHub (email: `user@example.com`)
2. VibeBox creates account with GitHub profile data
3. User later clicks "Login with Google" (same email: `user@example.com`)
4. VibeBox matches email and updates existing account
5. User can now log in with either GitHub or Google

**Implementation**: See `/workspace/backend/src/services/auth.service.ts`:

```typescript
async handleOAuth(provider: OAuthProvider, profile: OAuthProfile): Promise<AuthResponse> {
  // Find existing user by email
  let user = await this.prisma.user.findUnique({
    where: { email: profile.email },
  });

  if (!user) {
    // Create new user
    user = await this.prisma.user.create({ ... });
  } else {
    // Update existing user profile data
    user = await this.prisma.user.update({ ... });
  }
  // ...
}
```

**Edge case**: If user changes email in OAuth provider, they'll need to manually update VibeBox email or contact support.

### How to migrate existing password-based users to OAuth?

**Approach 1: Allow both authentication methods** (Recommended)

Users can continue using password while adding OAuth:
1. User logs in with email/password
2. User navigates to Settings → Connected Accounts
3. User clicks "Connect GitHub" (or other provider)
4. User completes OAuth flow
5. Account is linked by matching email
6. User can now use either password or OAuth to log in

**Approach 2: Force OAuth migration**

1. Email users announcing OAuth requirement
2. Provide grace period (e.g., 30 days)
3. During grace period, show banner: "Migrate to OAuth by [date]"
4. After grace period, disable password authentication
5. Users must use OAuth to log in

**Implementation**: Add `oauthOnly` flag to User model:

```typescript
// Force OAuth login
if (user.oauthOnly && !user.passwordHash) {
  throw new UnauthorizedError('Please use OAuth to log in (GitHub/Google/GitLab)');
}
```

### What happens if the OAuth provider is down?

**Impact**: Users cannot log in via the affected OAuth provider.

**Mitigation strategies**:

1. **Support multiple OAuth providers**: Users can switch to alternative provider if primary is down.

2. **Allow password authentication**: Users with passwords can still log in.

3. **Display status message**: Show user-friendly error with alternatives:
   ```
   GitHub is currently unavailable.
   Try one of these alternatives:
   - Login with Google
   - Login with email and password
   - Check status: https://githubstatus.com
   ```

4. **Implement OAuth provider health checks**: Monitor provider availability and show warnings proactively.

5. **Cache user sessions**: If user has active session, they can continue using VibeBox even if OAuth provider is down.

**Historical downtime**:
- GitHub OAuth: 99.9% uptime (rare outages)
- Google OAuth: 99.95% uptime (very rare outages)
- GitLab OAuth: 99.5% uptime (self-hosted instances vary)

### What are the rate limiting considerations for OAuth?

**GitHub OAuth Rate Limits**:
- Unauthenticated requests: 60 per hour
- Authenticated requests: 5,000 per hour
- OAuth token exchange: No specific limit
- Applies per application

**Google OAuth Rate Limits**:
- Token endpoint: 10 requests per second per client
- UserInfo endpoint: Quotas set in Google Cloud Console (default: unlimited)
- OAuth consent screen: No specific limit

**GitLab OAuth Rate Limits**:
- GitLab.com: 300 requests per minute per user
- Self-hosted: Configurable by admin

**VibeBox implementation**:
- OAuth flows are rate-limited by VibeBox backend (10 requests per minute per IP)
- Provider rate limits are rarely hit (only during token exchange)
- User profile data is cached after initial fetch

**Avoid rate limits**:
- Cache user profile data in database
- Don't refresh OAuth tokens on every request
- Use VibeBox JWT tokens for authentication (not OAuth tokens)

### How do I test OAuth in CI/CD pipelines?

**Challenge**: CI/CD environments can't complete interactive OAuth flows.

**Solutions**:

**Approach 1: Mock OAuth responses** (Recommended for unit tests)

```typescript
// Mock Passport strategy in tests
import { AuthService } from '@/services/auth.service';

vi.mock('passport-github2', () => ({
  Strategy: vi.fn().mockImplementation((config, verify) => ({
    authenticate: () => {
      verify(null, null, {
        id: 'github-123',
        email: 'test@example.com',
        displayName: 'Test User',
      }, () => {});
    },
  })),
}));
```

**Approach 2: Use test OAuth applications**

Create dedicated OAuth apps for CI/CD:
- Set callback URLs to CI/CD environment
- Pre-authorize test accounts
- Use long-lived test tokens

**Approach 3: Skip OAuth tests in CI**

```typescript
describe('OAuth Integration', () => {
  it.skipIf(process.env.CI)('should authenticate with GitHub', async () => {
    // OAuth test that requires browser interaction
  });
});
```

**Approach 4: E2E testing with Playwright**

Playwright can automate OAuth flows:

```typescript
import { test } from '@playwright/test';

test('GitHub OAuth login', async ({ page }) => {
  await page.goto('http://localhost:5173/login');
  await page.click('text=Login with GitHub');

  // GitHub login page
  await page.fill('input[name="login"]', process.env.TEST_GITHUB_USERNAME);
  await page.fill('input[name="password"]', process.env.TEST_GITHUB_PASSWORD);
  await page.click('input[type="submit"]');

  // Authorize application (if needed)
  await page.click('button[name="authorize"]');

  // Verify redirect back to VibeBox
  await expect(page).toHaveURL('http://localhost:5173/dashboard');
});
```

**Best practice**: Use mock OAuth in unit tests, real OAuth in E2E tests (optional).

---

## Additional Resources

### Official Provider Documentation

**GitHub OAuth**:
- [Authorizing OAuth Apps](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub OAuth API Reference](https://docs.github.com/en/rest/apps/oauth-applications)
- [GitHub OAuth Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)

**Google OAuth**:
- [OAuth 2.0 Overview](https://developers.google.com/identity/protocols/oauth2)
- [Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Google OAuth Scopes](https://developers.google.com/identity/protocols/oauth2/scopes)

**GitLab OAuth**:
- [GitLab as an OAuth 2.0 Provider](https://docs.gitlab.com/ee/integration/oauth_provider.html)
- [GitLab OAuth 2.0 Applications](https://docs.gitlab.com/ee/api/oauth2.html)
- [GitLab OAuth Scopes](https://docs.gitlab.com/ee/integration/oauth_provider.html#authorized-applications)

### Related VibeBox Documentation

- **[Security Guide](./.claude/security.md)** - Secrets management and security best practices
- **[API Reference](./.claude/api_reference.md)** - Authentication endpoints and request/response formats
- **[Quick Start Guide](./.claude/quick_start.md)** - Initial setup and environment configuration
- **[Development Workflow](./.claude/dev_workflow.md)** - Testing and deployment practices

### Passport.js Resources

VibeBox uses Passport.js for OAuth integration:

- [Passport.js Documentation](http://www.passportjs.org/docs/)
- [passport-github2 Strategy](https://github.com/passport/passport-github2)
- [passport-google-oauth20 Strategy](https://github.com/passport/passport-google-oauth20)
- [passport-gitlab2 Strategy](https://github.com/passport/passport-gitlab2)

### Tools

- **ngrok**: [https://ngrok.com](https://ngrok.com) - Secure tunnels for local development
- **Postman**: [https://postman.com](https://postman.com) - API testing and OAuth flow debugging
- **JWT Debugger**: [https://jwt.io](https://jwt.io) - Decode and verify JWT tokens

---

**Last Updated**: 2025-10-01

**Maintainer**: VibeBox Team

**Questions?** Open an issue at [GitHub Repository](https://github.com/yourusername/vibebox/issues)
