// グローバル変数の初期化
let camera;
let canvas;
let ctx;
let isCaptured = false;
let currentStream = null;

// APIキーの取得（セキュリティのため、環境変数から取得）
function getApiKey() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error('APIキーが設定されていません。');
    }
    return apiKey;
}

// カメラリソースのクリーンアップ
function cleanupCamera() {
    if (currentStream) {
        const tracks = currentStream.getTracks();
        tracks.forEach(track => track.stop());
        currentStream = null;
    }
    if (canvas) {
        canvas.width = 0;
        canvas.height = 0;
        canvas = null;
    }
}

// カメラの初期化
async function initCamera() {
    try {
        // HTTPSでのみカメラアクセスを許可
        if (window.location.protocol !== 'https:') {
            throw new Error('カメラを使用するにはHTTPSが必要です。');
        }

        // ユーザーの同意を求める
        camera = document.getElementById('camera');
        const container = document.getElementById('camera-container');
        
        // カメラコンテナの初期化
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        
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
        let stream;
        try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            // カメラの制約が厳しすぎる場合は、より柔軟な設定を試す
            console.warn('厳格な制約でのカメラアクセスに失敗しました。より柔軟な設定を試します。');
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        // 既存のストリームをクリーンアップ
        cleanupCamera();
        
        currentStream = stream;
        camera.srcObject = stream;
        
        // ユーザーの同意を待機
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
                    
                    // iPhoneの表示制御
                    camera.style.objectFit = 'contain';
                    camera.style.position = 'absolute';
                    camera.style.top = '0';
                    camera.style.left = '0';
                }
                
                // デバイスの向き変更イベントを追加
                window.addEventListener('orientationchange', () => {
                    if (navigator.userAgent.match(/iPhone/)) {
                        camera.style.transform = `rotate(${window.orientation}deg)`;
                    }
                });
                
                // ボタンの状態を更新
                updateButtonStates('capture');
                
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
        
        // エラーハンドリングの改善
    } catch (err) {
        console.error('カメラの初期化エラー:', err);
        
        // より具体的なエラーメッセージを表示
        let errorMessage = 'カメラの初期化に失敗しました。';
        if (err.name === 'NotAllowedError') {
            errorMessage = 'カメラへのアクセスを許可してください。\n\n' +
                         '1. ブラウザの設定でカメラアクセスを許可してください\n' +
                         '2. HTTPS環境でアプリケーションを使用してください\n' +
                         '3. ブラウザを再起動して再度お試しください';
        } else if (err.name === 'NotFoundError') {
            errorMessage = 'カメラが見つかりませんでした。\n\n' +
                         '1. デバイスにカメラが接続されているか確認してください\n' +
                         '2. カメラの電源がオンになっているか確認してください';
        } else if (err.name === 'NotAllowedError') {
            errorMessage = 'カメラへのアクセスが拒否されました。\n\n' +
                         '1. ブラウザの設定でカメラアクセスを許可してください\n' +
                         '2. ブラウザを再起動して再度お試しください';
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

// 状態管理用の関数
function updateButtonStates(state) {
    const captureButton = document.getElementById('capture');
    const analyzeButton = document.getElementById('analyze');
    const retryButton = document.getElementById('retry');
    const resultDiv = document.getElementById('result');
    const loading = document.getElementById('loading');

    switch (state) {
        case 'capture':
            captureButton.classList.remove('disabled');
            analyzeButton.classList.add('disabled');
            retryButton.classList.add('disabled');
            resultDiv.style.display = 'none';
            loading.style.display = 'none';
            break;
        case 'analyze':
            captureButton.classList.add('disabled');
            analyzeButton.classList.remove('disabled');
            retryButton.classList.add('disabled');
            resultDiv.style.display = 'none';
            loading.style.display = 'block';
            loading.querySelector('.loading-text').textContent = '分析中...';
            break;
        case 'result':
            captureButton.classList.add('disabled');
            analyzeButton.classList.add('disabled');
            retryButton.classList.remove('disabled');
            retryButton.className = 'active';
            resultDiv.style.display = 'block';
            loading.style.display = 'none';
            break;
    }
}

// 撮影処理
document.getElementById('capture').addEventListener('click', async () => {
    try {
        // キャンバスの初期化
        canvas = document.createElement('canvas');
        ctx = canvas.getContext('2d');
        
        // カメラのサイズを取得
        const videoWidth = camera.videoWidth;
        const videoHeight = camera.videoHeight;
        
        // 画面のアスペクト比に合わせてサイズを調整
        const container = document.getElementById('camera-container');
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // アスペクト比を維持しながら最大サイズに収まるように調整
        let width = videoWidth;
        let height = videoHeight;
        const aspectRatio = videoWidth / videoHeight;
        
        if (width > containerWidth) {
            width = containerWidth;
            height = Math.round(width / aspectRatio);
        }
        if (height > containerHeight) {
            height = containerHeight;
            width = Math.round(height * aspectRatio);
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // カメラ映像を描画
        ctx.drawImage(camera, 0, 0, width, height);
        
        // プレビュー画像を作成
        const preview = document.createElement('img');
        preview.id = 'preview';
        preview.className = 'preview-image';
        preview.src = canvas.toDataURL('image/png');
        
        // カメラ映像を非表示にし、プレビューを表示
        const cameraContainer = document.getElementById('camera-container');
        cameraContainer.appendChild(preview);
        camera.style.display = 'none';
                        
        // 状態を更新
        updateButtonStates('analyze');
                        
    } catch (err) {
        console.error('撮影エラー:', err);
        alert('撮影に失敗しました。');
        updateButtonStates('capture');
    }
});

// 分析処理
document.getElementById('analyze').addEventListener('click', async () => {
    try {
        // 状態を更新
        updateButtonStates('analyze');

        // APIキーの取得
        const apiKey = getApiKey();

        // 画像をBase64に変換
        const imgData = canvas.toDataURL('image/png');
        
        // Gemini Vision APIに画像を送信
        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-vision-pro:generateContent', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        inlineData: {
                            mimeType: 'image/png',
                            data: imgData.split(',')[1]
                        }
                    }]
                }]
            })
        });
        
        if (!response.ok) {
            throw new Error('分析に失敗しました。');
        }
        
        const data = await response.json();
        const result = data.candidates[0].content.parts[0].text;
        
        // 結果を表示
        const itemsDiv = document.getElementById('items');
        itemsDiv.innerHTML = result;
        
        // カロリーの合計を計算
        const totalCalories = calculateTotalCalories(result);
        document.getElementById('total-calories').textContent = totalCalories;
        
        // 状態を更新
        updateButtonStates('result');
        
    } catch (err) {
        console.error('分析エラー:', err);
        alert('分析に失敗しました。');
        updateButtonStates('capture');
    }
});

// もう一度撮影
document.getElementById('retry').addEventListener('click', () => {
    // イベントリスナーを一度削除
    const retryButton = document.getElementById('retry');
    retryButton.removeEventListener('click', arguments.callee);
    
    // カメラリソースをクリーンアップ
    cleanupCamera();
    
    // ボタンの状態をリセット
    const captureButton = document.getElementById('capture');
    const analyzeButton = document.getElementById('analyze');
    const resultDiv = document.getElementById('result');
    
    captureButton.style.display = 'inline';
    analyzeButton.style.display = 'none';
    resultDiv.style.display = 'none';
    
    // カメラを再起動
    initCamera();
});

// ページ読み込み時にカメラを初期化
window.addEventListener('load', async () => {
    try {
        await initCamera();
        // カメラ初期化後にボタンの状態を更新
        updateButtonStates('capture');
    } catch (err) {
        console.error('カメラ初期化エラー:', err);
        alert('カメラの初期化に失敗しました。');
    }
});
