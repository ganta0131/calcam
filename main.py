from flask import Flask, render_template, request, jsonify
import requests
import os
import base64
from google.oauth2 import service_account
import json

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
    try:
        print(f"=== Vision APIリクエスト詳細 ===")
        print(f"Base64データサイズ: {len(base64_data)}バイト")
        print(f"パディング前のデータ長: {len(base64_data) % 4}")
        
        # Base64データのバリデーション
        if not base64_data:
            raise ValueError('Base64データが空です')
            
        # パディングを追加（必要に応じて）
        padding_needed = len(base64_data) % 4
        if padding_needed:
            base64_data += '=' * (4 - padding_needed)
            print(f"パディング追加後: {len(base64_data)}バイト")
        
        # URLエンコードされた文字をデコード
        base64_data = base64_data.replace('-', '+').replace('_', '/')
        
        # サービスアカウント認証
        service_account_info = os.getenv('GOOGLE_SERVICE_ACCOUNT_INFO')
        if not service_account_info:
            raise ValueError('GOOGLE_SERVICE_ACCOUNT_INFO環境変数が設定されていません')
        
        credentials_dict = json.loads(service_account_info)
        credentials = service_account.Credentials.from_service_account_info(credentials_dict)
        
        # APIリクエスト
        response = requests.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent',
            headers={
                'Authorization': f'Bearer {credentials.token}',
                'Content-Type': 'application/json'
            },
            json={
                'contents': [{
                    'inlineData': {
                        'mimeType': 'image/jpeg',
                        'data': base64_data
                    }
                }],
                'generationConfig': {
                    'temperature': 0.7,
                    'topP': 0.8,
                    'topK': 40
                }
            }
        )
        
        print(f"=== APIレスポンス ===")
        print(f"ステータスコード: {response.status_code}")
        print(f"レスポンスヘッダー: {dict(response.headers)}")
        
        if response.status_code != 200:
            try:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', '不明なエラー')
                # エラーデータを返す代わりに、エラーメッセージのみを返す
                return {'error': f'Vision APIエラー: {error_message}'}, response.status_code
            except Exception:
                return {'error': f'Vision APIエラー: レスポンスの解析に失敗しました'}, response.status_code
        
        return response.json()
        
    except Exception as e:
        print(f"=== エラー詳細 ===")
        print(f"エラー: {str(e)}")
        raise

def call_generate_api(vision_response):
    try:
        print(f"=== Generate APIリクエスト詳細 ===")
        print(f"Visionレスポンス: {vision_response}")
        
        # サービスアカウント認証
        service_account_info = os.getenv('GOOGLE_SERVICE_ACCOUNT_INFO')
        if not service_account_info:
            raise ValueError('GOOGLE_SERVICE_ACCOUNT_INFO環境変数が設定されていません')
        
        credentials_dict = json.loads(service_account_info)
        credentials = service_account.Credentials.from_service_account_info(credentials_dict)
        
        response = requests.post(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
            headers={
                'Authorization': f'Bearer {credentials.token}',
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
        
        print(f"=== Generate APIレスポンス ===")
        print(f"ステータスコード: {response.status_code}")
        print(f"レスポンスヘッダー: {dict(response.headers)}")
        
        if response.status_code != 200:
            print(f"=== APIエラー詳細 ===")
            print(f"レスポンスボディ: {response.text}")
            error_data = response.json()
            error_message = error_data.get('error', {}).get('message', '不明なエラー')
            raise Exception(f'Generate APIエラー: {error_message}')
        
        return response.json()
        
    except Exception as e:
        print(f"=== エラー詳細 ===")
        print(f"エラー: {str(e)}")
        raise

if __name__ == '__main__':
    app.run(debug=True)
