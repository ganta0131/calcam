document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const captureButton = document.getElementById('captureButton');
    const dishesContainer = document.getElementById('dishes');
    const totalCaloriesContainer = document.getElementById('total-calories');
    const resultContainer = document.getElementById('result-container');
    let stream;

    // カメラアクセスの初期化
    async function initCamera() {
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment', // バックカメラを使用
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            video.srcObject = stream;
            captureButton.disabled = false;
        } catch (error) {
            console.error('カメラアクセスに失敗しました:', error);
            alert('カメラにアクセスできません。');
        }
    }

    // 撮影処理
    captureButton.addEventListener('click', async () => {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);

            const image = canvas.toDataURL('image/jpeg');
            
            // サーバーサイドAPIを使用して画像を分析
            const visionResponse = await analyzeImage(image);
            
            // Gemini Generate APIを使用して分析結果を生成
            const generateResponse = await generateAnalysis(visionResponse);
            
            // 結果を表示
            displayResults(generateResponse);
            resultContainer.style.display = 'block';
        } catch (error) {
            console.error('撮影に失敗しました:', error);
            alert('撮影に失敗しました。');
        }
    });

    // サーバーサイドAPIを使用して画像を分析
    async function analyzeImage(image) {
        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    image
                })
            });
            
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('APIエラー:', error);
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
