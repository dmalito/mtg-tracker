const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002/api';
console.log('API BASE:', BASE);

async function req(method, path, body) {
  console.log('API request:', method, path, body);  // add this
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Games
  getGames:   ()     => req('GET',    '/games'),
  saveGame:   (game) => req('POST',   '/games', game),
  deleteGame: (id)   => req('DELETE', `/games/${id}`),

  // Decks
  getDecks:   ()     => req('GET',    '/decks'),
  addDeck:    (deck) => req('POST',   '/decks', deck),
  updateDeck: (deck) => req('PUT',    `/decks/${deck.id}`, deck),
  deleteDeck: (id)   => req('DELETE', `/decks/${id}`),

  // Players / ELO
  getPlayers: ()     => req('GET',    '/players'),
};
