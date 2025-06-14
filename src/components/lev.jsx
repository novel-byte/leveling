// XP & Leveling Tracker - Starter Website (React + Tailwind)
// We'll make it clean, minimal, and expandable

import React, { useState } from 'react';

const LEVEL_XP = (level) => 100 * level * level;

const actions = [
  { name: 'JS Lesson', xp: 10 },
  { name: 'Fix a Bug', xp: 5 },
  { name: 'Mini Project', xp: 30 },
  { name: 'Workout 20+ min', xp: 10 },
  { name: 'Read 5+ Pages', xp: 10 },
  { name: 'Resist Dopamine Habit', xp: 5 },
  { name: 'Explore Something New', xp: 20 },
  { name: 'Uncomfortable Action', xp: 15 },
  { name: 'Weekly Quest', xp: 50 }
];

export default function XPTracker() {
  const [xp, setXP] = useState(0);

  const getLevel = () => {
    let level = 1;
    while (xp >= LEVEL_XP(level)) level++;
    return level - 1;
  };

  const currentLevel = getLevel();
  const nextLevelXP = LEVEL_XP(currentLevel + 1);
  const currentLevelXP = LEVEL_XP(currentLevel);
  const progress = ((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  return (
    <div className="min-h-screen bg-zinc-900 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-zinc-800 p-6 rounded-2xl shadow-xl">
        <h1 className="text-2xl font-bold text-center mb-4">🧙‍♂️ XP Tracker</h1>
        <p className="text-center text-sm mb-2">Level: <span className="text-green-400">{currentLevel}</span></p>
        <div className="w-full bg-zinc-700 rounded-full h-4 overflow-hidden mb-4">
          <div className="bg-green-500 h-full" style={{ width: `${progress}%` }}></div>
        </div>
        <p className="text-center text-xs mb-6">{xp} XP / {nextLevelXP} XP to Level {currentLevel + 1}</p>

        <div className="grid grid-cols-2 gap-2">
          {actions.map((action) => (
            <button
              key={action.name}
              onClick={() => setXP(xp + action.xp)}
              className="bg-zinc-700 hover:bg-zinc-600 rounded-lg px-3 py-2 text-sm text-left"
            >
              ➕ {action.name} (+{action.xp} XP)
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
