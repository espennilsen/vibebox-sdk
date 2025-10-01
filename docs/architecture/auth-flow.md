# Authentication & Authorization Flow

## User Registration Flow

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Frontend
    participant API
    participant Validation
    participant AuthService
    participant DB
    participant Email as Email<br/>Service

    User->>Frontend: Fill Registration Form<br/>(email, password, displayName)
    Frontend->>Frontend: Client-side Validation

    Frontend->>API: POST /auth/register<br/>{email, password, displayName}

    API->>Validation: Validate Request Schema

    alt Validation Failed
        Validation-->>Frontend: 400 Bad Request<br/>{field errors}
        Frontend-->>User: Show Validation Errors
    end

    Validation->>AuthService: Register User

    AuthService->>DB: Check if email exists
    DB-->>AuthService: User count

    alt Email Already Exists
        AuthService-->>Frontend: 409 Conflict<br/>Email already registered
        Frontend-->>User: Show Error
    end

    AuthService->>AuthService: Hash Password (bcrypt)<br/>Rounds: 10

    AuthService->>DB: BEGIN TRANSACTION
    AuthService->>DB: INSERT INTO users<br/>(email, password_hash, display_name)
    DB-->>AuthService: User ID

    AuthService->>DB: INSERT default settings<br/>(notification_settings)
    AuthService->>DB: COMMIT TRANSACTION

    AuthService->>AuthService: Generate JWT Token<br/>Payload: {userId, email}

    AuthService->>AuthService: Generate Refresh Token

    AuthService->>DB: Store refresh token hash

    AuthService-->>API: {user, accessToken, refreshToken}

    opt Send Welcome Email
        API->>Email: Send Welcome Email
    end

    API-->>Frontend: 201 Created<br/>{user, accessToken, refreshToken}

    Frontend->>Frontend: Store tokens in localStorage
    Frontend-->>User: Redirect to Dashboard
```

## Login Flow (Email/Password)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Frontend
    participant API
    participant AuthService
    participant DB
    participant Cache as Redis<br/>Cache

    User->>Frontend: Enter Credentials<br/>(email, password)

    Frontend->>API: POST /auth/login<br/>{email, password}

    API->>AuthService: Authenticate User

    AuthService->>DB: SELECT * FROM users<br/>WHERE email = {email}
    DB-->>AuthService: User record

    alt User Not Found
        AuthService-->>Frontend: 401 Unauthorized<br/>Invalid credentials
        Frontend-->>User: Show Error
    end

    AuthService->>AuthService: Compare Password<br/>bcrypt.compare(password, hash)

    alt Password Invalid
        AuthService->>DB: Increment failed_login_attempts
        AuthService-->>Frontend: 401 Unauthorized<br/>Invalid credentials
        Frontend-->>User: Show Error
    end

    Note over AuthService,DB: Password Correct

    AuthService->>DB: UPDATE users<br/>SET last_login_at = NOW(),<br/>failed_login_attempts = 0

    AuthService->>AuthService: Generate JWT Access Token<br/>Expires: 15 minutes

    AuthService->>AuthService: Generate Refresh Token<br/>Expires: 7 days

    AuthService->>DB: Store refresh token hash

    AuthService->>Cache: Cache user session<br/>TTL: 15 minutes

    AuthService-->>API: {user, accessToken, refreshToken}

    API-->>Frontend: 200 OK<br/>{user, accessToken, refreshToken}

    Frontend->>Frontend: Store tokens in localStorage
    Frontend->>Frontend: Store user in context
    Frontend-->>User: Redirect to Dashboard
```

## OAuth Login Flow (GitHub/Google)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Frontend
    participant API
    participant OAuthProvider as OAuth Provider<br/>(GitHub/Google)
    participant AuthService
    participant DB

    User->>Frontend: Click "Sign in with GitHub"

    Frontend->>API: GET /auth/oauth/github

    API->>API: Generate OAuth state token<br/>(CSRF protection)

    API-->>Frontend: 302 Redirect<br/>Location: github.com/login/oauth/authorize?<br/>client_id={id}&<br/>redirect_uri={uri}&<br/>state={state}

    Frontend->>OAuthProvider: Redirect User

    User->>OAuthProvider: Authorize VibeBox

    OAuthProvider-->>Frontend: 302 Redirect<br/>Location: api.vibebox.com/auth/oauth/github/callback?<br/>code={code}&state={state}

    Frontend->>API: GET /auth/oauth/github/callback?<br/>code={code}&state={state}

    API->>API: Verify state token

    alt State Invalid
        API-->>Frontend: 400 Bad Request<br/>Invalid state
    end

    API->>OAuthProvider: POST /oauth/access_token<br/>{code, client_id, client_secret}

    OAuthProvider-->>API: {access_token}

    API->>OAuthProvider: GET /user<br/>Authorization: Bearer {access_token}

    OAuthProvider-->>API: {id, email, name, avatar_url}

    API->>AuthService: Find or Create User

    AuthService->>DB: SELECT * FROM users<br/>WHERE email = {email}

    alt User Exists
        AuthService->>DB: UPDATE users<br/>SET last_login_at = NOW()
    else User Not Found
        AuthService->>DB: INSERT INTO users<br/>(email, display_name, avatar_url)<br/>password_hash = NULL
    end

    AuthService->>AuthService: Generate JWT Tokens

    AuthService->>DB: Store refresh token

    AuthService-->>API: {user, accessToken, refreshToken}

    API-->>Frontend: 200 OK<br/>{user, accessToken, refreshToken}

    Frontend->>Frontend: Store tokens
    Frontend-->>User: Redirect to Dashboard
```

## Token Refresh Flow

```mermaid
sequenceDiagram
    autonumber
    participant Frontend
    participant API
    participant AuthService
    participant JWT as JWT<br/>Verification
    participant DB
    participant Cache

    Note over Frontend: Access token expired (after 15 min)

    Frontend->>API: Request with expired token

    API->>JWT: Verify Access Token
    JWT-->>API: Token Expired

    API-->>Frontend: 401 Unauthorized<br/>{error: 'token_expired'}

    Frontend->>Frontend: Detect token_expired error

    Frontend->>API: POST /auth/refresh<br/>{refreshToken}

    API->>AuthService: Refresh Access Token

    AuthService->>JWT: Verify Refresh Token
    JWT->>JWT: Decode & Validate

    alt Refresh Token Invalid/Expired
        JWT-->>Frontend: 401 Unauthorized<br/>Please login again
        Frontend->>Frontend: Clear tokens
        Frontend-->>Frontend: Redirect to Login
    end

    JWT-->>AuthService: Valid Refresh Token<br/>{userId}

    AuthService->>DB: Check refresh token hash
    DB-->>AuthService: Token valid

    AuthService->>DB: Get user data
    DB-->>AuthService: User

    AuthService->>AuthService: Generate new Access Token<br/>Expires: 15 minutes

    AuthService->>AuthService: Rotate Refresh Token<br/>Expires: 7 days (new)

    AuthService->>DB: Update refresh token hash

    AuthService->>Cache: Update user session cache

    AuthService-->>API: {accessToken, refreshToken}

    API-->>Frontend: 200 OK<br/>{accessToken, refreshToken}

    Frontend->>Frontend: Store new tokens

    Frontend->>API: Retry original request<br/>with new access token

    API-->>Frontend: 200 OK<br/>Original response
```

## JWT Token Structure

```mermaid
graph LR
    JWT[JWT Token]

    JWT --> Header
    JWT --> Payload
    JWT --> Signature

    Header --> Alg[Algorithm: HS256]
    Header --> Type[Type: JWT]

    Payload --> UserId[User ID: uuid]
    Payload --> Email[Email: string]
    Payload --> Iat[Issued At: timestamp]
    Payload --> Exp[Expires: timestamp]
    Payload --> Jti[JWT ID: uuid]

    Signature --> Secret[HMAC SHA256<br/>Secret Key]

    classDef token fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef section fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef data fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class JWT token
    class Header,Payload,Signature section
    class Alg,Type,UserId,Email,Iat,Exp,Jti,Secret data
```

**Access Token Example**:
```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "iat": 1696176000,
    "exp": 1696176900,
    "jti": "access-abc123"
  }
}
```

## Authorization Middleware Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Gateway
    participant AuthMiddleware
    participant JWT
    participant Cache
    participant AuthzMiddleware
    participant DB
    participant Handler

    Client->>Gateway: Request<br/>Authorization: Bearer {token}

    Gateway->>AuthMiddleware: Extract Token

    alt No Authorization Header
        AuthMiddleware-->>Client: 401 Unauthorized
    end

    AuthMiddleware->>JWT: Verify Token

    JWT->>JWT: Decode & Validate Signature

    alt Token Invalid/Expired
        JWT-->>Client: 401 Unauthorized
    end

    JWT-->>AuthMiddleware: Decoded Payload {userId, email}

    AuthMiddleware->>Cache: Get cached user session

    alt Cache Hit
        Cache-->>AuthMiddleware: User Data
    else Cache Miss
        AuthMiddleware->>DB: Get user by ID
        DB-->>AuthMiddleware: User
        AuthMiddleware->>Cache: Cache user data (TTL: 15m)
    end

    AuthMiddleware->>AuthMiddleware: Attach request.user = {user}

    AuthMiddleware->>AuthzMiddleware: Check Permissions

    AuthzMiddleware->>AuthzMiddleware: Extract resource from request<br/>(e.g., environmentId from URL)

    AuthzMiddleware->>DB: Check ownership/team access

    alt User is resource owner
        AuthzMiddleware->>Handler: ✓ Authorized (Owner)
    else User is team member with access
        AuthzMiddleware->>Handler: ✓ Authorized (Team)
    else No access
        AuthzMiddleware-->>Client: 403 Forbidden
    end

    Handler->>Handler: Execute business logic
    Handler-->>Client: 200 OK + Data
```

## Permission Checking Logic

```mermaid
graph TD
    Request[API Request]

    Request --> ExtractResource[Extract Resource<br/>e.g., environment ID]

    ExtractResource --> CheckOwner{Is user<br/>the owner?}

    CheckOwner -->|Yes| AllowOwner[✓ Allow<br/>Full Access]

    CheckOwner -->|No| CheckTeam{Is resource<br/>team-owned?}

    CheckTeam -->|No| Deny1[✗ Deny<br/>403 Forbidden]

    CheckTeam -->|Yes| CheckMembership{Is user<br/>team member?}

    CheckMembership -->|No| Deny2[✗ Deny<br/>403 Forbidden]

    CheckMembership -->|Yes| CheckRole{User's<br/>team role?}

    CheckRole -->|admin| AllowAdmin[✓ Allow<br/>Full Access]
    CheckRole -->|developer| CheckAction{Action<br/>type?}
    CheckRole -->|viewer| AllowRead[✓ Allow<br/>Read-Only]

    CheckAction -->|Read| AllowDev[✓ Allow]
    CheckAction -->|Write| AllowDev
    CheckAction -->|Delete| DenyDev[✗ Deny<br/>403 Forbidden]

    AllowOwner --> Execute[Execute Request]
    AllowAdmin --> Execute
    AllowDev --> Execute
    AllowRead --> Execute

    classDef allow fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef deny fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff
    classDef check fill:#3498db,stroke:#333,stroke-width:2px,color:#fff

    class AllowOwner,AllowAdmin,AllowDev,AllowRead,Execute allow
    class Deny1,Deny2,DenyDev deny
    class Request,ExtractResource,CheckOwner,CheckTeam,CheckMembership,CheckRole,CheckAction check
```

## RBAC Permission Matrix

```mermaid
graph TB
    subgraph "Team Admin"
        AdminPerms[Permissions:<br/>• Manage team<br/>• Add/remove members<br/>• Create projects<br/>• Manage all environments<br/>• Delete team resources]
    end

    subgraph "Team Developer"
        DevPerms[Permissions:<br/>• View team resources<br/>• Create projects<br/>• Manage own projects<br/>• Create environments<br/>• Manage own environments<br/>• Cannot delete team resources]
    end

    subgraph "Team Viewer"
        ViewerPerms[Permissions:<br/>• View team resources<br/>• View projects<br/>• View environments<br/>• View logs (read-only)<br/>• Cannot modify anything]
    end

    subgraph "Resource Owner"
        OwnerPerms[Permissions:<br/>• Full control<br/>• All CRUD operations<br/>• Transfer ownership<br/>• Delete resource]
    end

    User[User]

    User -->|role: admin| AdminPerms
    User -->|role: developer| DevPerms
    User -->|role: viewer| ViewerPerms
    User -->|owns resource| OwnerPerms

    classDef role fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef perms fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef user fill:#f39c12,stroke:#333,stroke-width:2px,color:#000

    class AdminPerms,DevPerms,ViewerPerms,OwnerPerms perms
    class User user
```

## Session Management

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Cache

    User->>Frontend: Login
    Frontend->>API: POST /auth/login
    API-->>Frontend: {accessToken, refreshToken}

    Frontend->>Frontend: Store in localStorage

    Note over Frontend,Cache: Session Active (15 min)

    Frontend->>API: API Request<br/>Authorization: Bearer {accessToken}
    API->>Cache: Verify session exists
    Cache-->>API: Session valid
    API-->>Frontend: Response

    Note over Frontend: Token expires after 15 min

    Frontend->>API: Request (expired token)
    API-->>Frontend: 401 Unauthorized

    Frontend->>API: POST /auth/refresh<br/>{refreshToken}
    API-->>Frontend: {newAccessToken, newRefreshToken}

    Frontend->>Frontend: Update tokens

    Note over User,Frontend: User logs out

    User->>Frontend: Click Logout
    Frontend->>API: POST /auth/logout<br/>{refreshToken}
    API->>Cache: Blacklist access token
    API->>Cache: Delete refresh token
    API-->>Frontend: 200 OK

    Frontend->>Frontend: Clear tokens
    Frontend-->>User: Redirect to Login
```

## Security Features

### Password Security
```mermaid
graph LR
    Password[User Password]

    Password --> Validate[Validation:<br/>• Min 8 characters<br/>• Contains uppercase<br/>• Contains lowercase<br/>• Contains number<br/>• Contains special char]

    Validate --> Hash[bcrypt Hash<br/>Rounds: 10<br/>Salt: auto-generated]

    Hash --> Store[Store in DB<br/>password_hash column]

    Store --> Compare[Login:<br/>bcrypt.compare<br/>constant-time comparison]

    classDef input fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef process fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef secure fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff

    class Password input
    class Validate,Hash,Compare process
    class Store secure
```

### Rate Limiting
```mermaid
graph TD
    Request[API Request]

    Request --> CheckRL{Rate Limit<br/>Check}

    CheckRL --> GetCount[Get request count<br/>from Redis]

    GetCount --> WithinLimit{Count <<br/>Limit?}

    WithinLimit -->|Yes| Increment[Increment count<br/>TTL: 1 minute]
    WithinLimit -->|No| Reject[429 Too Many Requests<br/>Retry-After: 60s]

    Increment --> Process[Process Request]

    Note[Limits:<br/>• Login: 5 per minute<br/>• Register: 3 per hour<br/>• API: 100 per minute<br/>• OAuth: 10 per minute]

    classDef check fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef allow fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef deny fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff

    class CheckRL,GetCount,WithinLimit check
    class Increment,Process allow
    class Reject deny
```

### CSRF Protection
- **SameSite Cookies**: Set to `Strict` or `Lax`
- **State Parameter**: OAuth flows use random state token
- **Origin Checking**: Verify Origin/Referer headers
- **Token Rotation**: Refresh tokens rotated on use

### Token Security
- **Short-lived Access Tokens**: 15 minutes expiry
- **Refresh Token Rotation**: New refresh token on each use
- **Token Blacklisting**: Logout adds token to Redis blacklist
- **Secure Storage**: Tokens in httpOnly cookies (recommended) or localStorage

## Logout Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant AuthService
    participant DB
    participant Cache

    User->>Frontend: Click Logout

    Frontend->>API: POST /auth/logout<br/>{refreshToken}

    API->>AuthService: Logout User

    AuthService->>DB: DELETE FROM refresh_tokens<br/>WHERE token_hash = hash(refreshToken)

    AuthService->>Cache: Blacklist access token<br/>Key: blacklist:{jti}<br/>TTL: 15 minutes (until token expires)

    AuthService->>Cache: Delete user session<br/>Key: session:{userId}

    AuthService-->>API: Logout Success

    API-->>Frontend: 200 OK

    Frontend->>Frontend: Clear tokens from localStorage
    Frontend->>Frontend: Clear user from context
    Frontend->>Frontend: Clear all cached data

    Frontend-->>User: Redirect to Login Page
```

## Multi-Factor Authentication (Future)

```mermaid
graph TD
    Login[User Login<br/>Email + Password]

    Login --> Verify1[Verify Password]

    Verify1 -->|Success| CheckMFA{MFA<br/>Enabled?}

    CheckMFA -->|No| GenerateToken[Generate JWT<br/>Grant Access]

    CheckMFA -->|Yes| SendCode[Send OTP Code<br/>Email/SMS/App]

    SendCode --> PromptCode[Prompt for<br/>6-digit code]

    PromptCode --> VerifyCode{Verify<br/>Code?}

    VerifyCode -->|Invalid| Retry{Retry<br/>Count?}
    Retry -->|< 3| PromptCode
    Retry -->|>= 3| Block[Block Account<br/>Admin Review]

    VerifyCode -->|Valid| GenerateToken

    GenerateToken --> Success[Login Success]

    classDef auth fill:#3498db,stroke:#333,stroke-width:2px,color:#fff
    classDef mfa fill:#f39c12,stroke:#333,stroke-width:2px,color:#000
    classDef success fill:#27ae60,stroke:#333,stroke-width:2px,color:#fff
    classDef error fill:#e74c3c,stroke:#333,stroke-width:2px,color:#fff

    class Login,Verify1,CheckMFA auth
    class SendCode,PromptCode,VerifyCode mfa
    class GenerateToken,Success success
    class Block,Retry error
```

## Token Expiry & Rotation Summary

| Token Type | Expiry | Rotation | Storage | Purpose |
|-----------|--------|----------|---------|---------|
| Access Token | 15 minutes | No | localStorage/cookie | API authentication |
| Refresh Token | 7 days | Yes (on use) | httpOnly cookie/localStorage | Token refresh |
| OAuth State | 5 minutes | N/A | Session | CSRF protection |
| Password Reset | 1 hour | N/A | DB + Email | Password reset |
| Email Verification | 24 hours | N/A | DB + Email | Email verification |
