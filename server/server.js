const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const words = require('./data/words');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
}

// Initialize a Map to store user progress
const userProgress = new Map();

// Helper function to generate a weighted random index
const getWeightedRandomIndex = (weights) => {
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < weights.length; i++) {
    if (random < weights[i]) return i;
    random -= weights[i];
  }
  return weights.length - 1;
};

// Helper function to get or create user progress
const getUserProgress = (userId) => {
  let progress = userProgress.get(userId);
  if (!progress) {
    progress = {
      words: words.map((word, index) => ({ ...word, weight: 1, lastPlayed: null, index })),
      stats: { streak: 0, totalPlayed: 0, hintsUsed: 0 }
    };
    userProgress.set(userId, progress);
  }
  return progress;
};

// API endpoint to get a new word
app.get('/api/get-word', (req, res) => {
  const userId = req.query.userId || crypto.randomBytes(16).toString('hex');
  const { words: userWordList, stats } = getUserProgress(userId);

  if (userWordList.every(word => word.weight === 0)) {
    userWordList.forEach(word => { word.weight = 1; });
  }

  const weights = userWordList.map(word => word.weight);
  const selectedIndex = getWeightedRandomIndex(weights);
  const selectedWord = userWordList[selectedIndex];

  // Update word weight and last played time
  selectedWord.weight = Math.max(0, selectedWord.weight - 0.5);
  selectedWord.lastPlayed = Date.now();

  res.json({
    userId,
    word: selectedWord.word,
    hints: {
      hint1: selectedWord.hint1,
      hint2: selectedWord.hint2,
      hint3: selectedWord.hint3
    }
  });
});

// API endpoint to update user progress
app.post('/api/update-progress', (req, res) => {
  const { userId, won, hintsUsed } = req.body;
  const userProgress = getUserProgress(userId);

  const { stats } = userProgress;

  stats.totalPlayed++;
  stats.hintsUsed += hintsUsed; // Accumulate hints used
  if (won) {
    stats.streak++;
  } else {
    stats.streak = 0;
  }

  res.json({
    currentStreak: stats.streak,
    totalWordsPlayed: stats.totalPlayed,
    totalHintsUsed: stats.hintsUsed
  });
});

// Analytics logging function
const logAnalytics = async (event) => {
  const logPath = path.join(__dirname, 'analytics.log');
  const logEntry = `${new Date().toISOString()} - ${JSON.stringify(event)}\n`;
  try {
    await fs.appendFile(logPath, logEntry);
  } catch (error) {
    console.error('Error logging analytics:', error);
  }
};

// API endpoint to log analytics events
app.post('/api/log-event', (req, res) => {
  const { event } = req.body;
  logAnalytics(event);
  res.sendStatus(200);
});

const invalidWordsLogPath = path.join(__dirname, 'invalid_words.log');
const invalidWordsCache = new Set();

// Function to log invalid words
const logInvalidWord = async (word) => {
  const logEntry = `${new Date().toISOString()} - ${word}\n`;
  try {
    await fs.appendFile(invalidWordsLogPath, logEntry);
    invalidWordsCache.add(word);
    console.log('Invalid word logged:', word);
  } catch (error) {
    console.error('Error logging invalid word:', error);
  }
};

// API endpoint to log invalid words
app.post('/api/log-invalid-word', async (req, res) => {
  const { word } = req.body;
  if (!invalidWordsCache.has(word)) {
    await logInvalidWord(word);
  }
  res.sendStatus(200);
});

// API endpoint to get invalid words log
app.get('/api/invalid-words', async (req, res) => {
  try {
    if (invalidWordsCache.size === 0) {
      const data = await fs.readFile(invalidWordsLogPath, 'utf8');
      const words = data.split('\n').filter(Boolean).map(line => line.split(' - ')[1]);
      invalidWordsCache.clear();
      words.forEach(word => invalidWordsCache.add(word));
    }
    res.json(Array.from(invalidWordsCache));
  } catch (error) {
    console.error('Error reading invalid words log:', error);
    res.status(500).json({ error: 'Error retrieving invalid words' });
  }
});

// The "catchall" handler: for any request that doesn't match one above, send back React's index.html file.
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});