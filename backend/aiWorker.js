import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import 'dotenv/config';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Function to read the website and extract clean text
async function scrapeArticleText(url) {
  try {
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    
    // Remove scripts, styles, and navigation to save Gemini tokens
    $('script, style, nav, footer, header, aside').remove(); 
    
    // Grab all paragraph text and join it together
    const text = $('p').map((i, el) => $(el).text()).get().join(' ');
    
    // Return the first 5000 characters (plenty for Gemini to understand the news)
    return text.substring(0, 5000); 
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error.message);
    return null;
  }
}

// 2. Function to ask Gemini to format it into JSON
async function analyzeWithGemini(articleText) {
  const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash", // Flash is faster and cheaper/freer for this task
    generationConfig: { responseMimeType: "application/json" }
  });

  const prompt = `
    You are an expert news analyst for a Bangladesh news platform. 
    Read the following article and extract the data strictly as JSON.
    
    Format:
    {
      "title": "Main headline",
      "summary": "A strict 2-sentence summary",
      "category": "Choose one: Politics, Weather, Tech, Crime, Business, Sports, Local",
      "region_name": "The specific district or city (e.g., 'Dhaka', 'Sylhet', 'Chattogram'). If nationwide, output 'All'"
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
    // A. Find up to 5 articles that need AI processing
    // Now it looks for NULL, empty strings, OR that specific RSS junk text
    const [unprocessedArticles] = await pool.execute(
      `SELECT article_id, article_url 
       FROM news_article 
       WHERE summary IS NULL 
          OR summary = 'Click to read more.'
          OR summary = ''
          OR LENGTH(summary) < 25 -- Catches very short/broken summaries
       LIMIT 5`
    );

    if (unprocessedArticles.length === 0) {
      console.log("✅ No new articles to process right now.");
      return;
    }

    // B. Process each article one by one
    for (const article of unprocessedArticles) {
      console.log(`Processing: ${article.article_url}`);
      
      const rawText = await scrapeArticleText(article.article_url);
      if (!rawText) continue;

      const aiData = await analyzeWithGemini(rawText);
      console.log("🧠 Gemini Output:", aiData);

      // C. Update the database with the AI's JSON data
      await pool.execute(
        `UPDATE news_article 
         SET title = ?, summary = ?, category = ? 
         WHERE article_id = ?`,
        [aiData.title, aiData.summary, aiData.category, article.article_id]
      );
      
      console.log(`✅ Successfully updated article ${article.article_id}`);
      
      // Wait 3 seconds before asking Gemini again to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 3000)); 
    }
  } catch (error) {
    console.error("Pipeline Error:", error);
  }
}