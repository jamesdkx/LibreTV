import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

interface Props {
  name?: string;
  title?: string;
  location?: string;
}

// 地點/人名字幕條：120 幀 = 4 秒 @30fps
export const LowerThird: React.FC<Props> = ({
  name = "台南孔廟",
  title = "建於 1665 年，台灣現存最古老的孔廟",
  location,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 滑入
  const slideIn = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 120 },
    from: -300,
    to: 0,
  });

  // 淡出（最後 20 幀）
  const fadeOut = interpolate(frame, [100, 120], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 紅色線條展開
  const lineWidth = spring({
    fps,
    frame: frame - 5,
    config: { damping: 20, stiffness: 100 },
    from: 0,
    to: 4,
  });

  const textOpacity = interpolate(frame - 5, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "flex-start",
        padding: "0 80px 80px 80px",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          transform: `translateX(${slideIn}px)`,
          opacity: fadeOut,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
        }}
      >
        {/* 左側紅色粗線 */}
        <div
          style={{
            width: lineWidth,
            backgroundColor: "#e63946",
            marginRight: 16,
            flexShrink: 0,
          }}
        />

        {/* 文字內容 */}
        <div
          style={{
            opacity: textOpacity,
            backgroundColor: "rgba(0,0,0,0.75)",
            padding: "12px 20px",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 700,
              fontFamily: "sans-serif",
              lineHeight: 1.2,
            }}
          >
            {name}
          </div>
          {title && (
            <div
              style={{
                color: "#cccccc",
                fontSize: 18,
                fontWeight: 400,
                fontFamily: "sans-serif",
                marginTop: 4,
              }}
            >
              {title}
            </div>
          )}
          {location && (
            <div
              style={{
                color: "#e63946",
                fontSize: 16,
                fontWeight: 500,
                fontFamily: "sans-serif",
                marginTop: 4,
                letterSpacing: "0.05em",
              }}
            >
              📍 {location}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};
