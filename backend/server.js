import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcrypt';
import { startNewsFetcher } from './newsFetcher.js';
import { processNewArticles } from './aiWorker.js';

const app = express();
app.use(cors());
app.use(express.json());

// Create database connection pool using your existing .env structure
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Start the RSS news fetcher 
startNewsFetcher(pool);

// ==========================================
// 1. NEWS FEED ENDPOINTS
// ==========================================

// API Endpoint: Get localized news feed (Public)
app.get('/api/news', async (req, res) => {
  try {
    const { region } = req.query;

    let sqlQuery = `
      SELECT 
        na.article_id AS id, 
        na.title, 
        na.article_url AS url,
        na.summary,
        na.translation, 
        na.category, 
        na.published_at AS time,
        r.region_name AS region,
        
        (
          SELECT LEAST(100, ROUND(AVG(ns2.trust_weight) * 10 + (COUNT(DISTINCT na2.source_id) - 1) * 5))
          FROM news_article na2
          JOIN news_source ns2 ON na2.source_id = ns2.source_id
          WHERE na2.event_id = na.event_id
        ) AS base_score,

        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_real') AS real_votes,
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_fake') AS fake_votes,

        (
          SELECT GROUP_CONCAT(DISTINCT ns3.source_name SEPARATOR '||')
          FROM news_article na3
          JOIN news_source ns3 ON na3.source_id = ns3.source_id
          WHERE na3.event_id = na.event_id
        ) AS all_event_sources

      FROM news_article na
      JOIN event e ON na.event_id = e.event_id
      JOIN region r ON e.region_id = r.region_id
    `;

    const queryParams = [];
    if (region && region !== 'All') {
      sqlQuery += ` WHERE r.region_name = ? `;
      queryParams.push(region);
    }
    
    sqlQuery += ` ORDER BY na.published_at DESC`;

    const [rows] = await pool.execute(sqlQuery, queryParams);

    const formattedData = rows.map(row => {
      let finalScore = row.base_score + (row.real_votes * 2) - (row.fake_votes * 5);
      finalScore = Math.max(0, Math.min(100, finalScore));

      return {
        id: row.id,
        title: row.title,
        url: row.url,
        summary: row.summary,
        translation: row.translation,
        sources: row.all_event_sources ? row.all_event_sources.split('||') : ['Unknown Source'], 
        region: row.region,
        category: row.category,
        score: finalScore,
        realVotes: row.real_votes,
        fakeVotes: row.fake_votes,
        time: row.time,
        distance: region === 'All' ? 'National' : 'Local Priority'
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// API Endpoint: Get Personalized News Feed (Logged In - AI Recommended)
app.get('/api/news/personalized', async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // 1. Calculate Category Affinity (What topics do they like?)
    const [categoryPrefs] = await pool.execute(`
      SELECT na.category, COUNT(*) as weight
      FROM user_activity ua
      JOIN news_article na ON ua.article_id = na.article_id
      WHERE ua.user_id = ?
      GROUP BY na.category
      ORDER BY weight DESC
    `, [userId]);
    const preferredCategories = categoryPrefs.reduce((acc, curr) => {
      acc[curr.category] = curr.weight;
      return acc;
    }, {});

    // 2. Get Followed Sources (What portals do they trust?)
    const [follows] = await pool.execute(`
      SELECT ns.source_name 
      FROM follows f 
      JOIN news_source ns ON f.source_id = ns.source_id 
      WHERE f.user_id = ?
    `, [userId]);
    const followedSourceNames = follows.map(f => f.source_name);

    // 3. Fetch the last articles to score them
    let sqlQuery = `
      SELECT 
        na.article_id AS id, 
        na.title, 
        na.article_url AS url,
        na.summary, 
        na.translation,
        na.category, 
        na.published_at AS time,
        r.region_name AS region,
        
        (
          SELECT LEAST(100, ROUND(AVG(ns2.trust_weight) * 10 + (COUNT(DISTINCT na2.source_id) - 1) * 5))
          FROM news_article na2
          JOIN news_source ns2 ON na2.source_id = ns2.source_id
          WHERE na2.event_id = na.event_id
        ) AS base_score,

        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_real') AS real_votes,
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_fake') AS fake_votes,

        (
          SELECT GROUP_CONCAT(DISTINCT ns3.source_name SEPARATOR '||')
          FROM news_article na3
          JOIN news_source ns3 ON na3.source_id = ns3.source_id
          WHERE na3.event_id = na.event_id
        ) AS all_event_sources

      FROM news_article na
      JOIN event e ON na.event_id = e.event_id
      JOIN region r ON e.region_id = r.region_id
      ORDER BY na.published_at DESC 
    `;

    const [rows] = await pool.execute(sqlQuery);

    // 4. The Recommendation Engine Algorithm
    let formattedData = rows.map(row => {
      let finalScore = row.base_score + (row.real_votes * 2) - (row.fake_votes * 5);
      finalScore = Math.max(0, Math.min(100, finalScore));

      let personalSortWeight = finalScore; 
      
      // Boost 1: Category Match (More clicks = higher boost)
      if (preferredCategories[row.category]) {
        // THE FIX: Cap the category boost at 40 points. 
        // Without this Math.min limit, clicking a category 50 times adds 500 points and permanently breaks the feed!
        personalSortWeight += Math.min(preferredCategories[row.category] * 10, 40); 
      }

      // Boost 2: Followed Source Match
      const articleSources = row.all_event_sources ? row.all_event_sources.split('||') : [];
      const hasFollowedSource = articleSources.some(source => followedSourceNames.includes(source));
      if (hasFollowedSource) {
        personalSortWeight += 50; 
      }

      // Penalty: Age Degradation (Older news loses relevance)
      const hoursOld = Math.max(0, (new Date() - new Date(row.time)) / (1000 * 60 * 60));
      // THE FIX: Cap the maximum age penalty at 30 points so older high-quality news isn't destroyed
      personalSortWeight -= Math.min(hoursOld * 0.5, 30);

      return {
        id: row.id,
        title: row.title,
        url: row.url,
        summary: row.summary,
        translation: row.translation,
        sources: articleSources.length > 0 ? articleSources : ['Unknown Source'], 
        region: row.region,
        category: row.category,
        score: finalScore,
        sortWeight: personalSortWeight, 
        realVotes: row.real_votes,
        fakeVotes: row.fake_votes,
        time: row.time 
      };
    });

    // Sort by the algorithm's weight, then slice the top 12
    formattedData.sort((a, b) => b.sortWeight - a.sortWeight);
    res.json(formattedData.slice(0, 12)); 

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Personalized feed generation failed' });
  }
});

// NEW API Endpoint: Get Single Specific News Article (For Shared Links)
app.get('/api/news/:articleId', async (req, res) => {
  try {
    const { articleId } = req.params;
    const sqlQuery = `
      SELECT 
        na.article_id AS id, 
        na.title, 
        na.article_url AS url,
        na.summary, 
        na.translation, 
        na.category, 
        na.published_at AS time,
        r.region_name AS region,
        (
          SELECT LEAST(100, ROUND(AVG(ns2.trust_weight) * 10 + (COUNT(DISTINCT na2.source_id) - 1) * 5))
          FROM news_article na2 JOIN news_source ns2 ON na2.source_id = ns2.source_id WHERE na2.event_id = na.event_id
        ) AS base_score,
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_real') AS real_votes,
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_fake') AS fake_votes,
        (
          SELECT GROUP_CONCAT(DISTINCT ns3.source_name SEPARATOR '||')
          FROM news_article na3 JOIN news_source ns3 ON na3.source_id = ns3.source_id WHERE na3.event_id = na.event_id
        ) AS all_event_sources
      FROM news_article na
      JOIN event e ON na.event_id = e.event_id
      JOIN region r ON e.region_id = r.region_id
      WHERE na.article_id = ?
    `;
    
    const [rows] = await pool.execute(sqlQuery, [articleId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }

    const row = rows[0];
    const finalScore = Math.max(0, Math.min(100, row.base_score + (row.real_votes * 2) - (row.fake_votes * 5)));
    
    res.json({
      id: row.id, 
      title: row.title, 
      url: row.url, 
      summary: row.summary, 
      translation: row.translation,
      sources: row.all_event_sources ? row.all_event_sources.split('||') : ['Unknown Source'], 
      region: row.region, 
      category: row.category, 
      score: finalScore,
      realVotes: row.real_votes, 
      fakeVotes: row.fake_votes, 
      time: row.time
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});


// ==========================================
// 2. CRISIS ALERTS & MAPS
// ==========================================

app.get('/api/alerts', async (req, res) => {
  try {
    const { region } = req.query;

    if (!region || region === 'All') {
      return res.json([]); 
    }

    const crisisCategories = ['Disaster', 'Flood', 'Weather', 'Protest', 'Health', 'Crime', 'Health Crisis'];

    const sqlQuery = `
      SELECT 
        na.article_id,
        na.title,
        na.category,
        na.published_at,
        r.region_name
      FROM news_article na
      JOIN event e ON na.event_id = e.event_id
      JOIN region r ON e.region_id = r.region_id
      WHERE r.region_name = ? 
        AND na.category IN (?)
        AND na.published_at >= NOW() - INTERVAL 24 HOUR
      ORDER BY na.published_at DESC
      LIMIT 1; 
    `;

    const [rows] = await pool.query(sqlQuery, [region, crisisCategories]);
    res.json(rows);
  } catch (error) {
    console.error("Alert fetch error:", error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

app.get('/api/crises', async (req, res) => {
  try {
    const query = `
      SELECT 
        ce.event_id AS crisis_id, 
        ce.crisis_type, 
        ce.severity_level, 
        ce.latitude, 
        ce.longitude, 
        ce.radius_km, 
        (SELECT title FROM news_article WHERE event_id = ce.event_id LIMIT 1) AS title,
        ca.alert_message AS summary 
      FROM crisis_event ce
      LEFT JOIN crisis_alert ca ON ce.event_id = ca.event_id
      WHERE ce.is_active = TRUE AND ce.latitude IS NOT NULL
    `;
    const [crises] = await pool.execute(query);
    res.json(crises);
  } catch (error) {
    console.error("Failed to fetch crises:", error);
    res.status(500).json({ error: 'Failed to fetch crisis map data' });
  }
});

app.get('/api/map-news', async (req, res) => {
  try {
    const sql = `
      SELECT 
        r.region_name, r.latitude, r.longitude,
        na.article_id, na.title, na.summary, na.translation, na.category, na.published_at, na.article_url,
        ns.source_name
      FROM region r
      JOIN event e ON r.region_id = e.region_id
      JOIN news_article na ON e.event_id = na.event_id
      JOIN news_source ns ON na.source_id = ns.source_id
      WHERE r.latitude IS NOT NULL AND r.longitude IS NOT NULL
      ORDER BY na.published_at DESC
    `;
    const [rows] = await pool.execute(sql);

    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.region_name]) {
        acc[row.region_name] = {
          region: row.region_name,
          lat: row.latitude,
          lng: row.longitude,
          articles: []
        };
      }
      acc[row.region_name].articles.push({
        id: row.article_id,
        title: row.title,
        summary: row.summary,
        translation: row.translation,
        category: row.category,
        published_at: row.published_at,
        url: row.article_url,
        source: row.source_name
      });
      return acc;
    }, {});

    res.json(Object.values(grouped));
  } catch (error) {
    console.error("Failed to fetch map news:", error);
    res.status(500).json({ error: 'Failed to fetch map news data' });
  }
});

app.post('/api/check-crisis-alert', async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing coordinates" });
    }

    const query = `
      SELECT ce.crisis_id, ce.crisis_type, ce.severity_level, ce.radius_km, na.title, na.summary,
        ( 6371 * acos( cos( radians(?) ) * cos( radians( ce.latitude ) ) * 
        cos( radians( ce.longitude ) - radians(?) ) + sin( radians(?) ) * 
        sin( radians( ce.latitude ) ) ) ) AS distance 
      FROM crisis_event ce
      JOIN event e ON ce.event_id = e.event_id
      JOIN news_article na ON e.event_id = na.event_id
      WHERE ce.is_active = TRUE
      HAVING distance <= ce.radius_km
      ORDER BY distance ASC
      LIMIT 1
    `;

    const [alerts] = await pool.execute(query, [lat, lng, lat]);

    if (alerts.length > 0) {
      res.json({ inDangerZone: true, alert: alerts[0] });
    } else {
      res.json({ inDangerZone: false });
    }
  } catch (error) {
    console.error("Crisis check failed:", error);
    res.status(500).json({ error: 'Failed to calculate proximity' });
  }
});


// ==========================================
// 3. USER ACTIVITY & TRENDING
// ==========================================

app.get('/api/trending-news', async (req, res) => {
  try {
    let { window } = req.query; 
    let timeCondition = '';

    if (window === 'today') {
      timeCondition = 'DATE(ua.activity_time) = CURDATE()';
    } else if (window === '24h') {
      timeCondition = 'ua.activity_time >= NOW() - INTERVAL 24 HOUR';
    } else if (window === '7d') {
      timeCondition = 'ua.activity_time >= NOW() - INTERVAL 7 DAY';
    } else if (window === '30d') {
      timeCondition = 'ua.activity_time >= NOW() - INTERVAL 30 DAY';
    } else {
      window = '24h';
      timeCondition = 'ua.activity_time >= NOW() - INTERVAL 24 HOUR';
    }

    const sqlQuery = `
      SELECT 
        na.article_id, 
        na.title, 
        na.summary, 
        na.translation,
        na.category, 
        na.published_at, 
        na.article_url,
        ns.source_name, 
        e.canonical_title AS event_title, 
        r.region_name,
        COUNT(ua.activity_id) AS total_interactions,
        SUM(
          CASE 
            WHEN ua.activity_type = 'click' THEN 1 
            WHEN ua.activity_type = 'read' THEN 2 
            WHEN ua.activity_type = 'bookmark' THEN 4 
            WHEN ua.activity_type = 'share' THEN 5 
            ELSE 0 
          END
        ) + SUM(IF(ua.reading_time > 60, 2, 0)) AS trending_score
      FROM news_article na
      JOIN news_source ns ON na.source_id = ns.source_id
      JOIN event e ON na.event_id = e.event_id
      JOIN region r ON e.region_id = r.region_id
      JOIN user_activity ua ON na.article_id = ua.article_id
      WHERE ${timeCondition}
      GROUP BY 
        na.article_id, na.title, na.summary, na.translation, na.category, 
        na.published_at, na.article_url, ns.source_name, 
        e.canonical_title, r.region_name
      ORDER BY trending_score DESC
      LIMIT 10
    `;

    const [trendingRows] = await pool.execute(sqlQuery);

    for (const item of trendingRows) {
      const [existing] = await pool.execute(
        'SELECT trending_id FROM trending_record WHERE article_id = ? AND time_window = ?', 
        [item.article_id, window]
      );
      
      if (existing.length > 0) {
        await pool.execute(
          'UPDATE trending_record SET score = ?, calculated_at = NOW() WHERE trending_id = ?', 
          [item.trending_score, existing[0].trending_id]
        );
      } else {
        await pool.execute(
          'INSERT INTO trending_record (article_id, time_window, score) VALUES (?, ?, ?)', 
          [item.article_id, window, item.trending_score]
        );
      }
    }

    res.json(trendingRows);
  } catch (error) {
    console.error("Trending error:", error);
    res.status(500).json({ error: 'Failed to fetch trending news' });
  }
});

app.post('/api/track-activity', async (req, res) => {
  try {
    const { userId, articleId, activityType, readingTime } = req.body;
    await pool.execute(
      "INSERT INTO user_activity (user_id, article_id, activity_type, reading_time, activity_time) VALUES (?, ?, ?, ?, NOW())",
      [userId, articleId, activityType || 'click', readingTime || null]
    );
    res.json({ message: "Activity tracked successfully" });
  } catch (error) {
    console.error("Tracking error:", error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

app.post('/api/vote', async (req, res) => {
  try {
    const { userId, articleId, voteType } = req.body; 
    
    const [existingVote] = await pool.execute(
      "SELECT * FROM user_activity WHERE user_id = ? AND article_id = ? AND activity_type IN ('vote_real', 'vote_fake')",
      [userId, articleId]
    );
    
    if (existingVote.length > 0) {
      await pool.execute(
        "UPDATE user_activity SET activity_type = ?, activity_time = NOW() WHERE activity_id = ?",
        [voteType, existingVote[0].activity_id]
      );
    } else {
      await pool.execute(
        "INSERT INTO user_activity (user_id, article_id, activity_type) VALUES (?, ?, ?)",
        [userId, articleId, voteType]
      );
    }
    res.json({ message: "Vote recorded successfully" });
  } catch (error) {
    console.error("Voting error:", error);
    res.status(500).json({ error: 'Failed to record vote in database' });
  }
});

app.get('/api/user-votes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [votes] = await pool.execute(
      "SELECT article_id, activity_type FROM user_activity WHERE user_id = ? AND activity_type IN ('vote_real', 'vote_fake')",
      [userId]
    );

    const voteMap = {};
    votes.forEach(vote => {
      voteMap[vote.article_id] = vote.activity_type;
    });
    res.json(voteMap);
  } catch (error) {
    console.error("Failed to fetch user votes:", error);
    res.status(500).json({ error: 'Failed to fetch votes from database' });
  }
});

app.post('/api/remove-vote', async (req, res) => {
  try {
    const { userId, articleId } = req.body; 
    await pool.execute(
      "DELETE FROM user_activity WHERE user_id = ? AND article_id = ? AND activity_type IN ('vote_real', 'vote_fake')",
      [userId, articleId]
    );
    res.json({ message: "Vote removed successfully" });
  } catch (error) {
    console.error("Vote removal error:", error);
    res.status(500).json({ error: 'Failed to remove vote from database' });
  }
});


// ==========================================
// 4. BOOKMARKS & DASHBOARD (FEATURE 1 & 3)
// ==========================================

// Add Bookmark
app.post('/api/bookmarks', async (req, res) => {
  try {
    const { user_id, article_id } = req.body;
    
    // Prevent duplicates
    const [exists] = await pool.execute('SELECT * FROM bookmarks WHERE user_id = ? AND article_id = ?', [user_id, article_id]);
    if (exists.length > 0) {
      return res.status(400).json({ message: 'Already bookmarked' });
    }

    await pool.execute('INSERT INTO bookmarks (user_id, article_id) VALUES (?, ?)', [user_id, article_id]);
    
    // Track as activity to boost trending score
    await pool.execute("INSERT INTO user_activity (user_id, article_id, activity_type, activity_time) VALUES (?, ?, 'bookmark', NOW())", [user_id, article_id]);
    
    res.json({ message: 'Bookmarked successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to bookmark' });
  }
});

// Remove Bookmark
app.delete('/api/bookmarks/:userId/:articleId', async (req, res) => {
  try {
    const { userId, articleId } = req.params;
    await pool.execute('DELETE FROM bookmarks WHERE user_id = ? AND article_id = ?', [userId, articleId]);
    
    // NEW FIX: Delete the hidden activity history so the algorithm actually forgets it!
    await pool.execute("DELETE FROM user_activity WHERE user_id = ? AND article_id = ? AND activity_type = 'bookmark'", [userId, articleId]);
    
    res.json({ message: 'Bookmark removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to remove bookmark' });
  }
});

// Get User's Bookmarked Articles
app.get('/api/users/:userId/bookmarks', async (req, res) => {
  try {
    const { userId } = req.params;
    const sql = `
      SELECT 
        na.article_id AS id, 
        na.title, 
        na.article_url AS url, 
        na.summary, 
        na.category, 
        na.published_at AS time,
        ns.source_name, 
        r.region_name AS region
      FROM bookmarks b
      JOIN news_article na ON b.article_id = na.article_id
      JOIN news_source ns ON na.source_id = ns.source_id
      JOIN event e ON na.event_id = e.event_id
      JOIN region r ON e.region_id = r.region_id
      WHERE b.user_id = ?
      ORDER BY b.article_id DESC
    `;
    const [rows] = await pool.execute(sql, [userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch bookmarks' });
  }
});

// Get User Profile Data
app.get('/api/users/:userId/profile', async (req, res) => {
  try {
    const { userId } = req.params;
    const [user] = await pool.execute(`
      SELECT u.full_name, u.email, u.preferred_language, r.region_name
      FROM app_user u 
      LEFT JOIN region r ON u.region_id = r.region_id 
      WHERE u.user_id = ?
    `, [userId]);
    res.json(user[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Get User Recent Activity
app.get('/api/users/:userId/activity', async (req, res) => {
  try {
    const { userId } = req.params;
    const sql = `
      SELECT ua.activity_type, ua.activity_time, na.title, na.article_id
      FROM user_activity ua
      JOIN news_article na ON ua.article_id = na.article_id
      WHERE ua.user_id = ? AND ua.activity_type IN ('click', 'share', 'bookmark', 'vote_real', 'vote_fake')
      ORDER BY ua.activity_time DESC 
      LIMIT 10
    `;
    const [rows] = await pool.execute(sql, [userId]);
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});


// ==========================================
// 5. FOLLOW SOURCES
// ==========================================

// Add or Remove Follow
app.post('/api/follows', async (req, res) => {
  try {
    const { userId, sourceName } = req.body;
    
    const [sources] = await pool.execute('SELECT source_id FROM news_source WHERE source_name = ?', [sourceName]);
    if (sources.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    const sourceId = sources[0].source_id;
    const [exists] = await pool.execute('SELECT * FROM follows WHERE user_id = ? AND source_id = ?', [userId, sourceId]);
    
    if (exists.length > 0) {
      await pool.execute('DELETE FROM follows WHERE user_id = ? AND source_id = ?', [userId, sourceId]);
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      await pool.execute('INSERT INTO follows (user_id, source_id) VALUES (?, ?)', [userId, sourceId]);
      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: 'Database error during follow toggle' });
  }
});

// Alias for backward compatibility
app.post('/api/follow-source', async (req, res) => {
  try {
    const { userId, sourceName } = req.body;
    
    const [sources] = await pool.execute('SELECT source_id FROM news_source WHERE source_name = ?', [sourceName]);
    if (sources.length === 0) {
      return res.status(404).json({ error: 'Source not found' });
    }
    
    const sourceId = sources[0].source_id;
    const [exists] = await pool.execute('SELECT * FROM follows WHERE user_id = ? AND source_id = ?', [userId, sourceId]);
    
    if (exists.length > 0) {
      await pool.execute('DELETE FROM follows WHERE user_id = ? AND source_id = ?', [userId, sourceId]);
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      await pool.execute('INSERT INTO follows (user_id, source_id) VALUES (?, ?)', [userId, sourceId]);
      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: 'Database error during follow toggle' });
  }
});

app.get('/api/users/:userId/follows', async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute(`
      SELECT ns.source_name 
      FROM follows f 
      JOIN news_source ns ON f.source_id = ns.source_id 
      WHERE f.user_id = ?
    `, [userId]);
    
    res.json(rows.map(row => row.source_name));
  } catch (error) {
    console.error("Failed to fetch follows:", error);
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});

app.get('/api/user-follows/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const [rows] = await pool.execute(`
      SELECT ns.source_name 
      FROM follows f 
      JOIN news_source ns ON f.source_id = ns.source_id 
      WHERE f.user_id = ?
    `, [userId]);
    
    res.json(rows.map(row => row.source_name));
  } catch (error) {
    console.error("Failed to fetch follows:", error);
    res.status(500).json({ error: 'Failed to fetch follows' });
  }
});


// ==========================================
// 6. AUTHENTICATION & ADMIN
// ==========================================

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    const [existingUsers] = await pool.execute('SELECT * FROM app_user WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const [result] = await pool.execute(
      'INSERT INTO app_user (full_name, email, password_hash) VALUES (?, ?, ?)', 
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'User created successfully', userId: result.insertId });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: 'Database error during signup' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute('SELECT * FROM app_user WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json({
      userId: user.user_id,
      name: user.full_name,
      email: user.email,
      regionId: user.region_id
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: 'Database error during login' });
  }
});

app.post('/api/trigger-ai', async (req, res) => {
  try {
    const count = await processNewArticles(pool);
    if (count === 0) {
      res.json({ message: "Database is up to date! No new articles to process.", count: 0 });
    } else {
      res.json({ message: `Successfully processed ${count} articles with Gemini!`, count: count });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to process articles." });
  }
});

const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`); 
});