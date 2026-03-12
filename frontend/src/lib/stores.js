import { writable } from 'svelte/store';
import { api } from './api.js';

export const games   = writable([]);
export const decks   = writable([]);
export const players = writable({});
export const loading = writable(true);
export const toast   = writable({ msg: '', visible: false });

let toastTimer;
export function showToast(msg) {
  clearTimeout(toastTimer);
  toast.set({ msg, visible: true });
  toastTimer = setTimeout(() => toast.update(t => ({ ...t, visible: false })), 2600);
}

export async function loadAll() {
  loading.set(true);
  try {
    const [g, d, p] = await Promise.all([api.getGames(), api.getDecks(), api.getPlayers()]);
    games.set(g);
    decks.set(d);
    players.set(p);
  } finally {
    loading.set(false);
  }
}

export async function refreshPlayers() {
  const p = await api.getPlayers();
  players.set(p);
}
