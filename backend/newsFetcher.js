import cron from 'node-cron';
import Parser from 'rss-parser';

const parser = new Parser();

// Export a function that accepts your database pool
export const startNewsFetcher = (pool) => {
  
  // This CRON expression means: Run at minute 0 and 30 past the hour (every 30 mins)
  cron.schedule('* * * * *', async () => {
    console.log('🔄 [CRON] Starting 30-minute news fetch cycle...');

    try {
      // 1. Get all active RSS feeds from your database
      const [sources] = await pool.execute(
        'SELECT source_id, source_name, rss_url FROM news_source WHERE rss_url IS NOT NULL'
      );

      for (const source of sources) {
        console.log(`📡 Fetching feed for: ${source.source_name}...`);
        
        try {
          // 2. Parse the live RSS feed
          const feed = await parser.parseURL(source.rss_url);
          let newArticlesCount = 0;
          
          for (const item of feed.items) {
            // 3. Check if we already saved this article (prevent duplicates)
            const [existing] = await pool.execute(
              'SELECT article_id FROM news_article WHERE article_url = ?',
              [item.link]
            );

            if (existing.length === 0) {
              // 4. Create a generic "Event" first to satisfy your database rules
              // (Using Region 1 / Dhaka as a default placeholder for now)
              const [eventResult] = await pool.execute(
                `INSERT INTO event (region_id, canonical_title, event_description, event_type) 
                 VALUES (?, ?, ?, ?)`,
                [1, item.title, item.contentSnippet || 'Auto-generated description', 'Uncategorized']
              );
              
              const newEventId = eventResult.insertId;

              // 5. Insert the actual News Article linked to the new Event and the Source
              // We safely format the date to MySQL datetime format
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
                  'General', // Default category
                  item.link
                ]
              );
              
              newArticlesCount++;
            }
          }
          console.log(`✅ ${source.source_name}: Added ${newArticlesCount} new articles.`);
        } catch (feedError) {
          console.error(`❌ Failed to process feed ${source.rss_url}:`, feedError.message);
        }
      }
      console.log('🏁 [CRON] News fetch cycle complete.');
    } catch (dbError) {
      console.error('💥 Database error during fetch cycle:', dbError);
    }
  });

  console.log('⏱️ News Fetcher CRON job scheduled (runs every 30 mins).');
};