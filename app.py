import streamlit as st
from PIL import Image
import io
import google.generativeai as genai
import os
from dotenv import load_dotenv
import base64

def add_custom_css():
    with open('MPLUS1p-ExtraBold.ttf', 'rb') as f:
        font_base64 = base64.b64encode(f.read()).decode()
    
    custom_css = f"""
    <style>
    @font-face {{
        font-family: 'MPLUS1p';
        src: url('data:font/ttf;base64,{font_base64}') format('truetype');
        font-weight: normal;
        font-style: normal;
    }}
    body {{
        background-color: white !important;
        font-family: 'MPLUS1p', sans-serif !important;
        margin: 0;
        padding: 0;
    }}
    .stApp {{
        background-color: white !important;
        padding: 0 !important;
        margin: 0 !important;
    }}
    .stMarkdown {{
        font-family: 'MPLUS1p', sans-serif !important;
        text-align: center !important;
        padding: 20px !important;
        margin: 0 !important;
    }}
    .stButton {{
        font-family: 'MPLUS1p', sans-serif !important;
        font-size: 18px !important;
        padding: 10px 20px !important;
        margin: 10px !important;
    }}
    .stCameraInput {{
        width: 100% !important;
        height: calc(100vh - 200px) !important;
        margin: 20px auto !important;
        display: block !important;
        max-width: 800px !important;
    }}
    .stImage {{
        width: 100% !important;
        max-width: 800px !important;
        margin: 20px auto !important;
        display: block !important;
    }}
    .stSuccess {{
        font-size: 20px !important;
        margin: 15px 0 !important;
    }}
    .stCode {{
        font-size: 16px !important;
        padding: 15px !important;
        margin: 15px 0 !important;
    }}
    @media screen and (max-width: 768px) {{
        .stCameraInput {{
            height: calc(100vh - 150px) !important;
        }}
        .stMarkdown h1 {{
            font-size: 2.5em !important;
        }}
        .stMarkdown p {{
            font-size: 1.2em !important;
        }}
    }}
    </style>
    """
    st.markdown(custom_css, unsafe_allow_html=True)

st.set_page_config(page_title="カロリーカメラ", layout="centered")
add_custom_css()

st.markdown("""
    <h1 style='text-align: center; font-family: "MPLUS1p"; color: black;'>カロリーカメラ</h1>
    <p style='text-align: center; font-family: "MPLUS1p";'>食卓を撮影してください。AIが献立とカロリーを推定します。</p>
    """, unsafe_allow_html=True)

load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

image = None
camera_image = st.camera_input("カメラで撮影")
if camera_image:
    image = Image.open(camera_image)

if image:
    st.image(image, caption="撮影/アップロード画像", use_column_width=True)
    if not api_key:
        st.warning("Google Gemini APIキーを入力してください。")
    elif st.button("AIで分析する"):
        st.info("Gemini Vision APIで画像を分析中...")
        
        if st.button("もう一度撮影", key="retry_button"):
            st.rerun()
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash-vision")
            # 画像をバイト列に変換
            img_bytes = io.BytesIO()
            image.save(img_bytes, format="PNG")
            img_bytes = img_bytes.getvalue()
            prompt = "この写真に写っている食材・料理名・調理法・分量を推定し、それぞれの献立名と推定カロリー、献立全体の合算カロリーをJSON形式で出力してください。" 
            response = model.generate_content([
                prompt,
                genai.types.content.ImageData(data=img_bytes, mime_type="image/png")
            ])
            result_text = response.text
            # JSONをパースして合計カロリーを先に表示
            import json
            try:
                result_dict = json.loads(result_text)
                total_calories = sum(item.get('calories', 0) for item in result_dict.get('items', []))
                st.success(f"合計カロリー: {total_calories}kcal")
                
                # 個別の献立情報を表示
                st.markdown("---")
                st.success("個別の献立情報:")
                for item in result_dict.get('items', []):
                    st.write(f"- {item.get('name', '')}: {item.get('calories', 0)}kcal")
            except json.JSONDecodeError:
                st.warning("結果の解析に失敗しました。")
                st.code(result_text, language="json")
        except Exception as e:
            st.error(f"画像解析エラー: {e}")
            result_text = None
        # 説明文生成
        if result_text:
            st.info("Gemini Generate APIで説明文生成中...")
            try:
                model2 = genai.GenerativeModel("gemini-1.5-flash")
                prompt2 = f"次のJSONの献立内容・カロリーについて、わかりやすく日本語で説明してください。\n{result_text}"
                response2 = model2.generate_content(prompt2)
                st.success("説明文:")
                st.write(response2.text)
            except Exception as e:
                st.error(f"説明文生成エラー: {e}")
