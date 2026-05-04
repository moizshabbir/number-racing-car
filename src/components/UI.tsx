import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { motion, AnimatePresence } from 'framer-motion';

const formatTime = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
}

export function UI() {
  const { status, time, speed, levels, currentLevelIndex, message } = useGameStore();
  const [countdownText, setCountdownText] = useState('');

  const isIntro = status === 'intro';
  const isCountdown = status === 'countdown';
  const isFinish = status === 'finish';
  const isChampion = status === 'champion';
  const isOutOfTrack = status === 'outOfTrack';
  const currentNumber = levels[currentLevelIndex];

  useEffect(() => {
    if (isCountdown) {
      setCountdownText('3');
      const t1 = setTimeout(() => setCountdownText('2'), 750);
      const t2 = setTimeout(() => setCountdownText('1'), 1500);
      const t3 = setTimeout(() => setCountdownText('GO!'), 2250);
      return () => {
         clearTimeout(t1);
         clearTimeout(t2);
         clearTimeout(t3);
      };
    } else {
      setCountdownText('');
    }
  }, [isCountdown]);

  const displaySpeed = Math.min(320, Math.max(0, speed * 5));
  const rotation = -135 + (displaySpeed / 320) * 270;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col text-[#E0E0E0] font-sans overflow-hidden select-none">
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent"></div>
      
      {/* Dev / Debug Tools (Always visible for testing) */}
      <div className="absolute top-4 right-4 z-50 pointer-events-auto bg-black/60 p-2 rounded border border-cyan-500/30 flex items-center gap-2 backdrop-blur">
        <label className="text-xs text-cyan-400 font-bold uppercase">Jump to Level:</label>
        <select 
          className="bg-black text-white text-xs border border-cyan-500/50 rounded px-2 py-1 outline-none"
          value={currentLevelIndex}
          onChange={(e) => useGameStore.getState().jumpToLevel(Number(e.target.value))}
        >
          {levels.map((num, i) => (
            <option key={num} value={i}>Level {i + 1} (Shape {num})</option>
          ))}
        </select>
      </div>

      {/* Top HUD */}
      <div className="relative z-20 flex justify-between items-start p-6">
        
        {/* Top Left: Laps / Time */}
        <div className="flex flex-col gap-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.2)] bg-black/40 px-6 py-2 rounded-r-3xl border-l-4 border-cyan-400 italic">
          <h2 className="text-3xl font-black text-cyan-400 font-mono tracking-wider">
            {currentLevelIndex + 1}/{levels.length}
          </h2>
          <span className="text-xl font-mono text-white font-bold tracking-widest drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">
            {formatTime(time)}
          </span>
        </div>

        {/* Top Center: Analog Dashboard */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4">
           <div className="relative w-48 h-48 rounded-full border-4 border-white/20 bg-black/60 shadow-[0_0_30px_rgba(0,0,0,0.5)] flex items-center justify-center backdrop-blur-sm">
             {/* Tick Marks inner ring */}
             <div className="absolute inset-2 rounded-full border-2 border-dashed border-white/30"></div>
             
             {/* Digital RPM/Speed */}
             <div className="flex flex-col items-center mt-10">
               <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1 italic">x1000 RPM</span>
               <span className="text-5xl font-mono text-white font-black italic tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]">
                 {Math.round(displaySpeed).toString().padStart(3, '0')}
               </span>
               <span className="text-sm text-cyan-400 font-bold italic">Km/h</span>
             </div>

             {/* Needle */}
             <div 
               className="absolute w-full h-full"
               style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.1s linear' }}
             >
               <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-1.5 h-[40%] bg-red-500 rounded-t-full drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] origin-bottom"></div>
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#333] border-2 border-red-500 rounded-full drop-shadow-xl z-10"></div>
             </div>
           </div>
        </div>

        {/* Top Right: Score / Progress (Mock progress for track length) */}
        <div className="flex flex-col gap-2 text-right drop-shadow-[0_0_10px_rgba(0,255,255,0.2)] bg-black/40 px-6 py-2 rounded-l-3xl border-r-4 border-cyan-400 italic">
          <h2 className="text-3xl font-black text-green-400 font-mono tracking-wider">
            +{(speed * 100).toFixed(0)}
          </h2>
          <span className="text-xl font-mono font-bold tracking-widest text-cyan-400">
            {((currentLevelIndex / levels.length) * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Center Messages */}
      <div className="absolute inset-0 flex items-center justify-center flex-col z-30">
        {isIntro && (
           <div className="text-center drop-shadow-[0_0_20px_rgba(0,242,255,0.8)]">
             <h1 className="text-8xl font-black text-transparent italic tracking-wider animate-pulse" style={{ WebkitTextStroke: '4px #00f2ff' }}>
               SESSION {currentLevelIndex + 1}
             </h1>
           </div>
        )}

        {isCountdown && countdownText && (
          <AnimatePresence mode="wait">
            <motion.div 
               key={countdownText}
               initial={{ scale: 0.5, opacity: 0 }}
               animate={{ scale: 1.5, opacity: 1 }}
               exit={{ scale: 2, opacity: 0 }}
               transition={{ duration: 0.3 }}
               className="absolute inset-0 flex items-center justify-center drop-shadow-[0_0_20px_rgba(0,242,255,0.8)] z-40"
            >
              <h1 className="text-9xl font-black text-transparent italic" style={{ WebkitTextStroke: '4px #00f2ff' }}>
                {countdownText}
              </h1>
            </motion.div>
          </AnimatePresence>
        )}

        {isChampion && (
          <div className="text-center bg-black/80 px-16 py-10 rounded-2xl border-2 border-cyan-500/50 backdrop-blur-md drop-shadow-[0_0_30px_rgba(0,242,255,0.5)]">
            <h1 className="text-7xl font-black text-cyan-400 italic mb-6">
              CHAMPION
            </h1>
            <p className="text-3xl text-white mb-8 font-mono italic">
              Record: {formatTime(time)}
            </p>
            <button 
              className="pointer-events-auto px-10 py-4 bg-cyan-500 text-black font-bold text-xl uppercase tracking-widest hover:bg-cyan-400 transition-colors rounded italic"
              onClick={() => useGameStore.getState().resetRun()}
            >
              New Game
            </button>
          </div>
        )}
        
        {/* Realtime Event Messages (START! FINISH!) */}
        <AnimatePresence>
          {message && (
             <motion.div
               key={message}
               initial={{ y: 50, opacity: 0, scale: 0.8 }}
               animate={{ y: -50, opacity: 1, scale: 1.2 }}
               exit={{ y: -100, opacity: 0, scale: 1.5 }}
               transition={{ duration: 0.4 }}
               className="absolute top-1/2 flex items-center justify-center z-50 pointer-events-none drop-shadow-[0_0_30px_rgba(0,242,255,0.8)]"
             >
                <h2 className="text-8xl font-black text-transparent italic" style={{ WebkitTextStroke: '3px #00f2ff' }}>
                  {message}
                </h2>
             </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom HUD */}
      <div className="mt-auto relative z-20 flex justify-between items-end p-10">
        
        {/* Bottom Left: Steering Visual */}
        <div className="flex items-center gap-6 opacity-60 ml-4">
           {/* Left Arrow */}
           <div className="w-0 h-0 border-t-[15px] border-t-transparent border-r-[25px] border-r-cyan-400 border-b-[15px] border-b-transparent drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]"></div>
           {/* Wheel */}
           <div className="w-24 h-24 rounded-full border-4 border-cyan-400/50 flex flex-col items-center justify-center gap-2 drop-shadow-[0_0_10px_rgba(0,255,255,0.2)]">
              <div className="w-16 h-2 bg-cyan-400/50 rounded-full"></div>
              <div className="w-4 h-8 bg-cyan-400/50 rounded-full"></div>
           </div>
           {/* Right Arrow */}
           <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-cyan-400 border-b-[15px] border-b-transparent drop-shadow-[0_0_10px_rgba(0,255,255,0.5)]"></div>
        </div>

        {/* Bottom Center: Player text */}
        <div className="absolute left-1/2 -translate-x-1/2 bottom-8 text-xl font-bold italic tracking-[0.4em] text-white/50 lowercase">
          player 1
        </div>

        {/* Bottom Right: Pedals */}
        <div className="flex items-end gap-6 mr-8 drop-shadow-[0_0_15px_rgba(0,255,255,0.3)]">
          <div className="w-20 h-28 bg-gray-600/40 rounded-xl border-4 border-white/20 flex flex-wrap p-3 gap-2 content-start transform skew-x-[-10deg] backdrop-blur relative overflow-hidden">
             
             {[...Array(6)].map((_, i) => <div key={i} className={`w-4 h-4 rounded-full ${speed < 0 ? 'bg-red-500 shadow-[0_0_10px_rgba(255,0,0,1)]' : 'bg-red-500/30'}`}></div>)}
          </div>
          <div className="w-16 h-36 bg-gray-500/40 rounded-xl border-4 border-white/30 flex flex-wrap p-3 gap-2 content-start transform skew-x-[-10deg] backdrop-blur">
             {[...Array(12)].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full ${speed > 10 ? 'bg-green-400 shadow-[0_0_10px_rgba(0,255,0,1)]' : 'bg-green-400/30'}`}></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
