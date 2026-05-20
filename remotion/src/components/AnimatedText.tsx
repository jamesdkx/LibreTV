import { useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";

interface Props {
  text: string;
  delay?: number;
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<Props> = ({ text, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const opacity = interpolate(frame - delay, [0, 15], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const translateY = spring({
    fps,
    frame: frame - delay,
    config: { damping: 14, stiffness: 100, mass: 0.8 },
    from: 30,
    to: 0,
  });

  return (
    <span
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: "inline-block",
        ...style,
      }}
    >
      {text}
    </span>
  );
};
