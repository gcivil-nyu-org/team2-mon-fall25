# Auth0 Integration - Frontend

## Overview
This document describes the Auth0 integration implemented in the React frontend.

## What Was Done

### 1. Installed Dependencies
- `@auth0/auth0-react` - Auth0 SDK for React applications

### 2. Environment Variables
Environment variables are configured in `.env.development`:
- `VITE_AUTH0_DOMAIN` - Your Auth0 domain
- `VITE_AUTH0_CLIENT_ID` - Your Auth0 application client ID
- `VITE_AUTH0_AUDIENCE` - API audience (for Django backend authentication)

### 3. Created Auth Components

#### `src/auth/Auth0ProviderWithNavigate.tsx`
Wrapper component that provides Auth0 context to the entire application.

#### `src/components/auth/LoginButton.tsx`
Simple login button that redirects users to Auth0's Universal Login page.

#### `src/components/auth/LogoutButton.tsx`
Logout button that logs users out and redirects them back to the application.

#### `src/auth/useAccessToken.ts`
Custom hook to retrieve Auth0 access tokens for making authenticated API calls to the Django backend.

### 4. Updated Components

#### `src/main.tsx`
Wrapped the App component with `Auth0ProviderWithNavigate` to enable authentication throughout the app.

#### `src/components/layout/TopBar.tsx`
Added Login/Logout buttons to the top bar. Shows user name and logout button when authenticated, login button otherwise.

## Usage

### Starting the Application
```bash
cd frontend
npm run dev
```

### Testing Authentication
1. Click the "Log In" button in the top bar
2. You'll be redirected to Auth0's login page
3. After successful login, you'll be redirected back to the application
4. Your name will appear in the top bar with a "Log Out" button

### Using Access Tokens (For Future Django Integration)
```typescript
import { useAccessToken } from '../auth/useAccessToken';

function MyComponent() {
  const token = useAccessToken();
  
  // Use the token in your API calls
  const response = await fetch('/api/endpoint', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}
```

## Next Steps (Django Backend Integration)
1. Install and configure Auth0 authentication middleware in Django
2. Update API endpoints to require authentication
3. Verify JWT tokens from Auth0
4. Update the `lib/api.ts` file to include the access token in all requests

