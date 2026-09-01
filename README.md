# 標案雷達 Tender Radar

將標案監測流程轉成可直接使用的響應式網站前端。

線上靜態展示：https://moto-droid.github.io/tender-radar/

> GitHub Pages 僅展示前端與示範資料。CAG 即時同步、每日排程、Email 與 LINE 推播需另外啟動或部署 `server.py`。

Netlify 版本已將 `server.py` 的能力改寫成 Netlify Functions，包含 CAG 同步、Netlify Blobs 訂閱儲存、LINE Webhook、測試推播與每 15 分鐘檢查一次的每日排程。推播時間以使用者選擇的台北／新加坡時區計算。

## 啟動

靜態預覽可直接開啟 `index.html`。若要啟用 CAG 即時同步，請在此資料夾執行：

```bash
python3 server.py
```

再開啟 `http://localhost:8080`。

## 已完成

- 儀表板與最新標案摘要
- 標案搜尋、狀態／類別篩選
- 新增、啟停與刪除監測條件
- 收藏案件與獨立收藏頁
- 立即監測狀態與執行紀錄
- CSV 匯出
- 通知設定
- localStorage 保存監測條件、收藏與執行紀錄
- 桌面與手機版響應式介面
- 台灣採購公報網與 Changi Airport Group 雙資料來源篩選
- CAG Business Opportunities 即時同步 API（`/api/sync/cag`）
- 可修改的進階搜尋條件：來源、中英文關鍵字、排除字、AND/OR、機關、類別、地區、預算、日期與截止狀態
- 標書大綱辨識：採購目的、工作範圍、履約地點、機構類型、時程、預算與風險提醒
- 今日標案情報：自動辨識清潔維護、機場／航空站、公共交通設施、醫院／監獄／軍方／矯正機關
- 每日訂閱推播：Email 或 LINE 官方帳號、寄送時間、精選數量及摘要內容
- 每筆建議標案自動產生資格、文件、估價、現勘、技術與截止時程準備工項

## 啟用 Email 與 LINE 推播

推播密鑰只從伺服器環境變數讀取，不會存入瀏覽器或 `subscription.json`。

```bash
export SMTP_HOST="smtp.example.com"
export SMTP_PORT="587"
export SMTP_USER="your-user"
export SMTP_PASSWORD="your-password"
export SMTP_FROM="tender@example.com"

export LINE_CHANNEL_ACCESS_TOKEN="your-line-messaging-api-token"
export LINE_CHANNEL_SECRET="your-line-channel-secret"
python3 server.py
```

LINE 使用 Messaging API 的 push message；使用者必須加入 LINE 官方帳號，並由 Webhook 取得其 User ID。將 LINE Developers Console 的 Webhook URL 設為 `https://你的網域/api/line/webhook`，再按 Verify 並啟用 Use webhook。LINE Notify 已停止服務，因此本專案不使用 LINE Notify Token。

### Netlify Git 部署設定

- Repository：`moto-droid/tender-radar`
- Build command：`npm run build`
- Publish directory：`dist`
- Functions directory：`netlify/functions`
- Node.js：20 或更新版本

正式推播需在 Netlify Site configuration → Environment variables 設定 `.env.example` 中的 SMTP 與 LINE 變數；不要把實際密鑰提交到 GitHub。

## 串接既有爬蟲

目前版本以前端示範資料呈現完整操作流程。將既有爬蟲的輸出做成 JSON API 後，把 `app.js` 的 `tenders` 陣列改為以下方式即可：

```js
const tenders = await fetch('/api/tenders').then(r => r.json());
```

建議 API 欄位：`id`、`title`、`agency`、`code`、`category`、`budget`、`deadline`、`date`、`match`、`status`。
