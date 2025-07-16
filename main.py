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
        
        # Base64データのバリデーションと正規化
        if not base64_data:
            raise ValueError('Base64データが空です')
            
        # URLエンコードされた文字を置換（Gemini API仕様に合わせる）
        base64_data = base64_data.replace('-', '+').replace('_', '/')
        
        # パディングを追加（必要に応じて）
        padding_needed = len(base64_data) % 4
        if padding_needed:
            base64_data += '=' * (4 - padding_needed)
            
        # Base64データをバイナリにデコードして再エンコード
        try:
            binary_data = base64.b64decode(base64_data)
            # 画像データの形式を確認
            if not binary_data.startswith((b'\xff\xd8', b'\x89PNG')):
                raise ValueError('サポートされていない画像形式です')
            
            # 再エンコード
            base64_data = base64.b64encode(binary_data).decode('utf-8')
            print(f"Base64データ長: {len(base64_data)}バイト")
            
        except Exception as e:
            raise ValueError(f'Base64データの処理に失敗しました: {str(e)}')
        
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
                    'temperature': 0.7
                }
            }
        )
        
        print(f"=== APIレスポンス ===")
        print(f"ステータスコード: {response.status_code}")
        print(f"レスポンスヘッダー: {dict(response.headers)}")
        
        if response.status_code != 200:
            print(f"=== レスポンス詳細 ===")
            print(f"ステータスコード: {response.status_code}")
            print(f"レスポンスヘッダー: {dict(response.headers)}")
            print(f"レスポンスボディ: {response.text}")
            
            try:
                error_data = response.json()
                print(f"=== レスポンスJSON ===")
                print(json.dumps(error_data, indent=2))
                
                error_details = {
                    'code': error_data.get('error', {}).get('code'),
                    'status': error_data.get('error', {}).get('status'),
                    'message': error_data.get('error', {}).get('message'),
                    'details': error_data.get('error', {}).get('details')
                }
                
                error_message = f"Vision APIエラー: {error_details['message']}\n" \
                             f"ステータス: {error_details['status']}\n" \
                             f"コード: {error_details['code']}"
                
                return {'error': error_message}, response.status_code
                
            except Exception as e:
                error_message = f"Vision APIエラー: レスポンスの解析に失敗しました\n" \
                             f"ステータスコード: {response.status_code}\n" \
                             f"レスポンス: {response.text[:1000]}..."
                return {'error': error_message}, response.status_code
        
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
