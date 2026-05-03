import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Function to read the website
async function scrapeArticleText(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000 
    });
    
    const $ = cheerio.load(data);
    $('script, style, nav, footer, header, aside').remove(); 
    const text = $('p').map((i, el) => $(el).text()).get().join(' ');
    
    return text.substring(0, 5000); 
  } catch (error) {
    console.error(`❌ Failed to scrape ${url}:`, error.message);
    return null; 
  }
}

// 2. Function to ask Gemini to format it 
async function analyzeWithGemini(articleText) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const prompt = `
    You are an expert news analyst. 
    Read the following article and extract the data strictly as a raw JSON object.
    Do NOT wrap the response in markdown blocks (like \`\`\`json). Just output the raw JSON data.
    
    Format:
    {
      "title": "Main headline",
      "summary": "A strict 2-sentence summary",
      "category": "Choose one: Politics, Weather, Tech, Crime, Business, Sports, Local, General",
      "region_name": "The specific district or city (e.g., 'Dhaka', 'Sylhet', 'Chattogram'). If nationwide or international, output 'All'"
    }

    Article Text:
    ${articleText}
  `;

  const result = await model.generateContent(prompt);
  let rawText = result.response.text();

  rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();

  return JSON.parse(rawText);
}

// 3. The Main Execution Loop (Updated for Frontend Button)
export async function processNewArticles(pool) {
  console.log("🤖 Starting AI News Processor...");
  let processedCount = 0; // Track successful updates
  
  try {
    const [unprocessedArticles] = await pool.execute(
      `SELECT article_id, article_url 
       FROM news_article 
       WHERE summary IS NULL 
          OR summary = 'Click to read more.'
          OR summary = 'Auto-generated description'
          OR LENGTH(summary) < 25 
          OR LENGTH(summary) > 500
       LIMIT 5`
    );

    // If database is clean, report back 0 immediately
    if (unprocessedArticles.length === 0) {
      console.log("✅ No new articles to process right now.");
      return 0; 
    }

    for (const article of unprocessedArticles) {
      console.log(`\n⏳ Processing Article ID ${article.article_id}: ${article.article_url}`);
      
      const rawText = await scrapeArticleText(article.article_url);
      
      if (!rawText || rawText.trim() === '') {
          console.log(`⚠️ Could not extract text for ID ${article.article_id}. Skipping.`);
          continue; 
      }

      console.log(`🧠 Text scraped successfully. Sending to Gemini...`);
      const aiData = await analyzeWithGemini(rawText);
      console.log("✨ Gemini Output:", aiData);

      await pool.execute(
        `UPDATE news_article 
         SET title = ?, summary = ?, category = ? 
         WHERE article_id = ?`,
        [aiData.title, aiData.summary, aiData.category, article.article_id]
      );
      
      console.log(`✅ Successfully updated database for article ${article.article_id}`);
      processedCount++; // Increment our counter
      
      await new Promise(resolve => setTimeout(resolve, 3000)); 
    }
    
    return processedCount; // Return the final tally to the frontend
    
  } catch (error) {
    console.error("Pipeline Error:", error);
    throw error; // Pass the error back up to server.js
  }
}