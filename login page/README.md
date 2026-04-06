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

## Project setup

1. Copy `.env.example` to `.env`.
2. Set `VITE_API_BASE_URL` to your backend URL.
3. Set `VITE_SITE_URL` to your production domain.
4. Add `VITE_GA_MEASUREMENT_ID` if Google Analytics is required.
5. Add `VITE_GOOGLE_CLIENT_ID` to enable Google sign-in on `/login` and `/register`.
6. Optionally set `VITE_GOOGLE_AUTH_ENDPOINT` if your backend exchanges the Google credential for an app token.
7. Update social profile URLs via `VITE_SOCIAL_*` values.

## Google sign-in

The auth pages now use Google Identity Services.

- Set `VITE_GOOGLE_CLIENT_ID` from your Google Cloud OAuth web app.
- Add your local/dev and production origins in Google Cloud Authorized JavaScript origins.
- If you want backend-issued tokens, point `VITE_GOOGLE_AUTH_ENDPOINT` to your credential exchange endpoint. The frontend posts `{ credential, intent, clientId }`.
- If `VITE_GOOGLE_AUTH_ENDPOINT` is omitted, the app still signs users in locally with the Google credential and hydrates `app-profile`.

## SEO files

- `public/robots.txt`
- `public/sitemap.xml`

Replace `https://your-domain.com` with your real deployed domain before release.

## Contact endpoint

The contact form posts to both:

- `POST /api/contact` for email/contact workflow
- `POST /api/feedbacks` for in-app feedback storage

If `/api/contact` is unavailable, feedback still saves through `/api/feedbacks`.

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
