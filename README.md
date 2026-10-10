# DiscoverGB.pk

A content-managed Gilgit-Baltistan travel blog built with Node.js and browser-native JavaScript. The admin dashboard can publish destination guides, upload cover photos, and embed YouTube or Vimeo travel videos.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env`.
3. Replace `ADMIN_PASSWORD` in `.env` with a unique password of at least 12 characters.
4. In this folder, run `npm start`.
5. Open `http://127.0.0.1:3000` for the website and `http://127.0.0.1:3000/admin` to sign in.

The first run creates `data/stories.json` with six editable sample guides. Replace these with your own verified travel stories. Uploaded cover photos and story data are stored under `data/`.

## Publish online

This project needs a Node.js host that runs a persistent Node server and preserves its writable `data/` directory (including uploaded images) when it restarts or deploys. It is not a static-only site and cannot be deployed as just the HTML files to static hosting.

1. Choose hosting that supports Node.js 20+ and persistent writable storage.
2. Upload the complete project, including `package.json`, `server.js`, the HTML/CSS/JS files, and `data/` if it already contains your content.
3. Set `ADMIN_PASSWORD` to a long, unique secret and `NODE_ENV` to `production` in your hosting provider's environment-variable settings. Set `PORT` only if the host requires it. Keep `.env`, `data/stories.json`, and uploaded files private from source control.
4. Start the app with `npm start`. In production the app listens on `0.0.0.0` and marks its admin session cookie `Secure`; terminate HTTPS at your hosting provider or reverse proxy.
5. Connect `discovergb.pk` to the app with your host's domain/DNS instructions and enable HTTPS.
6. Back up `data/stories.json` and `data/uploads/` regularly. If the provider uses ephemeral disks, configure persistent storage before publishing content.

## Content dashboard

Visit `/admin` and sign in with `ADMIN_PASSWORD`. The public navigation has separate pages at `/`, `/destinations`, `/guides`, `/videos`, and `/about`. Each published guide or video also has its own `/story/<slug>` page. The dashboard supports:

- Creating, editing, publishing, unpublishing, and deleting travel stories.
- Photo guides and YouTube/Vimeo video stories, with public story pages at `/story/<slug>`.
- JPG, PNG, and WebP cover uploads (up to 8 MB), or external HTTPS image URLs.
- Draft stories that remain visible only in the admin dashboard.

Video stories require a YouTube or Vimeo URL. Starter sample videos have no video URLs; edit them to add your own before publishing. The default social links, contact address, and sample destination images should also be updated before launch.

Run `npm test` to verify the content API, authentication, publishing workflow, individual story pages, and photo uploads.
