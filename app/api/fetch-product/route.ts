import { NextResponse } from 'next/server';
import chromium from 'chrome-aws-lambda';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  let browser = null;

  try {
    console.log(`Fetching data from URL: ${url}`);
    
    browser = await chromium.puppeteer.launch({
      args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath,
      headless: true
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

    // Récupérer le nom du produit
    const productName = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      if (h1) return h1.textContent?.trim();
      return document.title.split('|')[0].trim();
    });

    // Récupérer les images du produit
    const imageLinks = await page.evaluate(() => {
      const uniqueImages = new Set();
      
      Array.from(document.querySelectorAll('img'))
        .filter(img => {
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          const minSize = 200;
          
          return (
            width >= minSize && 
            height >= minSize &&
            !img.src.includes('logo') &&
            !img.src.includes('icon') &&
            !img.src.endsWith('.svg') &&
            img.src
          );
        })
        .forEach(img => uniqueImages.add(img.src));
      
      return Array.from(uniqueImages);
    });

    // Récupérer le prix du produit
    const productPrice = await page.evaluate(() => {
      const priceSelectors = [
        '.current-price',
        '[data-price]',
        '[itemprop="price"]',
        '.product-price',
        '.price'
      ];

      for (const selector of priceSelectors) {
        const priceElement = document.querySelector(selector);
        if (priceElement) {
          const priceText = priceElement.textContent || '';
          const priceMatch = priceText.match(/(\d+[.,]?\d*)/);
          if (priceMatch) {
            return priceMatch[1].replace(',', '.');
          }
        }
      }

      const bodyText = document.body.innerText;
      const priceMatch = bodyText.match(/(\d+[.,]?\d*)\s*€/);
      return priceMatch ? priceMatch[1].replace(',', '.') : null;
    });

    // Récupérer la description du produit
    const productDescription = await page.evaluate(() => {
      const descriptionSelectors = [
        '[itemprop="description"]',
        '.description',
        '.product-description',
        '#description'
      ];

      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return element.textContent?.trim();
        }
      }
      return null;
    });

    if (browser) {
      await browser.close();
    }

    return NextResponse.json({ 
      images: imageLinks, 
      price: productPrice, 
      description: productDescription,
      name: productName
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    if (browser) {
      await browser.close();
    }
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}