# 大申台灣誌 · Remotion 影片製作工具

用 React + Remotion 製作頻道素材，全部 1920×1080 / 30fps。

## 安裝

```bash
cd remotion
npm install
```

## 開啟預覽介面

```bash
npm start
# 開啟 http://localhost:3000 即可即時預覽所有素材
```

## 素材列表

| ID | 內容 | 長度 |
|---|---|---|
| `ChannelIntro` | 頻道片頭動畫 | 3 秒 |
| `TitleCard` | 集數標題卡（可自訂文字） | 5 秒 |
| `LowerThird` | 地點/人名字幕條 | 4 秒 |
| `Outro` | 片尾訂閱畫面 | 6 秒 |

## 算圖（輸出 MP4）

```bash
# 算圖單一素材
npm run render:intro
npm run render:title
npm run render:lower-third
npm run render:outro

# 或手動指定 props（例如換集數）
npx remotion render src/index.ts TitleCard out/ep02-title.mp4 \
  --props='{"episodeNumber":"EP.02","title":"台南古都一日遊","subtitle":"府城的時光流逝","location":"台南市 · 中西區"}'
```

## 自訂 TitleCard 內容

在 `src/compositions/TitleCard.tsx` 修改 props：

```tsx
// 在 Root.tsx 的 defaultProps 改成你的集數資訊
defaultProps={{
  episodeNumber: "EP.03",
  title: "你的標題",
  subtitle: "你的副標題",
  location: "地點 · 區域",
}}
```

## 自訂 LowerThird 字幕

```tsx
defaultProps={{
  name: "景點或人名",
  title: "一行說明文字",
  location: "縣市 · 區域",  // 可省略
}}
```

## 加入背景影片

在任意 composition 中用 `<Video>` 元件疊加：

```tsx
import { Video } from "remotion";
import { staticFile } from "remotion";

// 將影片檔放在 remotion/public/ 資料夾
<Video src={staticFile("your-footage.mp4")} />
```
