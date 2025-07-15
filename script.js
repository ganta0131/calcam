let camera;
let canvas;
let ctx;
let isCaptured = false;

// カメラの初期化
async function initCamera() {
    try {
        // HTTPSでのみカメラアクセスを許可
        if (window.location.protocol !== 'https:') {
            throw new Error('カメラを使用するにはHTTPSが必要です。');
        }

        // ユーザーの同意を求める
        const camera = document.getElementById('camera');
        const container = document.getElementById('camera-container');
        
        // カメラコンテナのスタイルを調整
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.maxHeight = '80vh';
        
        // カメラのスタイルを調整
        camera.style.width = '100%';
        camera.style.height = '100%';
        camera.style.objectFit = 'cover';
        camera.style.position = 'absolute';
        camera.style.top = '0';
        camera.style.left = '0';
        
        // カメラの向きを明確に指定
        const constraints = {
            video: {
                facingMode: { exact: 'environment' }, // バックカメラを使用
                width: { ideal: 1280 },
                height: { ideal: 720 },
                aspectRatio: { ideal: 1.7777777778 }, // 16:9
                resizeMode: 'crop-and-scale'
            }
        };

        // カメラストリームを取得
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        camera.srcObject = stream;
        
        // カメラが起動するまで待機
        await new Promise(resolve => {
            camera.onloadedmetadata = () => {
                // カメラの向きを調整
                camera.play();
                
                // iPhone対応の追加設定
                if (navigator.userAgent.match(/iPhone/)) {
                    // iPhoneの場合、回転を無しに
                    camera.style.webkitTransform = '';
                    camera.style.transform = '';
                    
                    // カメラの向きを自動調整
                    camera.style.transform = 'rotate(0deg)';
                    camera.style.webkitTransform = 'rotate(0deg)';
                    
                    // iPhoneのユーザーインタラクション制限対策
                    camera.style.display = 'none';
                    setTimeout(() => {
                        camera.style.display = 'block';
                    }, 100);
                }
                
                resolve();
            };
        });
        
        // カメラの接続状態を監視
        const tracks = stream.getTracks();
        tracks.forEach(track => {
            track.onended = () => {
                console.log('カメラが切断されました');
                alert('カメラが切断されました。再起動します。');
                initCamera();
            };
        });
        
    } catch (err) {
        console.error('カメラのアクセスエラー:', err);
        
        // より具体的なエラーメッセージを表示
        let errorMessage = 'カメラのアクセスに失敗しました。';
        if (err.name === 'NotAllowedError') {
            errorMessage = 'カメラへのアクセスを許可してください。\n\n' +
                         '1. ブラウザの設定でカメラアクセスを許可してください\n' +
                         '2. HTTPS環境でアプリケーションを使用してください\n' +
                         '3. ブラウザを再起動して再度お試しください';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'カメラが見つかりませんでした。\n\n' +
                         '1. デバイスにカメラが接続されているか確認してください\n' +
                         '2. カメラの電源がオンになっているか確認してください';
        }
        
        alert(errorMessage);
        
        // カメラ起動に失敗した場合はリトライボタンを表示
        const retryButton = document.getElementById('retry');
        retryButton.style.display = 'inline';
        retryButton.textContent = 'カメラを再起動';
        
        // リトライボタンのイベントリスナーを追加
        retryButton.addEventListener('click', () => {
            retryButton.style.display = 'none';
            initCamera();
        });
    }
}

// 撮影処理
document.getElementById('capture').addEventListener('click', async () => {
    try {
        const captureButton = document.getElementById('capture');
        const analyzeButton = document.getElementById('analyze');
        const retryButton = document.getElementById('retry');
        const resultDiv = document.getElementById('result');

        // キャンバスの初期化
        canvas = document.createElement('canvas');
        canvas.width = camera.videoWidth;
        canvas.height = camera.videoHeight;
        ctx = canvas.getContext('2d');
        
        // カメラ画像をキャプチャ
        ctx.drawImage(camera, 0, 0);
        
        // キャプチャした画像をプレビュー表示
        const preview = document.createElement('img');
        preview.id = 'preview';
        preview.style.width = '100%';
        preview.style.maxWidth = '800px';
        preview.style.margin = '20px 0';
        preview.src = canvas.toDataURL('image/png');
        
        // 現在のカメラビデオを非表示
        camera.style.display = 'none';
        
        // プレビュー画像を追加
        const cameraContainer = document.getElementById('camera-container');
        cameraContainer.appendChild(preview);
        
        // ボタンの表示を切り替え
        captureButton.style.display = 'none';
        analyzeButton.style.display = 'inline';
        retryButton.style.display = 'inline';
        resultDiv.style.display = 'none';
        
    } catch (err) {
        console.error('撮影エラー:', err);
        alert('撮影に失敗しました。');
    }
});

// 分析処理
document.getElementById('analyze').addEventListener('click', async () => {
    const analyzeButton = document.getElementById('analyze');
    const retryButton = document.getElementById('retry');
    const resultDiv = document.getElementById('result');
    const totalCaloriesSpan = document.getElementById('total-calories');
    const itemsDiv = document.querySelector('.items');

    try {
        // 画像をTensorに変換
        const img = tf.browser.fromPixels(canvas);
        
        try {
            // 画像をBase64に変換
            const canvas = document.createElement('canvas');
            canvas.width = camera.videoWidth;
            canvas.height = camera.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(camera, 0, 0);
            
            // CanvasからBase64データを取得
            const base64Image = canvas.toDataURL('image/png');
            
            // Vercelの環境変数からAPIキーを取得
            const apiKey = process.env.GOOGLE_API_KEY;
            console.log('APIキー:', apiKey ? '設定されています' : '設定されていません');
            
            // テスト用のリクエスト
            const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-vision:generateContent', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiKey}`
                }
            });
            
            if (!testResponse.ok) {
                const error = await testResponse.json();
                console.error('テストリクエストエラー:', error);
                throw new Error(`テストリクエストに失敗しました: ${error.message}`);
            }
            
            // Gemini Vision APIにリクエスト
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/projects/generative-ai-demo/models/gemini-1.5-flash-vision:generateContent', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    inlineData: {
                                        mimeType: 'image/png',
                                        data: base64Image.split(',')[1] // Base64データ部分のみ
                                    }
                                }
                            ]
                        }
                    ],
                    prompt: {
                        text: "この写真に写っている食材・料理名・調理法・分量を推定し、それぞれの献立名と推定カロリー、献立全体の合算カロリーをJSON形式で出力してください。"
                    }
                })
            });
            
            const result = await response.json();
            const resultText = result.candidates[0].content.text;
            const resultDict = JSON.parse(resultText);
            
            // 結果を表示
            totalCaloriesSpan.textContent = resultDict.totalCalories + 'kcal';
            itemsDiv.innerHTML = resultDict.items.map(item => 
                `<div class="item">${item.name}: ${item.calories}kcal</div>`
            ).join('');
            
            // 説明文生成
            try {
                // Gemini Generate APIにリクエスト
                const explanationResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/projects/generative-ai-demo/models/gemini-1.5-flash:generateContent', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        contents: [
                            {
                                parts: [
                                    {
                                        text: `次のJSONの献立内容・カロリーについて、わかりやすく日本語で説明してください。\n${resultText}`
                                    }
                                ]
                            }
                        ]
                    })
                });
                
                const explanationResult = await explanationResponse.json();
                const explanation = explanationResult.candidates[0].content.text;
                
                // 説明文を表示
                const explanationDiv = document.createElement('div');
                explanationDiv.className = 'explanation';
                explanationDiv.innerHTML = `<div class="explanation-title">説明:</div><div class="explanation-text">${explanation}</div>`;
                itemsDiv.appendChild(explanationDiv);
            } catch (explanationError) {
                console.error('説明文生成エラー:', explanationError);
                alert('説明文の生成に失敗しました。');
            }
            
            resultDiv.style.display = 'block';
            
        } catch (error) {
            console.error('画像分析エラー:', error);
            alert('画像分析に失敗しました。');
        }
    } catch (err) {
        console.error('画像分析に失敗しました:', err);
        alert('画像分析に失敗しました。');
    }
});

// もう一度撮影
document.getElementById('retry').addEventListener('click', () => {
    const captureButton = document.getElementById('capture');
    const analyzeButton = document.getElementById('analyze');
    const retryButton = document.getElementById('retry');
    const resultDiv = document.getElementById('result');

    captureButton.style.display = 'inline';
    analyzeButton.style.display = 'none';
    retryButton.style.display = 'none';
    resultDiv.style.display = 'none';
    
    // カメラを再起動
    initCamera();
});

// ページ読み込み時にカメラを初期化
window.addEventListener('load', initCamera);
