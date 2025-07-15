document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const captureButton = document.getElementById('captureButton');
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
            
            // 撮影した画像を新しいタブで開く
            window.open(image);
            
            // 画像を保存する
            const link = document.createElement('a');
            link.href = image;
            link.download = 'photo.jpg';
            link.click();
        } catch (error) {
            console.error('撮影に失敗しました:', error);
            alert('撮影に失敗しました。');
        }
    });

    // ページ読み込み時にカメラを初期化
    initCamera();

    // ページを離れる時にカメラストリームを解放
    window.addEventListener('unload', () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });
});
