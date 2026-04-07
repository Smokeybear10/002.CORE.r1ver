import { ImageResponse } from "next/og"

export const size = { width: 32, height: 32 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 32 32" fill="none">
          <rect x="4" y="5" width="16" height="22" rx="2" fill="#c9a84c" transform="rotate(-8 12 16)" />
          <rect x="12" y="5" width="16" height="22" rx="2" stroke="#c9a84c" strokeWidth="1.2" fill="none" transform="rotate(8 20 16)" />
        </svg>
      </div>
    ),
    { ...size },
  )
}
