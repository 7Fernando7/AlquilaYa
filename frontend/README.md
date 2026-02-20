# FormaconIA Frontend

React + TypeScript frontend for the FormaconIA intelligent rental housing marketplace.

## Overview

This is a complete MVP frontend scaffolding with:
- ✅ Full authentication system (register, login, email verification, password reset)
- ✅ Protected routes with auth context
- ✅ User profile management
- ✅ Responsive design with TailwindCSS
- ✅ TypeScript strict mode
- ✅ Axios HTTP client with token management
- ⏳ Placeholder pages for Search, Favorites, Alerts, Chat, and Map (ready for implementation)

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **React Router 6** - Client-side routing
- **Axios** - HTTP client
- **TailwindCSS 3** - Styling
- **Context API** - State management (auth)

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- Backend running on `http://localhost:8000`

### Setup

1. Install dependencies:
```bash
npm install
```

2. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

3. Update `.env.local` if needed:
```
VITE_API_URL=http://localhost:8000
```

4. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Scripts

```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Type check
npm run tsc

# List all available scripts
npm run
```

## Project Structure

```
frontend/
├── src/
│   ├── api/              # HTTP API clients
│   │   ├── auth.ts       # Auth API endpoints
│   │   └── client.ts     # Axios instance with interceptors
│   ├── components/
│   │   ├── auth/         # Auth-related components
│   │   ├── layout/       # Navbar, Footer, Layout
│   │   └── ui/           # Reusable UI components (Button, Input, Card, etc.)
│   ├── hooks/            # Custom React hooks
│   │   └── useAuth.ts    # Auth context hook
│   ├── pages/            # Page components
│   │   ├── auth/         # Login, Register, Email Verification, Password Reset
│   │   ├── home/         # HomePage
│   │   ├── profile/      # ProfilePage
│   │   ├── search/       # SearchPage (placeholder)
│   │   ├── favorites/    # FavoritesPage (placeholder)
│   │   ├── alerts/       # AlertsPage (placeholder)
│   │   ├── chat/         # ChatPage, ChatThreadPage (placeholder)
│   │   └── map/          # MapPage (placeholder)
│   ├── stores/           # State management
│   │   └── AuthContext.tsx  # Authentication state
│   ├── types/            # TypeScript type definitions
│   │   └── auth.ts       # Auth types
│   ├── utils/            # Utility functions
│   │   └── validators.ts # Form validation
│   ├── App.tsx           # Router and main layout
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## Authentication Flow

### Registration
1. User fills out registration form (email, password, name, user type)
2. Frontend validates password requirements
3. Sends to `POST /auth/register`
4. User redirected to email verification page
5. Verification link sent to user's email

### Email Verification
1. User clicks link in email with verification token
2. `GET /verify-email?token=...`
3. Token verified with backend
4. User can now login

### Login
1. User enters email and password
2. `POST /auth/login`
3. Receives access_token and refresh_token
4. Tokens stored in localStorage
5. User redirected to home page
6. User data fetched and stored in auth context

### Token Refresh
- Access token automatically refreshed on 401 response
- Refresh token stored securely
- Old tokens automatically cleared on logout

### Password Reset
1. User requests password reset at `/forgot-password`
2. Email sent with reset link
3. User clicks link: `/reset-password?token=...`
4. New password set with `POST /auth/password/confirm-reset`

## Component Examples

### Using Auth Context
```typescript
import { useAuth } from '@/hooks/useAuth';

function MyComponent() {
  const { user, login, logout, loading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email: 'user@example.com', password: 'password' });
    } catch (err) {
      console.error('Login failed');
    }
  };

  return (
    <div>
      {user && <p>Welcome, {user.name}</p>}
      <button onClick={handleLogin} disabled={loading}>
        Login
      </button>
    </div>
  );
}
```

### Creating Protected Pages
```typescript
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MyPage } from '@/pages/MyPage';

<Route
  path="/my-page"
  element={
    <ProtectedRoute>
      <MyPage />
    </ProtectedRoute>
  }
/>
```

### Using API Client
```typescript
import authApi from '@/api/auth';

// Register
const user = await authApi.register({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  name: 'John Doe',
  user_type: 'seeker'
});

// Login
const { access_token, refresh_token, user } = await authApi.login({
  email: 'user@example.com',
  password: 'SecurePassword123!'
});

// Update profile
await authApi.updateProfile(userId, {
  name: 'New Name',
  phone: '+34 600000000',
  bio: 'My bio'
});
```

## Password Requirements

All passwords must meet these requirements:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)
- At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

The frontend validates these client-side in real-time.

## Available Pages

### Public (No Auth Required)
- `/register` - User registration
- `/login` - User login
- `/verify-email` - Email verification
- `/resend-verification` - Resend verification email
- `/forgot-password` - Request password reset
- `/reset-password` - Reset password with token

### Protected (Auth Required)
- `/` - Home dashboard
- `/profile` - User profile (view & edit)
- `/search` - Search properties (placeholder)
- `/favorites` - Saved properties (placeholder)
- `/alerts` - Search alerts (placeholder)
- `/chat` - Messages list (placeholder)
- `/chat/:id` - Individual chat (placeholder)
- `/map` - Map view (placeholder)

## Development Tips

### Auto-refresh on API Errors
- If access token expires (401), automatically refreshed
- User logged out if refresh token also invalid
- No interruption for user if refresh succeeds

### Form Validation
- Client-side validation with `validateEmail()`, `validatePassword()`, `validateName()`
- Server-side validation by backend
- Clear error messages for users

### TypeScript Usage
- Strict mode enabled
- All API responses typed
- Component props properly typed
- Path aliases with `@/` for imports

### Styling
- TailwindCSS utility-first approach
- Custom colors in `tailwind.config.js`
- No global CSS classes (except Tailwind directives)
- Responsive design with Tailwind breakpoints

## Troubleshooting

### Port 5173 already in use
```bash
npm run dev -- --port 3000
```

### API connection errors
- Verify backend is running on `http://localhost:8000`
- Check `.env.local` has correct `VITE_API_URL`
- Check browser console for CORS errors

### Token not persisting
- Check localStorage in browser DevTools
- Verify refresh token is being stored
- Clear localStorage if corrupted: `localStorage.clear()`

### Build errors
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Next Steps for Feature Implementation

All placeholder pages are ready for implementation:

1. **SearchPage** - Add property search with filters and results
2. **FavoritesPage** - Add saved properties display and management
3. **AlertsPage** - Add search alerts creation and management
4. **ChatPage** - Add messaging list and real-time chat
5. **MapPage** - Add interactive map with property markers

Each page follows the same pattern:
- Import `Layout` component for consistent UI
- Use `useAuth()` hook for user data
- Call API endpoints via imported API clients
- Handle loading and error states
- Use UI components from `@/components/ui`

## Support

For issues or questions:
1. Check the CLAUDE.md in the project root
2. Review the auth-service backend documentation
3. Check component documentation in inline comments

---

**Status**: MVP scaffolding complete ✅
**Last Updated**: 2026-02-20
**Next Phase**: Feature implementation and backend service integration
