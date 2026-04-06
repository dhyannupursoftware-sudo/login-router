# Deployment Guide

This frontend is a Vite + React app and your API is coming from Laravel. The clean production setup is:

- Frontend: deploy this `login page` app to Vercel
- Backend API: deploy your Laravel project to a Laravel/PHP host
- Domain split:
  - Frontend: `https://app.yourdomain.com`
  - API: `https://api.yourdomain.com`

## 1. Frontend deployment

This repo already expects the API URL from `VITE_API_BASE_URL` in [`src/lib/api.ts`](./src/lib/api.ts).

### Railway option

This frontend now includes:

- [`Dockerfile`](./Dockerfile)
- [`nginx.conf.template`](./nginx.conf.template)

So you can deploy it on Railway as a web service.

Railway supports config-as-code and custom build/deploy settings in code, and supports setting a service root directory for monorepos. See Railway docs:

- [Config as Code](https://docs.railway.com/reference/config-as-code)
- [Build Configuration](https://docs.railway.com/builds/build-configuration)
- [Monorepo guide](https://docs.railway.com/guides/monorepo)

### Frontend on Railway

1. Create a new Railway project.
2. Connect your GitHub repo.
3. Create a service from this repo.
4. Set the service Root Directory to `login page`.
5. Railway will detect the `Dockerfile` and build the frontend container.
6. Add these environment variables:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_SITE_URL=https://app.yourdomain.com
VITE_GA_MEASUREMENT_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_AUTH_ENDPOINT=/api/auth/google
VITE_SOCIAL_FACEBOOK_URL=https://facebook.com/yourpage
VITE_SOCIAL_INSTAGRAM_URL=https://instagram.com/yourpage
VITE_SOCIAL_TWITTER_URL=https://x.com/yourpage
VITE_SOCIAL_GITHUB_URL=https://github.com/yourorg
```

7. Add your custom frontend domain in Railway.

The Nginx config includes SPA fallback, so routes like `/login`, `/register`, `/todo/tasks`, and `/settings` continue working after refresh. It also listens on Railway's injected `PORT`, which Railway documents as required for public networking and health checks.

### Vercel option

1. Push your code to GitHub.
2. Import the repo into Vercel.
3. Set the project Root Directory to `login page`.
4. Use:
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add these environment variables in Vercel:

```env
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_SITE_URL=https://app.yourdomain.com
VITE_GA_MEASUREMENT_ID=
VITE_GOOGLE_CLIENT_ID=
VITE_GOOGLE_AUTH_ENDPOINT=/api/auth/google
VITE_SOCIAL_FACEBOOK_URL=https://facebook.com/yourpage
VITE_SOCIAL_INSTAGRAM_URL=https://instagram.com/yourpage
VITE_SOCIAL_TWITTER_URL=https://x.com/yourpage
VITE_SOCIAL_GITHUB_URL=https://github.com/yourorg
```

6. Add your custom frontend domain in Vercel.

This project includes [`vercel.json`](./vercel.json) so React routes like `/login`, `/register`, `/todo/tasks`, and `/settings` keep working after refresh.

## 2. Laravel API deployment

Your Laravel backend should be deployed separately. Good production choices are:

- Railway / Render / VPS
- Laravel Forge + DigitalOcean / AWS / Hetzner
- Shared hosting only if your Laravel setup already supports it cleanly

### Important

The Laravel `.env` file alone is not enough to deploy your backend.

To deploy the backend on Railway, I need the actual Laravel project files too, such as:

- `composer.json`
- `artisan`
- `app/`
- `bootstrap/`
- `config/`
- `database/`
- `public/`
- `routes/`
- `storage/`

Without the Laravel codebase, nobody can build or deploy the API service.

### Laravel production checklist

Set these on your Laravel server:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

Then run the normal production commands:

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

If your routes use closures, skip `php artisan route:cache`.

## 3. Laravel CORS

Since the frontend and backend are on different domains, your Laravel API must allow the frontend origin.

In `config/cors.php`, make sure your frontend domain is allowed for API routes. A common setup looks like:

```php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => ['https://app.yourdomain.com'],
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => false,
```

If you use cookie-based auth with Sanctum, `supports_credentials` should usually be `true` and your frontend must call the API with credentials enabled. This frontend currently uses Bearer tokens, so cross-domain API usage is simpler.

## 4. Google login

If you are using Google sign-in:

1. Add your frontend production URL to Google Cloud Authorized JavaScript origins.
2. Add any Laravel callback / backend exchange URLs that your auth flow needs.
3. Set `VITE_GOOGLE_CLIENT_ID` in the frontend.

## 5. What you should do now

If you want the fastest successful deployment:

1. Deploy Laravel first and confirm `https://api.yourdomain.com/api/login` works.
2. Deploy this React frontend on Vercel.
3. Set `VITE_API_BASE_URL` to the Laravel production URL.
4. Add the frontend domain to Laravel CORS.
5. Test login, register, reset password, contact, and todo APIs.

## 6. Important note

I can prepare the project for deployment, but I cannot complete the live deployment itself unless I have access to:

- your Laravel backend codebase
- your hosting account
- your domain / DNS settings
- your Vercel / Render / server credentials

Once you share the Laravel backend repo or the hosting target, I can set that side up too.
