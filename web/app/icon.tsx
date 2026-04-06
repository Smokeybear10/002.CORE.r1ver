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
          background: "#050505",
        }}
      >
        <div
          style={{
            width: 22,
            height: 30,
            borderRadius: 3,
            background: "linear-gradient(145deg, #0f0f0f 0%, #080808 100%)",
            border: "1px solid #c9a84c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#c9a84c",
            fontSize: 18,
            fontWeight: 700,
            fontFamily: "monospace",
          }}
        >
          1
        </div>
      </div>
    ),
    { ...size },
  )
}
