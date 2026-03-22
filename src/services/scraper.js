// src/services/scraper.js
import axios from 'axios';
import * as cheerio from 'cheerio';

const HTTP_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
};

/**
 * Safely fetch a URL and return parsed Cheerio object + raw HTML.
 * Returns null on failure.
 */
async function fetchPage(url) {
  try {
    const response = await axios.get(url, {
      headers: HTTP_HEADERS,
      timeout: 12000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(response.data);
    return { $, html: response.data };
  } catch {
    return null;
  }
}

/**
 * Extract key information from a loaded Cheerio page.
 */
function extractPageData($, url) {
  const title = $('title').first().text().trim();
  const metaDesc =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    '';
  const ogTitle = $('meta[property="og:title"]').attr('content') || '';
  const ogSiteName = $('meta[property="og:site_name"]').attr('content') || '';
  const ogImage = $('meta[property="og:image"]').attr('content') || '';
  const twitterDesc = $('meta[name="twitter:description"]').attr('content') || '';
  const canonical = $('link[rel="canonical"]').attr('href') || url;

  // Company name heuristic: og:site_name > og:title > <title> first segment
  const companyName =
    ogSiteName ||
    ogTitle ||
    title.split(/[-|–—]/)[0].trim() ||
    new URL(canonical).hostname.replace('www.', '');

  // Extract body text in a meaningful order: headings first, then paragraphs
  const headings = [];
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 2) headings.push(text);
  });

  const paragraphs = [];
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 40) paragraphs.push(text);
  });

  // Navigation links (useful for understanding site structure/products)
  const navLinks = [];
  $('nav a, header a').each((_, el) => {
    const text = $(el).text().trim();
    if (text && text.length > 1 && text.length < 50) navLinks.push(text);
  });

  // Collect key phrases from footer (often contains product/company info)
  const footerText = $('footer').text().replace(/\s+/g, ' ').trim().slice(0, 600);

  return {
    url,
    companyName,
    title,
    metaDescription: metaDesc || twitterDesc,
    headings: [...new Set(headings)].slice(0, 20),
    paragraphs: paragraphs.slice(0, 15),
    navLinks: [...new Set(navLinks)].slice(0, 20),
    footerText,
    ogImage,
  };
}

/**
 * Try to find and scrape an "About" page for richer company context.
 */
async function scrapeAboutPage(baseUrl, $root) {
  const candidates = [];
  $root('a').each((_, el) => {
    const href = $root(el).attr('href') || '';
    const text = $root(el).text().toLowerCase().trim();
    if (
      /about|company|mission|team|who-we-are|our-story/.test(text) ||
      /\/about|\/company|\/mission/.test(href)
    ) {
      try {
        const absoluteUrl = href.startsWith('http') ? href : new URL(href, baseUrl).href;
        if (absoluteUrl.startsWith(baseUrl) || absoluteUrl.includes(new URL(baseUrl).hostname)) {
          candidates.push(absoluteUrl);
        }
      } catch {
        // ignore malformed URLs
      }
    }
  });

  // Deduplicate and try the first valid candidate
  const unique = [...new Set(candidates)];
  for (const url of unique.slice(0, 3)) {
    const result = await fetchPage(url);
    if (result) {
      const data = extractPageData(result.$, url);
      return data;
    }
  }
  return null;
}

/**
 * Main scraper entrypoint.
 * @param {string} inputUrl - The target company website URL
 * @returns {Promise<object>} - Structured company data for strategy generation
 */
export async function scrapeCompany(inputUrl) {
  // Normalise URL
  const url = inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`;
  const baseUrl = `${new URL(url).protocol}//${new URL(url).hostname}`;

  // Scrape main page
  const mainResult = await fetchPage(url);
  if (!mainResult) {
    throw new Error(`Could not fetch the URL: ${url}. Please check the URL and try again.`);
  }

  const mainData = extractPageData(mainResult.$, url);

  // Try scraping the About page for additional context
  const aboutData = await scrapeAboutPage(baseUrl, mainResult.$);

  // Merge data — prefer longer/richer values
  const combined = {
    url,
    companyName: mainData.companyName,
    title: mainData.title,
    metaDescription: mainData.metaDescription,
    headings: [...new Set([...mainData.headings, ...(aboutData?.headings || [])])].slice(0, 25),
    paragraphs: [...mainData.paragraphs, ...(aboutData?.paragraphs || [])].slice(0, 20),
    navLinks: [...new Set([...mainData.navLinks, ...(aboutData?.navLinks || [])])].slice(0, 25),
    aboutContent: aboutData
      ? aboutData.paragraphs.join(' ').slice(0, 3000)
      : mainData.paragraphs.join(' ').slice(0, 3000),
    footerText: mainData.footerText,
    ogImage: mainData.ogImage,
    scrapedAt: new Date().toISOString(),
  };

  return combined;
}
