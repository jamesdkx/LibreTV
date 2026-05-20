import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
} from "remotion";

interface Props {
  episodeNumber?: string;
  title: string;
  subtitle?: string;
  location?: string;
}

// 集數標題卡：150 幀 = 5 秒 @30fps
export const TitleCard: React.FC<Props> = ({
  episodeNumber = "EP.01",
  title = "台北舊城散策",
  subtitle = "在大稻埕找一個下午的時光",
  location = "台北市 · 大稻埕",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  const fadeOut = interpolate(frame, [130, 150], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = fadeIn * fadeOut;

  // 集數標籤滑入
  const epSlide = spring({
    fps,
    frame,
    config: { damping: 16, stiffness: 100 },
    from: -60,
    to: 0,
  });

  // 主標題從右滑入
  const titleSlide = spring({
    fps,
    frame: frame - 10,
    config: { damping: 14, stiffness: 80 },
    from: 80,
    to: 0,
  });

  const titleOpacity = interpolate(frame - 10, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 副標題延遲
  const subOpacity = interpolate(frame - 25, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 地點標籤延遲
  const locOpacity = interpolate(frame - 40, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "rgba(0,0,0,0.75)",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingLeft: 100,
        opacity,
      }}
    >
      {/* 集數標籤 */}
      <div
        style={{
          transform: `translateX(${epSlide}px)`,
          marginBottom: 16,
        }}
      >
        <span
          style={{
            backgroundColor: "#e63946",
            color: "#fff",
            fontSize: 18,
            fontWeight: 700,
            padding: "6px 16px",
            letterSpacing: "0.15em",
            fontFamily: "sans-serif",
          }}
        >
          {episodeNumber}
        </span>
      </div>

      {/* 主標題 */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateX(${titleSlide}px)`,
          marginBottom: 12,
        }}
      >
        <h1
          style={{
            color: "#ffffff",
            fontSize: 72,
            fontWeight: 900,
            margin: 0,
            lineHeight: 1.1,
            fontFamily: "sans-serif",
            textShadow: "0 2px 20px rgba(0,0,0,0.8)",
          }}
        >
          {title}
        </h1>
      </div>

      {/* 副標題 */}
      <div style={{ opacity: subOpacity, marginBottom: 24 }}>
        <p
          style={{
            color: "#cccccc",
            fontSize: 28,
            fontWeight: 400,
            margin: 0,
            fontFamily: "sans-serif",
          }}
        >
          {subtitle}
        </p>
      </div>

      {/* 地點 */}
      <div
        style={{
          opacity: locOpacity,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            backgroundColor: "#e63946",
          }}
        />
        <span
          style={{
            color: "#e63946",
            fontSize: 20,
            fontWeight: 500,
            letterSpacing: "0.1em",
            fontFamily: "sans-serif",
          }}
        >
          {location}
        </span>
      </div>
    </AbsoluteFill>
  );
};
