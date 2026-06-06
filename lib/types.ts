export interface Team {
  id: number;
  name: string;
  short_name?: string;
  logo_url?: string;
}

export interface MatchStat {
  team_id: number;
  team_name: string;
  possession: number;
  shots: number;
  shots_on_target: number;
  pass_accuracy: number;
  passes: number;
  fouls: number;
  corners: number;
  yellow_cards: number;
  red_cards: number;
  offsides: number;
  xg: number;
  press_intensity: number;
}

export interface PlayerRating {
  id: number;
  name: string;
  position: string;
  team_name: string;
  rating: number;
  minutes_played: number;
  goals: number;
  assists: number;
  shots: number;
  passes: number;
  pass_accuracy: number;
  tackles: number;
}

export interface MatchDetail {
  id: number;
  home_team: Team;
  away_team: Team;
  home_score: number;
  away_score: number;
  status: string;
  match_date: string;
  league?: string;
  season?: string;
  venue?: string;
  home_stats?: MatchStat;
  away_stats?: MatchStat;
  players: PlayerRating[];
  analysis: { insights: string[]; model: string; created_at: string } | null;
}
