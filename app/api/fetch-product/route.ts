import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chrome from '@sparticuz/chromium-min';

const scrapeWithPuppeteer = async (url: string) => {
  console.log('Starting scraping process...');
  let browser;

  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      args: [
        ...chrome.args,
        '--hide-scrollbars',
        '--disable-web-security',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ],
      defaultViewport: chrome.defaultViewport,
      executablePath: process.env.CHROME_EXECUTABLE_PATH || await chrome.executablePath(),
      headless: true,
      ignoreHTTPSErrors: true,
    } as any);

    console.log('Creating new page...');
    const page = await browser.newPage();
    
    // Configuration du navigateur
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setDefaultNavigationTimeout(30000);

    console.log('Navigating to URL:', url);
    await page.goto(url, { waitUntil: 'networkidle0' });
    
    // Attendre un peu pour laisser le contenu se charger
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('Extracting data...');
    const data = await page.evaluate(() => {
      const name = document.querySelector('h1')?.textContent?.trim() || '';
      let price = null;
      let description = null;
      const images = new Set<string>();

      // Extraction du prix avec différents sélecteurs
      const priceSelectors = [
        'span[data-price]',
        '[itemprop="price"]',
        '.current-price',
        '.product-price',
        'span[class*="price"]',
        'div[class*="price"]'
      ];

      for (const selector of priceSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const priceText = element.textContent?.trim() || '';
          const match = priceText.match(/(\d+[.,]\d{2}|\d+)\s*€/);
          if (match) {
            price = parseFloat(match[1].replace(',', '.'));
            break;
          }
        }
      }

      // Extraction de la description
      const descriptionSelectors = [
        '.product-description',
        '[itemprop="description"]',
        '.description'
      ];

      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          description = element.textContent.trim();
          break;
        }
      }

      // Extraction des images
      document.querySelectorAll('img[src*="product"], img[src*="media"]').forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (src && !src.includes('logo') && !src.includes('icon')) {
          images.add(src.replace(/\?.*$/, ''));
        }
      });

      return {
        name,
        price: price ? price.toFixed(2) : null,
        description,
        images: Array.from(images)
      };
    });

    console.log('Data extracted:', data);
    await browser.close();
    return data;

  } catch (error) {
    console.error('Error during scraping:', error);
    if (browser) await browser.close();
    throw error;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  console.log('API called with URL:', url);

  if (!url) {
    console.error('No URL provided');
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    console.log('Starting scraping with Puppeteer...');
    const data = await scrapeWithPuppeteer(url);
    console.log('Scraping successful:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in scraping:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}