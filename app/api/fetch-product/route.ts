import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

const scrapeWithPuppeteer = async (url: string) => {
  let browser;
  try {
    // Configuration spécifique pour Vercel
    if (process.env.VERCEL) {
      console.log('Initialisation de Chrome sur Vercel...');
      chromium.setGraphicsMode = false;
      
      const executablePath = await chromium.executablePath();
      console.log('Chrome executable path:', executablePath);
      
      browser = await puppeteer.launch({
        args: [
          ...chromium.args,
          '--disable-features=AudioServiceOutOfProcess',
          '--disable-gpu',
          '--disable-software-rasterizer',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox'
        ],
        defaultViewport: {
          width: 1920,
          height: 1080
        },
        executablePath,
        headless: true,
        protocolTimeout: 30000
      });
      console.log('Chrome lancé avec succès');
    } else {
      // Configuration locale
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }

    const page = await browser.newPage();
    
    // Optimisations pour réduire l'utilisation de la mémoire
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'stylesheet', 'font'].includes(request.resourceType())) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Configuration minimale du navigateur
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setDefaultNavigationTimeout(10000);

    // Chargement optimisé de la page
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 8000
    });

    // Extraction des données avec un timeout réduit
    const data = await Promise.race([
      page.evaluate(() => {
        const name = document.querySelector('h1')?.textContent?.trim() || '';
        const priceElement = document.querySelector('[data-price], .price, .current-price');
        let price = null;

        if (priceElement) {
          const priceText = priceElement.textContent || '';
          const match = priceText.match(/(\d+[.,]\d{2})/);
          if (match) {
            price = parseFloat(match[1].replace(',', '.'));
          }
        }

        return { 
          name, 
          price: price ? price.toFixed(2) : null, 
          images: [],
          description: null
        };
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
    ]);

    await browser.close();
    return data;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Erreur détaillée:', error);
    throw error;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const data = await scrapeWithPuppeteer(url);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}