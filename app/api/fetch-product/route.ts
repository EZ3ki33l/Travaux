import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium-min';
import puppeteer from 'puppeteer-core';

const scrapeWithPuppeteer = async (url: string) => {
  console.log('Launching browser...');
  
  const executablePath = await chromium.executablePath();

  const browser = await puppeteer.launch({
    args: [...chromium.args, '--hide-scrollbars', '--disable-web-security'],
    defaultViewport: chromium.defaultViewport,
    executablePath: executablePath,
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
  } as any); // Type assertion nécessaire pour les options spécifiques à Vercel

  console.log('Browser launched successfully');

  const page = await browser.newPage();
  console.log('New page created');

  // Configuration plus complète pour simuler un vrai navigateur
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  console.log('Browser configuration set');

  try {
    await page.setDefaultNavigationTimeout(30000);
    console.log('Starting navigation to URL:', url);
    
    // Stratégie de chargement différente selon le site
    if (url.includes('conforama')) {
      // Pour Conforama, on attend juste le chargement initial du DOM
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      // Attendre que le prix soit visible
      await Promise.race([
        page.waitForSelector('[data-testid="product-price"]', { timeout: 5000 }),
        page.waitForSelector('.current-price', { timeout: 5000 }),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    } 
    // Pour Leroy Merlin
    else if (url.includes('leroymerlin')) {
      // Désactiver JavaScript pour éviter les problèmes de message channel
      await page.setJavaScriptEnabled(false);
      
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      
      // Réactiver JavaScript après le chargement initial
      await page.setJavaScriptEnabled(true);
      
      // Attendre un court instant pour laisser le contenu se charger
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    // Pour Castorama
    else if (url.includes('castorama')) {
      console.log('Detected Castorama site');
      await page.setJavaScriptEnabled(false);
      console.log('JavaScript disabled');
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      console.log('Page loaded with JS disabled');

      // Log du contenu HTML pour debug
      const pageContent = await page.content();
      console.log('Page content length:', pageContent.length);
      console.log('Page content preview:', pageContent.substring(0, 500));

      await page.setJavaScriptEnabled(true);
      console.log('JavaScript re-enabled');
      
      console.log('Waiting for important elements...');
      try {
        await Promise.race([
          page.waitForSelector('h1[itemprop="name"]').then(() => console.log('Found h1 title')),
          page.waitForSelector('span[data-price]').then(() => console.log('Found price span')),
          page.waitForSelector('.product-description').then(() => console.log('Found description')),
          new Promise(resolve => setTimeout(resolve, 5000)).then(() => console.log('Timeout reached'))
        ]);
      } catch (error) {
        console.error('Error waiting for selectors:', error);
      }

      // Vérifier si les éléments sont présents
      const title = await page.$('h1[itemprop="name"]');
      const price = await page.$('span[data-price]');
      const description = await page.$('.product-description');
      
      console.log('Elements found:', {
        hasTitle: !!title,
        hasPrice: !!price,
        hasDescription: !!description
      });

      if (title) {
        const titleText = await page.evaluate(el => el.textContent, title);
        console.log('Title text:', titleText);
      }

      if (price) {
        const priceText = await page.evaluate(el => el.textContent, price);
        console.log('Price text:', priceText);
      }
    }
    else {
      // Pour les autres sites, on attend que tout soit chargé
      await page.goto(url, { waitUntil: 'networkidle0' });
    }

    // Vérifier si la page est bien chargée
    const content = await page.content();
    if (!content || content.length < 100) {
      throw new Error('Page content not loaded properly');
    }

  const data = await page.evaluate(() => {
      let name = '';
      let price = null;
      let description = null;
      const images = new Set();

      // Pour Castorama
      if (window.location.hostname.includes('castorama')) {
        console.log('Extracting data for Castorama');
        
        // Titre
        const titleElement = document.querySelector('h1[itemprop="name"]') || document.querySelector('h1');
        name = titleElement?.textContent?.trim() || '';
        console.log('Found title:', name);

        // Prix - Essayer plusieurs méthodes
        const priceSelectors = [
          'span[data-price]',
          'span[class*="price"]',
          'div[class*="price"]',
          '[itemprop="price"]',
          '.current-price',
          '.product-price',
          '.price-wrapper'
        ];

        console.log('Trying price selectors...');
        // 1. Chercher dans les attributs data et content
        for (const selector of priceSelectors) {
          console.log('Trying selector:', selector);
          const elements = document.querySelectorAll(selector);
          console.log(`Found ${elements.length} elements for selector ${selector}`);
          
          for (const element of elements) {
            // Vérifier d'abord les attributs
            const dataPrice = element.getAttribute('data-price') || 
                            element.getAttribute('content');
            
            if (dataPrice) {
              console.log('Found price in attribute:', dataPrice);
              const numPrice = parseFloat(dataPrice.replace(',', '.'));
              if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                price = numPrice;
                console.log('Valid price found:', price);
                break;
              }
            }

            // Sinon vérifier le texte
            const priceText = element.textContent?.trim() || '';
            console.log('Price text content:', priceText);
            
            const patterns = [
              /(\d+[.,]\d{2})\s*€/,           // 299,99 €
              /(\d+)\s*€\s*(\d{2})/,          // 299 € 99
              /(\d+(?:\s*\d+)*)[.,](\d{2})/,  // 1 299,99
              /(\d+(?:\s*\d+)*)/              // 1 299
            ];

            for (const pattern of patterns) {
              const match = priceText.match(pattern);
              if (match) {
                console.log('Pattern match:', match);
                let rawPrice;
                if (match[2]) {
                  rawPrice = `${match[1].replace(/\s+/g, '')}.${match[2]}`;
                } else {
                  rawPrice = match[1].replace(/\s+/g, '').replace(',', '.');
                }
                console.log('Raw price:', rawPrice);
                const numPrice = parseFloat(rawPrice);
                if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                  price = numPrice;
                  console.log('Valid price found:', price);
                  break;
                }
              }
            }
            if (price) break;
          }
          if (price) break;
        }

        // 2. Si toujours pas de prix, chercher dans les scripts JSON
        if (!price) {
          console.log('No price found in HTML, checking JSON-LD...');
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          console.log(`Found ${scripts.length} JSON-LD scripts`);
          
          for (const script of scripts) {
            try {
              const content = script.textContent || '';
              console.log('JSON-LD content:', content.substring(0, 200) + '...');
              
              const jsonData = JSON.parse(content);
              console.log('Parsed JSON data:', JSON.stringify(jsonData, null, 2));
              
              if (jsonData.offers?.price) {
                console.log('Found price in JSON-LD:', jsonData.offers.price);
                const numPrice = parseFloat(jsonData.offers.price);
                if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                  price = numPrice;
                  console.log('Valid price found in JSON-LD:', price);
                  break;
                }
              }
            } catch (e) {
              console.error('Error parsing JSON-LD:', e);
            }
          }
        }

        // Description
        const descElement = document.querySelector('.product-description');
        description = descElement?.textContent?.trim() || null;
        console.log('Found description:', description?.substring(0, 100) + '...');

        // Images
        console.log('Searching for images...');
        document.querySelectorAll('img[src*="product"], img[src*="media"]').forEach(img => {
          const src = (img as HTMLImageElement).src;
          if (src && !src.includes('logo') && !src.includes('icon')) {
            images.add(src.replace(/\?.*$/, ''));
            console.log('Added image:', src);
          }
        });
        console.log('Total images found:', images.size);
      }
      // Pour Conforama
      else if (window.location.hostname.includes('conforama')) {
        // Titre
        const titleSelectors = [
          'h1[data-testid="product-title"]',
          'h1.name',
          'h1.product-title',
          'h1'
        ];

        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent) {
            name = element.textContent.trim();
            break;
          }
        }

        // Prix - essayer plusieurs méthodes pour Conforama
        const priceSelectors = [
          'span[data-testid="product-price"]',
          'span[data-testid="price"]',
          'div[class*="price"]',
          'div[class*="Price"]',
          'span[class*="price"]',
          'span[class*="Price"]'
        ];

        for (const selector of priceSelectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const priceText = element.textContent?.trim() || '';
            // Chercher différents formats de prix
            const patterns = [
              /(\d+[.,]\d{2})\s*€/,           // 299,99 €
              /(\d+)[.,](\d{2})/,             // 299,99 ou 299.99
              /(\d+(?:\s*\d+)*)/              // 299 ou 1 299
            ];

            for (const pattern of patterns) {
              const match = priceText.match(pattern);
              if (match) {
                let rawPrice;
                if (match[2]) {
                  // Si on a capturé les décimales séparément
                  rawPrice = `${match[1]}.${match[2]}`;
                } else {
                  rawPrice = match[1].replace(/\s+/g, '').replace(',', '.');
                }
                const numPrice = parseFloat(rawPrice);
                if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                  price = numPrice;
                  break;
                }
              }
            }
            if (price) break;
          }
          if (price) break;
        }

        // Si toujours pas de prix, chercher dans les scripts
        if (!price) {
          const scripts = document.querySelectorAll('script[type="application/json"], script:not([src])');
          for (const script of scripts) {
            try {
              const content = script.textContent || '';
              // Chercher un objet JSON qui pourrait contenir le prix
              if (content.includes('price') || content.includes('Price')) {
                const jsonMatch = content.match(/\{[^}]*"price":\s*"?(\d+(?:[.,]\d{2})?)"?[^}]*\}/i);
                if (jsonMatch) {
                  const rawPrice = jsonMatch[1].replace(',', '.');
                  const numPrice = parseFloat(rawPrice);
                  if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                    price = numPrice;
                    break;
                  }
                }
              }
            } catch (e) {
              console.error('Erreur parsing script:', e);
            }
          }
        }
      } 
      // Pour Brico Dépôt
      else if (window.location.hostname.includes('bricodepot')) {
        // Titre
        const titleElement = document.querySelector('h1') || document.querySelector('.product-title');
        name = titleElement?.textContent?.trim() || document.title.split('|')[0].trim();

        // Prix - Essayer plusieurs méthodes
        const priceSelectors = [
          '.price-value',
          '.current-price',
          '.product-price',
          '[data-price-value]',
          '[itemprop="price"]',
          '.price'
        ];

        // 1. Chercher dans les attributs data
        const priceElements = document.querySelectorAll(priceSelectors.join(','));
        for (const element of priceElements) {
          // Vérifier les attributs data
          const dataPrice = element.getAttribute('data-price-value') || 
                           element.getAttribute('data-price') || 
                           element.getAttribute('content');
          
          if (dataPrice) {
            const numPrice = parseFloat(dataPrice.replace(',', '.'));
            if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
              price = numPrice;
              break;
            }
          }

          // Vérifier le texte avec différents patterns
          const priceText = element.textContent?.trim() || '';
          const patterns = [
            /(\d+)\s*€\s*00/,               // Format "299 € 00"
            /(\d+[.,]\d{2})\s*€/,           // Format "299,99 €"
            /(\d+(?:\s*\d+)*)/              // Juste les chiffres
          ];

          for (const pattern of patterns) {
            const match = priceText.match(pattern);
            if (match) {
              const rawPrice = match[1].replace(/\s+/g, '').replace(',', '.');
              const numPrice = parseFloat(rawPrice);
              if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                price = numPrice;
                break;
              }
            }
          }
          if (price) break;
        }

        // 2. Si toujours pas de prix, chercher dans tout le HTML pour Brico Dépôt
        if (!price) {
          const fullText = document.body.textContent || '';
          const priceMatch = fullText.match(/(\d+)\s*€\s*00/);
          if (priceMatch) {
            const numPrice = parseInt(priceMatch[1]);
            if (numPrice >= 20 && numPrice < 10000) {
              price = numPrice;
            }
          }
        }
      }
      // Pour Leroy Merlin
      else if (window.location.hostname.includes('leroymerlin')) {
        // Titre
        const titleSelectors = [
          'h1[data-tracking="product-page-title"]',
          'h1.product-title',
          'h1[class*="title"]',
          'h1'
        ];

        for (const selector of titleSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent) {
            name = element.textContent.trim();
            break;
          }
        }

        // Prix
        const priceSelectors = [
          '[data-tracking="product-page-price"]',
          'span[class*="price-integer"]',
          'div[class*="main-price"]',
          'div[class*="product-price"]',
          '[itemprop="price"]',
          'span[class*="price"]'
        ];

        for (const selector of priceSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            // Vérifier d'abord les attributs
            const contentPrice = element.getAttribute('content');
            if (contentPrice) {
              const numPrice = parseFloat(contentPrice);
              if (!isNaN(numPrice) && numPrice > 0) {
                price = numPrice;
                break;
              }
            }

            // Sinon vérifier le texte
            const priceText = element.textContent?.trim() || '';
            const patterns = [
              /(\d+)[.,](\d{2})\s*€/,         // 299,99 €
              /(\d+)\s*€\s*(\d{2})/,          // 299 € 99
              /(\d+(?:\s*\d+)*)[.,](\d{2})/,  // 1 299,99
              /(\d+(?:\s*\d+)*)/              // 1 299
            ];

            for (const pattern of patterns) {
              const match = priceText.match(pattern);
              if (match) {
                let rawPrice;
                if (match[2]) {
                  // Si on a capturé les décimales
                  rawPrice = `${match[1].replace(/\s+/g, '')}.${match[2]}`;
                } else {
                  rawPrice = match[1].replace(/\s+/g, '');
                }
                const numPrice = parseFloat(rawPrice);
                if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                  price = numPrice;
                  break;
                }
              }
            }
          }
          if (price) break;
        }

        // Si toujours pas de prix, chercher dans les scripts
        if (!price) {
          const scripts = document.querySelectorAll('script[type="application/ld+json"]');
          for (const script of scripts) {
            try {
              const jsonData = JSON.parse(script.textContent || '');
              if (jsonData.offers?.price) {
                const numPrice = parseFloat(jsonData.offers.price);
                if (!isNaN(numPrice) && numPrice > 0 && numPrice < 10000) {
                  price = numPrice;
                  break;
                }
              }
            } catch (e) {
              console.error('Erreur parsing JSON-LD:', e);
            }
          }
        }
      }
      // Pour les autres sites
      else {
        const titleElement = document.querySelector('h1') || document.querySelector('.product-title');
        name = titleElement?.textContent?.trim() || document.title.split('|')[0].trim();

    const priceElement = document.querySelector('.current-price, [data-price], [itemprop="price"], .product-price, .price');
        if (priceElement?.textContent) {
          const priceText = priceElement.textContent.trim();
          const priceMatch = priceText.match(/(\d+(?:[.,]\d{2})?)/);
          price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : null;
        }
      }

      // Images (uniquement les URLs, sans charger les images)
      document.querySelectorAll('img[src]').forEach(img => {
        const src = (img as HTMLImageElement).src;
        if (src && 
            !src.includes('logo') && 
            !src.includes('icon') && 
            !src.endsWith('.svg') &&
            !src.includes('placeholder')) {
          images.add(src.replace(/\?.*$/, ''));
        }
      });

      return { 
        name, 
        images: Array.from(images), 
        price: price ? price.toFixed(2) : null, 
        description
      };
  });

  await browser.close();
  return data;
  } catch (error) {
    console.error('Erreur lors du scraping:', error);
    await browser.close();
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