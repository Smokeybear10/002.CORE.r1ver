/* global React */
// R1VER architecture — five readings of the same system graph.
// Shared node + edge data; per-variant layout & routing.

const N = {
  // Phase 1 · Abstract (preflop)
  cards:    { id:'cards',    title:'cards',     kind:'lib',     phase:1, sub:'evaluator · isomorphism · equity',   path:'src/cards/',        stack:['Rust','bitwise','no_std'],   citations:['R4'],
              bullets:['7-card eval ~10ns/hand', 'suit/rank → canonical iso', 'exhaustive + Monte Carlo equity', '52 cards · 4×13 lookup'] },
  transport:{ id:'transport',title:'transport', kind:'lib',     phase:1, sub:'optimal transport · sinkhorn',      path:'src/transport/',    stack:['Sinkhorn','Greenkhorn','OT'],citations:['R5'],
              bullets:['Wasserstein on metric spaces', 'ε = 0.025 reg. coupling', '~100× faster than LP baseline', 'Greedy + Sinkhorn variants'] },
  cluster:  { id:'cluster',  title:'cluster',   kind:'compute', phase:1, sub:'abstract · ~3 days CPU',            path:'src/clustering/',   stack:['Rayon','EMD','k-means'],     citations:['R2','R5'],
              bullets:['3.1T isomorphic situations', 'pairwise EMD via Sinkhorn OT', 'hierarchical k-means → 542', '169·128·144·101 per street'] },

  // Phase 2 · Solve (flop)
  gameplay: { id:'gameplay', title:'gameplay',  kind:'lib',     phase:2, sub:'NLHE engine · trees',               path:'src/gameplay/',     stack:['Tree','Decider','side-pot'], citations:['R7','R8'],
              bullets:['Node/Edge/Tree generic types', 'side pots · multi-way ties', 'pluggable Decider trait', 'discrete bet abstraction'] },
  trainer:  { id:'trainer',  title:'trainer',   kind:'compute', phase:2, sub:'mccfr · ~5 days CPU',               path:'src/mccfr/',        stack:['MCCFR','discounted','prune'],citations:['R1','R3','R6','R9','R11'],
              bullets:['external-sampling MCCFR', '268M training trees (CFR_TREE_COUNT)', '10⁹ iterations → ε-Nash', 'linear weighting · regret pruning'] },

  // Phase 3 · Publish (turn)
  pgcopy:   { id:'pgcopy',   title:'pgcopy',    kind:'store',   phase:3, sub:'binary spool · 3.4 GB',             path:'pgcopy/*.bin',      stack:['COPY BINARY','f32+i64'],     citations:[],
              bullets:['Postgres binary on disk', 'iso · metric · transitions', 'pure stream — zero parsing', 'one file per relation'] },
  publish:  { id:'publish',  title:'publish',   kind:'compute', phase:3, sub:'upload · ~30 min',                  path:'src/save/',         stack:['tokio-pg','BinaryCopyIn'],   citations:[],
              bullets:['BinaryCopyInWriter stream', 'CONCURRENT index build', 'VACUUM ANALYZE · planner stats', 'idempotent · resumable'] },
  db:       { id:'db',       title:'postgres',  kind:'store',   phase:3, sub:'r1ver · ~7 GB · indexed',           path:'database',          stack:['PostgreSQL 16','tokio-pg'],  citations:[],
              bullets:['138M iso rows · BIGINT pk', 'metric · 32k EMD pairs', 'transitions · 19k abs(t)→abs(t+1)', 'street totals · derived abstraction'] },

  // Phase 4 · Serve (river)
  api:      { id:'api',      title:'analysis',  kind:'service', phase:4, sub:'actix web · :3002',                 path:'src/analysis/',     stack:['Actix','tokio-pg','pool'],   citations:[],
              bullets:['/exp /nbr /hst /replace-obs', '/blueprint (awaits trainer)', 'JSON responses · typed structs', '7 endpoints · thin SQL'] },
  search:   { id:'search',   title:'search',    kind:'compute', phase:4, sub:'depth-limited subgame',             path:'src/search/',       stack:['subgame','safe-nested'],     citations:['R10','R12'],
              bullets:['real-time subgame solving', 'blueprint as prior', 'safe + nested resolves', 'IN PROGRESS · Pluribus parity'], dashed:true },
  fe:       { id:'fe',       title:'web',       kind:'service', phase:4, sub:'next.js · :2002',                   path:'web/app/',          stack:['Next.js','GSAP','Lenis'],    citations:[],
              bullets:['/ landing — cinematic scroll', '/explorer — 52-card picker', '/strategy — blueprint viewer', 'fetch /api per request'] },
  players:  { id:'players',  title:'players',   kind:'service', phase:4, sub:'CLI · live testing',                path:'src/players/',      stack:['Decider','terminal'],        citations:[],
              bullets:['terminal action loop', 'pluggable Decider trait', 'human vs blueprint matches', 'used to validate at-table'] },
};

const E = [
  // Phase 1 internal
  { from:'cards',     to:'cluster',  label:'3.1T obs',         meta:'observations', kind:'batch',  weight:'thick' },
  { from:'transport', to:'cluster',  label:'EMD',              meta:'sinkhorn coupling', kind:'lib', weight:'thin' },
  { from:'cards',     to:'transport',label:'metric',           meta:'distance fn', kind:'lib', weight:'thin', faint:true },

  // Phase 1 → 2
  { from:'cards',     to:'trainer',  label:'evaluator',        meta:'eval()',     kind:'lib',    weight:'thin'  },
  { from:'gameplay',  to:'trainer',  label:'tree',             meta:'Node·Edge',  kind:'lib',    weight:'thick' },

  // Phase 2 → 3
  { from:'cluster',   to:'pgcopy',   label:'iso · metric · trans', meta:'3.4 GB', kind:'write', weight:'thick' },
  { from:'trainer',   to:'pgcopy',   label:'blueprint',        meta:'awaits',     kind:'write',  weight:'thin', faint:true },

  // Phase 3 internal
  { from:'pgcopy',    to:'publish',  label:'COPY BINARY',      meta:'stream',     kind:'stream', weight:'thick' },
  { from:'publish',   to:'db',       label:'~7 GB',            meta:'load',       kind:'load',   weight:'thick' },

  // Phase 3 → 4
  { from:'db',        to:'api',      label:'tokio-postgres',   meta:'pool×8',     kind:'pool',   weight:'thick' },
  { from:'db',        to:'search',   label:'priors',           meta:'lookup',     kind:'pool',   weight:'thin', faint:true },

  // Phase 4 internal
  { from:'api',       to:'fe',       label:'JSON',             meta:'fetch',      kind:'http',   weight:'thick' },
  { from:'api',       to:'players',  label:'JSON',             meta:'fetch',      kind:'http',   weight:'thin' },
  { from:'search',    to:'api',      label:'resolved',         meta:'future',     kind:'http',   weight:'thin', faint:true },
];

// Phase metadata — used by every variant
const PHASES = [
  { id:1, suit:'♣', street:'Preflop', name:'Abstract', desc:'Cluster equity distributions into 542 representative situations.' },
  { id:2, suit:'♥', street:'Flop',    name:'Solve',    desc:'Train a blueprint strategy via external-sampling MCCFR.' },
  { id:3, suit:'♦', street:'Turn',    name:'Publish',  desc:'Stream the artifacts into a queryable Postgres database.' },
  { id:4, suit:'♠', street:'River',   name:'Serve',    desc:'Expose lookups over an Actix API to a Next.js frontend.' },
];

// Annotated callouts — engineering blueprint side-notes
const CALLOUTS = [
  { id:'C1', text:'52 → 1326 starting hands · 169 strategically distinct',                   nodes:['cards'] },
  { id:'C2', text:'EquityHistogram :: [f32; 51] over P(win | runout)',                         nodes:['cards','cluster'] },
  { id:'C3', text:'k-means seed: weighted reservoir sample · 5 restarts',                    nodes:['cluster'] },
  { id:'C4', text:'CFR_TREE_COUNT_NLHE = 268,435,456 (2²⁸)',                                  nodes:['trainer'] },
  { id:'C5', text:'binary tuple format: 2-byte header + N×field-bytes',                       nodes:['pgcopy'] },
  { id:'C6', text:'btree + brin indexes · CONCURRENTLY · then ANALYZE',                       nodes:['publish','db'] },
  { id:'C7', text:'NEXT_PUBLIC_API_URL → :3002 · CORS allow-list',                            nodes:['api','fe'] },
];

// ─────────────────────────────────────────────────────────────
// Node shape — service rect / store cylinder / lib rect-with-tab
// ─────────────────────────────────────────────────────────────

function Node({ x, y, w, h, n, density, accent, showCite, mode='card', dashed=false }) {
  const cite = showCite && n.citations.length > 0;
  const showBullets = density !== 'compact';
  const bulletCount = density === 'verbose' ? n.bullets.length : 2;
  const showStack = density !== 'compact';
  const isStore = n.kind === 'store';

  // Header band gets a phase-colored tick
  const phaseColor = `var(--phase-${n.phase})`;

  return (
    <g className="node" data-id={n.id}>
      {/* drop shadow plate */}
      <rect x={x+2} y={y+2} width={w} height={h} fill="rgba(0,0,0,0.5)" rx="2"/>

      {/* main body */}
      {isStore ? (
        // store: rect + ellipses on top/bottom (cylinder feel)
        <>
          <rect x={x} y={y+8} width={w} height={h-16} className={`node-body ${accent?'accent':''}`} rx="2"/>
          <ellipse cx={x+w/2} cy={y+8} rx={w/2} ry="8" className={`node-body ${accent?'accent':''}`}/>
          <ellipse cx={x+w/2} cy={y+h-8} rx={w/2} ry="8" fill="rgba(0,0,0,0.6)" stroke="var(--gold-dim)" strokeWidth="1"/>
          <path d={`M${x} ${y+8} A ${w/2} 8 0 0 0 ${x+w} ${y+8}`}
                fill="none" stroke="var(--gold-dim)" strokeWidth="1" opacity="0.5"/>
        </>
      ) : (
        <rect x={x} y={y} width={w} height={h} className={`node-body ${accent?'accent':''}`} rx="2"
              strokeDasharray={dashed?'5 4':undefined}/>
      )}

      {/* phase tick — vertical strip on left */}
      <rect x={x} y={y + (isStore?12:0)} width="3" height={h - (isStore?24:0)} fill={phaseColor} opacity="0.8"/>

      {/* corner crosshairs (engineering precision detail) */}
      {!isStore && (
        <>
          <path d={`M${x} ${y+10} L${x} ${y} L${x+10} ${y}`} stroke="var(--gold)" strokeWidth="1.2" fill="none"/>
          <path d={`M${x+w-10} ${y} L${x+w} ${y} L${x+w} ${y+10}`} stroke="var(--gold)" strokeWidth="1.2" fill="none"/>
          <path d={`M${x} ${y+h-10} L${x} ${y+h} L${x+10} ${y+h}`} stroke="var(--gold-dim)" strokeWidth="1" fill="none"/>
          <path d={`M${x+w-10} ${y+h} L${x+w} ${y+h} L${x+w} ${y+h-10}`} stroke="var(--gold-dim)" strokeWidth="1" fill="none"/>
        </>
      )}

      {/* eyebrow row: phase code + path */}
      <text x={x+16} y={y+24} className="node-eyebrow">P0{n.phase} · {n.kind.toUpperCase()}</text>
      <text x={x+w-16} y={y+24} className="node-path" textAnchor="end">{n.path}</text>

      {/* title */}
      <text x={x+16} y={y+62} className="node-title">{n.title}</text>

      {/* sub */}
      <text x={x+16} y={y+82} className="node-sub">{n.sub}</text>

      {/* divider */}
      <line x1={x+16} y1={y+96} x2={x+w-16} y2={y+96} stroke="var(--gold-ghost)"/>

      {/* bullets */}
      {showBullets && n.bullets.slice(0, bulletCount).map((b, i) => (
        <g key={i}>
          <circle cx={x+22} cy={y+118 + i*20} r="1.4" fill="var(--gold)"/>
          <text x={x+32} y={y+122 + i*20} className="node-data">{b}</text>
        </g>
      ))}

      {/* tech chips at bottom */}
      {showStack && (
        <g>
          {(() => {
            // measure all chips and decide how many fit, with ellipsis if needed
            const items = n.stack.slice(0, 3).map(s => ({
              text: s,
              cw: Math.max(s.length * 7.4 + 16, 44),
            }));
            const maxRow = w - 32; // available horizontal space
            const gap = 8;
            const fit = [];
            let used = 0;
            for (const it of items) {
              if (used + it.cw + (fit.length ? gap : 0) <= maxRow) {
                fit.push(it);
                used += it.cw + (fit.length > 1 ? gap : 0);
              } else break;
            }
            let cx0 = x + 16;
            return fit.map((it, i) => {
              const cx = cx0;
              cx0 += it.cw + gap;
              return (
                <g key={i}>
                  <rect x={cx} y={y+h-(isStore?42:30)} width={it.cw} height="18" rx="1"
                        fill="var(--bg)" stroke="var(--gold-faint)" strokeWidth="0.6"/>
                  <text x={cx + it.cw/2} y={y+h-(isStore?29:17)} className="node-chip" textAnchor="middle">{it.text}</text>
                </g>
              );
            });
          })()}
        </g>
      )}

      {/* citation marker — top right above eyebrow */}
      {cite && (
        <g>
          <rect x={x+w-46} y={y-10} width="40" height="14" rx="1"
                fill="var(--bg)" stroke="var(--gold-bright)" strokeWidth="0.8"/>
          <text x={x+w-26} y={y} className="citation" textAnchor="middle">
            {n.citations.join('·')}
          </text>
        </g>
      )}
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// Edge — orthogonal routed with arrow + label
// ─────────────────────────────────────────────────────────────

function getPort(rect, side) {
  const { x, y, w, h } = rect;
  switch (side) {
    case 'r': return { x: x + w, y: y + h/2, dir: 'r' };
    case 'l': return { x: x,     y: y + h/2, dir: 'l' };
    case 't': return { x: x + w/2, y: y,     dir: 't' };
    case 'b': return { x: x + w/2, y: y + h, dir: 'b' };
    default:  return { x: x + w/2, y: y + h/2, dir: 'r' };
  }
}

// Orthogonal path with rounded elbows
function routePath(p1, p2, opts = {}) {
  const { bend = 'auto', radius = 8 } = opts;
  const sx = p1.x, sy = p1.y, tx = p2.x, ty = p2.y;
  const dx = tx - sx, dy = ty - sy;

  // Single straight line
  if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
    return { d: `M${sx} ${sy} L${tx} ${ty}`, mid: { x: (sx+tx)/2, y: (sy+ty)/2 } };
  }

  // Choose elbow: prefer orientation matching p1.dir
  let bendX;
  if (bend === 'auto') {
    if (p1.dir === 'r' || p1.dir === 'l') bendX = (sx + tx) / 2;
    else bendX = sx;
  } else if (typeof bend === 'number') {
    bendX = sx + (tx - sx) * bend;
  } else {
    bendX = (sx + tx) / 2;
  }

  // Determine path: horizontal-vertical-horizontal (HVH)
  // p1 is horizontal exit (l/r), so go horiz to bendX, vert to ty, horiz to tx
  if (p1.dir === 'r' || p1.dir === 'l') {
    const r = Math.min(radius, Math.abs(bendX - sx) - 2, Math.abs(dy) - 2);
    const r2 = Math.min(radius, Math.abs(tx - bendX) - 2, Math.abs(dy) - 2);
    const goingDown = ty > sy;
    const goingRight = bendX > sx;
    const finalGoingRight = tx > bendX;
    const c1y = sy + (goingDown ? r : -r);
    const c1x = bendX + (goingRight ? -r : r);
    const c2y = ty + (goingDown ? -r2 : r2);
    const c2x = bendX + (finalGoingRight ? r2 : -r2);
    const sw1 = goingRight ? (goingDown ? 1 : 0) : (goingDown ? 0 : 1);
    const sw2 = finalGoingRight ? (goingDown ? 0 : 1) : (goingDown ? 1 : 0);
    const d = `M${sx} ${sy} L${c1x} ${sy} Q ${bendX} ${sy} ${bendX} ${c1y} L${bendX} ${c2y} Q ${bendX} ${ty} ${c2x} ${ty} L${tx} ${ty}`;
    return { d, mid: { x: bendX, y: (sy + ty) / 2 } };
  } else {
    // vertical exit (t/b): VHV
    const bendY = (sy + ty) / 2;
    const r = Math.min(radius, Math.abs(bendY - sy) - 2, Math.abs(dx) - 2);
    const r2 = Math.min(radius, Math.abs(ty - bendY) - 2, Math.abs(dx) - 2);
    const goingDown = bendY > sy;
    const goingRight = tx > sx;
    const c1x = sx + (goingRight ? r : -r);
    const c1y = bendY + (goingDown ? -r : r);
    const c2y = bendY + (goingDown ? r2 : -r2);
    const c2x = tx + (goingRight ? -r2 : r2);
    const d = `M${sx} ${sy} L${sx} ${c1y} Q ${sx} ${bendY} ${c1x} ${bendY} L${c2x} ${bendY} Q ${tx} ${bendY} ${tx} ${c2y} L${tx} ${ty}`;
    return { d, mid: { x: (sx + tx) / 2, y: bendY } };
  }
}

function Arrow({ x, y, dir, color = 'var(--gold)' }) {
  // Triangle pointing in `dir`. Flat-back, thin.
  const size = 7;
  let pts;
  switch (dir) {
    case 'r': pts = `${x-size},${y-size*0.6} ${x},${y} ${x-size},${y+size*0.6}`; break;
    case 'l': pts = `${x+size},${y-size*0.6} ${x},${y} ${x+size},${y+size*0.6}`; break;
    case 't': pts = `${x-size*0.6},${y+size} ${x},${y} ${x+size*0.6},${y+size}`; break;
    case 'b': pts = `${x-size*0.6},${y-size} ${x},${y} ${x+size*0.6},${y-size}`; break;
    default: pts = '';
  }
  return <polygon points={pts} fill={color}/>;
}

function EdgeLabel({ x, y, text, kindGlyph }) {
  if (!text) return null;
  // Tighter, more accurate sizing: ~7px per char (uppercase mono), generous padding,
  // and explicit glyph offset so text never bleeds past the chip.
  const TXT = text.toUpperCase();
  const charW = 7;
  const glyphW = kindGlyph ? 20 : 0;
  const padX = 10;
  const w = TXT.length * charW + glyphW + padX * 2;
  const h = 18;
  return (
    <g>
      <rect x={x - w/2} y={y - h/2} width={w} height={h} rx="2"
            fill="var(--bg)" stroke="var(--gold-faint)" strokeWidth="0.6"/>
      {kindGlyph && (
        <text x={x - w/2 + padX} y={y+3.5} className="edge-glyph" textAnchor="start">{kindGlyph}</text>
      )}
      <text x={x - w/2 + padX + glyphW} y={y+3.5} className="edge-label" textAnchor="start">{TXT}</text>
    </g>
  );
}

const EDGE_GLYPH = {
  batch:  '▸▸▸',
  stream: '▸▸',
  load:   '▸▸',
  http:   '→',
  pool:   '↺',
  write:  '↧',
  lib:    '⌁',
};

function Edge({ from, to, fromSide='r', toSide='l', edge, density, bend='auto', labelDx=0, labelDy=0 }) {
  const p1 = getPort(from, fromSide);
  const p2 = getPort(to, toSide);
  const { d, mid } = routePath(p1, p2, { bend });
  const labelText = density === 'compact' ? null : edge.label;
  const className = `edge ${edge.weight === 'thick' ? 'thick' : 'thin'} ${edge.faint ? 'faint' : ''}`;
  // arrow direction = toSide opposite
  const arrowDir = { l:'r', r:'l', t:'b', b:'t' }[toSide];
  return (
    <g>
      <path d={d} className={className}/>
      <Arrow x={p2.x} y={p2.y} dir={arrowDir}/>
      {labelText && <EdgeLabel x={mid.x + labelDx} y={mid.y + labelDy} text={labelText} kindGlyph={EDGE_GLYPH[edge.kind]}/>}
    </g>
  );
}

// Group band — colored phase backdrop with ribbon header
function PhaseBand({ x, y, w, h, phase, vertical=false }) {
  const color = `var(--phase-${phase.id})`;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={color} opacity="0.04"
            stroke={color} strokeOpacity="0.18" strokeDasharray="2 6"/>
      {/* header bar */}
      <rect x={x} y={y} width={w} height="40" fill="var(--surface)" stroke={color} strokeOpacity="0.30"/>
      <rect x={x} y={y} width="3" height="40" fill={color} opacity="0.85"/>
      <text x={x+18} y={y+18} className="phase-eyebrow">PHASE 0{phase.id} · {phase.street.toUpperCase()}</text>
      <text x={x+18} y={y+33} className="phase-name" fill={color}>{phase.name.toUpperCase()}</text>
      <text x={x+w-18} y={y+28} className="phase-suit" fill={color} textAnchor="end">{phase.suit}</text>
    </g>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT: STREETS (default — four columns by phase)
// ─────────────────────────────────────────────────────────────

function VariantStreets({ density, showCite }) {
  const W = 1900, H = 1480;
  const cols = [80, 510, 940, 1370];
  const colW = 340;

  // Layout — column per phase, multiple stops per column.
  // Wider gutters between rows so edge labels sit cleanly in corridors.
  const r = {
    // P1 (3 nodes) — gutters of ~100px between rows
    cards:     { x: cols[0], y: 140, w: colW, h: 220 },
    transport: { x: cols[0], y: 460, w: colW, h: 220 },
    cluster:   { x: cols[0], y: 780, w: colW, h: 240 },

    // P2 (2 nodes)
    gameplay:  { x: cols[1], y: 260, w: colW, h: 230 },
    trainer:   { x: cols[1], y: 600, w: colW, h: 250 },

    // P3 (3 nodes)
    pgcopy:    { x: cols[2], y: 140, w: colW, h: 210 },
    publish:   { x: cols[2], y: 450, w: colW, h: 210 },
    db:        { x: cols[2], y: 760, w: colW, h: 230 },

    // P4 (4 nodes — tight pack but wider gutters)
    api:       { x: cols[3], y: 140, w: colW, h: 220 },
    search:    { x: cols[3], y: 460, w: colW, h: 220 },
    fe:        { x: cols[3], y: 780, w: colW, h: 200 },
    players:   { x: cols[3], y: 1080, w: colW, h: 220 },
  };

  const phaseRects = [
    { phase: PHASES[0], x: cols[0]-30, y: 80,  w: colW+60, h: H-180 },
    { phase: PHASES[1], x: cols[1]-30, y: 80,  w: colW+60, h: H-180 },
    { phase: PHASES[2], x: cols[2]-30, y: 80,  w: colW+60, h: H-180 },
    { phase: PHASES[3], x: cols[3]-30, y: 80,  w: colW+60, h: H-180 },
  ];

  // helper to find an edge by from/to
  const ef = (from,to) => E.find(e => e.from===from && e.to===to);
  const edges = [
    { e: ef('cards','cluster'),     from: r.cards,     to: r.cluster,   fromSide:'b', toSide:'t' },
    { e: ef('transport','cluster'), from: r.transport, to: r.cluster,   fromSide:'b', toSide:'t' },
    { e: ef('cards','transport'),   from: r.cards,     to: r.transport, fromSide:'b', toSide:'t' },
    { e: ef('cards','trainer'),     from: r.cards,     to: r.trainer,   fromSide:'r', toSide:'l', labelDy:-22 },
    { e: ef('gameplay','trainer'),  from: r.gameplay,  to: r.trainer,   fromSide:'b', toSide:'t', labelDx:-90 },
    { e: ef('cluster','pgcopy'),    from: r.cluster,   to: r.pgcopy,    fromSide:'r', toSide:'l', bend:0.06 },
    { e: ef('trainer','pgcopy'),    from: r.trainer,   to: r.pgcopy,    fromSide:'r', toSide:'l', bend:0.55 },
    { e: ef('pgcopy','publish'),    from: r.pgcopy,    to: r.publish,   fromSide:'b', toSide:'t' },
    { e: ef('publish','db'),        from: r.publish,   to: r.db,        fromSide:'b', toSide:'t' },
    { e: ef('db','api'),            from: r.db,        to: r.api,       fromSide:'r', toSide:'l', labelDy:-26 },
    { e: ef('db','search'),         from: r.db,        to: r.search,    fromSide:'r', toSide:'l', labelDy:24 },
    { e: ef('api','fe'),            from: r.api,       to: r.fe,        fromSide:'b', toSide:'t' },
    { e: ef('api','players'),       from: r.api,       to: r.players,   fromSide:'b', toSide:'t', labelDx:90 },
    { e: ef('search','api'),        from: r.search,    to: r.api,       fromSide:'t', toSide:'b', labelDx:-90 },
  ].filter(x => x.e);

  return (
    <svg className="arch" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="hatch-streets" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--gold)" strokeOpacity="0.025" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#hatch-streets)"/>

      {/* phase bands */}
      {phaseRects.map(p => <PhaseBand key={p.phase.id} {...p}/>)}

      {/* edges first, behind nodes */}
      {edges.map((eg, i) => <Edge key={i} {...eg} edge={eg.e} density={density}/>)}

      {/* nodes */}
      {Object.entries(r).map(([id, rect]) => (
        <Node key={id} {...rect} n={N[id]} density={density} showCite={showCite}
              accent={['cluster','trainer','db','api'].includes(id)}
              dashed={N[id].dashed}/>
      ))}

      {/* axis ruler — top */}
      <g transform="translate(0 60)">
        <line x1="60" y1="0" x2={W-60} y2="0" stroke="var(--gold-ghost)"/>
        {Array.from({length: 17}).map((_,i)=>{
          const x = 60 + i*((W-120)/16);
          const major = i%4===0;
          return <g key={i}>
            <line x1={x} y1="0" x2={x} y2={major?-8:-4} stroke={major?'var(--gold)':'var(--gold-dim)'}/>
            {major && <text x={x} y={-12} className="lane-label" textAnchor="middle" style={{fontSize:9}}>
              {String(i*100).padStart(4,'0')}
            </text>}
          </g>;
        })}
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT: RIVER (vertical waterfall, sweeping curve)
// ─────────────────────────────────────────────────────────────

function VariantRiver({ density, showCite }) {
  const W = 1500, H = 2080;
  const colA = 80, colB = 580, colC = 1080;
  const colW = 340;

  const r = {
    cards:     { x: colA, y: 110,  w: colW, h: 220 },
    transport: { x: colA, y: 380,  w: colW, h: 220 },
    cluster:   { x: colA, y: 660,  w: colW, h: 240 },
    gameplay:  { x: colA, y: 950,  w: colW, h: 220 },
    trainer:   { x: colA, y: 1220, w: colW, h: 240 },

    // Store column — taller so bullets + chips fit cleanly
    pgcopy:    { x: colB, y: 760,  w: colW, h: 230 },
    publish:   { x: colB, y: 1050, w: colW, h: 230 },
    db:        { x: colB, y: 1340, w: colW, h: 240 },

    api:       { x: colC, y: 1180, w: colW, h: 240 },
    search:    { x: colC, y: 850,  w: colW, h: 220 },
    fe:        { x: colC, y: 1480, w: colW, h: 220 },
    players:   { x: colC, y: 1760, w: colW, h: 200 },
  };

  const ef = (from,to) => E.find(e => e.from===from && e.to===to);
  // Long-haul vertical jumps (cards→cluster, cards→trainer) re-routed via the
  // RIGHT side of column A so they don't punch through transport / gameplay /
  // cluster on their way down. Their labels sit in the right-side corridor.
  const edges = [
    { e: ef('cards','transport'), from: r.cards,     to: r.transport, fromSide:'b', toSide:'t' },
    // cards → cluster: exit cards.r, bus down the RIGHT gutter at x≈590, enter cluster.l
    { e: ef('cards','cluster'),     from: r.cards,     to: r.cluster,   fromSide:'r', toSide:'l', bend:-0.5 },
    { e: ef('transport','cluster'), from: r.transport, to: r.cluster,   fromSide:'b', toSide:'t' },
    // cards → trainer: same right-side bus, longer drop into trainer.l
    { e: ef('cards','trainer'),     from: r.cards,     to: r.trainer,   fromSide:'r', toSide:'l', bend:-0.7 },
    { e: ef('gameplay','trainer'),  from: r.gameplay,  to: r.trainer,   fromSide:'b', toSide:'t' },
    // CLUSTER → PGCOPY: lift label well above pgcopy header so it doesn't overlap title/eyebrow
    { e: ef('cluster','pgcopy'),    from: r.cluster,   to: r.pgcopy,    fromSide:'r', toSide:'l', bend:0.4, labelDy:-22 },
    // TRAINER → PGCOPY: drop label below pgcopy entry; route over the top
    { e: ef('trainer','pgcopy'),    from: r.trainer,   to: r.pgcopy,    fromSide:'r', toSide:'l', bend:0.3, labelDy:24 },
    { e: ef('pgcopy','publish'),    from: r.pgcopy,    to: r.publish,   fromSide:'b', toSide:'t' },
    { e: ef('publish','db'),        from: r.publish,   to: r.db,        fromSide:'b', toSide:'t' },
    // db → api: arc into api.l with label in horizontal mid-corridor
    { e: ef('db','api'),            from: r.db,        to: r.api,       fromSide:'r', toSide:'l', labelDy:-26 },
    // db → search: long upward jog — exit r, arc up over api, enter search.b
    { e: ef('db','search'),         from: r.db,        to: r.search,    fromSide:'r', toSide:'b', bend:0.45, labelDx:140 },
    { e: ef('search','api'),        from: r.search,    to: r.api,       fromSide:'b', toSide:'t' },
    // api → fe / api → players: short vertical hops; nudge labels off arrow
    { e: ef('api','fe'),            from: r.api,       to: r.fe,        fromSide:'b', toSide:'t', labelDx:-110 },
    { e: ef('api','players'),       from: r.api,       to: r.players,   fromSide:'b', toSide:'t', labelDx:110 },
  ].filter(x=>x.e);

  return (
    <svg className="arch" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="river-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(201,168,76,0.04)"/>
          <stop offset="100%" stopColor="rgba(26,58,42,0.10)"/>
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#river-bg)"/>

      {/* lane labels */}
      {[
        { x: colA, label: 'I · COMPUTE' },
        { x: colB, label: 'II · STORAGE' },
        { x: colC, label: 'III · SERVE' },
      ].map((l, i) => (
        <g key={i}>
          <text x={l.x} y={60} className="lane-label">{l.label}</text>
          <line x1={l.x} y1={75} x2={l.x+colW} y2={75} stroke="var(--gold-dim)"/>
        </g>
      ))}

      {edges.map((eg, i) => <Edge key={i} {...eg} edge={eg.e} density={density}/>)}
      {Object.entries(r).map(([id, rect]) => (
        <Node key={id} {...rect} n={N[id]} density={density} showCite={showCite}
              accent={true} dashed={N[id].dashed}/>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT: TRANSIT (subway map — two lines)
// ─────────────────────────────────────────────────────────────

function VariantTransit({ density, showCite }) {
  const W = 2100, H = 900;

  // Two-line system with branches off the trunk.
  // Trunk runs y=440 from cards → fe; branches splay above & below with horizontal spacing for labels.
  const stations = [
    { id:'cards',     x: 130,  y: 440, line:'both', interchange:true  },
    { id:'transport', x: 360,  y: 240, line:'cluster' },
    { id:'cluster',   x: 600,  y: 240, line:'cluster' },
    { id:'gameplay',  x: 360,  y: 640, line:'solver' },
    { id:'trainer',   x: 600,  y: 640, line:'solver' },
    { id:'pgcopy',    x: 840,  y: 440, line:'both', interchange:true  },
    { id:'publish',   x: 1060, y: 440, line:'both' },
    { id:'db',        x: 1280, y: 440, line:'both', interchange:true  },
    { id:'search',    x: 1480, y: 240, line:'spur',  dashed:true },
    { id:'api',       x: 1560, y: 440, line:'both', interchange:true },
    { id:'players',   x: 1760, y: 640, line:'spur' },
    { id:'fe',        x: 1960, y: 440, line:'both', terminus:true },
  ];
  const sm = Object.fromEntries(stations.map(s => [s.id, s]));

  const lines = [
    { name: 'CLUSTER LINE', color: 'var(--phase-1)', stops: ['cards','transport','cluster','pgcopy','publish','db','api','fe'] },
    { name: 'SOLVER LINE',  color: 'var(--phase-2)', stops: ['cards','gameplay','trainer','pgcopy','publish','db','api','fe'] },
  ];

  // Branches off main system (drawn as separate spurs)
  const spurs = [
    { color:'var(--phase-4)', from:'db',  to:'search',  dashed:true },
    { color:'var(--phase-4)', from:'api', to:'players', dashed:false },
  ];

  // Trunk y is now 440
  const offset = { 'CLUSTER LINE': -6, 'SOLVER LINE': 6 };

  return (
    <svg className="arch" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {/* base plate */}
      <rect width={W} height={H} fill="rgba(201,168,76,0.012)"/>

      {/* title strip */}
      <text x="60" y="50" className="lane-label">R1VER · TRANSIT MAP</text>
      <line x1="60" y1="64" x2={W-60} y2="64" stroke="var(--gold-ghost)"/>

      {/* draw lines (under stations) */}
      {lines.map((ln, li) => {
        const off = offset[ln.name];
        const pts = ln.stops.map(id => ({ x: sm[id].x, y: sm[id].y, id }));
        let d = '';
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i], b = pts[i+1];
          const ay = a.y === 440 ? 440 + off : a.y;
          const by = b.y === 440 ? 440 + off : b.y;
          if (i === 0) d += `M${a.x} ${ay} `;
          if (Math.abs(ay - by) < 1) {
            d += `L${b.x} ${by} `;
          } else {
            // branch up/down: vertical run with rounded corners
            const dy = by - ay;
            const turn = dy > 0 ? 18 : -18;
            // exit a horizontally a bit, then curve down/up to b
            const midX = a.x + (b.x - a.x) * 0.4;
            d += `L${midX} ${ay} Q ${midX+15} ${ay} ${midX+15} ${ay+turn} L${midX+15} ${by-turn} Q ${midX+15} ${by} ${midX+30} ${by} L${b.x} ${by} `;
          }
        }
        return <path key={li} d={d} fill="none" stroke={ln.color} strokeWidth="6"
                     strokeLinecap="round" strokeLinejoin="round" opacity="0.85"/>;
      })}

      {/* spurs to branch destinations (search, players) */}
      {spurs.map((sp, i) => {
        const a = sm[sp.from], b = sm[sp.to];
        const d = `M${a.x} ${a.y} L${a.x} ${(a.y+b.y)/2} Q ${a.x} ${b.y} ${a.x+18} ${b.y} L${b.x} ${b.y}`;
        return <path key={i} d={d} fill="none" stroke={sp.color} strokeWidth="4"
                     strokeLinecap="round" opacity="0.7"
                     strokeDasharray={sp.dashed?'8 5':undefined}/>;
      })}

      {/* stations */}
      {stations.map(s => {
        const n = N[s.id];
        // labels alternate above/below for trunk stations to avoid overlap
        const onTrunk = s.y === 440;
        const labelY = onTrunk ? 30 : (s.y < 440 ? -120 : 30);
        const labelW = 156;
        return (
          <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
            {/* marker */}
            {s.interchange ? (
              <g>
                <circle r="14" fill="var(--bg)" stroke="var(--gold-bright)" strokeWidth="2.5"
                        strokeDasharray={s.dashed?'3 2':undefined}/>
                <circle r="6" fill="var(--gold-bright)"/>
              </g>
            ) : s.terminus ? (
              <g>
                <rect x="-12" y="-12" width="24" height="24" fill="var(--gold-bright)" stroke="var(--gold)" strokeWidth="1.5"/>
              </g>
            ) : (
              <g>
                <circle r="9" fill="var(--bg)" stroke="var(--gold)" strokeWidth="2"
                        strokeDasharray={s.dashed?'3 2':undefined}/>
                <circle r="3" fill="var(--gold)"/>
              </g>
            )}

            {/* label card */}
            <g transform={`translate(0 ${labelY})`}>
              <rect x={-labelW/2} y="0" width={labelW} height={density === 'verbose' ? 96 : 76}
                    fill="var(--surface)" stroke="var(--gold-faint)" strokeWidth="1"
                    strokeDasharray={s.dashed?'4 3':undefined}/>
              <rect x={-labelW/2} y="0" width="3" height={density === 'verbose' ? 96 : 76}
                    fill={`var(--phase-${n.phase})`} opacity="0.85"/>
              <text x="0" y="20" className="node-title" textAnchor="middle" style={{fontSize:18}}>{n.title}</text>
              <text x="0" y="36" className="node-sub" textAnchor="middle" style={{fontSize:9.5}}>{n.sub}</text>
              <line x1={-labelW/2+10} y1="44" x2={labelW/2-10} y2="44" stroke="var(--gold-ghost)"/>
              <text x="0" y="58" className="node-data" textAnchor="middle" style={{fontSize: 9.5}}>
                {n.stack.slice(0, 2).join(' · ')}
              </text>
              <text x="0" y="72" className="node-eyebrow" textAnchor="middle" style={{fontSize:8.5}}>
                {n.kind.toUpperCase()} · P0{n.phase}
              </text>
              {density === 'verbose' && (
                <text x="0" y="88" className="node-data" textAnchor="middle" style={{fontSize: 8.5, fill:'var(--w40)'}}>
                  {n.path}
                </text>
              )}
            </g>

            {/* citation */}
            {showCite && n.citations.length > 0 && (
              <g transform={`translate(0 ${onTrunk ? -26 : (s.y < 440 ? 30 : -26)})`}>
                <rect x="-26" y="-7" width="52" height="14" fill="var(--bg)" stroke="var(--gold-bright)"/>
                <text x="0" y="3.2" className="citation" textAnchor="middle">
                  {n.citations.join('·')}
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* legend */}
      <g transform="translate(80 800)">
        <line x1="0" y1="0" x2="40" y2="0" stroke="var(--phase-1)" strokeWidth="6" strokeLinecap="round"/>
        <text x="50" y="4" className="lane-label" style={{fontSize: 10}}>CLUSTER LINE</text>
        <line x1="200" y1="0" x2="240" y2="0" stroke="var(--phase-2)" strokeWidth="6" strokeLinecap="round"/>
        <text x="250" y="4" className="lane-label" style={{fontSize: 10}}>SOLVER LINE</text>
        <line x1="400" y1="0" x2="440" y2="0" stroke="var(--phase-4)" strokeWidth="4"
              strokeLinecap="round" strokeDasharray="8 5"/>
        <text x="450" y="4" className="lane-label" style={{fontSize: 10}}>SPUR · in progress</text>
        <circle cx="640" cy="0" r="9" fill="var(--bg)" stroke="var(--gold)" strokeWidth="2"/>
        <text x="660" y="4" className="lane-label" style={{fontSize: 10}}>STOP</text>
        <circle cx="740" cy="0" r="11" fill="var(--bg)" stroke="var(--gold-bright)" strokeWidth="2.5"/>
        <circle cx="740" cy="0" r="5" fill="var(--gold-bright)"/>
        <text x="760" y="4" className="lane-label" style={{fontSize: 10}}>INTERCHANGE</text>
        <rect x="900" y="-9" width="18" height="18" fill="var(--gold-bright)"/>
        <text x="928" y="4" className="lane-label" style={{fontSize: 10}}>TERMINUS</text>
      </g>

      {/* annotation panel — stats at bottom */}
      <g transform="translate(80 850)">
        <line x1="0" y1="-10" x2={W-160} y2="-10" stroke="var(--gold-ghost)"/>
        <text x="0" y="6" className="lane-label" style={{fontSize:9}}>FROM CARDS TO WEB · 4 INTERCHANGES · 2 LINES · 12 STOPS</text>
        <text x={W-160} y="6" className="lane-label" textAnchor="end" style={{fontSize:9, fill:'var(--w40)'}}>SCALE 1:N · NOT TO ROUTE</text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT: STRATA (horizontal layers)
// ─────────────────────────────────────────────────────────────

function VariantStrata({ density, showCite }) {
  const W = 1820, H = 1380;

  const finalLayers = [
    { y: 100, h: 240, label: '05 · CLIENT',  sub: 'CLI · web',           nodes: ['fe','players'] },
    { y: 400, h: 240, label: '04 · SERVE',   sub: 'Actix · search',      nodes: ['api','search'] },
    { y: 700, h: 240, label: '03 · STORE',   sub: 'Postgres · 7 GB',     nodes: ['pgcopy','publish','db'] },
    { y: 1000, h: 200, label:'02 · COMPUTE', sub: 'Rust · days of CPU',  nodes: ['cluster','trainer'] },
    { y: 1240, h: 100, label: '01 · CORE',   sub: 'libraries',           nodes: ['cards','transport','gameplay'] },
  ];

  const r = {};
  finalLayers.forEach(L => {
    if (L.nodes.length === 0) return;
    const n = L.nodes.length;
    const isCore = L.label.startsWith('01');
    const nodeW = isCore ? 360 : (n === 1 ? 380 : 340);
    const nodeH = isCore ? 70 : L.h - 60;
    const gap = 80;
    const totalW = n * nodeW + (n-1) * gap;
    const startX = (W - totalW) / 2;
    L.nodes.forEach((id, i) => {
      r[id] = { x: startX + i * (nodeW + gap), y: L.y + (isCore ? 14 : 30), w: nodeW, h: nodeH };
    });
  });

  const ef = (from,to) => E.find(e => e.from===from && e.to===to);
  // Strata edges: bottom-up flow (CORE → COMPUTE → STORE → SERVE → CLIENT).
  // pgcopy is leftmost in STORE → cluster/trainer below feed up cleanly.
  // db is rightmost in STORE → api/search above pull cleanly.
  // Internal store flow: pgcopy→publish→db (left-to-right within layer).
  const edges = [
    // CORE → COMPUTE
    { e: ef('cards','cluster'),     from: r.cards,     to: r.cluster,   fromSide:'t', toSide:'b' },
    { e: ef('cards','transport'),   from: r.cards,     to: r.transport, fromSide:'r', toSide:'l' },
    { e: ef('transport','cluster'), from: r.transport, to: r.cluster,   fromSide:'t', toSide:'b' },
    { e: ef('cards','trainer'),     from: r.cards,     to: r.trainer,   fromSide:'t', toSide:'b' },
    { e: ef('gameplay','trainer'),  from: r.gameplay,  to: r.trainer,   fromSide:'t', toSide:'b' },
    // COMPUTE → STORE (cluster + trainer both feed pgcopy on left of store layer)
    { e: ef('cluster','pgcopy'),    from: r.cluster, to: r.pgcopy, fromSide:'t', toSide:'b', labelDy:-30 },
    { e: ef('trainer','pgcopy'),    from: r.trainer, to: r.pgcopy, fromSide:'t', toSide:'b', labelDy:30 },
    // STORE internal (left → right)
    { e: ef('pgcopy','publish'),    from: r.pgcopy,  to: r.publish, fromSide:'r', toSide:'l' },
    { e: ef('publish','db'),        from: r.publish, to: r.db,      fromSide:'r', toSide:'l' },
    // STORE → SERVE (db on right of store feeds api/search above)
    { e: ef('db','api'),            from: r.db,     to: r.api,    fromSide:'t', toSide:'b', labelDx:-20 },
    { e: ef('db','search'),         from: r.db,     to: r.search, fromSide:'t', toSide:'b', labelDx:20 },
    // SERVE internal
    { e: ef('search','api'),        from: r.search, to: r.api,    fromSide:'l', toSide:'r' },
    // SERVE → CLIENT
    { e: ef('api','fe'),            from: r.api,    to: r.fe,      fromSide:'t', toSide:'b' },
    { e: ef('api','players'),       from: r.api,    to: r.players, fromSide:'t', toSide:'b' },
  ].filter(x=>x.e);

  return (
    <svg className="arch" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      {/* layer bands */}
      {finalLayers.map((L, i) => (
        <g key={L.label}>
          <rect x="40" y={L.y} width={W-80} height={L.h}
                fill={i % 2 === 0 ? 'rgba(201,168,76,0.02)' : 'rgba(26,58,42,0.06)'}
                stroke="var(--gold-ghost)" strokeDasharray="3 6"/>
          <text x="60" y={L.y - 8} className="lane-label">{L.label}</text>
          <text x={W-60} y={L.y - 8} className="lane-label" textAnchor="end" style={{color: 'var(--w40)'}}>{L.sub.toUpperCase()}</text>
        </g>
      ))}

      {edges.map((eg, i) => <Edge key={i} {...eg} edge={eg.e} density={density}/>)}
      {Object.entries(r).map(([id, rect]) => (
        <Node key={id} {...rect} n={N[id]} density={density} showCite={showCite}
              accent={true} dashed={N[id].dashed}/>
      ))}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// VARIANT: SCHEMATIC (engineering blueprint)
// ─────────────────────────────────────────────────────────────

function VariantSchematic({ density, showCite }) {
  const W = 1820, H = 1240;

  const r = {
    cards:     { x: 80,   y: 200, w: 240, h: 200 },
    transport: { x: 80,   y: 460, w: 240, h: 200 },
    gameplay:  { x: 80,   y: 720, w: 240, h: 200 },

    cluster:   { x: 380,  y: 200, w: 280, h: 220 },
    trainer:   { x: 380,  y: 580, w: 280, h: 240 },

    pgcopy:    { x: 720,  y: 200, w: 220, h: 200 },
    publish:   { x: 720,  y: 460, w: 220, h: 200 },
    db:        { x: 1000, y: 320, w: 240, h: 220 },

    api:       { x: 1300, y: 200, w: 280, h: 240 },
    search:    { x: 1300, y: 500, w: 280, h: 200 },
    fe:        { x: 1620, y: 200, w: 180, h: 200 },
    players:   { x: 1620, y: 460, w: 180, h: 200 },
  };

  const ef = (from,to) => E.find(e => e.from===from && e.to===to);
  const edges = [
    { e: ef('cards','cluster'),     from: r.cards,     to: r.cluster,   fromSide:'r', toSide:'l' },
    { e: ef('transport','cluster'), from: r.transport, to: r.cluster,   fromSide:'r', toSide:'b' },
    { e: ef('cards','transport'),   from: r.cards,     to: r.transport, fromSide:'b', toSide:'t' },
    { e: ef('cards','trainer'),     from: r.cards,     to: r.trainer,   fromSide:'r', toSide:'l' },
    { e: ef('gameplay','trainer'),  from: r.gameplay,  to: r.trainer,   fromSide:'r', toSide:'l' },
    { e: ef('cluster','pgcopy'),    from: r.cluster,   to: r.pgcopy,    fromSide:'r', toSide:'l' },
    { e: ef('trainer','pgcopy'),    from: r.trainer,   to: r.pgcopy,    fromSide:'r', toSide:'l' },
    { e: ef('pgcopy','publish'),    from: r.pgcopy,    to: r.publish,   fromSide:'b', toSide:'t' },
    { e: ef('publish','db'),        from: r.publish,   to: r.db,        fromSide:'r', toSide:'l' },
    { e: ef('db','api'),            from: r.db,        to: r.api,       fromSide:'r', toSide:'l' },
    { e: ef('db','search'),         from: r.db,        to: r.search,    fromSide:'r', toSide:'l' },
    { e: ef('search','api'),        from: r.search,    to: r.api,       fromSide:'t', toSide:'b' },
    { e: ef('api','fe'),            from: r.api,       to: r.fe,        fromSide:'r', toSide:'l' },
    { e: ef('api','players'),       from: r.api,       to: r.players,   fromSide:'r', toSide:'l' },
  ].filter(x=>x.e);

  return (
    <svg className="arch" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="grid-min" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(201,168,76,0.04)" strokeWidth="0.5"/>
        </pattern>
        <pattern id="grid-maj" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M 100 0 L 0 0 0 100" fill="none" stroke="rgba(201,168,76,0.10)" strokeWidth="0.6"/>
        </pattern>
      </defs>
      <rect width={W} height={H} fill="url(#grid-min)"/>
      <rect width={W} height={H} fill="url(#grid-maj)"/>

      {/* phase column rules */}
      {[
        { x: 80,   w: 240, label: 'A · CORE LIBS' },
        { x: 380,  w: 280, label: 'B · COMPUTE' },
        { x: 720,  w: 220, label: 'C · TRANSPORT' },
        { x: 1000, w: 240, label: 'D · STORE' },
        { x: 1300, w: 280, label: 'E · SERVE' },
        { x: 1620, w: 180, label: 'F · CLIENT' },
      ].map((c, i) => (
        <g key={i}>
          <line x1={c.x + c.w + 30} y1={140} x2={c.x + c.w + 30} y2={H-220}
                stroke="var(--gold-ghost)" strokeDasharray="6 4"/>
          <text x={c.x + c.w/2} y={120} className="lane-label" textAnchor="middle">{c.label}</text>
        </g>
      ))}

      {/* axis ticks */}
      <g transform="translate(0 140)">
        {Array.from({length: 19}).map((_,i)=>{
          const x = 60 + i*((W-120)/18);
          const major = i%3===0;
          return <g key={i}>
            <line x1={x} y1="0" x2={x} y2={major?-7:-3} stroke={major?'var(--gold-dim)':'var(--gold-ghost)'}/>
          </g>;
        })}
      </g>

      {edges.map((eg, i) => <Edge key={i} {...eg} edge={eg.e} density={density}/>)}
      {Object.entries(r).map(([id, rect]) => (
        <Node key={id} {...rect} n={N[id]} density={density} showCite={showCite}
              accent={true} dashed={N[id].dashed}/>
      ))}

      {/* numbered callouts — 2 rows × 4 cols below the nodes */}
      {density !== 'compact' && (() => {
        const calloutsTop = H - 200;
        const colGap = 440;
        const rowGap = 26;
        return (
          <g transform={`translate(60 ${calloutsTop})`}>
            <line x1="0" y1="-14" x2={W-580} y2="-14" stroke="var(--gold-ghost)"/>
            <text x="0" y="-22" className="lane-label" style={{fontSize:9}}>NOTES · KEYED TO DRAWING</text>
            {CALLOUTS.map((c, i) => {
              const col = i % 4;
              const row = Math.floor(i / 4);
              return (
                <g key={c.id} transform={`translate(${col*colGap} ${row*rowGap + 8})`}>
                  <circle cx="11" cy="0" r="10" fill="var(--bg)" stroke="var(--gold-bright)" strokeWidth="1.3"/>
                  <text x="11" y="3.5" className="citation" textAnchor="middle" style={{fontSize:9}}>{c.id}</text>
                  <text x="28" y="3.8" className="node-data" style={{fontSize:9.5}}>{c.text}</text>
                </g>
              );
            })}
          </g>
        );
      })()}

      {/* title block — bottom right (clear of callouts column area) */}
      <g transform={`translate(${W-460} ${H-130})`}>
        <rect x="0" y="0" width="420" height="110" fill="var(--surface)" stroke="var(--gold)"/>
        <line x1="0" y1="34" x2="420" y2="34" stroke="var(--gold-faint)"/>
        <line x1="0" y1="74" x2="420" y2="74" stroke="var(--gold-faint)"/>
        <line x1="220" y1="34" x2="220" y2="110" stroke="var(--gold-faint)"/>
        <text x="14" y="22" className="lane-label">DRAWING · R1VER-001 · SHEET 1/1</text>
        <text x="14" y="58" className="node-title" style={{fontSize: 16}}>system architecture</text>
        <text x="14" y="96" className="node-sub">Rev. 05 · 2026 · poker.fyi</text>
        <text x="234" y="58" className="node-data" style={{fill: 'var(--gold)'}}>SCALE 1:N</text>
        <text x="234" y="96" className="node-sub">12 nodes · 14 edges</text>
      </g>

      {/* north-arrow / compass-like glyph at top-right for blueprint feel */}
      <g transform={`translate(${W-100} 70)`}>
        <circle r="22" fill="var(--bg)" stroke="var(--gold-dim)" strokeWidth="1"/>
        <path d="M0 -16 L4 0 L0 16 L-4 0 Z" fill="var(--gold)"/>
        <text x="0" y="-26" className="lane-label" textAnchor="middle" style={{fontSize:8.5}}>FLOW</text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────

const VARIANTS = [
  { id: 'streets',   label: 'Streets',   subtitle: 'Stages as poker streets',     Component: VariantStreets },
  { id: 'river',     label: 'River',     subtitle: 'Downstream waterfall',        Component: VariantRiver },
  { id: 'transit',   label: 'Transit',   subtitle: 'Two subway lines',            Component: VariantTransit },
  { id: 'strata',    label: 'Strata',    subtitle: 'Horizontal layered tiers',    Component: VariantStrata },
  { id: 'schematic', label: 'Schematic', subtitle: 'Engineering blueprint',       Component: VariantSchematic },
];

window.R1VER_DIAGRAMS = { VARIANTS, N, E, PHASES };
