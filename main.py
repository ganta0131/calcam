from flask import Flask, render_template, request, jsonify
import requests
import os
import base64

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        # 画像データを取得
        data = request.get_json()
        if not data or 'image' not in data:
            raise ValueError('画像データが含まれていません')
            
        # Base64エンコードされた画像データの処理
        image_data = data['image']
        if not image_data.startswith('data:image/jpeg;base64,'):
            raise ValueError('無効な画像データ形式')
            
        # データURLのプレフィックスを削除
        base64_data = image_data.split(',')[1]
        
        # パディングを追加
        padding_needed = len(base64_data) % 4
        if padding_needed:
            base64_data += '=' * (4 - padding_needed)
        
        # URLエンコードされた文字をデコード
        base64_data = base64_data.replace('-', '+').replace('_', '/')
        
        # Gemini Vision APIを呼び出し
        vision_response = call_vision_api(base64_data)
        
        # Gemini Generate APIを呼び出し
        generate_response = call_generate_api(vision_response)
        
        return jsonify(generate_response)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def call_vision_api(base64_data):
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError('APIキーが設定されていません')
    
    response = requests.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'contents': [{
                'inlineData': {
                    'mimeType': 'image/jpeg',
                    'data': base64_data
                }
            }]
        }
    )
    
    if response.status_code != 200:
        raise Exception(f'Vision APIエラー: {response.text}')
    
    return response.json()

def call_generate_api(vision_response):
    api_key = os.environ.get('GOOGLE_API_KEY')
    if not api_key:
        raise ValueError('APIキーが設定されていません')
    
    response = requests.post(
        'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
        headers={
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        },
        json={
            'contents': [{
                'parts': [{
                    'text': f"画像から分析した食事内容に基づいて、以下のような情報を生成してください：\n1. 各料理の名前と推定カロリー\n2. 献立全体の合算カロリー\n3. 調理法の推定\n\n分析結果：{vision_response}"
                }]
            }]
        }
    )
    
    if response.status_code != 200:
        raise Exception(f'Generate APIエラー: {response.text}')
    
    return response.json()

if __name__ == '__main__':
    app.run(debug=True)
