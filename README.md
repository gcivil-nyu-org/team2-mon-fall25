# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

# CollabDesk Backend (Django + Supabase)

This is the backend service for **CollabDesk**, built using **Django REST Framework** and **Supabase (PostgreSQL)**.  
It powers workspace management, event scheduling, user roles, and collaboration APIs.

---

## Setup Instructions (Run From Scratch)

Follow these steps carefully to set up the backend locally 👇

### Step 1 — Clone the Repository
```bash
git clone origin Backend
cd <your_project_directory>
```
### Step 2 — Install
```bash
pip install -r requirements.txt
```
### Step 3 — If any Model changes done in Backend(Optional):
```bash
# Detect model changes
python manage.py makemigrations
# Apply migrations to database
python manage.py migrate
```

### Step4 - Run Server:
```bash
python manage.py runserver
```

### The Endpoints :
The detailed specifications of the API can be found on Notion.
- Calendar API: GET Events - http://collabdesk.com/api/events/
    - GET all events: http://collabdesk.com/api/events/
    - GET specified events: http://collabdesk.com/api/events/?event_id="46b07014-a804-4514-ab1e-17b00a61e400"&user_id=1
- Calendar API: POST Events - http://collabdesk.com/api/events/
- Workspace API: GET workspac details - http://collabdesk/api/workspace/information/?workspace_id=2&user_id=1

    Example : http://127.0.0.1:8000/api/workspaces/information/?workspace_id=cdb5abfe-dc99-4394-ac0e-e50a2f21d960&user_id=1

