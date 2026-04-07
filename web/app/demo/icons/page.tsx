export default function IconDemos() {
  return (
    <div style={{ background: "#000", minHeight: "100vh", padding: 60, display: "flex", flexDirection: "column", gap: 48 }}>
      <h1 style={{ color: "#c9a84c", fontFamily: "monospace", fontSize: 14, letterSpacing: 4 }}>ICON OPTIONS — 128px preview (actual 32px)</h1>

      <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
        {/* 1. Gold Spade */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <path d="M16 4 C16 4 6 14 6 19 C6 23 9 25 12 24 C13.5 23.5 15 22 16 20 C17 22 18.5 23.5 20 24 C23 25 26 23 26 19 C26 14 16 4 16 4Z" fill="#c9a84c"/>
            <path d="M16 20 L16 28" stroke="#c9a84c" strokeWidth="2"/>
            <path d="M12 28 L20 28" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>1. Gold Spade</div>
        </div>

        {/* 2. Two Cards Fanned */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <rect x="4" y="5" width="16" height="22" rx="2" stroke="#c9a84c" strokeWidth="1" opacity="0.5" transform="rotate(-8 12 16)"/>
            <rect x="12" y="5" width="16" height="22" rx="2" stroke="#c9a84c" strokeWidth="1.2" transform="rotate(8 20 16)"/>
            <circle cx="20" cy="13" r="1.5" fill="#c9a84c" transform="rotate(8 20 16)"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>2. Fanned Cards</div>
        </div>

        {/* 3. Poker Chip */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="13" stroke="#c9a84c" strokeWidth="1.5" strokeDasharray="3 2"/>
            <circle cx="16" cy="16" r="9" stroke="#c9a84c" strokeWidth="0.8" opacity="0.4"/>
            <text x="16" y="20" textAnchor="middle" fill="#c9a84c" fontSize="12" fontFamily="monospace" fontWeight="700">R</text>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>3. Poker Chip</div>
        </div>

        {/* 4. Equity Arc */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" stroke="#c9a84c" strokeWidth="0.5" opacity="0.2"/>
            <path d="M16 4 A12 12 0 1 1 5.5 22.4" stroke="#c9a84c" strokeWidth="2.5" strokeLinecap="round"/>
            <circle cx="16" cy="16" r="1.5" fill="#c9a84c"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>4. Equity Arc</div>
        </div>

        {/* 5. Card Back Crosshatch */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <rect x="5" y="3" width="22" height="26" rx="2.5" stroke="#c9a84c" strokeWidth="1.2"/>
            <rect x="8" y="6" width="16" height="20" rx="1" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3"/>
            <line x1="8" y1="6" x2="24" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="12" y1="6" x2="24" y2="22" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="16" y1="6" x2="24" y2="18" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="20" y1="6" x2="24" y2="14" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="8" y1="10" x2="20" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="8" y1="14" x2="16" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="8" y1="18" x2="12" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="24" y1="6" x2="8" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="20" y1="6" x2="8" y2="22" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="16" y1="6" x2="8" y2="18" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="12" y1="6" x2="8" y2="14" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="24" y1="10" x2="12" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="24" y1="14" x2="16" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
            <line x1="24" y1="18" x2="20" y2="26" stroke="#c9a84c" strokeWidth="0.4" opacity="0.25"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>5. Card Back</div>
        </div>

        {/* 6. Spade + Arc */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <path d="M16 7 C16 7 9 14 9 18 C9 21 11 22.5 13 22 C14 21.7 15 20.5 16 19 C17 20.5 18 21.7 19 22 C21 22.5 23 21 23 18 C23 14 16 7 16 7Z" fill="#c9a84c" opacity="0.8"/>
            <path d="M16 19 L16 25" stroke="#c9a84c" strokeWidth="1.5"/>
            <path d="M13 25 L19 25" stroke="#c9a84c" strokeWidth="1" strokeLinecap="round"/>
            <path d="M4 20 A13 13 0 0 1 16 3" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" strokeDasharray="2 2"/>
            <path d="M28 12 A13 13 0 0 1 16 29" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" strokeDasharray="2 2"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>6. Spade + Arc</div>
        </div>

        {/* 7. Overlapping Suits */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <path d="M12 6 C12 6 5 13 5 17 C5 20 7.5 21.5 9.5 21 C10.5 20.7 11.5 19.5 12 18.5" fill="none" stroke="#c9a84c" strokeWidth="1" opacity="0.4"/>
            <path d="M20 8 L20 16 L14 20 L26 20 Z" fill="none" stroke="#c9a84c" strokeWidth="1.2"/>
            <path d="M20 8 L14 20" stroke="#c9a84c" strokeWidth="1.2"/>
            <path d="M20 8 L26 20" stroke="#c9a84c" strokeWidth="1.2"/>
            <circle cx="20" cy="24" r="1" fill="#c9a84c"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>7. Spade + Diamond</div>
        </div>

        {/* 8. Card with Bell Curve */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <rect x="5" y="3" width="22" height="26" rx="2.5" stroke="#c9a84c" strokeWidth="1"/>
            <path d="M8 22 Q10 22 12 20 Q14 14 16 10 Q18 14 20 20 Q22 22 24 22" stroke="#c9a84c" strokeWidth="1.2" fill="none"/>
            <line x1="8" y1="22" x2="24" y2="22" stroke="#c9a84c" strokeWidth="0.5" opacity="0.3"/>
            <circle cx="16" cy="10" r="1" fill="#c9a84c"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>8. Card + Curve</div>
        </div>

        {/* 9. Cluster Dot */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="3" fill="#c9a84c"/>
            <circle cx="16" cy="16" r="7" stroke="#c9a84c" strokeWidth="0.8" opacity="0.3"/>
            <circle cx="16" cy="16" r="12" stroke="#c9a84c" strokeWidth="0.5" opacity="0.15" strokeDasharray="1 3"/>
            <circle cx="10" cy="10" r="1" fill="#c9a84c" opacity="0.3"/>
            <circle cx="22" cy="11" r="0.8" fill="#c9a84c" opacity="0.25"/>
            <circle cx="8" cy="18" r="0.7" fill="#c9a84c" opacity="0.2"/>
            <circle cx="23" cy="21" r="1" fill="#c9a84c" opacity="0.3"/>
            <circle cx="13" cy="24" r="0.6" fill="#c9a84c" opacity="0.2"/>
            <circle cx="20" cy="6" r="0.5" fill="#c9a84c" opacity="0.15"/>
            <line cx="16" cy="16" x1="16" y1="16" x2="10" y2="10" stroke="#c9a84c" strokeWidth="0.3" opacity="0.15"/>
            <line x1="16" y1="16" x2="23" y2="21" stroke="#c9a84c" strokeWidth="0.3" opacity="0.15"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>9. Cluster Map</div>
        </div>

        {/* 10. Chip Stack */}
        <div style={{ textAlign: "center" }}>
          <svg width="128" height="128" viewBox="0 0 32 32" fill="none">
            <ellipse cx="16" cy="22" rx="10" ry="4" stroke="#c9a84c" strokeWidth="1" opacity="0.4"/>
            <ellipse cx="16" cy="18" rx="10" ry="4" stroke="#c9a84c" strokeWidth="1" opacity="0.6"/>
            <ellipse cx="16" cy="14" rx="10" ry="4" stroke="#c9a84c" strokeWidth="1.2"/>
            <ellipse cx="16" cy="14" rx="10" ry="4" fill="#c9a84c" opacity="0.08"/>
            <line x1="6" y1="14" x2="6" y2="22" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
            <line x1="26" y1="14" x2="26" y2="22" stroke="#c9a84c" strokeWidth="1" opacity="0.3"/>
          </svg>
          <div style={{ color: "#fff", fontFamily: "monospace", fontSize: 11, marginTop: 8 }}>10. Chip Stack</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, marginTop: 32, alignItems: "center" }}>
        <span style={{ color: "#666", fontFamily: "monospace", fontSize: 11 }}>Actual size (32px):</span>
        {/* Actual size previews */}
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <div key={n} style={{ width: 32, height: 32, border: "1px solid #333", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: "#c9a84c", fontFamily: "monospace", fontSize: 8 }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
