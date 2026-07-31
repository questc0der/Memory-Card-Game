import "../App.css";
import { useEffect, useMemo, useState } from "react";

const POKEMON_THEMES = [
  {
    name: "Kanto Icons",
    pokemon: [
      "bulbasaur",
      "ivysaur",
      "venusaur",
      "charmander",
      "charmeleon",
      "charizard",
      "squirtle",
      "wartortle",
      "blastoise",
      "pikachu",
      "raichu",
      "eevee",
      "snorlax",
      "mew",
      "dragonite",
      "gengar",
      "lapras",
      "vulpix",
    ],
  },
  {
    name: "Johto Legends",
    pokemon: [
      "chikorita",
      "bayleef",
      "meganium",
      "cyndaquil",
      "quilava",
      "typhlosion",
      "totodile",
      "croconaw",
      "feraligatr",
      "lugia",
      "ho-oh",
      "celebi",
      "ampharos",
      "espeon",
      "umbreon",
      "scizor",
      "heracross",
      "skarmory",
    ],
  },
  {
    name: "Hoenn Rising",
    pokemon: [
      "treecko",
      "grovyle",
      "sceptile",
      "torchic",
      "combusken",
      "blaziken",
      "mudkip",
      "marshtomp",
      "swampert",
      "gardevoir",
      "aggron",
      "flygon",
      "milotic",
      "salamence",
      "metagross",
      "rayquaza",
      "absol",
      "electrike",
    ],
  },
  {
    name: "Legendary Clash",
    pokemon: [
      "articuno",
      "zapdos",
      "moltres",
      "mewtwo",
      "dratini",
      "dragonair",
      "dragonite",
      "suicune",
      "entei",
      "raikou",
      "latias",
      "latios",
      "deoxys",
      "jirachi",
      "regirock",
      "regice",
      "registeel",
      "lugia",
    ],
  },
  {
    name: "Nature Pulse",
    pokemon: [
      "oddish",
      "bellsprout",
      "roselia",
      "surskit",
      "azurill",
      "psyduck",
      "poliwag",
      "tentacool",
      "staryu",
      "slowpoke",
      "magnemite",
      "voltorb",
      "electrike",
      "pikachu",
      "mareep",
      "shinx",
      "eevee",
      "meditite",
    ],
  },
];

const DIFFICULTIES = {
  easy: { label: "Easy", baseCards: 8, maxCards: 10, timer: 50 },
  normal: { label: "Normal", baseCards: 12, maxCards: 14, timer: 40 },
  hard: { label: "Hard", baseCards: 16, maxCards: 18, timer: 30 },
};

const MODES = {
  timed: { label: "Timed Rush" },
  lives: { label: "3 Lives" },
};

const ACHIEVEMENTS = {
  first10: "Reached 10 score",
  combo6: "6-hit combo streak",
  perfect: "Perfect run (no mistakes)",
  daily: "Completed a daily challenge",
};

const AD_COOLDOWN_MS = 45_000;
const AD_MAX_REWARDED_PER_SESSION = 2;

function parseStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function shuffleCards(cards) {
  const shuffled = [...cards];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getDailyConfig() {
  const dayKey = new Date().toISOString().slice(0, 10);
  const seed = dayKey.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const difficultyKeys = Object.keys(DIFFICULTIES);

  return {
    dayKey,
    themeIndex: seed % POKEMON_THEMES.length,
    difficulty: difficultyKeys[seed % difficultyKeys.length],
    mode: seed % 2 === 0 ? "timed" : "lives",
  };
}

export default function Cards() {
  const [phase, setPhase] = useState("menu");
  const [difficulty, setDifficulty] = useState("normal");
  const [mode, setMode] = useState("timed");
  const [isDaily, setIsDaily] = useState(false);

  const [themeIndex, setThemeIndex] = useState(0);
  const [deck, setDeck] = useState([]);
  const [visibleCards, setVisibleCards] = useState([]);
  const [seenCards, setSeenCards] = useState([]);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [lives, setLives] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [goalUnique, setGoalUnique] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [milestones, setMilestones] = useState([]);

  const [bestScores, setBestScores] = useState(() => parseStorage("mcg_best_scores", {}));
  const [runHistory, setRunHistory] = useState(() => parseStorage("mcg_history", []));
  const [achievements, setAchievements] = useState(() => parseStorage("mcg_achievements", []));
  const [dailyProgress, setDailyProgress] = useState(() => parseStorage("mcg_daily", {}));

  const [status, setStatus] = useState({
    type: "neutral",
    text: "Set your mode and start a run.",
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [rewardedUsedInRun, setRewardedUsedInRun] = useState(false);
  const [rewardedCount, setRewardedCount] = useState(0);
  const [lastRewardedAt, setLastRewardedAt] = useState(0);

  const [sessionStart, setSessionStart] = useState(null);
  const [analytics, setAnalytics] = useState(() => parseStorage("mcg_analytics", []));

  const [imageCache, setImageCache] = useState(() => parseStorage("mcg_cache", {}));

  const currentConfig = DIFFICULTIES[difficulty];
  const currentTheme = POKEMON_THEMES[themeIndex];
  const dailyConfig = useMemo(() => getDailyConfig(), []);

  useEffect(() => {
    localStorage.setItem("mcg_best_scores", JSON.stringify(bestScores));
  }, [bestScores]);

  useEffect(() => {
    localStorage.setItem("mcg_history", JSON.stringify(runHistory));
  }, [runHistory]);

  useEffect(() => {
    localStorage.setItem("mcg_achievements", JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem("mcg_daily", JSON.stringify(dailyProgress));
  }, [dailyProgress]);

  useEffect(() => {
    localStorage.setItem("mcg_analytics", JSON.stringify(analytics));
  }, [analytics]);

  useEffect(() => {
    localStorage.setItem("mcg_cache", JSON.stringify(imageCache));
  }, [imageCache]);

  useEffect(() => {
    if (phase !== "playing" || mode !== "timed" || loading || timeLeft <= 0) {
      return undefined;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(prev - 1, 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, mode, loading, timeLeft]);

  const progressPercent = goalUnique
    ? Math.min(100, Math.floor((seenCards.length / goalUnique) * 100))
    : 0;

  function trackAnalytics(type, payload = {}) {
    const event = {
      type,
      timestamp: Date.now(),
      payload,
    };
    setAnalytics((prev) => [event, ...prev].slice(0, 60));
  }

  function unlockAchievement(id) {
    if (achievements.includes(id)) {
      return;
    }
    setAchievements((prev) => [...prev, id]);
    setStatus({ type: "success", text: `🏆 Achievement unlocked: ${ACHIEVEMENTS[id]}` });
  }

  function assignSpecials(cards, currentScore) {
    const nextCards = cards.map((card) => ({ ...card, special: null }));
    if (currentScore < 2 || nextCards.length < 6) {
      return nextCards;
    }

    if (Math.random() < 0.35) {
      const bonusIndex = Math.floor(Math.random() * nextCards.length);
      nextCards[bonusIndex].special = "bonus";
    }

    if (Math.random() < 0.25) {
      const trapIndex = Math.floor(Math.random() * nextCards.length);
      nextCards[trapIndex].special = nextCards[trapIndex].special ?? "trap";
    }

    return nextCards;
  }

  function updateVisibleCards(cards, nextScore) {
    const cap = Math.min(
      currentConfig.maxCards,
      currentConfig.baseCards + Math.floor(nextScore / 5)
    );
    const shuffled = shuffleCards(cards).slice(0, cap);
    setVisibleCards(assignSpecials(shuffled, nextScore));
  }

  async function loadThemeCards(theme, maxCards) {
    const names = theme.pokemon.slice(0, maxCards);
    const pending = names
      .filter((name) => !imageCache[name])
      .map((name) =>
        fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
          .then((response) => response.json())
          .then((data) => ({ name, url: data?.sprites?.front_default }))
      );

    if (pending.length > 0) {
      const fetched = await Promise.all(pending);
      const cachePatch = fetched.reduce((acc, item) => {
        if (item.url) {
          acc[item.name] = item.url;
        }
        return acc;
      }, {});
      setImageCache((prev) => ({ ...prev, ...cachePatch }));
      const mergedCache = { ...imageCache, ...cachePatch };
      return names
        .map((name) => ({ name, url: mergedCache[name] }))
        .filter((item) => Boolean(item.url));
    }

    return names
      .map((name) => ({ name, url: imageCache[name] }))
      .filter((item) => Boolean(item.url));
  }

  function saveRun(bestKey, finalScore, reason, win) {
    const durationSeconds = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
    const prevBest = bestScores[bestKey] ?? 0;

    if (finalScore > prevBest) {
      setBestScores((prev) => ({ ...prev, [bestKey]: finalScore }));
      trackAnalytics("best_score_improved", {
        key: bestKey,
        from: prevBest,
        to: finalScore,
      });
    }

    const historyEntry = {
      date: new Date().toISOString(),
      score: finalScore,
      mode,
      difficulty,
      theme: currentTheme.name,
      durationSeconds,
      result: win ? "win" : "loss",
      reason,
    };

    setRunHistory((prev) => [historyEntry, ...prev].slice(0, 8));

    trackAnalytics("game_end", {
      score: finalScore,
      reason,
      durationSeconds,
      mode,
      difficulty,
      daily: isDaily,
      win,
    });
  }

  function endGame(reasonLabel, reasonCode, forceWin = false, finalScore = score, finalSeen = seenCards.length) {
    const won = forceWin || finalSeen >= goalUnique;
    const bestKey = isDaily ? `daily-${dailyConfig.dayKey}` : `${difficulty}-${mode}`;

    saveRun(bestKey, finalScore, reasonCode, won);

    if (won && mistakes === 0) {
      unlockAchievement("perfect");
    }

    if (isDaily && won) {
      unlockAchievement("daily");
      setDailyProgress((prev) => ({
        ...prev,
        [dailyConfig.dayKey]: {
          completed: true,
          best: Math.max(prev[dailyConfig.dayKey]?.best ?? 0, finalScore),
        },
      }));
    }

    setResult({
      win: won,
      reason: reasonLabel,
      score: finalScore,
      best: Math.max(bestScores[bestKey] ?? 0, finalScore),
    });
    setPhase("result");
    setStatus({
      type: won ? "success" : "loss",
      text: won
        ? "🎉 Great run! Try harder settings or daily mode next."
        : `Run ended: ${reasonLabel}.`,
    });
  }

  async function startGame(dailyMode = false) {
    setLoading(true);

    const chosenConfig = dailyMode
      ? {
          difficulty: dailyConfig.difficulty,
          mode: dailyConfig.mode,
          themeIndex: dailyConfig.themeIndex,
        }
      : {
          difficulty,
          mode,
          themeIndex: (themeIndex + 1) % POKEMON_THEMES.length,
        };

    setDifficulty(chosenConfig.difficulty);
    setMode(chosenConfig.mode);
    setThemeIndex(chosenConfig.themeIndex);
    setIsDaily(dailyMode);

    const nextConfig = DIFFICULTIES[chosenConfig.difficulty];
    const nextTheme = POKEMON_THEMES[chosenConfig.themeIndex];
    const maxCards = nextConfig.maxCards;

    setScore(0);
    setCombo(0);
    setLives(3);
    setMistakes(0);
    setSeenCards([]);
    setMilestones([]);
    setResult(null);
    setRewardedUsedInRun(false);

    if (chosenConfig.mode === "timed") {
      setTimeLeft(nextConfig.timer);
    } else {
      setTimeLeft(0);
    }

    setGoalUnique(Math.min(maxCards - 1, nextConfig.baseCards + 3));

    try {
      const loadedCards = await loadThemeCards(nextTheme, maxCards);
      setDeck(loadedCards);
      updateVisibleCards(loadedCards, 0);
      setPhase("playing");
      setSessionStart(Date.now());
      setStatus({
        type: "neutral",
        text: `Theme: ${nextTheme.name}. Build streaks and avoid repeats!`,
      });

      trackAnalytics("game_start", {
        mode: chosenConfig.mode,
        difficulty: chosenConfig.difficulty,
        daily: dailyMode,
        theme: nextTheme.name,
      });
    } catch {
      setStatus({ type: "loss", text: "Could not load cards. Please retry." });
      setPhase("menu");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (phase === "playing" && mode === "timed" && timeLeft === 0 && !loading) {
      endGame("Time up", "timer");
    }
  }, [timeLeft, mode, phase, loading, endGame]);

  function handleMistake(reason) {
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    setCombo(0);

    if (mode === "lives") {
      const nextLives = lives - 1;
      setLives(nextLives);
      setSeenCards([]);
      setStatus({
        type: "loss",
        text: `💥 Repeat card. ${nextLives} lives left. Streak reset.`,
      });

      if (nextLives <= 0) {
        endGame("No lives left", reason);
      }
      return;
    }

    endGame("Repeated card", reason);
  }

  function handleCardClick(card) {
    if (phase !== "playing") {
      return;
    }

    if (seenCards.includes(card.name)) {
      handleMistake("repeat");
      return;
    }

    const nextSeen = [...seenCards, card.name];
    const nextCombo = combo + 1;
    let bonus = 0;
    let penaltyMessage = "";

    if (nextCombo > 1 && nextCombo % 3 === 0) {
      bonus += 1;
    }

    if (card.special === "bonus") {
      bonus += 2;
    }

    if (card.special === "trap") {
      if (mode === "timed") {
        setTimeLeft((prev) => Math.max(prev - 5, 0));
        penaltyMessage = " ⏱ Trap card: -5s.";
      } else {
        setScore((prev) => Math.max(prev - 2, 0));
        penaltyMessage = " ⚡ Trap card: -2 score.";
      }
    }

    if ([5, 10, 15].includes(nextSeen.length) && !milestones.includes(nextSeen.length)) {
      bonus += 2;
      setMilestones((prev) => [...prev, nextSeen.length]);
      if (mode === "lives") {
        setLives((prev) => Math.min(prev + 1, 5));
      }
    }

    const nextScore = score + 1 + bonus;
    setSeenCards(nextSeen);
    setScore(nextScore);
    setCombo(nextCombo);

    if (nextScore >= 10) {
      unlockAchievement("first10");
    }
    if (nextCombo >= 6) {
      unlockAchievement("combo6");
    }

    setStatus({
      type: "success",
      text: `🔥 Combo ${nextCombo}. +${1 + bonus} points.${penaltyMessage}`,
    });

    if (nextSeen.length >= goalUnique) {
      endGame("Goal reached", "goal", true, nextScore, nextSeen.length);
      return;
    }

    updateVisibleCards(deck, nextScore);
  }

  function canUseRewardedRetry() {
    const cooldownDone = Date.now() - lastRewardedAt >= AD_COOLDOWN_MS;
    return (
      phase === "result" &&
      !result?.win &&
      !rewardedUsedInRun &&
      rewardedCount < AD_MAX_REWARDED_PER_SESSION &&
      cooldownDone
    );
  }

  function useRewardedRetry() {
    if (!canUseRewardedRetry()) {
      return;
    }

    setRewardedUsedInRun(true);
    setRewardedCount((prev) => prev + 1);
    setLastRewardedAt(Date.now());
    setPhase("playing");
    setStatus({
      type: "neutral",
      text: "🎁 Rewarded retry activated. Make this turn count!",
    });

    if (mode === "timed") {
      setTimeLeft((prev) => Math.max(prev, 12));
    } else {
      setLives(1);
    }

    trackAnalytics("rewarded_retry_used", {
      mode,
      difficulty,
      daily: isDaily,
    });
  }

  return (
    <div className="container">
      <h1>MATCH CARDS</h1>

      {phase === "menu" && (
        <div className="panel">
          <p className="status_message neutral">
            Choose your setup and aim for longer sessions, more replays, and higher best scores.
          </p>

          <div className="engagement_goals">
            <p>🎯 Engagement goals</p>
            <ul>
              <li>Play longer sessions with mode variety</li>
              <li>Increase replay attempts with daily challenge + rewards</li>
              <li>Raise best-score attempts via combos and milestones</li>
            </ul>
          </div>

          <div className="controls_grid">
            <label>
              Difficulty
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                disabled={loading}
              >
                {Object.entries(DIFFICULTIES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mode
              <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={loading}>
                {Object.entries(MODES).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="button_row">
            <button className="cta" onClick={() => startGame(false)} disabled={loading}>
              {loading ? "Loading..." : "Start Run"}
            </button>
            <button className="cta secondary" onClick={() => startGame(true)} disabled={loading}>
              Daily Challenge
            </button>
          </div>

          <p className="daily_note">
            Today: {DIFFICULTIES[dailyConfig.difficulty].label} · {MODES[dailyConfig.mode].label} ·{" "}
            {POKEMON_THEMES[dailyConfig.themeIndex].name}
            {dailyProgress[dailyConfig.dayKey]?.completed ? " ✅ Completed" : ""}
          </p>

          <div className="ad_zone">Ad-ready zone: menu placement (non-intrusive)</div>

          <div className="history_panel">
            <p>Recent runs</p>
            {runHistory.length === 0 && <span>No runs yet.</span>}
            {runHistory.map((entry, index) => (
              <div key={`${entry.date}-${index}`} className="history_row">
                <span>{new Date(entry.date).toLocaleDateString()}</span>
                <span>{entry.score} pts</span>
                <span>{entry.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase !== "menu" && (
        <>
          <div className="scoreboard">
            <p>Score: {score}</p>
            <p>Best: {bestScores[isDaily ? `daily-${dailyConfig.dayKey}` : `${difficulty}-${mode}`] ?? 0}</p>
            <p>Combo: {combo}</p>
            {mode === "lives" ? <p>Lives: {lives}</p> : <p>Time: {timeLeft}s</p>}
            <p>Theme: {currentTheme.name}</p>
          </div>

          <div className="progress_wrap">
            <div className="progress_bar" style={{ width: `${progressPercent}%` }} />
            <span>
              Progress {seenCards.length}/{goalUnique}
            </span>
          </div>

          <p className={`status_message ${status.type}`}>{status.text}</p>

          {phase === "playing" && (
            <div className="card_container">
              {visibleCards.map((card) => (
                <button
                  key={card.name}
                  className={`cards ${card.special ? `special_${card.special}` : ""}`}
                  onClick={() => handleCardClick(card)}
                  type="button"
                >
                  <div className="card_inner">
                    <img src={card.url} alt={card.name} className="images" loading="lazy" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {phase === "result" && result && (
            <div className={`result_panel ${result.win ? "win" : "loss"}`}>
              <h2>{result.win ? "You Win!" : "Run Over"}</h2>
              <p>Reason: {result.reason}</p>
              <p>Score: {result.score}</p>
              <p>Best: {result.best}</p>
              <div className="button_row">
                <button className="cta" onClick={() => startGame(isDaily)} type="button">
                  Restart
                </button>
                <button className="cta secondary" onClick={() => setPhase("menu")} type="button">
                  Back to Menu
                </button>
                {canUseRewardedRetry() && (
                  <button className="cta rewarded" onClick={useRewardedRetry} type="button">
                    Rewarded Retry
                  </button>
                )}
              </div>
              <div className="ad_zone">Ad-ready zone: result screen + rewarded ad entry</div>
            </div>
          )}

          <div className="achievements_panel">
            <p>Achievements</p>
            <div className="badge_row">
              {Object.entries(ACHIEVEMENTS).map(([id, label]) => (
                <span key={id} className={`badge ${achievements.includes(id) ? "on" : "off"}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
