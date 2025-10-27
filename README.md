# Coverage Badges

## Develop branch
![Build Status](https://app.travis-ci.com/gcivil-nyu-org/team2-mon-fall25.svg?token=femJf7L7wQgHi3cCjt9R&branch=develop)
[![Coverage Status](https://coveralls.io/repos/github/gcivil-nyu-org/team2-mon-fall25/badge.svg?branch=develop)](https://coveralls.io/github/gcivil-nyu-org/team2-mon-fall25?branch=develop)

# CollabDesk Frontend

React + TypeScript frontend for the CollabDesk collaborative workspace platform.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install  # or npm install
   ```

2. **Configure environment variables:**
   
   Copy `.env.development` and update if needed:
   ```env
   VITE_API_BASE_URL=http://localhost:8000
   ```

3. **Run the development server:**
   ```bash
   pnpm dev  # or npm run dev
   ```

The app will be available at `http://localhost:5173`

## Build for Production

```bash
pnpm build  # or npm run build
```

Built files will be in the `dist/` directory.

## Project Structure

```
src/
├── components/
│   ├── calendar/      # Calendar-related components
│   ├── dashboard/     # Dashboard components
│   ├── layout/        # Layout components (TopBar, Sidebar, etc.)
│   └── modals/        # Modal components
├── lib/
│   ├── api.ts         # API client and backend communication
│   ├── store.ts       # State management
│   └── useDarkMode.ts # Dark mode hook
├── App.tsx            # Main application component
├── main.tsx           # Application entry point
└── types.ts           # TypeScript type definitions
```

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **date-fns** - Date manipulation
- **axios** - HTTP client

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint

## Environment Variables

- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:8000`)
# CollabDesk Backend

Django REST API backend for the CollabDesk collaborative workspace platform.

## Setup

1. **Create a virtual environment:**
   ```bash
   cd collabdesk
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run migrations:**
   ```bash
   python manage.py migrate
   ```

4. **Create a superuser (optional):**
   ```bash
   python manage.py createsuperuser
   ```

5. **Run the development server:**
   ```bash
   python manage.py runserver
   ```

The API will be available at `http://localhost:8000`

## Project Structure

```
collabdesk/
├── manage.py
├── requirements.txt
├── collabdesk/          # Main project settings
├── events/              # Events app (calendar events)
├── users/               # Users app
└── workspaces/          # Workspaces app
```

## API Endpoints

- `/api/events/` - Event management
- `/api/workspaces/` - Workspace management
- `/admin/` - Django admin interface

## Testing

```bash
python manage.py test
```

## Database

- **Development**: SQLite (`db.sqlite3`)
- **Production**: PostgreSQL (configured via environment variables)

