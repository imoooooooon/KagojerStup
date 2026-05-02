import cron from 'node-cron';
import Parser from 'rss-parser';

// THE FIX: Add a browser disguise and a timeout limit
const parser = new Parser({
  timeout: 15000, // Give up after 15 seconds so one bad site doesn't freeze everything
  headers: {
    // This makes the news sites think you are a real human using Google Chrome
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/rss+xml, application/xml, text/xml; q=0.1'
  }
});

export const startNewsFetcher = (pool) => {
  
  cron.schedule('*/30 * * * *', async () => {
    console.log('🔄 [CRON] Starting 30-minute news fetch cycle...');

    try {
      // 1. Get all RSS feeds (added a check to ignore empty strings)
      const [sources] = await pool.execute(
        "SELECT source_id, source_name, rss_url FROM news_source WHERE rss_url IS NOT NULL AND rss_url != ''"
      );

      for (const source of sources) {
        console.log(`📡 Fetching feed for: ${source.source_name}...`);
        
        try {
          // 2. Parse the RSS feed with our new disguised parser
          // THE FIX: Use AllOrigins as a trusted middleman to bypass Cloudflare/IP blocks
          const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(source.rss_url)}`;
          const feed = await parser.parseURL(proxyUrl);
          let newArticlesCount = 0;
          
          for (const item of feed.items) {
            // 3. Prevent duplicates
            const [existing] = await pool.execute(
              'SELECT article_id FROM news_article WHERE article_url = ?',
              [item.link]
            );

            if (existing.length === 0) {
              // 4. Create dummy event
              const [eventResult] = await pool.execute(
                `INSERT INTO event (region_id, canonical_title, event_description, event_type) 
                 VALUES (?, ?, ?, ?)`,
                [1, item.title, item.contentSnippet || 'Auto-generated description', 'Uncategorized']
              );
              
              const newEventId = eventResult.insertId;

              // 5. Insert News Article safely
              const publishDate = item.pubDate ? new Date(item.pubDate) : new Date();
              
              await pool.execute(
                `INSERT INTO news_article 
                (title, event_id, source_id, summary, published_at, category, article_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  item.title, 
                  newEventId, 
                  source.source_id, 
                  item.contentSnippet || 'Click to read more.', 
                  publishDate, 
                  'General', 
                  item.link
                ]
              );
              
              newArticlesCount++;
            }
          }
          console.log(`✅ ${source.source_name}: Added ${newArticlesCount} new articles.`);
        
        } catch (feedError) {
          // THE FIX: Better error logging so we know EXACTLY why a site failed
          console.error(`❌ Failed on ${source.source_name}: ${feedError.message}`);
        }
      }
      console.log('🏁 [CRON] News fetch cycle complete.');
    } catch (dbError) {
      console.error('💥 Database error during fetch cycle:', dbError);
    }
  });

  console.log('⏱️ News Fetcher CRON job scheduled (runs every 30 mins).');
};