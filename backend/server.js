const express = require('express');
const cors = require('cors');
const { TranslationServiceClient } = require('@google-cloud/translate');
const app = express();

// 允許跨網域請求
app.use(cors());
app.use(express.json());

// 建立記憶體快取
const translationCache = {};

// 初始化 Google Translate 官方客戶端
// 注意：API Key 需要設定在環境變數中
const translationClient = new TranslationServiceClient({
  key: process.env.GOOGLE_API_KEY,  // Render 環境變數會自動載入
});

const projectId = process.env.GOOGLE_PROJECT_ID; // 需要你的 Project ID
const location = 'global';

// 建立翻譯 API 路由
app.post('/api/translate', async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: '缺少必要參數 text' });
  }

  console.log(`收到翻譯請求: [${text}]`);

  // 檢查快取
  if (translationCache[text]) {
    console.log(`✨ 快取命中! 直接回傳: ${translationCache[text]}`);
    return res.json({ translatedText: translationCache[text] });
  }

  try {
    // 使用官方 API 進行翻譯
    const request = {
      parent: `projects/${projectId}/locations/${location}`,
      contents: [text],
      mimeType: 'text/plain',
      sourceLanguageCode: 'auto',
      targetLanguageCode: 'zh-TW',
    };

    const [response] = await translationClient.translateText(request);
    const translatedText = response.translations[0].translatedText;

    // 存入快取
    translationCache[text] = translatedText;

    console.log(`🌐 翻譯成功: [${text}] -> [${translatedText}]`);
    res.json({ translatedText });

  } catch (error) {
    console.error('❌ Google 翻譯 API 發生錯誤:', error);
    // 失敗時回傳原文
    res.json({ translatedText: text });
  }
});

// Render 會自動分配 PORT
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 翻譯後端伺服器已成功啟動，正運行於 Port ${PORT}`);
});