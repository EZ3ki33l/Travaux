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
  
  // Extraction du titre avec plusieurs patterns
  let name = '';
  const titlePatterns = [
    /<h1[^>]*>([^<]+)<\/h1>/,
    /<title[^>]*>([^|<-]+)(?:\||<|-)/,
    /<meta[^>]+og:title[^>]+content="([^"]+)"/,
    /<meta[^>]+name="title"[^>]+content="([^"]+)"/
  ];
  
  for (const pattern of titlePatterns) {
    const match = html.match(pattern);
    if (match && match[1].trim()) {
      name = decodeHTMLEntities(match[1].trim());
      break;
    }
  }

  // Images
  const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g;
  const images = [];
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    if (!match[1].includes('logo') && !match[1].includes('icon') && !match[1].endsWith('.svg')) {
      images.push(match[1]);
    }
  }

  // Prix avec plusieurs patterns
  let price = null;
  const cleanHtml = html.replace(/\s+/g, ' ');
  
  // Pattern spécifique pour Brico Dépôt
  if (url.includes('bricodepot')) {
    const priceRegex = /(\d+)\s*(?:€|&euro;|EUR)\s*00\b/g;
    let maxPrice = 0;
    let match;
    
    while ((match = priceRegex.exec(cleanHtml)) !== null) {
      const num = parseInt(match[1]);
      if (num >= 20 && num < 10000 && num > maxPrice) {
        maxPrice = num;
      }
    }
    
    if (maxPrice > 0) {
      price = maxPrice.toString();
    }
  }

  // Si pas de prix trouvé, essayer les patterns génériques
  if (!price) {
    const pricePatterns = [
      /data-price-value="(\d+(?:[.,]\d{2})?)"/,
      /class="[^"]*price-value[^"]*"[^>]*>([^<]*?)(?:\s*€|&euro;|EUR)/i,
      /class="[^"]*current-price[^"]*"[^>]*>([^<]*?)(?:\s*€|&euro;|EUR)/i,
      /itemprop="price"[^>]*content="(\d+(?:[.,]\d{2})?)"[^>]*>/
    ];

    for (const pattern of pricePatterns) {
      const match = html.match(pattern);
      if (match) {
        const rawPrice = match[1].replace(/[^\d.,]/g, '');
        const tempPrice = rawPrice.replace(',', '.');
        const numPrice = parseFloat(tempPrice);
        if (numPrice > 0 && numPrice < 10000) {
          price = tempPrice;
          break;
        }
      }
    }
  }

  // Description avec nettoyage complet du HTML
  const descriptionPatterns = [
    /<meta[^>]+description[^>]+content="([^"]+)"/,
    /<div[^>]+description[^>]*>([^]*?)<\/div>/,
    /<p[^>]+description[^>]*>([^]*?)<\/p>/
  ];

  let description = null;
  for (const pattern of descriptionPatterns) {
    const match = html.match(pattern);
    if (match) {
      // Nettoie le HTML et décode les entités
      description = cleanHTML(decodeHTMLEntities(match[1]));
      break;
    }
  }

  return { 
    name, 
    images: [...new Set(images)], 
    price: price ? parseFloat(price).toFixed(2) : null, 
    description 
  };
};

// Fonction pour nettoyer le HTML
function cleanHTML(text: string) {
  return text
    .replace(/<[^>]+>/g, '') // Supprime les balises HTML
    .replace(/\s+/g, ' ')    // Normalise les espaces
    .trim();
}

// Fonction pour décoder les entités HTML
function decodeHTMLEntities(text: string) {
  const entities: { [key: string]: string } = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#034;': '"',
    '&#039;': "'",
    '&eacute;': 'é',
    '&egrave;': 'è',
    '&agrave;': 'à',
    '&ecirc;': 'ê',
    '&ccedil;': 'ç',
  };
  
  return text
    .replace(/&[^;]+;/g, (entity) => entities[entity] || '')
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec)));
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