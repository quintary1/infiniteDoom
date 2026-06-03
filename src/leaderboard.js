/**
 * Leaderboard module for Grave Escape 3D.
 * Manages saving and loading high scores from localStorage (local)
 * and includes placeholder stubs for network API database integration (global).
 */

export function getLocalScores() {
  const scoresJson = localStorage.getItem('grave_escape_scores');
  if (!scoresJson) return [];
  try {
    return JSON.parse(scoresJson).sort((a, b) => b.score - a.score);
  } catch (e) {
    return [];
  }
}

export function saveLocalScore(name, score, floor, kills) {
  const scores = getLocalScores();
  scores.push({
    name: name.toUpperCase().slice(0, 3) || 'AAA',
    score: parseInt(score) || 0,
    floor: parseInt(floor) || 1,
    kills: parseInt(kills) || 0,
    date: new Date().toLocaleDateString()
  });
  // Sort and keep top 5
  scores.sort((a, b) => b.score - a.score);
  const topScores = scores.slice(0, 5);
  localStorage.setItem('grave_escape_scores', JSON.stringify(topScores));
  return topScores;
}

export function checkLocalHighScore(score) {
  const scores = getLocalScores();
  if (scores.length < 5) return true;
  return score > scores[scores.length - 1].score;
}

// Global leaderboard stubs for future API integration (Firebase, Supabase, etc.)
export async function fetchGlobalScores() {
  // Simulates fetching scores from a database.
  // Set online: true and call your real database endpoint here in the future.
  return {
    online: false,
    scores: [
      { name: "DOOM", score: 75000, floor: 12, kills: 120, date: "06/03/2026" },
      { name: "ROGU", score: 62000, floor: 9, kills: 94, date: "06/03/2026" },
      { name: "RAYC", score: 48000, floor: 7, kills: 72, date: "06/03/2026" }
    ],
    message: "Global Leaderboards coming soon!"
  };
}

export async function submitGlobalScore(name, score, floor, kills) {
  // Call your database write endpoint here in the future
  console.log("Global leaderboard is offline. Mock submission: ", { name, score, floor, kills });
  return false;
}
