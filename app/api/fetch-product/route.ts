import { NextResponse } from 'next/server';
import { chromium } from 'playwright';

interface ScrapedData {
  name: string;
  price: string | null;
  images: string[];
  description: string | null;
}

interface ScrapingError extends Error {
  step?: string;
}

const scrapeWithPlaywright = async (url: string): Promise<ScrapedData> => {
  let browser;
  try {
    console.log('Étape 1: Configuration du navigateur');
    browser = await chromium.launch({
      args: [
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
        '--no-zygote',
        '--no-sandbox'
      ]
    });

    console.log('Étape 2: Création nouvelle page');
    const context = await browser.newContext();
    const page = await context.newPage();

    console.log('Étape 4: Navigation vers', url);
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 8000
    });

    console.log('Étape 5: Extraction des données');
    const data = await Promise.race([
      page.evaluate(() => {
        const name = document.querySelector('h1')?.textContent?.trim() || '';
        const priceElement = document.querySelector('[data-price], .price, .current-price');
        let price = null;

        if (priceElement) {
          const priceText = priceElement.textContent || '';
          const match = priceText.match(/(\d+[.,]\d{2})/);
          if (match) {
            price = parseFloat(match[1].replace(',', '.')).toFixed(2);
          }
        }

        return { 
          name, 
          price, 
          images: [],
          description: null
        };
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout pendant l\'extraction des données')), 5000))
    ]) as ScrapedData;

    console.log('Étape 6: Fermeture du navigateur');
    await browser.close();
    return data;
  } catch (error: unknown) {
    const scrapingError = error as ScrapingError;
    console.error('Erreur pendant le scraping:', {
      step: scrapingError.message?.includes('Timeout') ? 'Extraction des données' : 'Configuration du navigateur',
      message: scrapingError.message,
      stack: scrapingError.stack
    });
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Erreur lors de la fermeture du navigateur:', closeError);
      }
    }
    throw scrapingError;
  }
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    console.log('Démarrage du scraping pour:', url);
    const data = await scrapeWithPlaywright(url);
    console.log('Données récupérées avec succès:', data);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const apiError = error as Error;
    console.error('Erreur complète:', {
      message: apiError.message,
      stack: apiError.stack,
      name: apiError.name
    });
    return NextResponse.json({ 
      error: 'Failed to fetch data',
      details: apiError.message,
      type: apiError.name
    }, { status: 500 });
  }
}