import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

function App() {
  // Firebase configuration: REPLACE THESE VALUES WITH YOUR OWN FIREBASE CONFIG
  // You will get this from the Firebase Console -> Project settings -> Your apps -> Web app
  // Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDRtHacJDalfYRs4RTFVKlRe_uYNmofEe0",
  authDomain: "levlevlev-9191d.firebaseapp.com",
  projectId: "levlevlev-9191d",
  storageBucket: "levlevlev-9191d.firebasestorage.app",
  messagingSenderId: "347960270611",
  appId: "1:347960270611:web:95e2e775b7900790cac4e6"
};
  // Use the appId from your config for Firestore paths
  const appId = firebaseConfig.appId;

  // Firebase state
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Game state
  const [currentXP, setCurrentXP] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [xpLog, setXpLog] = useState([]);
  const [dailyQuests, setDailyQuests] = useState([]);
  const [lastQuestResetDate, setLastQuestResetDate] = useState(null);
  const [message, setMessage] = useState(''); // For user messages

  // Character Stats
  const [strength, setStrength] = useState(1);
  const [intelligence, setIntelligence] = useState(1);
  const [agility, setAgility] = useState(1);
  const [vitality, setVitality] = useState(1);
  const [statPoints, setStatPoints] = useState(0); // New state for allocatable points

  // Ref to store the Firebase unsubscribe function
  const unsubscribeRef = useRef(null);

  // --- Firebase Initialization and Authentication ---
  useEffect(() => {
    try {
      // Check if firebaseConfig is populated. If not, show an error.
      if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "YOUR_FIREBASE_API_KEY") {
        setMessage("Firebase configuration missing. Please update src/App.js with your Firebase project details.");
        setIsLoading(false);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      // Listen for auth state changes
      const authUnsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // If no user, try to sign in anonymously
          try {
            await signInAnonymously(firebaseAuth);
            setUserId(firebaseAuth.currentUser?.uid);
          } catch (error) {
            console.error("Error signing in anonymously:", error);
            setMessage("Error signing in. Please check your network.");
          }
        }
        setIsAuthReady(true);
      });

      // Cleanup auth listener on unmount
      return () => authUnsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      setMessage("Error initializing the app. Please try again.");
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this runs once on mount

  // --- Firestore Data Listener ---
  useEffect(() => {
    // Only proceed if auth and db are ready
    if (!isAuthReady || !db || !userId) {
      return;
    }

    // Reference to the user's document
    const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'levelingSystem', 'data');

    // Set up real-time listener for the user's data
    unsubscribeRef.current = onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setCurrentXP(data.currentXP || 0);
        setCurrentLevel(data.currentLevel || 1);
        setXpLog(data.xpLog || []);
        setDailyQuests(data.dailyQuests || []);
        setLastQuestResetDate(data.lastQuestResetDate ? new Date(data.lastQuestResetDate) : null);

        // Load Character Stats and Stat Points
        setStrength(data.strength || 1);
        setIntelligence(data.intelligence || 1);
        setAgility(data.agility || 1);
        setVitality(data.vitality || 1);
        setStatPoints(data.statPoints || 0); // Load stat points

        // Check if daily quests need to be reset
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day

        const lastReset = data.lastQuestResetDate ? new Date(data.lastQuestResetDate) : null;
        if (!lastReset || lastReset.setHours(0, 0, 0, 0) < today.getTime()) {
          console.log("Daily quests need to be reset!");
          // Pass db (firestore) and userDocRef to resetDailyQuests
          await resetDailyQuests(db, userDocRef);
        }

      } else {
        // Document doesn't exist, initialize it
        console.log("No data found, initializing with default values.");
        const initialQuests = generateDailyQuests();
        const initialResetDate = new Date().toISOString();

        await setDoc(userDocRef, {
          currentXP: 0,
          currentLevel: 1,
          xpLog: [],
          dailyQuests: initialQuests,
          lastQuestResetDate: initialResetDate,
          strength: 1,
          intelligence: 1,
          agility: 1,
          vitality: 1,
          statPoints: 0, // Initialize stat points
        })
          .then(() => {
            setCurrentXP(0);
            setCurrentLevel(1);
            setXpLog([]);
            setDailyQuests(initialQuests);
            setLastQuestResetDate(new Date(initialResetDate));
            setStrength(1);
            setIntelligence(1);
            setAgility(1);
            setVitality(1);
            setStatPoints(0);
          })
          .catch((error) => console.error("Error initializing user data:", error));
      }
      setIsLoading(false); // Data loaded or initialized
    }, (error) => {
      console.error("Error fetching real-time data:", error);
      setMessage("Error loading your data. Please check console for details.");
      setIsLoading(false);
    });

    // Cleanup snapshot listener on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [db, userId, isAuthReady, appId]); // Re-run when db, userId, or auth state changes

  // --- Game Logic ---
  const calculateXpRequiredForNextLevel = (level) => {
    return 100 * (level * level);
  };

  const xpToNextLevel = calculateXpRequiredForNextLevel(currentLevel) - currentXP;

  // --- Daily Quest Logic ---
  const possibleDailyQuests = [
    { id: 'dq1', description: 'Complete 3 XP Actions', xp: 25 },
    { id: 'dq2', description: 'Read 10+ pages from a valuable book', xp: 15 },
    { id: 'dq3', description: 'Engage in a 15+ min focused work session', xp: 20 },
    { id: 'dq4', description: 'Do a 10 min stretching routine', xp: 10 },
    { id: 'dq5', description: 'Learn a new word or concept', xp: 15 },
    { id: 'dq6', description: 'Help someone (small act of kindness)', xp: 10 },
    { id: 'dq7', description: 'Plan your next day (10+ min)', xp: 10 },
    { id: 'dq8', description: 'Drink 6 glasses of water', xp: 10 },
    { id: 'dq9', description: 'Spend 15 mins decluttering a space', xp: 10 },
  ];

  const generateDailyQuests = () => {
    // Select 3 random unique quests
    const shuffled = [...possibleDailyQuests].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3).map(quest => ({ ...quest, completed: false }));
  };

  const resetDailyQuests = async (firestoreInstance, docRef) => {
    const newQuests = generateDailyQuests();
    const newResetDate = new Date();
    newResetDate.setHours(0, 0, 0, 0); // Normalize to start of day
    const newResetDateISO = newResetDate.toISOString();

    try {
      await setDoc(docRef, {
        dailyQuests: newQuests,
        lastQuestResetDate: newResetDateISO,
      }, { merge: true }); // Use merge to update only these fields
      setDailyQuests(newQuests);
      setLastQuestResetDate(new Date(newResetDateISO));
      setMessage("Daily quests have been reset!");
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error("Error resetting daily quests:", error);
      setMessage("Error resetting daily quests.");
    }
  };

  const completeDailyQuest = async (questId) => {
    if (!db || !userId) {
      setMessage("Please wait, app is loading or not authenticated.");
      return;
    }

    const updatedQuests = dailyQuests.map(quest =>
      quest.id === questId ? { ...quest, completed: true } : quest
    );

    const completedQuest = dailyQuests.find(quest => quest.id === questId && !quest.completed);

    if (completedQuest) {
      const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'levelingSystem', 'data');
      try {
        // Update quests array in Firestore
        await setDoc(userDocRef, { dailyQuests: updatedQuests }, { merge: true });
        setDailyQuests(updatedQuests); // Update local state immediately

        // Now, add the XP
        addXP(completedQuest.xp, `Daily Quest: ${completedQuest.description}`);
        setMessage(`Quest Completed! +${completedQuest.xp} XP`);
      } catch (error) {
        console.error("Error completing daily quest:", error);
        setMessage("Error completing quest.");
      }
    } else if (dailyQuests.find(quest => quest.id === questId && quest.completed)) {
      setMessage("Quest already completed today!");
    }
  };

  // Function to allocate stat points
  const allocateStatPoint = async (statName) => {
    if (!db || !userId) {
      setMessage("Please wait, app is loading or not authenticated.");
      return;
    }
    if (statPoints <= 0) {
      setMessage("No stat points available to allocate!");
      return;
    }

    let newStrength = strength;
    let newIntelligence = intelligence;
    let newAgility = agility;
    let newVitality = vitality;
    let newStatPoints = statPoints - 1;

    switch (statName) {
      case 'strength':
        newStrength += 1;
        setStrength(newStrength);
        break;
      case 'intelligence':
        newIntelligence += 1;
        setIntelligence(newIntelligence);
        break;
      case 'agility':
        newAgility += 1;
        setAgility(newAgility);
        break;
      case 'vitality':
        newVitality += 1;
        setVitality(newVitality);
        break;
      default:
        console.error("Invalid stat name:", statName);
        return;
    }
    setStatPoints(newStatPoints);

    const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'levelingSystem', 'data');
    try {
      await setDoc(userDocRef, {
        strength: newStrength,
        intelligence: newIntelligence,
        agility: newAgility,
        vitality: newVitality,
        statPoints: newStatPoints,
      }, { merge: true });
      setMessage(`Allocated 1 point to ${statName.charAt(0).toUpperCase() + statName.slice(1)}!`);
      setTimeout(() => setMessage(''), 1500);
    } catch (error) {
      console.error("Error allocating stat point:", error);
      setMessage("Error saving stat allocation.");
    }
  };

  const addXP = async (xpGained, actionDescription) => {
    if (!db || !userId) {
      setMessage("Please wait, app is loading or not authenticated.");
      return;
    }

    // Apply Intelligence bonus for specific actions
    let finalXpGained = xpGained;
    if (actionDescription === 'Read 5+ Pages' || actionDescription === 'Explore Something New') {
      const bonus = Math.floor(xpGained * (intelligence * 0.01)); // 1% bonus per Intelligence point
      finalXpGained = xpGained + bonus;
      if (bonus > 0) {
          setMessage(`Intelligence bonus! +${bonus} XP for ${actionDescription}.`);
          // A short delay to allow the bonus message to show before the general XP message
          setTimeout(() => setMessage(''), 2000);
      }
    }


    let newXP = currentXP + finalXpGained;
    let newLevel = currentLevel;
    let newStatPoints = statPoints; // Use existing stat points

    const logEntry = {
      timestamp: new Date().toLocaleString(),
      action: actionDescription,
      xpGained: finalXpGained, // Log the final XP gained after bonuses
    };
    const newXpLog = [logEntry, ...xpLog].slice(0, 50); // Keep last 50 entries

    let levelUpMessage = '';

    // Check for level up
    while (newXP >= calculateXpRequiredForNextLevel(newLevel)) {
      newXP -= calculateXpRequiredForNextLevel(newLevel); // Carry over excess XP
      newLevel++;
      newStatPoints += 5; // Grant 5 stat points per level up

      levelUpMessage = `Congratulations! You leveled up to Level ${newLevel} and gained 5 Stat Points!`;
      setMessage(levelUpMessage);
    }

    // Update state and Firestore
    setCurrentXP(newXP);
    setCurrentLevel(newLevel);
    setXpLog(newXpLog);
    setStatPoints(newStatPoints);


    const userDocRef = doc(db, 'artifacts', appId, 'users', userId, 'levelingSystem', 'data');
    try {
      await setDoc(userDocRef, {
        currentXP: newXP,
        currentLevel: newLevel,
        xpLog: newXpLog,
        dailyQuests: dailyQuests,
        lastQuestResetDate: lastQuestResetDate ? lastQuestResetDate.toISOString() : null,
        strength: strength, // Ensure existing stats are carried over
        intelligence: intelligence,
        agility: agility,
        vitality: vitality,
        statPoints: newStatPoints, // Save new stat points
      }, { merge: true }); // Use merge to avoid overwriting other fields
      if (levelUpMessage) {
        // Longer timeout for level up message
        setTimeout(() => setMessage(''), 4000);
      } else if (!actionDescription.includes("Daily Quest")) { // Don't clear if it's a daily quest, as quest message handles it
         setTimeout(() => setMessage(`+${finalXpGained} XP for ${actionDescription}!`), 100); // Brief message for regular actions
         setTimeout(() => setMessage(''), 1500); // Clear after a bit
      }
    } catch (error) {
      console.error("Error updating user data in Firestore:", error);
      setMessage("Error saving your progress.");
    }
  };

  const xpActions = [
    { name: 'Complete JS Lesson', xp: 10 },
    { name: 'Solve a Bug', xp: 5 },
    { name: 'Build Mini Project', xp: 30 },
    { name: 'Game Dev Task', xp: 20 },
    { name: 'Workout (20+ min)', xp: 10 },
    { name: 'Journal/Reflect (10+ min)', xp: 10 },
    { name: 'Resist Dopamine Habit', xp: 5 },
    { name: 'Read 5+ Pages', xp: 10 }, // This and "Explore Something New" get Intelligence bonus
    { name: 'Explore Something New', xp: 20 },
    { name: 'Do Something Uncomfortable', xp: 15 },
    { name: 'Weekly Quest', xp: 50 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl">Loading your adventure...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white font-inter p-4 sm:p-8 flex flex-col items-center">
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />

      <style>{`
        body { font-family: 'Inter', sans-serif; }
        .xp-button {
            @apply bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 active:scale-95;
            background-image: linear-gradient(to right, #4F46E5, #3B82F6);
        }
        .xp-button:active {
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);
        }
        .glow-text {
            text-shadow: 0 0 8px rgba(79, 70, 229, 0.7);
        }
        .log-entry:nth-child(odd) {
            background-color: rgba(255,255,255,0.05);
        }
        .log-entry:nth-child(even) {
            background-color: rgba(255,255,255,0.02);
        }
        .quest-completed-button {
            @apply bg-gray-600 text-gray-300 cursor-not-allowed;
            background-image: none;
            opacity: 0.7;
        }
        .stat-button {
            @apply bg-green-500 hover:bg-green-600 text-white font-bold py-1 px-3 rounded-full text-sm ml-2 transition duration-200;
        }
        .stat-button:disabled {
            @apply bg-gray-600 cursor-not-allowed;
        }
      `}</style>

      {/* User ID Display */}
      {userId && (
        <div className="bg-gray-700 bg-opacity-70 rounded-xl p-3 mb-6 shadow-xl text-sm break-all">
          <p className="text-gray-300">Your User ID: <span className="font-mono text-blue-300">{userId}</span></p>
        </div>
      )}

      {/* Message Box */}
      {message && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce transition-all duration-300 ease-out">
          {message}
        </div>
      )}

      {/* Main XP System Card */}
      <div className="bg-gray-800 bg-opacity-70 rounded-2xl shadow-2xl p-6 sm:p-10 w-full max-w-4xl border border-gray-700 transform transition-all duration-300 hover:scale-[1.005]">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-center mb-8 glow-text">
          My Real-Life Leveling System
        </h1>

        {/* XP and Level Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center mb-8">
          <div className="bg-gray-700 bg-opacity-50 p-5 rounded-xl shadow-inner border border-gray-600">
            <p className="text-gray-300 text-lg">Current Level</p>
            <p className="text-5xl font-bold text-yellow-400">{currentLevel}</p>
          </div>
          <div className="bg-gray-700 bg-opacity-50 p-5 rounded-xl shadow-inner border border-gray-600">
            <p className="text-gray-300 text-lg">Current XP</p>
            <p className="text-5xl font-bold text-green-400">{currentXP}</p>
          </div>
          <div className="bg-gray-700 bg-opacity-50 p-5 rounded-xl shadow-inner border border-gray-600">
            <p className="text-gray-300 text-lg">XP to Next Level</p>
            <p className="text-5xl font-bold text-purple-400">{xpToNextLevel < 0 ? 0 : xpToNextLevel}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-4 mb-8 relative overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(currentXP / calculateXpRequiredForNextLevel(currentLevel)) * 100}%` }}
          ></div>
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-xs font-semibold text-white mix-blend-difference">
            {currentXP} / {calculateXpRequiredForNextLevel(currentLevel)} XP
          </span>
        </div>

        {/* Character Stats Section */}
        <h2 className="text-3xl font-bold text-center mb-6 text-red-400">Character Stats</h2>
        <div className="bg-gray-700 bg-opacity-50 rounded-xl p-4 mb-8 border border-gray-600 shadow-inner">
            <p className="text-center text-lg text-gray-300 mb-4">
                Available Stat Points: <span className="font-bold text-yellow-300 text-2xl">{statPoints}</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                {[
                    { name: 'Strength', value: strength, setter: setStrength },
                    { name: 'Intelligence', value: intelligence, setter: setIntelligence },
                    { name: 'Agility', value: agility, setter: setAgility },
                    { name: 'Vitality', value: vitality, setter: setVitality },
                ].map((stat) => (
                    <div key={stat.name} className="flex flex-col items-center p-3 rounded-xl bg-gray-800 border border-gray-700">
                        <p className="text-gray-300 text-md">{stat.name}</p>
                        <p className="text-4xl font-bold text-red-300 mb-2">{stat.value}</p>
                        <button
                            onClick={() => allocateStatPoint(stat.name.toLowerCase())}
                            disabled={statPoints <= 0}
                            className="stat-button"
                        >
                            + Add Point
                        </button>
                    </div>
                ))}
            </div>
        </div>


        {/* Daily Quests Section */}
        <h2 className="text-3xl font-bold text-center mb-6 text-yellow-300">Daily Quests</h2>
        <div className="bg-gray-700 bg-opacity-50 rounded-xl p-4 mb-8 border border-gray-600 shadow-inner">
          {dailyQuests.length === 0 ? (
            <p className="text-center text-gray-400">No daily quests available. Quests will generate soon!</p>
          ) : (
            <ul className="space-y-3">
              {dailyQuests.map((quest) => (
                <li key={quest.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
                  <span className={`flex-1 text-lg ${quest.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                    {quest.description}
                  </span>
                  <span className="text-green-400 font-semibold mr-4">+{quest.xp} XP</span>
                  <button
                    onClick={() => completeDailyQuest(quest.id)}
                    disabled={quest.completed}
                    className={`px-4 py-2 rounded-lg font-bold transition duration-200 ${
                      quest.completed
                        ? 'quest-completed-button'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transform hover:scale-105 active:scale-95'
                    }`}
                  >
                    {quest.completed ? 'Completed!' : 'Complete'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* XP Actions */}
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-300">Gain XP (General Actions)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {xpActions.map((action, index) => (
            <button
              key={index}
              onClick={() => addXP(action.xp, action.name)}
              className="xp-button"
            >
              {action.name} <span className="text-sm font-normal">({action.xp} XP)</span>
            </button>
          ))}
        </div>

        {/* XP Log */}
        <h2 className="text-3xl font-bold text-center mb-6 text-pink-300">XP Log</h2>
        <div className="bg-gray-700 bg-opacity-50 rounded-xl p-4 max-h-60 overflow-y-auto border border-gray-600 shadow-inner">
          {xpLog.length === 0 ? (
            <p className="text-center text-gray-400">No XP activities logged yet. Start grinding!</p>
          ) : (
            <ul className="space-y-2">
              {xpLog.map((entry, index) => (
                <li key={index} className="log-entry flex justify-between items-center p-3 rounded-lg text-gray-200 text-sm">
                  <span className="font-medium text-blue-200">{entry.action}</span>
                  <span className="font-semibold text-green-300">+{entry.xpGained} XP</span>
                  <span className="text-gray-400 text-xs">{entry.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="mt-10 text-gray-500 text-sm text-center">
        Powered by Solo Leveling inspiration and Firebase
      </footer>
    </div>
  );
}

export default App;
