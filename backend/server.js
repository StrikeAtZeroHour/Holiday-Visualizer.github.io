const express = require('express');
const cors = require('cors');
const { translate } = require('@vitalets/google-translate-api');
const app = express();

// 允許跨網域請求 (讓你的 React 前端可以連過來)
app.use(cors());
// 允許解析 JSON 格式的請求主體 (Body)
app.use(express.json());

// 建立一個記憶體快取物件，格式如：{ "New Year's Day": "元旦" }
const translationCache = {};

// 建立翻譯 API 路由
app.post('/api/translate', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: '缺少必要參數 text' });
  }

  console.log(`收到翻譯請求: [${text}]`);

  // 檢查快取：如果以前翻譯過，直接從記憶體拿出來回傳
  if (translationCache[text]) {
    console.log(`✨ 快取命中! 直接回傳: ${translationCache[text]}`);
    return res.json({ translatedText: translationCache[text] });
  }

  try {
    // 呼叫 Google 翻譯 API，將目標語言設為繁體中文 (zh-TW)
    const result = await translate(text, { to: 'zh-TW' });
    const translatedText = result.text;

    // 將結果存入快取，供下次使用
    translationCache[text] = translatedText;

    console.log(`🌐 翻譯成功: [${text}] -> [${translatedText}]`);
    res.json({ translatedText });

  } catch (error) {
    console.error('❌ Google 翻譯 API 發生錯誤:', error);
    // 萬一 API 壞了，至少把原文還給前端，確保網頁不會整個掛掉崩潰
    res.json({ translatedText: text });
  }
});

// Render 會自動分配 PORT，若在本機開發則預設使用 5000
const PORT = process.env.PORT || 5000;

// 綁定 0.0.0.0 是為了讓 Render 的反向代理能正確存取
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 翻譯後端伺服器已成功啟動，正運行於 Port ${PORT}`);
});