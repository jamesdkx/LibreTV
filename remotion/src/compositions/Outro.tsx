import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

// 片尾：180 幀 = 6 秒 @30fps
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 中央 Logo 縮放進入
  const logoScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 12, stiffness: 80 },
    from: 0.5,
    to: 1,
  });

  const logoOpacity = interpolate(frame - 10, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 訂閱提示延遲出現
  const subOpacity = interpolate(frame - 40, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const subSlide = spring({
    fps,
    frame: frame - 40,
    config: { damping: 16, stiffness: 100 },
    from: 30,
    to: 0,
  });

  // 社群連結更晚出現
  const socialOpacity = interpolate(frame - 70, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 整體脈動（0.98 ~ 1.02 緩慢呼吸感）
  const pulse = 1 + Math.sin(frame * 0.05) * 0.015;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        opacity: fadeIn,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: 0,
      }}
    >
      {/* 背景漸層圓 */}
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(230,57,70,0.08) 0%, transparent 70%)",
          opacity: logoOpacity,
        }}
      />

      {/* 頻道名稱 */}
      <div
        style={{
          opacity: logoOpacity,
          transform: `scale(${logoScale * pulse})`,
          textAlign: "center",
          marginBottom: 32,
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            fontSize: 88,
            fontWeight: 900,
            margin: 0,
            letterSpacing: "0.05em",
            fontFamily: "sans-serif",
          }}
        >
          大申台灣誌
        </h1>
        <div
          style={{
            width: 300,
            height: 3,
            backgroundColor: "#e63946",
            margin: "12px auto 0",
          }}
        />
        <p
          style={{
            color: "#e63946",
            fontSize: 20,
            fontWeight: 400,
            margin: "8px 0 0",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            fontFamily: "sans-serif",
          }}
        >
          TAIWAN CHRONICLES
        </p>
      </div>

      {/* 訂閱提示 */}
      <div
        style={{
          opacity: subOpacity,
          transform: `translateY(${subSlide}px)`,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        <p
          style={{
            color: "#cccccc",
            fontSize: 26,
            fontWeight: 400,
            margin: 0,
            fontFamily: "sans-serif",
          }}
        >
          喜歡這支影片嗎？
        </p>
        <p
          style={{
            color: "#ffffff",
            fontSize: 30,
            fontWeight: 700,
            margin: "8px 0 0",
            fontFamily: "sans-serif",
          }}
        >
          按讚 · 訂閱 · 開小鈴鐺 🔔
        </p>
      </div>

      {/* 社群連結 */}
      <div
        style={{
          opacity: socialOpacity,
          display: "flex",
          gap: 32,
          marginTop: 8,
        }}
      >
        {["YouTube", "Instagram", "Facebook"].map((platform) => (
          <div
            key={platform}
            style={{
              color: "#888888",
              fontSize: 16,
              fontFamily: "sans-serif",
              letterSpacing: "0.1em",
              borderBottom: "1px solid #333",
              paddingBottom: 4,
            }}
          >
            {platform}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
