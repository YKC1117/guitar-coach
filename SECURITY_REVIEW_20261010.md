# Guitar Coach 第二次資安複查

基準：b8116ffa90dd16d415c30933c18fbf8632cc2554。範圍：所有正式載入 JS/CSS、HTML、Service Worker、資料與媒體保存、筆記輸出、備份匯入、使用者切換、密碼與清除流程。沒有對真實使用者資料執行清除；沒有把前端密碼當成伺服器權限。

| 問題 | 判定 | 本輪處理 |
|---|---|---|
| 共用密碼可清除全部使用者 | 高風險 | 移除全部人清除 UI；clearData 對 current 以外的範圍先拒絕，不只隱藏按鈕 |
| 使用者切換沒有身分驗證 | 高風險 | 每位使用者獨立密碼；已設定者切換須解鎖；冷啟動在解鎖前不載入 app-core／筆記程式；提供離開並鎖定 |
| 共用 SHA-256 密碼 | 不適合使用者隔離 | 每位使用者 PBKDF2-SHA256、隨機 16-byte salt、600,000 iterations；不保存明文；舊共用密碼只供原有使用者第一次設定獨立密碼時驗證，不能刪除資料 |
| 遞迴合併接受原型鍵 | 高風險 | 阻擋 __proto__、constructor、prototype，使用自有鍵枚舉，匯入前驗證與深度／節點上限；保留安全未知欄位 |
| 筆記／和弦格 ID 直接插入 HTML | 內容注入風險 | 在屬性位置轉義，譜面類別／拍號轉義，座標、附點、BPM 與統計展示改成數字 |
| 備份附件僅檢查 data: | 不足 | 還原前驗證 MIME 與 base64，拒絕 SVG／HTML 等可執行附件，加入檔案與總附件容量上限 |
| 隱私檢查只看入口 | 覆蓋不足 | 擴展至所有正式 JS/CSS；保留 CSP、自站資源、connect-src none；沒有第三方 runtime／分析／外部 API |
| 備份 checksum 被誤當來源可信 | 邊界不清 | 明確標示內容完整性一致不是來源認證；輕量匯入增加目前使用者覆蓋確認 |

## 必須保留的限制

- 本網站是 GitHub Pages 靜態、本機儲存網站。前端鎖只約束一般介面操作，無法防止持有裝置的人修改 JavaScript／storage、清除瀏覽器網站資料或使用裝置管理工具。不能宣稱具有伺服器級授權。
- 各使用者必須自行設定獨立密碼；尚未設定者仍未受密碼保護。共用平板交接前須點「離開並鎖定」。密碼忘記沒有繞過／共用管理員密碼。
- 原有 localStorage 格式與預設使用者鍵保留。密碼與 session 使用獨立控制鍵；未加密既有筆記與媒體。備份檔仍為未加密檔案，需自行保管。
- 原「完整備份」未含獨立 classroom notebook，五線譜等須另匯出 PNG/PDF；本輪沒有悄悄更改既有備份版本。
- 真正防惡意刪除與保障復原，需要伺服器帳號、伺服器逐筆授權、soft delete、稽核與備份。這需要獨立架構施工，不能用前端角色下拉框假裝完成。
- 本輪是程式碼、安全案例與瀏覽器複查，並非外部滲透測試或安全認證。實際 iPhone/iPad 麥克風、附件及分享 API 未作實機認證。

## 配色

先選深色／淺色，再選黑、白、藍、綠、紫、橘、玫瑰，共 14 組完整頁面配色。選顏色不改明暗模式，模式／顏色保存在目前使用者的既有 theme 記錄，安全未知欄位保留。舊白色預設遷移為淺色，舊彩色維持原深色，舊 mode 設定保留。

## 驗證

集中執行 recovery-regression、dom-regression、profile-regression、security-regression；另執行所有正式 JavaScript 語法檢查、Privacy Guard 與 diff whitespace 檢查。測試涵蓋：五大頁面／五線譜局部更新／3 秒鎖定／復原與擦除／和弦格／TAB／匯出按鈕、14 組模式與顏色、未解鎖阻擋資料和核心載入、跨使用者密碼拒絕、全部人範圍拒絕、只清除目前使用者媒體、保留其他人的原始資料、舊共用密碼不授權刪除、惡意 JSON／HTML／SVG、離線與儲存失敗。

OWASP 邊界參考：https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
原型污染參考：https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html
