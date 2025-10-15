# Frontend Deployment Guide

## Environment Configuration

The frontend uses environment variables to configure the API endpoint for different environments (development vs production).

### Environment Files

Three environment files are configured:

1. **`.env.development`** - Used when running `npm run dev`
   - Points to localhost backend: `http://localhost:8000`

2. **`.env.production`** - Used when running `npm run build`
   - Points to AWS backend: `http://collabdesk-env.eba-e9d4hm2k.us-east-1.elasticbeanstalk.com`

3. **`.env.example`** - Template file for reference

### Environment Variables

- `VITE_API_BASE_URL` - Base URL for the backend API (no trailing slash)

## Development

Run the development server with local backend:

```bash
npm run dev
```

This automatically uses `.env.development` and connects to `http://localhost:8000`

## Building for Production

Build the production bundle that connects to AWS backend:

```bash
npm run build
```

This uses `.env.production` and the production API URL will be baked into the build.

The built files will be in the `dist/` folder, ready to deploy to S3.

## Deploying to AWS S3

### Prerequisites

1. AWS CLI installed and configured
2. S3 bucket created for static website hosting
3. Bucket configured for public access (if needed)

### Build the Production Bundle

```bash
npm run build
```

### Upload to S3

```bash
# Replace 'your-bucket-name' with your actual S3 bucket name
aws s3 sync dist/ s3://your-bucket-name --delete

# If you need to set public read permissions
aws s3 sync dist/ s3://your-bucket-name --delete --acl public-read
```

### Configure S3 Bucket for Static Website

1. Go to S3 Console → Your Bucket → Properties
2. Enable "Static website hosting"
3. Set Index document: `index.html`
4. Set Error document: `index.html` (for SPA routing)

### Configure CORS on Backend

Make sure your Django backend's `settings.py` includes your S3 website URL in `CORS_ALLOWED_ORIGINS`:

```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Development
    "http://your-bucket-name.s3-website-us-east-1.amazonaws.com",  # S3 static website
    "https://your-cloudfront-domain.cloudfront.net",  # If using CloudFront
]
```

## Changing API URLs

### For Development
Edit `.env.development`:
```
VITE_API_BASE_URL=http://localhost:8000
```

### For Production
Edit `.env.production`:
```
VITE_API_BASE_URL=http://your-production-backend-url.com
```

### For Local Override
Create `.env.local` (not committed to git):
```
VITE_API_BASE_URL=http://custom-url:8000
```

## Testing Production Build Locally

You can test the production build locally before deploying:

```bash
# Build for production
npm run build

# Preview the production build
npm run preview
```

This will serve the production build locally at `http://localhost:4173` (or similar).

## Troubleshooting

### API calls failing after deployment

1. Check browser console for CORS errors
2. Verify `VITE_API_BASE_URL` is set correctly in `.env.production`
3. Ensure backend CORS settings include your S3/CloudFront URL
4. Check that API_BASE_URL doesn't have a trailing slash

### Environment variable not updating

1. Stop the dev server
2. Clear the build cache: `rm -rf dist node_modules/.vite`
3. Rebuild: `npm run build`

### 404 errors on refresh in S3

Configure error document to point to `index.html` in S3 static website settings to handle client-side routing.

## Additional Notes

- Environment variables must be prefixed with `VITE_` to be exposed to the client
- Changes to `.env` files require restarting the dev server or rebuilding
- Never commit sensitive data in environment files (use `.env.local` for secrets)

