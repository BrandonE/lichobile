import { fetchJSON } from '../../http';
import { Tournament, PlayerInfo, TournamentCreateResponse, TournamentLists } from './interfaces';

export function currentTournaments(): Promise<TournamentLists> {
  return fetchJSON('/tournament', {}, true);
}

export function tournament(id: string): Promise<Tournament> {
  return fetchJSON('/tournament/' + id, {query: {socketVersion: 1}}, true);
}

export function reload(id: string, page: number): Promise<Tournament> {
  return fetchJSON('/tournament/' + id,
  {
    method: 'GET',
    query: page ? { page } : {}
  });
}

export function join(id: string, password: string): Promise<{}> {
  return fetchJSON('/tournament/' + id + '/join',
  {
    method: 'POST',
    body: password ? JSON.stringify({p: password}) : null
  });
}

export function withdraw(id: string): Promise<{}> {
  return fetchJSON('/tournament/' + id + '/withdraw', {method: 'POST'});
}

export function playerInfo(tournamentId: string, playerId: string): Promise<PlayerInfo> {
  return fetchJSON('/tournament/' + tournamentId + '/player/' + playerId, {}, true);
}

export function create(variant: string, position: string, mode: string, clockTime: string, clockIncrement: string, minutes: string, waitMinutes: string, isPrivate: string, password: string): Promise<TournamentCreateResponse> {
  return fetchJSON('/tournament/new', {
    method: 'POST',
    body: JSON.stringify({
      variant,
      position,
      mode,
      clockTime,
      clockIncrement,
      minutes,
      waitMinutes,
      private: isPrivate,
      password
    })
  }, true);
}
