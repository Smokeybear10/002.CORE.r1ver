import { ImageResponse } from "next/og"

export const size = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#050505",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 110,
            height: 150,
            borderRadius: 14,
            background: "linear-gradient(145deg, #0f0f0f 0%, #080808 100%)",
            border: "3px solid #c9a84c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c9a84c",
            fontSize: 92,
            fontWeight: 700,
            fontFamily: "monospace",
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
          }}
        >
          1
        </div>
      </div>
    ),
    { ...size },
  )
}
