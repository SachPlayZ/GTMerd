// src/index.js
import 'dotenv/config';
import express from 'express';
import { config } from './config/index.js';
import { scrapeCompany } from './services/scraper.js';
import { generateGTMStrategy } from './services/strategyGenerator.js';
import { generatePDF } from './services/pdfGenerator.js';
import { uploadToS3 } from './services/s3Uploader.js';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

/**
 * Health check
 */
app.get('/health', (_, res) => res.json({ status: 'ok' }));

/**
 * POST /api/generate-gtm
 * Body: { "url": "https://example.com" }
 * Returns: { success: true, data: { companyName, pdfUrl, generatedAt } }
 */
app.post('/api/generate-gtm', async (req, res) => {
  const { url } = req.body;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Request body must contain a "url" string field.',
    });
  }

  // Basic URL sanity check
  try {
    new URL(url.startsWith('http') ? url : `https://${url}`);
  } catch {
    return res.status(400).json({
      success: false,
      error: `Invalid URL: "${url}"`,
    });
  }

  console.log(`\n[GTMerd] ► Starting pipeline for: ${url}`);
  const startTime = Date.now();

  try {
    // 1. Scrape
    console.log('[GTMerd] [1/4] Scraping website...');
    const companyData = await scrapeCompany(url);
    console.log(`[GTMerd]       Company identified: ${companyData.companyName}`);

    // 2. Generate Strategy
    console.log('[GTMerd] [2/4] Generating GTM strategy with Gemini...');
    const strategy = await generateGTMStrategy(companyData);
    console.log('[GTMerd]       Strategy generated ✓');

    // 3. Generate PDF
    console.log('[GTMerd] [3/4] Building PDF document...');
    const pdfBuffer = await generatePDF(strategy);
    console.log(`[GTMerd]       PDF size: ${(pdfBuffer.length / 1024).toFixed(1)} KB`);

    // 4. Upload to S3
    console.log('[GTMerd] [4/4] Uploading to S3...');
    const slug = (strategy.companyName || 'company')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const fileName = `gtm-strategy-${slug}-${uuidv4()}.pdf`;
    const pdfUrl = await uploadToS3(pdfBuffer, fileName);
    console.log(`[GTMerd]       Uploaded ✓ → ${pdfUrl}`);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[GTMerd] ✅ Done in ${elapsed}s\n`);

    return res.status(200).json({
      pdfUrl
    });
  } catch (err) {
    console.error('[GTMerd] ✗ Pipeline error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message || 'An unexpected error occurred.',
    });
  }
});

app.listen(config.port, () => {
  console.log(`[GTMerd] Server running on http://localhost:${config.port}`);
  console.log(`[GTMerd] POST /api/generate-gtm  { "url": "https://example.com" }`);
});
