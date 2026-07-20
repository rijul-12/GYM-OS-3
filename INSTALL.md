# Installing GymOS Locally

GymOS runs exclusively on a standard Node.js server loop (no explicit Docker daemon required for the Next.js runtime).

## 1. Prerequisites
- **Node.js**: `v20.x` LTS or higher.
- **Package Manager**: `npm` explicitly configured. 

## 2. Environment Variables
GymOS expects strict environmental boundaries to run standard authentication and mapping flows cleanly.
```bash
cp .env.example .env.local
```
Fill out the variables listed in your `.env.local`:
- `NEXT_PUBLIC_API_URL`
- `SUPABASE_KEY` (Wait until database hookup)
- Database credentials etc.

## 3. Install NPM Core
```bash
$ npm install
```
*Note: Due to our usage of `framer-motion` and `recharts`, ensure `--legacy-peer-deps` is run if a React version conflict appears.*

## 4. Boot Dev Engine
```bash
$ npm run dev
```

The application will listen cleanly on `http://localhost:3000`. 
**Important**: The application currently runs entirely off 5 Megabytes of natively instantiated Demo Mode JSON data (`mock-db-members.json`, etc.). You do not need a live database to boot the application immediately!
