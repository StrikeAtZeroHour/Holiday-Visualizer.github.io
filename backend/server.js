const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const translationCache = {};

async function translateText(text) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      target: 'zh-TW',
      format: 'text'
    })
  });
  
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.data.translations[0].translatedText;
}

app.post('/api/translate', async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: '缺少必要參數 text' });
  
  if (translationCache[text]) {
    return res.json({ translatedText: translationCache[text] });
  }
  
  try {
    const translatedText = await translateText(text);
    translationCache[text] = translatedText;
    res.json({ translatedText });
  } catch (error) {
    console.error('翻译错误:', error);
    res.json({ translatedText: text });
  }
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Translation API is ready' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});