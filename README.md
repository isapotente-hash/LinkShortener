# URL shortener prototype

A polished dark-mode URL shortener prototype with glassmorphism cards, user-defined custom short URLs, QR generation, dashboard management, local real-time analytics, account flows, pricing, API documentation, and admin/security feature showcases.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static web server:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## If you still see "invalid URL"

Download or pull the version that includes the custom-URL fix, then hard refresh your browser. The updated form accepts a destination URL and a full custom short URL, and it automatically prepends `https://` when you type a domain without a protocol.

Example values:

- Destination URL: `https://example.com/very/long/page`
- Custom short URL: `https://your-domain.com/study`

## Notes

Analytics are based only on locally recorded opens from the dashboard's **Open** button. Country and conversion metrics are not fabricated by the front end; they stay empty until a real backend supplies that data.
