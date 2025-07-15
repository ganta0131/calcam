const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

// APIキーを使用した画像分析エンドポイント
app.post('/api/analyze', async (req, res) => {
    try {
        const { image } = req.body;
        
        // Gemini Vision APIを使用して画像を分析
        const visionResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`
            },
            body: JSON.stringify({
                contents: [{
                    inlineData: {
                        mimeType: 'image/jpeg',
                        data: image.split(',')[1]
                    }
                }]
            })
        });
        
        if (!visionResponse.ok) {
            throw new Error(`Vision APIエラー: ${visionResponse.status} ${visionResponse.statusText}`);
        }
        
        const visionData = await visionResponse.json();
        
        // Gemini Generate APIを使用して分析結果を生成
        const generateResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `画像から分析した食事内容に基づいて、以下のような情報を生成してください：
1. 各料理の名前と推定カロリー
2. 献立全体の合算カロリー
3. 調理法の推定

分析結果：${JSON.stringify(visionData)}`
                    }]
                }]
            })
        });
        
        if (!generateResponse.ok) {
            throw new Error(`Generate APIエラー: ${generateResponse.status} ${generateResponse.statusText}`);
        }
        
        const generateData = await generateResponse.json();
        
        res.json(generateData);
    } catch (error) {
        console.error('APIエラー:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
