# bancho-web

A clean, modern web frontend for [bancho.py](https://github.com/osuAkatsuki/bancho.py),
built with React + TypeScript. It's an SPA driven entirely by bancho.py's
**v2 api** — no database access, no server-side rendering.

![](https://img.shields.io/badge/react-18-61dafb) ![](https://img.shields.io/badge/typescript-5-3178c6) ![](https://img.shields.io/badge/tailwindcss-3-38bdf8)

## Features

- **Registration & sign in** — website account creation (backed by bancho.py's
  v2 accounts/sessions apis) with optional captcha (reCAPTCHA, hCaptcha or
  Turnstile); important since bancho.py disables in-game registration by default
- **Email verification & password reset** — requires the backend email API
  described below
- **Home** — server stats (online/registered players) & "how to connect" guide
- **Leaderboards** — per-mode rankings (vanilla/relax/autopilot) with
  performance/score/accuracy/playcount sorts, country filtering, avatars,
  clan tags & pagination
- **Player profiles** — per-mode stats with global/country ranks, level bar,
  grade counts, userpage, live "now playing" status, best/recent scores and
  most played maps with beatmap thumbnails
- **Beatmap pages** — map info with cover art, difficulty stats, and per-mode
  leaderboards with grades, mods & FC markers
- **Clans** — clan listing & clan pages with member roles
- **Player search** — debounced live search in the navbar
- **Settings** — avatar upload for signed-in players (requires bancho.py
  with `PUT /v2/players/{id}/avatar`)

## Stack

| Layer     | Choice                                        |
| --------- | --------------------------------------------- |
| Build     | [Vite 5](https://vitejs.dev)                  |
| UI        | React 18 + TypeScript (strict)                |
| Styling   | Tailwind CSS 3                                |
| Routing   | React Router 6                                |
| Data      | TanStack Query 5 (caching, retries, refetch)  |

## Development

You'll need Node.js 18+ and a bancho.py instance to talk to.

```bash
npm install
npm run dev        # http://localhost:5173
```

bancho.py routes its api by Host header (`api.{DOMAIN}`), so the dev server
proxies `/api/*` to your local instance with the Host header rewritten.
Configure via `.env` (see `.env.example`):

```bash
BANCHO_API_TARGET=http://127.0.0.1:10000  # where bancho.py listens
BANCHO_DOMAIN=cmyui.xyz                   # builds the api.{DOMAIN} Host header
```

Other scripts:

```bash
npm run build            # typecheck + production build into dist/
npm run typecheck        # typecheck only
npm run preview          # serve the production build locally
npm run storybook        # component workshop at http://localhost:6006
npm run build-storybook  # static storybook build
```

## Design system

The brand theme (near-black neutral palette + crimson accent) lives in
`tailwind.config.js` as Tailwind color tokens (`canvas`, `surface`,
`surface-2/3`, `line`, `muted`, `accent`, `accent-2`). Shared primitives
in `src/components/ui/` keep spacing & shape consistent:

- `Card` — the standard surface container (default `px-5 py-4` padding,
  or edge-to-edge for tables & media)
- `PageHeader` — page title + description block
- `PillTabs` — the segmented pill-tab control (mode switchers, sorts, tabs)

Run **Storybook** to iterate on components and the theme in isolation —
the `Design/Theme` story documents the palette, type scale, spacing
conventions and radii.

## Configuration

All `VITE_*` variables are baked in at build time (see `.env.example`):

| Variable                | Purpose                                | Default             |
| ----------------------- | -------------------------------------- | ------------------- |
| `VITE_APP_NAME`         | Server name shown in navbar & titles   | `bancho.py`         |
| `VITE_BANCHO_DOMAIN`    | Domain in "how to connect" instructions | `cmyui.xyz`        |
| `VITE_API_BASE_URL`     | Base url for api requests              | `/api`              |
| `VITE_AVATARS_BASE_URL` | Base url for avatars (`a.{DOMAIN}`)    | `https://a.cmyui.xyz` |
| `VITE_DISCORD_INVITE`   | Discord invite shown in the footer (keep in sync with bancho.py's `DISCORD_INVITE`) | empty = hidden |

### Email authentication API

The frontend never handles SMTP credentials. Configure SMTP on the backend and
have it implement these JSON endpoints, using the existing `{status, data,
meta}` response envelope:

| Method | Path | Body |
| ------ | ---- | ---- |
| `POST` | `/v2/account/email-verification` | `{ "email": "..." }` |
| `POST` | `/v2/account/email-verification/confirm` | `{ "token": "..." }` |
| `POST` | `/v2/account/password-reset` | `{ "email": "..." }` |
| `POST` | `/v2/account/password-reset/confirm` | `{ "token": "...", "password": "..." }` |

Verification and reset tokens should be single-use, short-lived, stored hashed,
and rate-limited. The email and reset request endpoints should return the same
generic success message for unknown email addresses to avoid account
enumeration.

## Deployment

Build the static bundle and serve `dist/` from any web server. The SPA needs:

1. **History fallback** — unknown paths must serve `index.html`
2. **An api origin** — keep the default `/api` and proxy it to bancho.py
   (recommended): sessions ride an http-only, `SameSite=Lax` cookie, which
   Just Works when everything stays same-origin. (Splitting the api onto
   another origin requires CORS with `Access-Control-Allow-Credentials` and
   an explicit `Access-Control-Allow-Origin` — avoid unless you need it.)

```nginx
# http context: rate limits for the authentication endpoints.
# registration is limited strictly to prevent automated account
# creation; logins are limited to slow down credential stuffing.
limit_req_zone $binary_remote_addr zone=bancho_registrations:10m rate=1r/m;
limit_req_zone $binary_remote_addr zone=bancho_logins:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=bancho_avatar_uploads:10m rate=10r/m;

server {
    listen 443 ssl;
    server_name osu.example.com;

    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    ssl_ciphers "EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH:@SECLEVEL=1";

    # bancho.py resolves client ips from these headers (used for
    # geolocation during registration & for rate limiting fairness)
    proxy_set_header Host api.example.com;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

    # ---- security headers ----
    # csp: allowlist of what pages may load/execute; limits the blast
    # radius of xss. keep exactly ONE Content-Security-Policy line —
    # the one matching your captcha provider — and replace
    # a.example.com with your avatar host. roll out with
    # Content-Security-Policy-Report-Only first if you've customized
    # the frontend.

    # no captcha:
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://a.example.com https://assets.ppy.sh https://b.ppy.sh https://flagcdn.com; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;

    # cloudflare turnstile:
    #add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://a.example.com https://assets.ppy.sh https://b.ppy.sh https://flagcdn.com; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;

    # google recaptcha:
    #add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/; frame-src https://www.google.com/recaptcha/; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://a.example.com https://assets.ppy.sh https://b.ppy.sh https://flagcdn.com; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;

    # hcaptcha:
    #add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://hcaptcha.com https://*.hcaptcha.com; frame-src https://hcaptcha.com https://*.hcaptcha.com; style-src 'self' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com; img-src 'self' data: https://a.example.com https://assets.ppy.sh https://b.ppy.sh https://flagcdn.com; connect-src 'self' https://hcaptcha.com https://*.hcaptcha.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location / {
        root /srv/bancho-web/dist;
        try_files $uri /index.html;
    }

    location = /api/v2/accounts {
        limit_req zone=bancho_registrations burst=3 nodelay;
        limit_req_status 429;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:10000;
    }

    location = /api/v2/sessions {
        limit_req zone=bancho_logins burst=5 nodelay;
        limit_req_status 429;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:10000;
    }

    # avatar uploads are up to 2MB (nginx's default body limit is 1MB)
    location ~ ^/api/v2/players/\d+/avatar$ {
        limit_req zone=bancho_avatar_uploads burst=5 nodelay;
        limit_req_status 429;
        client_max_body_size 4m;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:10000;
    }

    location /api/ {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://127.0.0.1:10000;
    }
}
```

## Project structure

```
src/
├── lib/
│   ├── api/          # typed api client (http envelope, types, endpoints)
│   ├── gamemodes.ts  # mode ids <-> vanilla/relax/autopilot helpers
│   ├── mods.ts       # mod bitmask -> acronyms
│   ├── grades.ts     # grade display (XH/X/SH/S/A/...)
│   ├── rankedStatus.ts
│   ├── format.ts     # numbers, accuracy, playtime, relative time
│   └── assets.ts     # avatar/cover/flag url builders
├── components/       # shared components (Navbar, ModeSwitcher, badges, ...)
└── pages/            # one component per route
```

To consume a new api endpoint: add its response shape to `lib/api/types.ts`,
a fetcher to `lib/api/client.ts`, then use it with `useQuery` in a component.

## External assets

- **Avatars** are served by your bancho.py deployment (`a.{DOMAIN}`), with a
  built-in placeholder fallback.
- **Beatmap covers/thumbnails** load from osu!'s public cdn
  (`assets.ppy.sh` / `b.ppy.sh`) by set id.
- **Country flags** load from [flagcdn.com](https://flagcdn.com).
