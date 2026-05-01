import 'dotenv/config';
import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcrypt';

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

// API Endpoint: Get localized news feed
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
        
        -- DYNAMIC LOGIC 1: Base Consensus Score from trusted sources
        (
          SELECT LEAST(100, ROUND(AVG(ns2.trust_weight) * 10 + (COUNT(DISTINCT na2.source_id) - 1) * 5))
          FROM news_article na2
          JOIN news_source ns2 ON na2.source_id = ns2.source_id
          WHERE na2.event_id = na.event_id
        ) AS base_score,

        -- DYNAMIC LOGIC 2: Crowd-Sourced Votes from user_activity table
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_real') AS real_votes,
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_fake') AS fake_votes,

        -- DYNAMIC LOGIC 3: Source concatenation
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
    sqlQuery += ` ORDER BY na.published_at DESC LIMIT 10`;

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
        time: new Date(row.time).toLocaleDateString(),
        distance: region === 'All' ? 'National' : 'Local Priority'
      };
    });

    res.json(formattedData);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

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

// --- THE TWO MISSING ENDPOINTS ARE NOW HERE! ---

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

// -----------------------------------------------

const PORT = process.env.PORT || 5000; 

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

app.listen(PORT, () => {
  console.log(`Backend API running on port ${PORT}`); 
});

// API Endpoint: Track User Activity (Clicks/Reads)
app.post('/api/track-activity', async (req, res) => {
  try {
    const { userId, articleId, activityType } = req.body;
    
    // Insert the interaction into the database
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

// API Endpoint: Get Personalized News Feed
app.get('/api/news/personalized', async (req, res) => {
  try {
    const { region, userId } = req.query;

    // 1. Identify the user's top 3 preferred categories
    const [preferences] = await pool.execute(`
      SELECT na.category, COUNT(*) as interaction_count
      FROM user_activity ua
      JOIN news_article na ON ua.article_id = na.article_id
      WHERE ua.user_id = ? AND ua.activity_type IN ('click', 'read', 'share', 'bookmark')
      GROUP BY na.category
      ORDER BY interaction_count DESC
      LIMIT 3
    `, [userId]);

    // Extract just the category names into an array
    const preferredCategories = preferences.map(p => p.category);

    // 2. Fetch the standard news feed (similar to your existing query)
    let sqlQuery = `
      SELECT 
        na.article_id AS id, 
        na.title, 
        na.article_url AS url,
        na.summary, 
        na.category, 
        na.published_at AS time,
        r.region_name AS region,
        
        -- Base Consensus Score
        (
          SELECT LEAST(100, ROUND(AVG(ns2.trust_weight) * 10 + (COUNT(DISTINCT na2.source_id) - 1) * 5))
          FROM news_article na2
          JOIN news_source ns2 ON na2.source_id = ns2.source_id
          WHERE na2.event_id = na.event_id
        ) AS base_score,

        -- Crowd Votes
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_real') AS real_votes,
        (SELECT COUNT(*) FROM user_activity ua WHERE ua.article_id = na.article_id AND ua.activity_type = 'vote_fake') AS fake_votes,

        -- Sources
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
    sqlQuery += ` ORDER BY na.published_at DESC LIMIT 20`;

    const [rows] = await pool.execute(sqlQuery, queryParams);

    // 3. THE ALGORITHM: Calculate Final Score + Personalization Boost
    let formattedData = rows.map(row => {
      let finalScore = row.base_score + (row.real_votes * 2) - (row.fake_votes * 5);
      finalScore = Math.max(0, Math.min(100, finalScore));

      // Personalization Engine: Boost the sorting weight if it matches their preferences
      let personalSortWeight = finalScore; 
      if (preferredCategories.includes(row.category)) {
        personalSortWeight += 50; // Huge boost to push it to the top of the feed
      }

      return {
        id: row.id,
        title: row.title,
        url: row.url,
        summary: row.summary,
        sources: row.all_event_sources ? row.all_event_sources.split('||') : ['Unknown Source'], 
        region: row.region,
        category: row.category,
        score: finalScore,
        sortWeight: personalSortWeight, // Hidden metric used just for sorting
        realVotes: row.real_votes,
        fakeVotes: row.fake_votes,
        time: new Date(row.time).toLocaleDateString()
      };
    });

    // Sort by the personalized weight (highest first)
    formattedData.sort((a, b) => b.sortWeight - a.sortWeight);

    res.json(formattedData.slice(0, 10)); // Return top 10 personalized articles
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Personalized feed generation failed' });
  }
});

