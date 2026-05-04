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

// Create database connection pool
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

// API Endpoint: Get Personalized News Feed (Logged In)
app.get('/api/news/personalized', async (req, res) => {
  try {
    const { region, userId } = req.query;

    // 1. Get Preferred Categories
    const [preferences] = await pool.execute(`
      SELECT na.category, COUNT(*) as interaction_count
      FROM user_activity ua
      JOIN news_article na ON ua.article_id = na.article_id
      WHERE ua.user_id = ? AND ua.activity_type IN ('click', 'read', 'share', 'bookmark')
      GROUP BY na.category
      ORDER BY interaction_count DESC
      LIMIT 3
    `, [userId]);

    const preferredCategories = preferences.map(p => p.category);

    // 2. Get Followed Sources (FEATURE 7 FIX)
    const [follows] = await pool.execute(`
      SELECT ns.source_name 
      FROM follows f 
      JOIN news_source ns ON f.source_id = ns.source_id 
      WHERE f.user_id = ?
    `, [userId]);
    
    const followedSourceNames = follows.map(f => f.source_name);

    let sqlQuery = `
      SELECT 
        na.article_id AS id, 
        na.title, 
        na.article_url AS url,
        na.summary, 
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

    let formattedData = rows.map(row => {
      let finalScore = row.base_score + (row.real_votes * 2) - (row.fake_votes * 5);
      finalScore = Math.max(0, Math.min(100, finalScore));

      let personalSortWeight = finalScore; 
      
      // Category Boost
      if (preferredCategories.includes(row.category)) {
        personalSortWeight += 50; 
      }

      // Followed Source Boost (FEATURE 7 FIX)
      const articleSources = row.all_event_sources ? row.all_event_sources.split('||') : [];
      const hasFollowedSource = articleSources.some(source => followedSourceNames.includes(source));
      
      if (hasFollowedSource) {
        personalSortWeight += 75; // Pushes followed news straight to the top
      }

      return {
        id: row.id,
        title: row.title,
        url: row.url,
        summary: row.summary,
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

    formattedData.sort((a, b) => b.sortWeight - a.sortWeight);
    res.json(formattedData); 
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Personalized feed generation failed' });
  }
});


// ==========================================
// 2. CRISIS ALERTS (FEATURE 6)
// ==========================================

// API Endpoint: Get Active Crisis Alerts
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

    // Using pool.query here because it handles arrays for 'IN (?)' better
    const [rows] = await pool.query(sqlQuery, [region, crisisCategories]);
    res.json(rows);
  } catch (error) {
    console.error("Alert fetch error:", error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});


// ==========================================
// 3. USER ACTIVITY & INTERACTIONS
// ==========================================

// API Endpoint: Submit a Vote
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

// API Endpoint: Get all previous votes for a user
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

// API Endpoint: Remove a Vote (Un-toggle)
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

// API Endpoint: Track User Activity (Clicks/Reads)
app.post('/api/track-activity', async (req, res) => {
  try {
    const { userId, articleId, activityType } = req.body;
    await pool.execute(
      "INSERT INTO user_activity (user_id, article_id, activity_type, activity_time) VALUES (?, ?, ?, NOW())",
      [userId, articleId, activityType || 'click']
    );
    res.json({ message: "Activity tracked successfully" });
  } catch (error) {
    console.error("Tracking error:", error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

// ==========================================
// 4. FOLLOW SOURCES (FEATURE 7)
// ==========================================

// API Endpoint: Toggle Follow a News Source
app.post('/api/follow-source', async (req, res) => {
  try {
    const { userId, sourceName } = req.body;
    
    // Find the source_id from the name
    const [sources] = await pool.execute('SELECT source_id FROM news_source WHERE source_name = ?', [sourceName]);
    if (sources.length === 0) return res.status(404).json({ error: 'Source not found' });
    const sourceId = sources[0].source_id;

    // Check if the user is already following this source
    const [exists] = await pool.execute('SELECT * FROM follows WHERE user_id = ? AND source_id = ?', [userId, sourceId]);
    
    if (exists.length > 0) {
      // Unfollow
      await pool.execute('DELETE FROM follows WHERE user_id = ? AND source_id = ?', [userId, sourceId]);
      res.json({ message: 'Unfollowed successfully', isFollowing: false });
    } else {
      // Follow
      await pool.execute('INSERT INTO follows (user_id, source_id) VALUES (?, ?)', [userId, sourceId]);
      res.json({ message: 'Followed successfully', isFollowing: true });
    }
  } catch (error) {
    console.error("Follow error:", error);
    res.status(500).json({ error: 'Database error during follow toggle' });
  }
});

// API Endpoint: Get User's Followed Sources
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
// 5. AUTHENTICATION
// ==========================================

// API Endpoint: User Signup
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

// API Endpoint: User Login
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


// ==========================================
// 6. ADMIN & UTILS
// ==========================================

// API Endpoint: Manual AI Trigger
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