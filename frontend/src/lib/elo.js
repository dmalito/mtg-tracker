// Derive winner from BoN scores
export function deriveWinner(players, scores) {
  return [...players]
    .filter(p => scores[p.name] !== '' && scores[p.name] !== undefined)
    .sort((a, b) => Number(scores[b.name]) - Number(scores[a.name]))[0]?.name ?? '';
}

export const COLOR_META = [
  { v: 'W', label: 'White' },
  { v: 'U', label: 'Blue'  },
  { v: 'B', label: 'Black' },
  { v: 'R', label: 'Red'   },
  { v: 'G', label: 'Green' },
  { v: 'C', label: 'Colorless' },
];

export const FMT_LABELS = {
  cmd:  'Commander / EDH',
  pau:  'Pauper',
  both: 'Both',
};

export function fmtDate(d) {
  if (!d) return '—';
  const [y, m, dd] = d.split('-');
  const mo = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mo[parseInt(m) - 1]} ${parseInt(dd)}, ${y}`;
}
