# GTMerd — AI GTM Strategy Agent

An AI-powered API agent that scrapes a company's website, generates a comprehensive Go-To-Market (GTM) strategy using Google Gemini, produces a polished PDF, uploads it to AWS S3, and returns the URL.

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Then edit .env with your actual keys
```

Required variables in `.env`:
| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Google Gemini API key |
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_REGION` | S3 bucket region (e.g. `us-east-1`) |
| `S3_BUCKET_NAME` | Name of your S3 bucket |

> **Note on S3 Permissions**: Your bucket must allow public `GetObject` for the returned URLs to be accessible. Alternatively, use a CloudFront distribution and set `S3_PUBLIC_BASE_URL` in your `.env`.

### 3. Run the server
```bash
npm run dev      # Development (auto-restarts on change)
npm start        # Production
```

---

## API Usage

### `POST /api/generate-gtm`

**Request:**
```bash
curl -X POST http://localhost:3000/api/generate-gtm \
  -H "Content-Type: application/json" \
  -d '{"url": "https://stripe.com"}'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "companyName": "Stripe",
    "pdfUrl": "https://your-bucket.s3.us-east-1.amazonaws.com/gtm-strategy-stripe-<uuid>.pdf",
    "generatedAt": "2026-03-22T10:45:00.000Z",
    "processingTimeSeconds": 18.4
  }
}
```

### `GET /health`
Returns `{ "status": "ok" }` for health checks.

---

## Architecture

```
POST /api/generate-gtm
        │
        ▼
  [1] Scraper (Axios + Cheerio)
      - Fetches main page + About page
      - Extracts text, headings, meta, nav links
        │
        ▼
  [2] Strategy Generator (Google Gemini 1.5 Flash)
      - Structured JSON GTM strategy prompt
      - 10 sections: Executive Summary → KPIs → Risks
        │
        ▼
  [3] PDF Generator (PDFKit)
      - Cover page, Table of Contents, branded sections
      - KPI table, launch phases, risk mitigations
        │
        ▼
  [4] S3 Uploader (AWS SDK v3)
      - Uploads with unique UUID filename
      - Returns public URL
        │
        ▼
  JSON response with pdfUrl
```

---

## Project Structure

```
GTMerd/
├── src/
│   ├── index.js                   # Express API server
│   ├── config/
│   │   └── index.js               # Env var config & validation
│   └── services/
│       ├── scraper.js             # Web scraping (Axios + Cheerio)
│       ├── strategyGenerator.js   # GTM strategy via Gemini
│       ├── pdfGenerator.js        # PDF creation (PDFKit)
│       └── s3Uploader.js          # AWS S3 upload
├── .env.example
├── .gitignore
└── package.json
```
