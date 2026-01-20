
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, LabelList
} from 'recharts';
import { StatsData, GamingSession } from '../types';

interface DashboardProps {
  stats: StatsData;
}

const formatPlaytime = (h: number) => {
  const totalMinutes = Math.round(h * 60);
  const hrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-2xl ring-1 ring-white/10">
        <p className="text-blue-400 font-bold text-sm mb-1">{data.name || data.day || data.label || data.hour || (data.date ? `Day ${data.date}` : '')}</p>
        <div className="space-y-1">
          {data.game_id && (
            <p className="text-gray-400 text-xs">
              <span className="text-gray-500">AppID:</span> {data.game_id}
            </p>
          )}
          <p className="text-gray-100 text-sm font-semibold">
            <span className="text-gray-500 font-normal">Playtime:</span> {formatPlaytime(data.hours)}
          </p>
          {(data.sessionCount !== undefined || data.sessions !== undefined) && (
            <p className="text-gray-100 text-sm font-semibold">
              <span className="text-gray-500 font-normal">Sessions:</span> {data.sessionCount || data.sessions}
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ stats }) => {
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#ef4444', '#06b6d4', '#f59e0b'];

  const currentSessions = useMemo(() => {
    if (selectedGameId === null) return stats.sessions;
    return stats.sessions.filter(s => s.game_id === selectedGameId);
  }, [stats.sessions, selectedGameId]);

  const dateRange = useMemo(() => {
    if (!currentSessions.length) return { min: new Date(), max: new Date() };
    const timestamps = currentSessions.map(s => (s.start_time as Date).getTime());
    return {
      min: new Date(Math.min(...timestamps)),
      max: new Date(Math.max(...timestamps))
    };
  }, [currentSessions]);

  const latestMonthOffset = useMemo(() => {
    const now = new Date();
    const lastSession = dateRange.max;
    return (lastSession.getFullYear() - now.getFullYear()) * 12 + (lastSession.getMonth() - now.getMonth());
  }, [dateRange.max]);

  const latestWeekOffset = useMemo(() => {
    const now = new Date();
    const lastSession = dateRange.max;
    const d1 = new Date(now);
    d1.setDate(d1.getDate() - d1.getDay());
    d1.setHours(0, 0, 0, 0);
    const d2 = new Date(lastSession);
    d2.setDate(d2.getDate() - d2.getDay());
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2.getTime() - d1.getTime()) / (7 * 24 * 60 * 60 * 1000));
  }, [dateRange.max]);

  useEffect(() => {
    setSelectedDay(null);
  }, [selectedGameId, monthOffset, weekOffset]);

  useEffect(() => {
    setWeekOffset(latestWeekOffset);
    setMonthOffset(latestMonthOffset);
  }, [selectedGameId, latestWeekOffset, latestMonthOffset]);

  const currentWeekData = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + (weekOffset * 7)));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayBuckets = days.map(d => ({ day: d, hours: 0 }));
    const filtered = currentSessions.filter(s => {
      const d = s.start_time as Date;
      return d >= startOfWeek && d < endOfWeek;
    });
    filtered.forEach(s => {
      const dayIdx = (s.start_time as Date).getDay();
      dayBuckets[dayIdx].hours += (s.duration || 0) / 60;
    });
    const total = dayBuckets.reduce((sum, d) => sum + d.hours, 0);
    return {
      buckets: dayBuckets,
      totalFormatted: formatPlaytime(total),
      avgFormatted: formatPlaytime(total / 7),
      range: `${startOfWeek.toLocaleDateString()} - ${new Date(endOfWeek.getTime() - 1).toLocaleDateString()}`,
      canPrev: currentSessions.some(s => (s.start_time as Date) < startOfWeek),
      canNext: currentSessions.some(s => (s.start_time as Date) >= endOfWeek)
    };
  }, [currentSessions, weekOffset]);

  const targetMonthDate = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const currentMonthData = useMemo(() => {
    const targetMonth = targetMonthDate;
    const year = targetMonth.getFullYear();
    const month = targetMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dailyBuckets = Array.from({ length: daysInMonth }, (_, i) => ({
      date: i + 1,
      hours: 0,
      label: `${targetMonth.toLocaleString('default', { month: 'short' })} ${i + 1}`
    }));
    const monthSessions = currentSessions.filter(s => {
      const d = s.start_time as Date;
      return d.getFullYear() === year && d.getMonth() === month;
    });
    monthSessions.forEach(s => {
      const dateIdx = (s.start_time as Date).getDate() - 1;
      dailyBuckets[dateIdx].hours += (s.duration || 0) / 60;
    });
    const total = dailyBuckets.reduce((sum, d) => sum + d.hours, 0);
    return {
      buckets: dailyBuckets,
      totalFormatted: formatPlaytime(total),
      avgFormatted: formatPlaytime(total / daysInMonth),
      monthName: targetMonth.toLocaleString('default', { month: 'long', year: 'numeric' }),
      canPrev: currentSessions.some(s => (s.start_time as Date) < new Date(year, month, 1)),
      canNext: currentSessions.some(s => (s.start_time as Date) >= new Date(year, month + 1, 1))
    };
  }, [currentSessions, targetMonthDate]);

  const dayDeepDiveData = useMemo(() => {
    if (selectedDay === null) return null;
    const year = targetMonthDate.getFullYear();
    const month = targetMonthDate.getMonth();
    
    const daySessions = currentSessions.filter(s => {
      const d = s.start_time as Date;
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === selectedDay;
    });

    const gameMap = new Map<number, number>();
    const uniqueGameIds: number[] = [];
    daySessions.forEach(s => {
      const durationHrs = (s.duration || 0) / 60;
      gameMap.set(s.game_id, (gameMap.get(s.game_id) || 0) + durationHrs);
      if (!uniqueGameIds.includes(s.game_id)) {
        uniqueGameIds.push(s.game_id);
      }
    });

    // Create a color map for games played this day
    const gameColorMap = new Map<number, string>();
    uniqueGameIds.forEach((id, idx) => {
      gameColorMap.set(id, COLORS[idx % COLORS.length]);
    });

    const timelineSessions = daySessions.map((s, idx) => {
      const start = s.start_time as Date;
      const startMinutes = start.getHours() * 60 + start.getMinutes();
      const durationMinutes = s.duration || 0;
      
      const gameInfo = stats.topGames.find(g => Number(g.game_id) === Number(s.game_id));
      const startPercent = (startMinutes / 1440) * 100;
      let widthPercent = (durationMinutes / 1440) * 100;
      
      if (startPercent + widthPercent > 100) {
        widthPercent = 100 - startPercent;
      }

      return {
        id: idx,
        game_id: s.game_id,
        name: gameInfo?.name || `AppID: ${s.game_id}`,
        startTimeStr: start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        endTimeStr: new Date(start.getTime() + durationMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        startPercent,
        widthPercent: Math.max(widthPercent, 0.4),
        heightPercent: Math.min(65, Math.max(25, (durationMinutes / 240) * 65)), 
        durationFormatted: formatPlaytime(durationMinutes / 60),
        color: gameColorMap.get(s.game_id) || COLORS[0]
      };
    }).sort((a, b) => a.startPercent - b.startPercent);

    const dayGamesSummary = Array.from(gameMap.entries())
      .map(([id, hours]) => {
        const gameInfo = stats.topGames.find(g => Number(g.game_id) === id);
        return { 
          game_id: id, 
          name: gameInfo?.name || `AppID: ${id}`, 
          hours,
          displayLabel: formatPlaytime(hours),
          color: gameColorMap.get(id)
        };
      })
      .sort((a, b) => b.hours - a.hours);

    const total = dayGamesSummary.reduce((sum, g) => sum + g.hours, 0);

    return {
      date: new Date(year, month, selectedDay).toLocaleDateString(undefined, { dateStyle: 'long' }),
      games: dayGamesSummary,
      timelineSessions,
      totalFormatted: formatPlaytime(total)
    };
  }, [selectedDay, targetMonthDate, currentSessions, stats.topGames]);

  const evolutionData = useMemo(() => {
    const monthMap: Record<string, number> = {};
    currentSessions.forEach(s => {
      const d = s.start_time as Date;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthMap[key] = (monthMap[key] || 0) + (s.duration || 0) / 60;
    });
    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, hours]) => ({ month, hours }));
  }, [currentSessions]);

  const rhythmData = useMemo(() => {
    const hourMap = new Array(24).fill(0);
    currentSessions.forEach(s => {
      const hour = (s.start_time as Date).getHours();
      hourMap[hour] += (s.duration || 0) / 60;
    });
    return hourMap.map((hours, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, hours }));
  }, [currentSessions]);

  const lifetimeRanking = useMemo(() => {
    const gameMap = new Map<number, { hours: number; sessions: number }>();
    stats.sessions.forEach(s => {
      const id = Number(s.game_id);
      const existing = gameMap.get(id) || { hours: 0, sessions: 0 };
      gameMap.set(id, { 
        hours: existing.hours + (s.duration || 0) / 60, 
        sessions: existing.sessions + 1 
      });
    });
    return Array.from(gameMap.entries())
      .map(([id, data]) => {
        const gameInfo = stats.topGames.find(g => Number(g.game_id) === id);
        const name = gameInfo?.name || `AppID: ${id}`;
        return {
          game_id: id,
          hours: data.hours,
          sessionCount: data.sessions,
          name: name,
          displayLabel: `${formatPlaytime(data.hours)} (${data.sessions} sess)`
        };
      })
      .sort((a, b) => b.hours - a.hours);
  }, [stats.sessions, stats.topGames]);

  const handleBarClick = (data: any) => {
    if (data && data.date) {
      setSelectedDay(data.date);
      setTimeout(() => {
        const el = document.getElementById('daily-deep-dive');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20">
      {/* Stats Summary Section */}
      {selectedGameId !== null ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSelectedGameId(null)}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-2xl transition-all group shadow-lg"
            >
              <svg className="w-6 h-6 text-gray-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <div>
              <h2 className="text-4xl font-black text-white tracking-tight leading-none">{stats.topGames.find(g => Number(g.game_id) === Number(selectedGameId))?.name || `AppID: ${selectedGameId}`}</h2>
              <p className="text-gray-500 mt-2 font-mono text-sm">AppID: {selectedGameId}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-gray-800/50 px-6 py-4 rounded-2xl border border-gray-700 shadow-xl text-center min-w-[140px]">
              <div className="text-2xl font-black text-white">{formatPlaytime(currentSessions.reduce((s, r) => s + r.duration, 0) / 60)}</div>
              <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Playtime</div>
            </div>
            <div className="bg-gray-800/50 px-6 py-4 rounded-2xl border border-gray-700 shadow-xl text-center min-w-[140px]">
              <div className="text-2xl font-black text-white">{currentSessions.length}</div>
              <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Total Sessions</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Games" value={stats.totalGames} subtitle="In library" icon="🎮" />
          <StatCard title="Total Playtime" value={formatPlaytime(stats.totalHours)} subtitle="Recorded" icon="⏳" />
          <StatCard title="Top Title" value={stats.topGames[0]?.name || "N/A"} subtitle={`${formatPlaytime(stats.topGames[0]?.hours || 0)} total`} icon="🏆" />
        </div>
      )}

      {/* Weekly Breakdown Section */}
      <section className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
              Weekly Breakdown
            </h3>
            <p className="text-gray-400 mt-1 font-medium">{currentWeekData.range}</p>
          </div>
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button onClick={() => setWeekOffset(v => v - 1)} disabled={!currentWeekData.canPrev} className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
            <button onClick={() => setWeekOffset(latestWeekOffset)} className="px-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-blue-400">Latest</button>
            <button onClick={() => setWeekOffset(v => v + 1)} disabled={!currentWeekData.canNext} className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentWeekData.buckets}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Monthly Activity Section */}
      <section className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <span className="w-2 h-8 bg-purple-500 rounded-full"></span>
              Monthly Activity
            </h3>
            <p className="text-gray-400 mt-1 font-medium">{currentMonthData.monthName} <span className="text-[10px] ml-2 text-gray-600 uppercase tracking-widest font-bold text-purple-400 animate-pulse">(Click any day for details)</span></p>
          </div>
          <div className="flex bg-gray-800 rounded-xl p-1">
            <button onClick={() => setMonthOffset(v => v - 1)} disabled={!currentMonthData.canPrev} className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg></button>
            <button onClick={() => setMonthOffset(latestWeekOffset)} className="px-4 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-purple-400">Latest</button>
            <button onClick={() => setMonthOffset(v => v + 1)} disabled={!currentMonthData.canNext} className="p-2 rounded-lg hover:bg-gray-700 disabled:opacity-20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg></button>
          </div>
        </div>
        
        <div className="space-y-8">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentMonthData.buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#4b5563', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                <Bar 
                  dataKey="hours" 
                  radius={[4, 4, 0, 0]} 
                  className="cursor-pointer transition-all duration-300"
                  onClick={(data) => handleBarClick(data)}
                >
                  {currentMonthData.buckets.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedDay === entry.date ? '#d8b4fe' : '#a855f7'}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-800/60 text-center">
              <div className="text-2xl font-black text-white">{currentMonthData.totalFormatted}</div>
              <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Month Total</div>
            </div>
            <div className="bg-gray-800/40 p-4 rounded-xl border border-gray-800/60 text-center">
              <div className="text-2xl font-black text-white">{currentMonthData.avgFormatted}</div>
              <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mt-1">Daily Average</div>
            </div>
          </div>
        </div>
      </section>

      {/* Daily Deep Dive Section */}
      {dayDeepDiveData && (
        <section id="daily-deep-dive" className="bg-blue-600/10 border-2 border-blue-500/30 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-6 duration-500 relative">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-black text-white">Daily Insight</h3>
              <p className="text-blue-400 font-bold tracking-tight">{dayDeepDiveData.date}</p>
            </div>
            <button 
              onClick={() => setSelectedDay(null)}
              className="p-2 hover:bg-gray-800 rounded-xl transition-colors text-gray-400 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Games Summary</h4>
              <div className="space-y-4">
                {dayDeepDiveData.games.length > 0 ? dayDeepDiveData.games.map((g, i) => (
                  <div key={g.game_id} className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs text-white"
                        style={{ backgroundColor: g.color }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{g.name}</div>
                        <div className="text-[10px] text-gray-500 uppercase font-black">AppID: {g.game_id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-blue-400">{g.displayLabel}</div>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-500 italic">No games recorded for this day.</p>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-gray-800/50 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Day Total</span>
                <span className="text-xl font-black text-white">{dayDeepDiveData.totalFormatted}</span>
              </div>
            </div>

            <div className="flex flex-col">
              <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-6">Session Timeline (24h)</h4>
              
              <div className="relative h-80 bg-gray-900/40 rounded-2xl border border-gray-800/60 pt-24 pb-12 px-4 isolate">
                
                {/* 24-hour Grid Lines */}
                <div className="absolute inset-x-4 inset-y-0 flex justify-between pointer-events-none">
                  {[0, 4, 8, 12, 16, 20, 24].map(h => (
                    <div key={h} className="relative h-full flex flex-col items-center">
                      <div className="h-full border-l border-gray-800/40 border-dashed"></div>
                      <span className="absolute bottom-1 text-[9px] text-gray-600 font-bold whitespace-nowrap bg-gray-900/80 px-1 rounded translate-y-2">{String(h).padStart(2, '0')}:00</span>
                    </div>
                  ))}
                </div>

                {/* Session Blocks Container */}
                <div className="relative h-full flex items-end">
                  {dayDeepDiveData.timelineSessions.map((session) => (
                    <div 
                      key={session.id}
                      className="absolute bottom-0 rounded-lg group transition-all hover:ring-2 hover:ring-white/40 cursor-help"
                      style={{
                        left: `${session.startPercent}%`,
                        width: `${session.widthPercent}%`,
                        height: `${session.heightPercent}%`,
                        backgroundColor: session.color,
                        opacity: 0.9,
                        zIndex: 10
                      }}
                    >
                      {/* Tooltip positioned bottom-full */}
                      <div className={`absolute bottom-full mb-3 left-1/2 -translate-x-1/2 
                        bg-gray-900 text-white p-3 rounded-lg shadow-2xl border border-gray-700 
                        pointer-events-none opacity-0 group-hover:opacity-100 transition-all z-[100] 
                        min-w-[180px] translate-y-4 group-hover:translate-y-0
                        ${session.startPercent < 15 ? 'left-0 translate-x-0' : ''} 
                        ${session.startPercent > 85 ? 'left-full -translate-x-full' : ''}`}
                      >
                        <div className="text-xs font-black uppercase tracking-widest text-blue-400 mb-1 border-b border-gray-800 pb-1 truncate">{session.name}</div>
                        <div className="text-sm font-black text-white">{session.startTimeStr} - {session.endTimeStr}</div>
                        <div className="text-xs text-gray-400 mt-1">Duration: <span className="text-gray-200 font-bold">{session.durationFormatted}</span></div>
                        
                        {/* Tooltip Arrow */}
                        <div className={`absolute top-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-gray-700
                          ${session.startPercent < 15 ? 'left-4' : session.startPercent > 85 ? 'right-4 left-auto' : 'left-1/2 -translate-x-1/2'}`}
                        ></div>
                      </div>
                      
                      {/* Sub-label for wide blocks */}
                      {session.widthPercent > 5 && (
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                          <span className="text-[8px] font-bold text-gray-500 whitespace-nowrap">
                            {session.startTimeStr}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                {dayDeepDiveData.timelineSessions.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600 text-xs italic">
                    No session data for this day
                  </div>
                )}
              </div>
              <div className="mt-8 flex items-center justify-center gap-6 text-[10px] text-gray-500 uppercase font-black tracking-widest">
                <div className="flex items-center gap-1.5"><span className="w-3 h-1.5 rounded-sm bg-gray-600"></span> Session Color = Unique Game</div>
                <div className="flex items-center gap-1.5"><span className="w-1.5 h-3 rounded-sm bg-gray-600"></span> Height = Duration</div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Lifetime Ranking Section */}
      {selectedGameId === null && (
        <section className="bg-gray-900/50 border border-gray-800 rounded-3xl p-8 shadow-2xl">
          <h3 className="text-2xl font-black text-white flex items-center gap-3 mb-8">
            <span className="w-2 h-8 bg-emerald-500 rounded-full"></span>
            Lifetime Ranking
          </h3>
          <div className="h-[500px] overflow-y-auto pr-4 custom-scrollbar">
            <ResponsiveContainer width="100%" height={Math.max(500, lifetimeRanking.length * 40)}>
              <BarChart data={lifetimeRanking} layout="vertical" margin={{ left: 10, right: 180 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="game_id" type="category" axisLine={false} tickLine={false} width={180} tick={({ x, y, payload }) => {
                  const game = lifetimeRanking.find(g => Number(g.game_id) === Number(payload.value));
                  return (
                    <text x={x - 10} y={y} dy={4} textAnchor="end" fill="#9ca3af" fontSize={11} fontWeight={600} className="cursor-pointer hover:fill-blue-400" onClick={() => setSelectedGameId(Number(payload.value))}>
                      {game?.name && game.name.length > 20 ? game.name.substring(0, 18) + '...' : game?.name}
                    </text>
                  );
                }} />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]} barSize={24} className="cursor-pointer" onClick={(e: any) => e && setSelectedGameId(Number(e.game_id))}>
                  {lifetimeRanking.map((entry, index) => <Cell key={`cell-${entry.game_id}`} fill={COLORS[index % COLORS.length]} />)}
                  <LabelList dataKey="displayLabel" position="right" style={{ fill: '#9ca3af', fontSize: 10, fontWeight: 700 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Lower Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><span className="w-2 h-6 bg-pink-500 rounded-full"></span>Intensity Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="hours" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><span className="w-2 h-6 bg-emerald-500 rounded-full"></span>Daily Rhythm</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rhythmData}>
                <defs><linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="hours" stroke="#10b981" strokeWidth={2} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subtitle, icon }: any) => (
  <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-xl hover:border-gray-700 transition-colors group">
    <div className="flex items-center justify-between mb-4">
      <span className="text-sm font-medium text-gray-500 uppercase tracking-wider group-hover:text-gray-300">{title}</span>
      <span className="text-2xl opacity-50">{icon}</span>
    </div>
    <div className="text-4xl font-black text-white mb-2 tracking-tight">{value}</div>
    <div className="text-sm text-gray-500 font-medium">{subtitle}</div>
  </div>
);

export default Dashboard;
