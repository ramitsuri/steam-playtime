import { GamingSession, StatsData } from "../types";

// Note: initSqlJs is available globally from the script tag in index.html
declare var initSqlJs: any;

export async function processDatabase(fileBuffer: ArrayBuffer): Promise<StatsData> {
  const SQL = await initSqlJs({
    locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.3/${file}`
  });

  const db = new SQL.Database(new Uint8Array(fileBuffer));

  // 1. Discover all tables
  const tablesResult = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
  if (!tablesResult.length || !tablesResult[0].values.length) {
    throw new Error("The database appears to be empty or contains no tables.");
  }

  const tableNames = tablesResult[0].values.map((row: any) => row[0] as string);
  
  // 2. Extract Game Names from game_dict (as provided by user)
  const gameNamesMap = new Map<number, string>();
  if (tableNames.includes('game_dict')) {
    try {
      const dictResults = db.exec(`SELECT "game_id", "name" FROM "game_dict"`);
      if (dictResults.length && dictResults[0].values.length) {
        dictResults[0].values.forEach((row: any) => {
          const id = Number(row[0]);
          const name = String(row[1]);
          if (!isNaN(id) && name && name !== 'undefined' && name !== 'null') {
            gameNamesMap.set(id, name);
          }
        });
      }
    } catch (e) {
      console.warn("Found 'game_dict' but failed to query it. Trying fallback discovery.", e);
    }
  }

  // 3. Extract Sessions from play_time (as provided by user)
  let sessionTable = tableNames.find((t: string) => t.toLowerCase() === 'play_time') || '';
  let idCol = 'game_id';
  let timeCol = 'date_time';
  let durCol = 'duration';

  // Fallback discovery if the specific table names aren't found
  if (!sessionTable) {
    const ID_COLS = ['game_id', 'appid', 'app_id', 'id', 'steam_id'];
    const TIME_COLS = ['date_time', 'start_time', 'timestamp', 'date', 'time', 'played_at'];
    const DUR_COLS = ['duration', 'playtime', 'seconds', 'minutes'];

    for (const tableName of tableNames) {
      const info = db.exec(`PRAGMA table_info("${tableName}")`);
      const cols = info[0].values.map((row: any) => (row[1] as string).toLowerCase());
      
      const foundId = cols.find((c: string) => ID_COLS.includes(c));
      const foundTime = cols.find((c: string) => TIME_COLS.includes(c));
      const foundDur = cols.find((c: string) => DUR_COLS.includes(c));

      if (foundId && (foundTime || foundDur)) {
        sessionTable = tableName;
        idCol = foundId;
        timeCol = foundTime || '';
        durCol = foundDur || '';
        break;
      }
    }
  }

  if (!sessionTable) {
    throw new Error("Could not find a gaming session table (expected 'play_time').");
  }

  const query = `SELECT "${idCol}", ${timeCol ? `"${timeCol}"` : "NULL"}, ${durCol ? `"${durCol}"` : "0"} FROM "${sessionTable}"`;
  const results = db.exec(query);
  if (!results.length) throw new Error(`Table ${sessionTable} exists but returned no data.`);

  // 4. Normalize and Process
  const rawSessions = results[0].values.map((row: any) => ({
    game_id: Number(row[0]),
    start_time: row[1],
    duration: Number(row[2]) || 0
  }));

  const parseSqliteDate = (val: any): Date | null => {
    if (val === null || val === undefined) return null;
    
    // Check if it's a number (Unix timestamp)
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return new Date(num > 10000000000 ? num : num * 1000);
    }
    
    // Handle ISO or other string formats
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  };

  const sessions: GamingSession[] = rawSessions.map((s: any) => ({
    ...s,
    start_time: parseSqliteDate(s.start_time) || new Date(0),
    // User confirmed 'play_time' duration is in seconds
    duration: s.duration / 60 
  })).filter((s: GamingSession) => (s.start_time as Date).getTime() > 0);

  // 5. Aggregate Distributions
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weeklyMap = new Array(7).fill(0);
  const hourMap = new Array(24).fill(0);
  const monthMap: Record<string, number> = {};

  sessions.forEach((s: GamingSession) => {
    const date = s.start_time as Date;
    const dayIdx = date.getDay();
    const hour = date.getHours();
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const durationHrs = (s.duration || 0) / 60;

    weeklyMap[dayIdx] += durationHrs;
    hourMap[hour] += durationHrs;
    monthMap[monthKey] = (monthMap[monthKey] || 0) + durationHrs;
  });

  const gameDurations = new Map<number, number>();
  sessions.forEach((s: GamingSession) => {
    if (!isNaN(s.game_id) && s.game_id !== 0) {
      gameDurations.set(s.game_id, (gameDurations.get(s.game_id) || 0) + (s.duration || 0));
    }
  });

  const topGames = Array.from(gameDurations.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([id, dur]) => ({
      game_id: id,
      name: gameNamesMap.get(id) || `AppID: ${id}`,
      hours: Math.round((dur / 60) * 10) / 10
    }));

  return {
    totalGames: new Set(sessions.map((s: GamingSession) => s.game_id)).size,
    totalHours: Math.round((sessions.reduce((sum: number, s: GamingSession) => sum + s.duration, 0) / 60) * 10) / 10,
    topGames,
    weeklyDistribution: days.map((day, i) => ({ day, hours: Math.round(weeklyMap[i] * 10) / 10 })),
    monthlyDistribution: Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).map(([m, h]) => ({ month: m, hours: Math.round(h * 10) / 10 })),
    timeOfDayDistribution: hourMap.map((hrs, i) => ({ hour: `${String(i).padStart(2, '0')}:00`, hours: Math.round(hrs * 10) / 10 })),
    sessions
  };
}