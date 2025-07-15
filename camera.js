document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const captureButton = document.getElementById('captureButton');
    const dishesContainer = document.getElementById('dishes');
    const totalCaloriesContainer = document.getElementById('total-calories');
    const resultContainer = document.getElementById('result-container');
    let stream;

    // カメラの初期化
    async function initCamera() {
        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };

            stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            captureButton.disabled = false;
        } catch (error) {
            console.error('カメラアクセスエラー:', error);
            alert('カメラにアクセスできません。');
        }
    }

    // 撮影処理
    captureButton.addEventListener('click', async () => {
        try {
            if (!video.srcObject) {
                throw new Error('カメラが準備できていません');
            }

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const image = canvas.toDataURL('image/jpeg', 0.8);
            
            const visionResponse = await analyzeImage(image);
            const generateResponse = await generateAnalysis(visionResponse);
            
            displayResults(generateResponse);
            resultContainer.style.display = 'block';
        } catch (error) {
            console.error('撮影エラー:', error);
            alert('撮影エラー: ' + error.message);
        }
    });

    // Gemini Vision APIを使用して画像を分析
    async function analyzeImage(image) {
        try {
            const apiKey = document.querySelector('meta[name="GOOGLE_API_KEY"]').content;
            if (!apiKey) {
                throw new Error('APIキーが設定されていません');
            }

            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
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
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Vision APIエラー:', error);
            throw error;
        }
    }

    // Gemini Generate APIを使用して分析結果を生成
    async function generateAnalysis(visionResponse) {
        try {
            const apiKey = document.querySelector('meta[name="GOOGLE_API_KEY"]').content;
            if (!apiKey) {
                throw new Error('APIキーが設定されていません');
            }

            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `画像から分析した食事内容に基づいて、以下のような情報を生成してください：
1. 各料理の名前と推定カロリー
2. 献立全体の合算カロリー
3. 調理法の推定

分析結果：${JSON.stringify(visionResponse)}`
                        }]
                    }]
                })
            });
            
            if (!response.ok) {
                throw new Error(`Generate APIエラー: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Generate APIエラー:', error);
            throw error;
        }
    }

    // ページ読み込み時にカメラを初期化
    initCamera();

    // ページを離れる時にカメラストリームを解放
    window.addEventListener('unload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
});
