# Auth0 Backend Integration

## Overview
This document describes the Auth0 JWT authentication implementation in the Django backend.

## Components Implemented

### 1. Authentication Utilities (`collabdesk/auth.py`)
- **Auth0TokenValidator**: Validates JWT tokens from Auth0
  - Fetches JWKS (JSON Web Key Set) from Auth0
  - Extracts public keys based on token's `kid` header
  - Validates token signature, audience, and issuer
  - Caches JWKS for performance

### 2. DRF Authentication & Permissions (`collabdesk/permissions.py`)
- **Auth0Authentication**: DRF authentication class
  - Extracts Bearer token from Authorization header
  - Validates token using Auth0TokenValidator
  - Creates/retrieves user based on Auth0 user ID (sub claim)
  - Attaches token payload to user object for access in views

- **IsAuthenticated**: Permission class for protecting views
  - Checks if request is authenticated via Auth0

### 3. Protected API Views
Updated the following views to require authentication:
- `events/views.py`: EventListCreateView, EventDetailView
- `workspaces/views.py`: WorkspaceInformationView, WorkspaceListView

## Configuration

### Settings (`collabdesk/settings.py`)
```python
# Auth0 Configuration
AUTH0_DOMAIN = 'dev-5s54nlyerhlsnvj1.us.auth0.com'
AUTH0_AUDIENCE = 'https://api.collabdesk.com'

# DRF Configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'collabdesk.permissions.Auth0Authentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',  # Default to allow, protect specific views
    ],
}
```

### Dependencies Added
- `PyJWT==2.10.1` - JWT token decoding and validation
- `cryptography==44.0.0` - RSA signature verification
- `requests==2.32.3` - Fetching JWKS from Auth0

## How It Works

1. **Frontend sends request** with `Authorization: Bearer <token>` header
2. **Auth0Authentication class** extracts and validates the token
3. **Token validator** fetches Auth0's public keys and verifies:
   - Token signature (RS256 algorithm)
   - Audience matches `AUTH0_AUDIENCE`
   - Issuer matches Auth0 domain
   - Token hasn't expired
4. **User lookup/creation** based on Auth0 user ID from token's `sub` claim
5. **Request proceeds** if authenticated, returns 401 if not

## Testing

### Test with curl:
```bash
# This will fail without a token
curl http://localhost:8000/api/events/

# This should work with a valid token
curl -H "Authorization: Bearer <your-auth0-token>" http://localhost:8000/api/events/
```

### Frontend Integration
The frontend automatically includes the Auth0 token in all API requests via the `authenticatedFetch` wrapper in `lib/api.ts`.

## Environment Variables

Set these in your environment or `.env` file:
- `AUTH0_DOMAIN` - Your Auth0 domain (defaults to dev-5s54nlyerhlsnvj1.us.auth0.com)
- `AUTH0_AUDIENCE` - Your API audience (defaults to https://api.collabdesk.com)

## User Management

Users are automatically created when they first authenticate:
- Username: Auth0 user ID (sub claim from token)
- Email: From token if available

You can customize user creation logic in `collabdesk/permissions.py` in the `Auth0Authentication.authenticate()` method.

## Security Notes

- JWKS is cached using `@lru_cache` for performance
- Tokens are validated on every request
- Only RS256 algorithm is allowed
- Audience and issuer are strictly validated
- Uses Django's built-in User model for authentication

