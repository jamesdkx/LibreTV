import { Composition } from "remotion";
import { ChannelIntro } from "./compositions/ChannelIntro";
import { TitleCard } from "./compositions/TitleCard";
import { LowerThird } from "./compositions/LowerThird";
import { Outro } from "./compositions/Outro";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* 頻道片頭 3 秒 */}
      <Composition
        id="ChannelIntro"
        component={ChannelIntro}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
      />

      {/* 集數標題卡 5 秒，可傳入 props 客製化 */}
      <Composition
        id="TitleCard"
        component={TitleCard}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          episodeNumber: "EP.01",
          title: "台北舊城散策",
          subtitle: "在大稻埕找一個下午的時光",
          location: "台北市 · 大稻埕",
        }}
      />

      {/* 地點/人名字幕條 4 秒 */}
      <Composition
        id="LowerThird"
        component={LowerThird}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          name: "台南孔廟",
          title: "建於 1665 年，台灣現存最古老的孔廟",
          location: "台南市 · 中西區",
        }}
      />

      {/* 片尾 6 秒 */}
      <Composition
        id="Outro"
        component={Outro}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
