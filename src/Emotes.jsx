import { useState } from 'react';
import { Play, Search } from 'lucide-react';
const label = name => name.replace(/[_-]+/g, ' ').replace(/([a-z])(\d)/g, '$1 $2').replace(/\b[a-z]/g, c => c.toUpperCase());
export default function Emotes({ emotes, error, disabled, onPlay }) {
  const [search, setSearch] = useState('');
  const matches = emotes.filter(e => `${e.name} ${label(e.name)}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="panel emotes"><div className="emotes-heading"><h2>Emotes</h2><label className="search"><Search size={19} /><input aria-label="Find an emote" placeholder="Find an emote" value={search} onChange={e => setSearch(e.target.value)} /></label></div>
    {error && <p className="inline-error" role="alert">{error}</p>}
    <div className="emote-list">{matches.map(emote => <button key={emote.id} disabled={disabled} onClick={() => onPlay(emote.id)}><Play size={23} /><span>{label(emote.name)}</span></button>)}</div>
    {!matches.length && <p className="empty-list">{emotes.length ? 'No matching emotes.' : 'No emotes available.'}</p>}
  </section>;
}
