import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  AbsoluteFill,
  Audio,
  staticFile,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";

// 頻道片頭：90 幀 = 3 秒 @30fps
export const ChannelIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 背景漸入
  const bgOpacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  // 紅線從左展開
  const lineWidth = spring({
    fps,
    frame,
    config: { damping: 18, stiffness: 80 },
    from: 0,
    to: 320,
  });

  // 標題淡入縮放
  const titleScale = spring({
    fps,
    frame: frame - 10,
    config: { damping: 12, stiffness: 90 },
    from: 0.6,
    to: 1,
  });

  const titleOpacity = interpolate(frame - 10, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 副標題延遲出現
  const subOpacity = interpolate(frame - 30, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // 整體片尾淡出（最後 15 幀）
  const fadeOut = interpolate(frame, [75, 90], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        opacity: bgOpacity * fadeOut,
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
      }}
    >
      {/* 背景裝飾：台灣地圖輪廓風格紅點 */}
      <div
        style={{
          position: "absolute",
          top: 80,
          right: 120,
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: "#e63946",
          opacity: subOpacity,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 200,
          right: 80,
          width: 4,
          height: 4,
          borderRadius: "50%",
          backgroundColor: "#e63946",
          opacity: subOpacity * 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 120,
          left: 100,
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: "#e63946",
          opacity: subOpacity * 0.4,
        }}
      />

      {/* 主要內容區 */}
      <div style={{ textAlign: "center", position: "relative" }}>
        {/* 紅色橫線 */}
        <div
          style={{
            width: lineWidth,
            height: 4,
            backgroundColor: "#e63946",
            marginBottom: 20,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        />

        {/* 頻道主標題 */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${titleScale})`,
          }}
        >
          <h1
            style={{
              color: "#ffffff",
              fontSize: 80,
              fontWeight: 900,
              margin: 0,
              letterSpacing: "0.05em",
              fontFamily: "sans-serif",
            }}
          >
            大申台灣誌
          </h1>
        </div>

        {/* 英文副標題 */}
        <div style={{ opacity: subOpacity, marginTop: 16 }}>
          <p
            style={{
              color: "#e63946",
              fontSize: 24,
              fontWeight: 400,
              margin: 0,
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              fontFamily: "sans-serif",
            }}
          >
            TAIWAN CHRONICLES
          </p>
        </div>

        {/* 底部紅線 */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: "#e63946",
            marginTop: 20,
            marginLeft: "auto",
            marginRight: "auto",
            opacity: 0.5,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
