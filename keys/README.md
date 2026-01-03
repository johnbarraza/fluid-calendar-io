# 🔑 Keys & Environment Configuration

This directory contains all sensitive configuration and environment variables.

## 📁 Structure

```
keys/
├── .env                    # Base environment variables (committed to git)
├── .env.local             # Local overrides (gitignored - YOU CREATE THIS)
├── .env.production        # Production variables (gitignored)
├── database.env           # Database credentials (gitignored)
├── google-oauth.env       # Google API credentials (gitignored)
├── fitbit-oauth.env       # Fitbit API credentials (gitignored)
└── README.md              # This file
```

## 🚀 Quick Start

1. **Copy template files:**
   ```bash
   cp .env .env.local
   cp database.env.template database.env
   cp google-oauth.env.template google-oauth.env
   cp fitbit-oauth.env.template fitbit-oauth.env
   ```

2. **Fill in your credentials** in the `.local` and individual env files

3. **Never commit** files with real credentials (already in .gitignore)

## 🔒 Security Rules

- ✅ **DO**: Keep `.env.local` and `*.env` files with real credentials gitignored
- ✅ **DO**: Use `.env.template` files as examples (committed to git)
- ❌ **DON'T**: Commit real API keys, secrets, or passwords
- ❌ **DON'T**: Share credentials via Slack, email, or screenshots

## 📝 Environment Variables Explained

### Database (`database.env`)
- `DATABASE_URL`: PostgreSQL connection string

### Google OAuth (`google-oauth.env`)
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

### Fitbit OAuth (`fitbit-oauth.env`)
- `FITBIT_CLIENT_ID`: From Fitbit Dev Portal
- `FITBIT_CLIENT_SECRET`: From Fitbit Dev Portal

### NextAuth (`.env.local`)
- `NEXTAUTH_SECRET`: Generated secret for JWT encryption
- `NEXTAUTH_URL`: Your app URL

## 🛠️ Loading Order

The app loads environment variables in this order (later overrides earlier):

1. `keys/.env` (base config, committed)
2. `keys/database.env` (database credentials)
3. `keys/google-oauth.env` (Google credentials)
4. `keys/fitbit-oauth.env` (Fitbit credentials)
5. `keys/.env.local` (local overrides, highest priority)

## 🔄 Using with Bun

The project uses Bun which automatically loads .env files.

To load from `keys/` directory:
```bash
bun --env-file=keys/.env.local run dev
```

Or use the npm scripts which handle this automatically.
