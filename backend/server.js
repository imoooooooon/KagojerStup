import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';
import bcrypt from 'bcrypt';


const app = express();
app.use(cors()); // Allows your Vite React app to fetch data
app.use(express.json());

// Create database connection pool
const pool = mysql.createPool({
  host: '127.0.0.1',
  user: 'root', // Default XAMPP user
  password: '', // Default XAMPP password (leave blank if none)
  database: 'crisis_news_system',
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
      // THE FAKE NEWS ALGORITHM:
      // Base score + (Real Votes * 2%) - (Fake Votes * 5% penalty)
      let finalScore = row.base_score + (row.real_votes * 2) - (row.fake_votes * 5);
      
      // Keep score clamped between 0 and 100
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

// NEW API Endpoint: Submit a Vote
app.post('/api/vote', async (req, res) => {
  try {
    const { userId, articleId, voteType } = req.body; // voteType is 'vote_real' or 'vote_fake'
    
    // 1. Check if user already voted on this article
    const [existingVote] = await pool.execute(
      "SELECT * FROM user_activity WHERE user_id = ? AND article_id = ? AND activity_type IN ('vote_real', 'vote_fake')",
      [userId, articleId]
    );
    
    if (existingVote.length > 0) {
      // 2. Update their existing vote (allows user to change mind)
      await pool.execute(
        "UPDATE user_activity SET activity_type = ?, activity_time = NOW() WHERE activity_id = ?",
        [voteType, existingVote[0].activity_id]
      );
    } else {
      // 3. Insert fresh vote into database
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

const PORT = 5000;

// API Endpoint: User Signup
app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // 1. Check if user already exists
    const [existingUsers] = await pool.execute('SELECT * FROM app_user WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // 2. Hash the password securely
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Insert into database
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

    // 1. Find user by email
    const [users] = await pool.execute('SELECT * FROM app_user WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // 2. Compare the submitted password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // 3. Send back user data (NEVER send the password_hash back to the frontend!)
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
  console.log(`Backend API running on http://localhost:${PORT}`);
});