
import React, { useState } from 'react';
import { AnalysisState, StatsData } from './types';
import { processDatabase } from './services/sqliteService';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  const [state, setState] = useState<AnalysisState>(AnalysisState.IDLE);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setState(AnalysisState.LOADING_DB);
    setError(null);

    try {
      const buffer = await file.arrayBuffer();
      setState(AnalysisState.PROCESSING);
      
      const processedStats = await processDatabase(buffer);
      setStats(processedStats);
      setState(AnalysisState.READY);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred processing your database.");
      setState(AnalysisState.ERROR);
    }
  };

  const reset = () => {
    setState(AnalysisState.IDLE);
    setStats(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-blue-500/30">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-bold text-lg text-white">P</span>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              PlayPulse
            </h1>
          </div>
          {state !== AnalysisState.IDLE && (
            <button 
              onClick={reset}
              className="px-4 py-1.5 text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-all"
            >
              Upload New
            </button>
          )}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {state === AnalysisState.IDLE && (
          <div className="max-w-2xl mx-auto mt-20 text-center animate-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-5xl font-black mb-6 tracking-tight">Your Gaming History, <span className="text-blue-500">Visualized.</span></h2>
            <p className="text-gray-400 text-lg mb-10 leading-relaxed">
              Upload your local PlayTime Decky SQLite session database. We'll extract your playtime data 
              and identify titles using your local game dictionary. No data ever leaves your computer.
            </p>
            
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
              <label className="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-900/50 hover:bg-gray-800/50 hover:border-blue-500/50 transition-all cursor-pointer">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg className="w-12 h-12 mb-4 text-gray-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mb-2 text-xl font-semibold text-gray-200">Choose your SQLite database</p>
                  <p className="text-sm text-gray-500">Supports .db, .sqlite files with session and dictionary tables</p>
                </div>
                <input type="file" className="hidden" accept=".db,.sqlite,.sqlite3" onChange={handleFileUpload} />
              </label>
            </div>
          </div>
        )}

        {(state === AnalysisState.LOADING_DB || state === AnalysisState.PROCESSING) && (
          <div className="flex flex-col items-center justify-center py-40 animate-in fade-in duration-500">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-2xl font-bold mb-2">
              {state === AnalysisState.LOADING_DB ? "Loading database..." : "Analyzing sessions..."}
            </h3>
            <p className="text-gray-400">Processing records entirely in your browser.</p>
          </div>
        )}

        {state === AnalysisState.ERROR && (
          <div className="max-w-lg mx-auto bg-red-900/20 border border-red-900/50 rounded-xl p-8 text-center animate-in zoom-in-95 duration-300">
            <div className="text-red-400 mb-4 font-bold text-xl flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Error
            </div>
            <p className="text-gray-300 mb-8 leading-relaxed">{error}</p>
            <button 
              onClick={reset}
              className="bg-red-600 hover:bg-red-500 text-white px-8 py-2.5 rounded-lg font-bold transition-all transform hover:scale-105"
            >
              Try Another Database
            </button>
          </div>
        )}

        {state === AnalysisState.READY && stats && (
          <Dashboard stats={stats} />
        )}
      </main>

      <footer className="mt-20 border-t border-gray-800 py-12 bg-gray-900/30">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm mb-2">Built with React and sql.js.</p>
          <p className="text-gray-600 text-xs">Privacy first: Your database stays on your device.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
