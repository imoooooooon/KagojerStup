import cron from 'node-cron';

export const startNewsFetcher = (pool) => {
  
  cron.schedule('* * * * *', async () => {
    console.log('🔄 [CRON] Starting 30-minute news fetch cycle using rss2json...');

    try {
      // 1. Get all active RSS feeds
      const [sources] = await pool.execute(
        "SELECT source_id, source_name, rss_url FROM news_source WHERE rss_url IS NOT NULL AND rss_url != ''"
      );

      for (const source of sources) {
        console.log(`📡 Requesting feed for: ${source.source_name}...`);
        
        try {
          // THE FIX: Use the rss2json API to bypass Cloudflare completely
          const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.rss_url)}`;
          
          const response = await fetch(apiUrl);
          const data = await response.json();

          // Check if the API successfully grabbed the feed
          if (data.status !== 'ok') {
            throw new Error(`rss2json failed to read the feed. Message: ${data.message || 'Unknown error'}`);
          }

          let newArticlesCount = 0;
          
          // Data.items contains the perfectly formatted news articles
          for (const item of data.items) {
            
            // 2. Prevent duplicates (using item.link)
            const [existing] = await pool.execute(
              'SELECT article_id FROM news_article WHERE article_url = ?',
              [item.link]
            );

            if (existing.length === 0) {
              // 3. Create dummy event
              const [eventResult] = await pool.execute(
                `INSERT INTO event (region_id, canonical_title, event_description, event_type) 
                 VALUES (?, ?, ?, ?)`,
                [1, item.title, item.description || 'Auto-generated description', 'Uncategorized']
              );
              
              const newEventId = eventResult.insertId;

              // 4. Insert News Article
              // rss2json standardizes the date format into item.pubDate
              const publishDate = item.pubDate ? new Date(item.pubDate) : new Date();
              
              await pool.execute(
                `INSERT INTO news_article 
                (title, event_id, source_id, summary, published_at, category, article_url) 
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                  item.title, 
                  newEventId, 
                  source.source_id, 
                  item.description || 'Click to read more.', 
                  publishDate, 
                  'General', 
                  item.link
                ]
              );
              
              newArticlesCount++;
            }
          }
          console.log(`✅ ${source.source_name}: Added ${newArticlesCount} new articles.`);
        
        } catch (error) {
          console.error(`❌ Failed on ${source.source_name}:`, error.message);
        }
      }
      console.log('🏁 [CRON] News fetch cycle complete.');
    } catch (dbError) {
      console.error('💥 Database error during fetch cycle:', dbError);
    }
  });

  console.log('⏱️ News Fetcher CRON job scheduled (runs every 30 mins).');
};