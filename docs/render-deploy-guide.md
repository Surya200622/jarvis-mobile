# Render Deploy Guide for J.A.R.V.I.S

## 1) Service Settings

- Platform: Render Web Service
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`
- Health Check Path: `/api/status`

## 2) Required Environment Variables

Set these in Render -> Service -> Environment.

```env
NODE_ENV=production
PORT=10000
JARVIS_AUTH_TOKEN=MIuwxfNcWq1GeAJBh3Rida0lFKz4b9vmnEHLtpDjXkYOgPS2
JARVIS_CLOUD_URL=https://your-service-name.onrender.com
```

## 3) Optional AI Provider Variables

Add only providers you actively use:

```env
GEMINI_API_KEY=
GROQ_API_KEY=
COHERE_API_KEY=
HF_API_KEY=
```

If your backend depends on workflow automation:

```env
N8N_WEBHOOK_URL=
N8N_API_KEY=
```

## 4) Verify Deployment

After deploy, verify:

- `GET https://your-service-name.onrender.com/api/status`
- `POST https://your-service-name.onrender.com/api/auth` with:

```json
{"token":"MIuwxfNcWq1GeAJBh3Rida0lFKz4b9vmnEHLtpDjXkYOgPS2"}
```

## 5) Connect App

Login in mobile app with:

- Server URL: `https://your-service-name.onrender.com`
- Access Token: `MIuwxfNcWq1GeAJBh3Rida0lFKz4b9vmnEHLtpDjXkYOgPS2`

