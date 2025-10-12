# 🧠 CollabDesk Backend (Django + Supabase)

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

    Example : http://127.0.0.1:8000/api/workspace/information/?workspace_id=cdb5abfe-dc99-4394-ac0e-e50a2f21d960&user_id=1

