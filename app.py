import streamlit as st
from PIL import Image
import io
import google.generativeai as genai
import os
from dotenv import load_dotenv

st.set_page_config(page_title="カロリーカメラ", layout="centered")
st.title("カロリーカメラ")

st.write("食卓を撮影または画像をアップロードしてください。AIが献立とカロリーを推定します。")

# カメラまたは画像アップロード
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")
tab1, tab2 = st.tabs(["カメラで撮影", "画像をアップロード"])

image = None
with tab1:
    camera_image = st.camera_input("カメラで撮影")
    if camera_image:
        image = Image.open(camera_image)

with tab2:
    uploaded_file = st.file_uploader("画像を選択", type=["jpg", "jpeg", "png"])
    if uploaded_file:
        image = Image.open(uploaded_file)

if image:
    st.image(image, caption="撮影/アップロード画像", use_column_width=True)
    if not api_key:
        st.warning("Google Gemini APIキーを入力してください。")
    elif st.button("AIで分析する"):
        st.info("Gemini Vision APIで画像を分析中...")
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-flash-vision")
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
            st.success("献立名・カロリー推定結果:")
            st.code(result_text, language="json")
        except Exception as e:
            st.error(f"画像解析エラー: {e}")
            result_text = None
        # 説明文生成
        if result_text:
            st.info("Gemini Generate APIで説明文生成中...")
            try:
                model2 = genai.GenerativeModel("gemini-flash")
                prompt2 = f"次のJSONの献立内容・カロリーについて、わかりやすく日本語で説明してください。\n{result_text}"
                response2 = model2.generate_content(prompt2)
                st.success("説明文:")
                st.write(response2.text)
            except Exception as e:
                st.error(f"説明文生成エラー: {e}")
