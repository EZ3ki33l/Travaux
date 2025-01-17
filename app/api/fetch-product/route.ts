import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

const scrapeWithPuppeteer = async (url: string) => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3');
  await page.goto(url, { waitUntil: 'networkidle2' });

  const data = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const name = h1 ? h1.textContent?.trim() : document.title.split('|')[0].trim();

    const images = Array.from(document.querySelectorAll('img'))
      .filter(img => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        return (
          width >= 200 && 
          height >= 200 &&
          !img.src.includes('logo') &&
          !img.src.includes('icon') &&
          !img.src.endsWith('.svg') &&
          img.src
        );
      })
      .map(img => img.src);

    const priceElement = document.querySelector('.current-price, [data-price], [itemprop="price"], .product-price, .price');
    const priceText = priceElement?.textContent || '';
    const priceMatch = priceText.match(/(\d+[.,]?\d*)/);
    const price = priceMatch ? priceMatch[1].replace(',', '.') : null;

    const descElement = document.querySelector('[itemprop="description"], .description, .product-description, #description');
    const description = descElement?.textContent?.trim() || null;

    return { name, images: [...new Set(images)], price, description };
  });

  await browser.close();
  return data;
};

const scrapeWithFetch = async (url: string) => {
  const response = await fetch(url);
  const html = await response.text();
  
  // Extraction basique avec des regex
  const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
  const name = nameMatch ? nameMatch[1].trim() : '';

  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  const images = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (!match[1].includes('logo') && !match[1].includes('icon') && !match[1].endsWith('.svg')) {
      images.push(match[1]);
    }
  }

  // Amélioration de l'extraction du prix
  const priceRegex = /[€]?\s*(\d+(?:[.,]\d{2})?)\s*€/;
  const priceMatch = html.match(priceRegex);
  const price = priceMatch ? priceMatch[1].replace(',', '.') : null;

  // Décodage du HTML dans la description
  const descMatch = html.match(/<meta[^>]+description[^>]+content="([^"]+)"/);
  const description = descMatch 
    ? decodeHTMLEntities(descMatch[1])
    : null;

  return { name, images: [...new Set(images)], price, description };
};

// Fonction pour décoder les entités HTML
function decodeHTMLEntities(text: string) {
  const entities: { [key: string]: string } = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#034;': '"',
    '&#039;': "'",
  };
  
  return text.replace(/&[^;]+;/g, (entity) => {
    return entities[entity] || entity;
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  try {
    const data = process.env.VERCEL 
      ? await scrapeWithFetch(url)
      : await scrapeWithPuppeteer(url);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}