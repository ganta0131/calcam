// グローバル変数の初期化
let camera;
let canvas;
let ctx;
let isCaptured = false;
let initCameraPromise;

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
        container.style.display = 'block';
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.maxWidth = '800px';
        container.style.height = '500px';
        container.style.margin = '20px auto';
        container.style.background = '#f0f0f0';
        container.style.borderRadius = '10px';
        container.style.overflow = 'hidden';
        
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
            // ユーザーの操作を待機
            await new Promise(resolve => {
                const captureButton = document.getElementById('capture');
                captureButton.addEventListener('click', resolve, { once: true });
            });
            
            stream = await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            // カメラの制約が厳しすぎる場合は、より柔軟な設定を試す
            console.warn('厳格な制約でのカメラアクセスに失敗しました。より柔軟な設定を試します。');
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
        }
        
        // カメラを設定
        camera.srcObject = stream;
        camera.style.width = '100%';
        camera.style.height = '500px';
        camera.style.objectFit = 'contain';
        camera.style.position = 'static';
        camera.style.transform = 'rotate(0deg)';
        camera.style.webkitTransform = 'rotate(0deg)';
        
        // カメラが起動するまで待機
        await new Promise(resolve => {
            camera.onloadedmetadata = () => {
                camera.play();
                
                // iPhone対応の追加設定
                if (navigator.userAgent.match(/iPhone/)) {
                    // カメラの向きを自動調整
                    window.addEventListener('orientationchange', () => {
                        camera.style.transform = `rotate(${window.orientation}deg)`;
                        camera.style.webkitTransform = `rotate(${window.orientation}deg)`;
                    });
                }
                
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
        
    } catch (err) {
        console.error('カメラの初期化エラー:', err);
        alert('カメラの初期化に失敗しました。');
    }
}

// ボタンの状態を更新する関数
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
            resultDiv.style.display = 'block';
            loading.style.display = 'none';
            break;
    }
}

// ページ読み込み時にカメラを初期化
window.addEventListener('load', () => {
    initCameraPromise = initCamera();
});
