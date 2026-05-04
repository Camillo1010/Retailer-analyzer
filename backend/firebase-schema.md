# Firebase Realtime Database — schema

Two-user family calendar. All paths below are rooted at the database URL.

```
/users/{userId}
  username:      string   // unique, lowercase
  displayName:   string
  passwordHash:  string   // bcrypt, cost 12
  createdAt:     number   // ms epoch

/events/{eventId}
  title:         string
  date:          string   // "YYYY-MM-DD" (local calendar date)
  time:          string|null   // "HH:MM" 24h, or null for all-day
  category:      "appointment" | "bill" | "reminder" | "milestone" | "other"
  description:   string
  reminders:     ("1d" | "1h" | "at-time")[]   // optional
  createdBy:     string   // userId
  createdAt:     number
  updatedAt:     number

/comments/{eventId}/{commentId}
  body:          string
  authorId:      string   // userId
  authorName:    string   // username at the time of posting
  createdAt:     number
```

## Indexes

Add to your Realtime Database rules so the queries the API issues are
served from indexes rather than full scans:

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "users":    { ".indexOn": ["username"] },
    "events":   { ".indexOn": ["date", "createdBy"] },
    "comments": {
      "$eventId": { ".indexOn": ["createdAt"] }
    }
  }
}
```

The Express API uses the Firebase Admin SDK with full access; the
top-level `.read: false` / `.write: false` ensures clients can't reach
the DB directly. All access goes through `/api/*`.

## Auth model

- Two users only. Created via `npm run seed` (see `scripts/seed-users.js`).
- Login → server checks `bcrypt.compare`, returns a JWT
  (`sub = userId`). Client stores it in `localStorage`.
- All `/api/events` and `/api/events/:id/comments` routes require
  `Authorization: Bearer <token>`.

## Why Realtime Database (not Firestore)

The "real-time comment thread" requirement is trivial to satisfy with
RTDB's `on('child_added')` listener if we later expose a read-only
client SDK channel. For the MVP, the React client polls
`GET /api/events/:id/comments` every few seconds when an event detail
is open; swapping to a live listener is a one-file change.
