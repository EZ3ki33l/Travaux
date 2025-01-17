import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    console.log(`Fetching data from URL: ${url}`);
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Configurer les en-têtes HTTP pour imiter un navigateur réel
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');

    await page.goto(url, { waitUntil: 'networkidle2' });

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
          // Récupérer les dimensions de l'image
          const width = img.naturalWidth || img.width;
          const height = img.naturalHeight || img.height;
          
          // Filtrer les images trop petites (miniatures/logos)
          const minSize = 200; // Taille minimale en pixels
          
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

    await browser.close();

    console.log(`Images found: ${imageLinks.length}, Price: ${productPrice}, Description: ${productDescription}`);

    return NextResponse.json({ 
      images: imageLinks, 
      price: productPrice, 
      description: productDescription,
      name: productName
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}