import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Function to read the website (NOW WITH BROWSER DISGUISE)
async function scrapeArticleText(url) {
  try {
    // We add headers so Prothom Alo and Daily Star think we are a real human on Chrome
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000 // 10 second timeout so it doesn't freeze
    });
    
    const $ = cheerio.load(data);
    $('script, style, nav, footer, header, aside').remove(); 
    const text = $('p').map((i, el) => $(el).text()).get().join(' ');
    
    return text.substring(0, 5000); 
  } catch (error) {
    console.error(`❌ Failed to scrape ${url}:`, error.message);
    return null; // If blocked, return null so we don't crash
  }
}

// 2. Function to ask Gemini to format it
async function analyzeWithGemini(articleText) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are an expert news analyst. 
    Read the following article and extract the data strictly as JSON.
    
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
  return JSON.parse(result.response.text());
}

// 3. The Main Execution Loop
export async function processNewArticles(pool) {
  console.log("🤖 Starting AI News Processor...");
  
  try {
    // THE FIX: Updated SQL query to catch 'Auto-generated description' and the massive text dumps
    const [unprocessedArticles] = await pool.execute(
      `SELECT article_id, article_url 
       FROM news_article 
       WHERE summary IS NULL 
          OR summary = 'Click to read more.'
          OR summary = 'Auto-generated description'
          OR LENGTH(summary) < 25 
          OR LENGTH(summary) > 500 -- Catches the articles where the full text was accidentally dumped into the summary
       LIMIT 5`
    );

    if (unprocessedArticles.length === 0) {
      console.log("✅ No new articles to process right now.");
      return;
    }

    for (const article of unprocessedArticles) {
      console.log(`\n⏳ Processing Article ID ${article.article_id}: ${article.article_url}`);
      
      const rawText = await scrapeArticleText(article.article_url);
      
      // If the scraper failed (blocked), we skip it so we don't send empty text to Gemini
      if (!rawText || rawText.trim() === '') {
          console.log(`⚠️ Could not extract text for ID ${article.article_id}. Skipping.`);
          continue; 
      }

      console.log(`🧠 Text scraped successfully. Sending to Gemini...`);
      const aiData = await analyzeWithGemini(rawText);
      console.log("✨ Gemini Output:", aiData);

      // C. Update the database with the AI's JSON data
      await pool.execute(
        `UPDATE news_article 
         SET title = ?, summary = ?, category = ? 
         WHERE article_id = ?`,
        [aiData.title, aiData.summary, aiData.category, article.article_id]
      );
      
      console.log(`✅ Successfully updated database for article ${article.article_id}`);
      
      // Wait 3 seconds to respect Gemini's free tier rate limits
      await new Promise(resolve => setTimeout(resolve, 3000)); 
    }
  } catch (error) {
    console.error("Pipeline Error:", error);
  }
}