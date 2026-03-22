// src/services/strategyGenerator.js
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Build a rich prompt from scraped company data.
 */
function buildPrompt(companyData) {
  const {
    companyName,
    url,
    metaDescription,
    headings,
    aboutContent,
    navLinks,
    footerText,
  } = companyData;

  return `You are a world-class Go-To-Market (GTM) strategist and management consultant. 
Based on the following information gathered about a company from their website, create a comprehensive, actionable, and insightful GTM strategy document.

---
COMPANY INFORMATION
Website: ${url}
Company Name: ${companyName}
Meta Description: ${metaDescription || 'N/A'}

Page Headings / Key Phrases:
${headings.slice(0, 15).map((h) => `- ${h}`).join('\n')}

Navigation / Product Areas:
${navLinks.slice(0, 15).map((n) => `- ${n}`).join('\n')}

About / Company Content:
${aboutContent?.slice(0, 2500) || 'Not available'}

Footer Information:
${footerText?.slice(0, 400) || 'N/A'}
---

Using the above information, generate a detailed GTM strategy with the following sections. 
For each section, be specific, data-informed (based on what you can infer), and actionable. 
Think like McKinsey meets a Silicon Valley growth hacker.

Respond ONLY with a valid JSON object matching this exact structure (no markdown code fences, just raw JSON):

{
  "companyName": "string",
  "tagline": "string (a crisp 1-line description of what the company does)",
  "executiveSummary": "string (3-5 sentences summarising the GTM opportunity and strategy)",
  "companyOverview": {
    "description": "string",
    "industry": "string",
    "businessModel": "string (e.g. SaaS, Marketplace, E-commerce, Services)",
    "valueProposition": "string",
    "keyProducts": ["string"]
  },
  "targetMarket": {
    "primarySegment": "string",
    "secondarySegments": ["string"],
    "geographies": ["string"],
    "icp": {
      "profile": "string",
      "painPoints": ["string"],
      "buyingTriggers": ["string"]
    },
    "marketSize": "string (TAM/SAM/SOM estimate based on industry knowledge)"
  },
  "competitiveLandscape": {
    "directCompetitors": ["string"],
    "indirectCompetitors": ["string"],
    "competitiveAdvantages": ["string"],
    "potentialThreats": ["string"]
  },
  "positioningAndMessaging": {
    "positioningStatement": "string",
    "coreMessages": ["string"],
    "proofPoints": ["string"],
    "brandTone": "string"
  },
  "channelStrategy": {
    "inbound": ["string"],
    "outbound": ["string"],
    "partnerships": ["string"],
    "contentMarketing": ["string"],
    "paidChannels": ["string"]
  },
  "pricingStrategy": {
    "recommendedModel": "string",
    "tiers": ["string"],
    "rationale": "string"
  },
  "launchTimeline": [
    { "phase": "string", "duration": "string", "keyActions": ["string"] }
  ],
  "kpis": [
    { "metric": "string", "target": "string", "timeframe": "string" }
  ],
  "risks": [
    { "risk": "string", "mitigation": "string" }
  ]
}`;
}

/**
 * Generate a GTM strategy from scraped company data using Gemini.
 * @param {object} companyData - Output from the scraper
 * @returns {Promise<object>} - Parsed GTM strategy JSON
 */
export async function generateGTMStrategy(companyData) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = buildPrompt(companyData);

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  });

  const responseText = result.response.text();

  // Strip any accidental markdown fences (```json ... ```)
  const cleaned = responseText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const strategy = JSON.parse(cleaned);
    // Ensure companyName is set
    if (!strategy.companyName) {
      strategy.companyName = companyData.companyName;
    }
    return strategy;
  } catch (err) {
    throw new Error(
      `Failed to parse Gemini response as JSON. Raw output:\n${responseText.slice(0, 500)}`
    );
  }
}
