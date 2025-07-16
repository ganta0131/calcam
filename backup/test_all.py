# -*- coding: utf-8 -*-
import sys
import io
from google.oauth2 import service_account
from googleapiclient.discovery import build
import os
import sys
import io
from datetime import datetime
from dateutil.parser import parse as date_parse
from dateutil import tz
from dotenv import load_dotenv
import json

# 環境変数の読み込み
load_dotenv()



import requests

def get_weather():
    try:
        # OpenWeatherMap APIのエンドポイントとパラメータ
        url = "https://api.openweathermap.org/data/2.5/forecast"
        params = {
            'q': '江南市',  # 愛知県江南市
            'appid': os.getenv('OPENWEATHERMAP_API_KEY'),  # 環境変数からAPIキーを取得
            'lang': 'ja',  # 日本語
            'units': 'metric'  # 摂氏度で取得
        }
        
        # APIリクエストを実行
        response = requests.get(url, params=params)
        print(f"\n=== APIリクエスト詳細 ===")
        print(f"URL: {response.url}")
        print(f"ステータスコード: {response.status_code}")
        print(f"レスポンスヘッダー: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            
            # デバッグ用の情報表示
            print("\n=== APIレスポンスデータ ===")
            print(f"APIキー: {os.getenv('OPENWEATHERMAP_API_KEY')}")
            print(f"レスポンスデータ: {data}")
            
            # 日本時間（JST）で現在の時刻を取得
            jst = tz.gettz('Asia/Tokyo')
            now = datetime.now(jst)
            
            # 今日の天気情報を取得
            today_weather = []
            max_temp = float('-inf')  # 最高気温を追跡
            for forecast in data['list']:
                # UTCタイムスタンプを日本時間に変換
                forecast_time = datetime.fromtimestamp(forecast['dt'], tz=jst)
                if forecast_time.date() == now.date():
                    today_weather.append(forecast)
                    # 最高気温を更新
                    max_temp = max(max_temp, forecast['main']['temp_max'])
            
            if today_weather:
                print(f"\n今日の天気データ: {len(today_weather)}件")
                print(f"最初のデータ: {today_weather[0]}")
                
                # 朝の天気（9時頃）を取得
                morning_weather = None
                for weather in today_weather:
                    forecast_time = datetime.fromtimestamp(weather['dt'], tz=jst)
                    if 8 <= forecast_time.hour <= 10:
                        morning_weather = weather
                        break
                
                # 最初のデータを使用
                if today_weather:
                    print(f"\n最初の天気データを使用")
                    first_weather = today_weather[0]
                    
                    # 天気情報の生成
                    weather_text = []
                    
                    # 最高気温
                    weather_text.append(f"今日の最高気温は{int(max_temp)}度です。")
                    
                    # 現在の天気
                    current_weather = first_weather['weather'][0]['description']
                    weather_text.append(f"今日は{current_weather}です。")
                    
                    # 降水予報
                    rain_forecast = []
                    for weather in today_weather:
                        if 'rain' in weather and '3h' in weather['rain'] and weather['rain']['3h'] > 0:
                            rain_time = datetime.fromtimestamp(weather['dt'], tz=jst)
                            rain_forecast.append((rain_time, weather['rain']['3h']))
                            
                    if rain_forecast:
                        # 最初の降水予報
                        first_rain = rain_forecast[0]
                        rain_time = first_rain[0]
                        rain_amount = first_rain[1]
                        weather_text.append(f"{rain_time.hour}時頃から雨が降り始めます。")
                        
                    return " ".join(weather_text)
        else:
            print(f"\nAPIエラー: ステータスコード {response.status_code}")
            print(f"エラーレスポンス: {response.text}")
            return f"天気情報の取得に失敗しました（エラーコード: {response.status_code}）"
        
        return "天気情報の取得に失敗しました。"
        
    except Exception as e:
        print(f"天気情報取得エラー: {str(e)}")
        return f"天気情報の取得に失敗しました（エラー: {str(e)}）"

def get_kyushoku():
    try:
        # サービスアカウント情報を環境変数から取得
        service_account_info = os.getenv('GOOGLE_SERVICE_ACCOUNT_INFO')
        if not service_account_info:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_INFO environment variable not set")
            
        # JSON文字列を辞書に変換
        credentials_dict = json.loads(service_account_info)
        
        # クレデンシャルを作成
        credentials = service_account.Credentials.from_service_account_info(credentials_dict)
        service = build('sheets', 'v4', credentials=credentials)
        SPREADSHEET_ID = '1VgVASBlOmjK_VLbsbgAGn0wu6Oi5CRiUJXfVZ8zhOpY'
        
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range='A:B'
        ).execute()
        
        values = result.get('values', [])
        
        if not values:
            return ""
            
        # 日本時間（JST）で現在の日付を取得
        jst = tz.gettz('Asia/Tokyo')
        today = datetime.now(jst).strftime('%Y/%m/%d')
        found = False
        for row in values:
            if len(row) >= 2:
                try:
                    # 日本時間としてパース
                    sheet_date = date_parse(row[0], tzinfos={'JST': 9 * 3600}).strftime('%Y/%m/%d')
                    if sheet_date == today:
                        return row[1]
                except ValueError:
                    continue
        return ""
    except Exception as e:
        print(f"給食データ取得エラー: {str(e)}")
        return ""

def get_geko():
    try:
        # サービスアカウント情報を環境変数から取得
        service_account_info = os.getenv('GOOGLE_SERVICE_ACCOUNT_INFO')
        if not service_account_info:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_INFO environment variable not set")
            
        # JSON文字列を辞書に変換
        credentials_dict = json.loads(service_account_info)
        
        # クレデンシャルを作成
        credentials = service_account.Credentials.from_service_account_info(credentials_dict)
        service = build('sheets', 'v4', credentials=credentials)
        SPREADSHEET_ID = '18LOXzRjakazyQ5SB_yLHfZhZOBTIqp2E_am9gNrIJOQ'
        
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range='A:B'
        ).execute()
        
        values = result.get('values', [])
        
        if not values:
            return ""
            
        # 日本時間（JST）で現在の日付を取得
        jst = tz.gettz('Asia/Tokyo')
        today = datetime.now(jst).strftime('%Y/%m/%d')
        found = False
        for row in values:
            if len(row) >= 2:
                try:
                    # 日本時間としてパース
                    sheet_date = date_parse(row[0], tzinfos={'JST': 9 * 3600}).strftime('%Y/%m/%d')
                    if sheet_date == today:
                        return row[1]
                except ValueError:
                    continue
        return ""
    except Exception as e:
        print(f"下校時間データ取得エラー: {str(e)}")
        return ""

def get_remind():
    try:
        # サービスアカウント情報を環境変数から取得
        service_account_info = os.getenv('GOOGLE_SERVICE_ACCOUNT_INFO')
        if not service_account_info:
            raise ValueError("GOOGLE_SERVICE_ACCOUNT_INFO environment variable not set")
            
        # JSON文字列を辞書に変換
        credentials_dict = json.loads(service_account_info)
        
        # クレデンシャルを作成
        credentials = service_account.Credentials.from_service_account_info(credentials_dict)
        service = build('sheets', 'v4', credentials=credentials)
        SPREADSHEET_ID = '1QOjCLGUat3G6n3LlaY8iKr9Eu93AEkimNuPUqwFPJoI'
        
        result = service.spreadsheets().values().get(
            spreadsheetId=SPREADSHEET_ID,
            range='A2'
        ).execute()
        
        values = result.get('values', [])
        if not values:
            return ""
            
        return values[0][0] if values[0] else ""
    except Exception as e:
        print(f"リマインドデータ取得エラー: {str(e)}")
        return ""

import google.generativeai as genai

def generate_text():
    # Google Generative AI APIの設定
    genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
    
    # モデルの選択
    model = genai.GenerativeModel('gemini-1.5-flash')
    print(f"\n=== 使用モデル: gemini-1.5-flash ===")
    
    # 情報の取得
    weather = get_weather()
    kyushoku = get_kyushoku()
    geko = get_geko()
    remind = get_remind()
    
    # プロンプトの作成
    prompt = f"""あなたは小学三年生の「たける」くんの友達です。朝にアプリを起動すると、たけるくんに元気に話しかけて、今日の情報を伝えます。

以下の情報を使って、全体で3～5文の明るくてフレンドリーなメッセージを作成してください。

【天気】：{weather}
【給食】：{kyushoku}
【下校時間】：{geko}
【リマインド】：{remind}

注意点：
1. リマインド情報は完全にそのまま使用してください。特に「だぴょん」などの表現は省かないでください。
2. たけるくんの年齢や性格に合わせた、親しみやすい表現を使用してください。
3. メッセージは明るく、励ましの要素を含めてください。

生成するメッセージは以下の制約を厳密に守ってください：
- リマインド情報（{remind}）は、その前に必ず「それと、ママからの伝言。」と話してください。
- リマインド情報（{remind}）は完全にそのまま使用してください。特に「だぴょん」などの表現は省かないでください。
- 天気・給食・下校時刻・リマインドを自然な流れで話に入れてください
- 天気の話をする際は、最高気温も必ず含めてください。
- 給食の献立は、省略せず全文を話してください。その後、メニューについての一言コメントも加えてください。
- **天気に「雨」が含まれているときは、絶対に『傘忘れんなよ！』などの注意を1文入れてください**
- 友達っぽい口調で、語尾もややカジュアルに（「〜だよ」「〜してね」「〜だなー」など）
- 最後はたけるくんが元気になるような前向きな一言で締めてください
- 出力は日本語のみでお願いします
- 絵文字は絶対に使わないでください

【出力例】：
おはよう、たける！今日もばっちり起きれた？  
昨日どうだった？楽しかった？  
今日の最高気温は36度、蒸し暑くなりそうだね。くもり時々雨っぽいから、傘忘れんなよ！  
給食はクリームシチューとコッペパンだってさ。パンをシチューにつけるとおいしく食べられそうだ。あと、図工の作品も持ってくの忘れんな！  
下校は午後2時半だよー。今日も思いっきり楽しんでいこうぜ！"""
    
    # AIによるメッセージ生成
    try:
        print("プロンプトを送信中...")
        response = model.generate_content(prompt)
        print("レスポンスを受け取りました")
        print("レスポンスの詳細:", response)
        
        # テキストの取得と文字コードの処理
        message = response.text
        if isinstance(message, bytes):
            message = message.decode('utf-8')
        
        print("生成されたメッセージ:", message)
        return message
    except Exception as e:
        print(f"AI生成エラー: {str(e)}")
        print("エラーの詳細:", e)
        # エラー時の代替メッセージ
        return "おはよう、たける！今日も元気だね。昨日は楽しかった？\n\n天気や給食の情報は、もう一度試してね。今日も頑張ろう！"
    motivation = "今日も元気でいきましょうね！"
    
    # 全てのテキストを結合
    total_text = "\n".join([
        greeting,
        yesterday_question,
        weather_text,
        kyushoku_text,
        geko_text,
        remind_text,
        motivation
    ])
    
    return total_text

def main():
    print("\n全体テスト開始")
    print("=======================================")
    
    # 読み上げ用テキストの生成
    text = generate_text()
    print("\n生成された読み上げテキスト:")
    print("=======================================")
    print(text)

if __name__ == '__main__':
    main()
