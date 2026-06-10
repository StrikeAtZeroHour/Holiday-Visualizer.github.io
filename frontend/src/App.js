import React, { useState, useEffect } from 'react';
import './App.css';

const COUNTRIES = [
  { code: "DE", name: "Germany", color: "#38bdf8", height: 100 },
  { code: "FR", name: "France", color: "#f43f5e", height: 250 },
  { code: "ES", name: "Spain", color: "#a855f7", height: 400 }
];

const MONTHS = [
  { label: "Jan", day: 1 }, { label: "Feb", day: 32 }, { label: "Mar", day: 61 },
  { label: "Apr", day: 92 }, { label: "May", day: 122 }, { label: "Jun", day: 153 },
  { label: "Jul", day: 183 }, { label: "Aug", day: 214 }, { label: "Sep", day: 245 },
  { label: "Oct", day: 275 }, { label: "Nov", day: 306 }, { label: "Dec", day: 336 }
];
// 🌟 設定後端網址（本地測試用 localhost，部署後記得改成 Render 提供給你的後端網址）
const BACKEND_URL = 'http://localhost:5000';

function getDayOfYear(dateString) {
  const date = new Date(dateString);
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / (1000 * 60 * 60 * 24));
}

// Wikipedia API
async function fetchHolidayInfo(holidayName,countryCode) {
  try {
    // fuzzy search
    const searchUrl = `https://${countryCode}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(holidayName)}&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();
    
    // return the most relevant result 
    const bestMatch = searchData.query.search[0];
    if (!bestMatch) return null;

    // get the details
    const infoUrl = `https://${countryCode}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(bestMatch.title)}&prop=pageimages|extracts&exintro&explaintext&exchars=80&pithumbsize=200&format=json&origin=*`;
    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();
    
    const pages = infoData.query.pages;
    const pageId = Object.keys(pages)[0];
    
    return {
      imageUrl: pages[pageId].thumbnail?.source || null,
      summary: pages[pageId].extract || "No detailed description available",
      title: bestMatch.title 
    };
  } catch (e) {
    console.error("Wikipedia API error:", e);
    return null;
  }
}
// 🌟 新增：向後端發送翻譯請求的輔助函式
async function requestTranslation(text) {
  if (!text || text === "unknown festival") return text;
  try {
    const res = await fetch(`${BACKEND_URL}/api/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();
    return data.translatedText;
  } catch (e) {
    console.error("後端翻譯連線失敗:", e);
    return text; // 萬一後端掛了，至少顯示原本的外文
  }
}
export default function App() {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredHolidayIndex, setHoveredHolidayIndex] = useState(null);
  const [holidayDetails, setHolidayDetails] = useState({}); // cache so no need to fetch again { index: { imageUrl, summary } }
  const [timelineWidth] = useState(1700);

  useEffect(() => {
    async function fetchAllHolidays() {
      setLoading(true);
      try {
        const promises = COUNTRIES.map(async (country) => {
          const res = await fetch(`https://openholidaysapi.org/PublicHolidays?countryIsoCode=${country.code}&validFrom=2026-01-01&validTo=2026-12-31`);
          const data = await res.json();
          return data.map(item => ({
            name: item.name[0]?.text || "unknown festival",
            countryCode: country.code,
            date: item.startDate,
            dayOfYear: getDayOfYear(item.startDate)
          }));
        });
        const results = await Promise.all(promises);
        setHolidays(results.flat().map((h, i) => ({ ...h, index: i })));
      } catch (error) { console.error("API Error:", error); } 
      finally { setLoading(false); }
    }
    fetchAllHolidays();
  }, []);

  const handleMouseEnter = async (fest) => {
    setHoveredHolidayIndex(fest.index);
    
    if (!holidayDetails[fest.index]) {
      // 1. 同時啟動：查維基百科（內含內文翻譯） 與 節日名稱翻譯
      const [info, zhFestivalName] = await Promise.all([
        fetchHolidayInfo(fest.name, fest.countryCode),
        requestTranslation(fest.name)
      ]);

      // 2. 存入快取
      setHolidayDetails(prev => ({ 
        ...prev, 
        [fest.index]: {
          imageUrl: info?.imageUrl || null,
          summary: info?.summary || "暫無詳細中文資訊介紹",
          translatedName: zhFestivalName || fest.name
        } 
      }));
    }
  };

  if (loading) return <div className="loading">🌍 Loading...</div>;

  return (
    <div className="timeline-container">
      <div className="header"><h1>🗺️ OPEN HOLIDAYS CHRONICLE (2026)</h1><h3>🔵France 🔴Germany 🟣Spain</h3></div>
      <div className="scroll-wrapper">
        <div className="timeline-canvas" style={{ width: `${timelineWidth}px` }}>
          {MONTHS.map((m, i) => (
            <div key={i} className="month-label" style={{ left: `${(m.day / 365) * timelineWidth}px` }}>{m.label}</div>
          ))}
          {holidays.map((fest) => {
            const countryCfg = COUNTRIES.find(c => c.code === fest.countryCode);
            const x = (fest.dayOfYear / 365) * timelineWidth;
            // 🌟 檢查快取內有沒有翻譯好的名稱，沒有就先顯示原始名稱
            const displayName = holidayDetails[fest.index]?.translatedName || fest.name;
            return (
              <div key={fest.index} className="holiday-wrapper"
                style={{ left: `${x}px`, top: `${countryCfg.height}px`, '--dot-color': countryCfg.color }}
                onMouseEnter={() => handleMouseEnter(fest)}
                onMouseLeave={() => setHoveredHolidayIndex(null)}
              >
                <div className="holiday-dot" />
                {hoveredHolidayIndex === fest.index && (
                  <div className="holiday-card">
                    {holidayDetails[fest.index]?.imageUrl ? (
                      <img src={holidayDetails[fest.index].imageUrl} alt={displayName} />
                    ) : <div className="no-image">No related image</div>}
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{countryCfg.name} | {fest.date.substring(5).replace('-', '/')}</div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', margin: '4px 0' }}>{displayName}</div>
                    <p style={{ fontSize: '10px', color: '#cbd5e1', margin: 0 }}>{holidayDetails[fest.index]?.summary || "Loading..."}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}