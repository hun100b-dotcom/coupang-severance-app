# -*- coding: utf-8 -*-
"""
퇴직금 한번에 - 일용직 퇴직금·평균임금 계산기
- 토스 감성 UI: 인트로 → 자격 판별 → 계산 단계 플로우
- 쿠팡·컬리·CJ·한진 등 물류·배송 일용직을 위한 Streamlit 웹 앱
"""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
import re
import time
import json
from pathlib import Path

# 클릭 카운터 파일 (실시간 누적)
COUNTER_DIR = Path(__file__).resolve().parent / "data"
COUNTER_PATH = COUNTER_DIR / "click_count.json"

def get_click_count():
    """전체 확인 클릭 수 (퇴직금+실업급여 합계)."""
    try:
        if COUNTER_PATH.exists():
            with open(COUNTER_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                return int(data.get("total", 0))
    except (json.JSONDecodeError, IOError):
        pass
    return 0

def increment_click_count(service: str):
    """퇴직금/실업급여 확인 버튼 클릭 시 +1 저장."""
    try:
        COUNTER_DIR.mkdir(parents=True, exist_ok=True)
        data = {"total": 0, "severance": 0, "unemployment": 0}
        if COUNTER_PATH.exists():
            try:
                with open(COUNTER_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except (json.JSONDecodeError, IOError):
                pass
        data["total"] = data.get("total", 0) + 1
        if service == "severance":
            data["severance"] = data.get("severance", 0) + 1
        else:
            data["unemployment"] = data.get("unemployment", 0) + 1
        with open(COUNTER_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False)
    except IOError:
        pass

try:
    import plotly.express as px
    HAS_PLOTLY = True
except ImportError:
    HAS_PLOTLY = False

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

try:
    from streamlit_autorefresh import st_autorefresh
    HAS_AUTOREFRESH = True
except ImportError:
    HAS_AUTOREFRESH = False

# =============================================================================
# 페이지 설정
# =============================================================================
st.set_page_config(
    page_title="퇴직금 한번에",
    page_icon="💵",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# =============================================================================
# 토스 감성 디자인 시스템 (글래스모피즘 + 메쉬 그라데이션)
# =============================================================================
st.markdown("""
<style>
    @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
    
    :root {
        --toss-blue: #3182f6;
        --toss-blue-hover: #2b73db;
        --toss-green: #00c48c;
        --toss-text: #2c2926;
        --toss-text-secondary: #5c5752;
        --toss-text-tertiary: #7a756e;
        --toss-card-radius: 20px;
    }
    
    * { font-family: 'Pretendard', 'Apple SD Gothic Neo', -apple-system, BlinkMacSystemFont, sans-serif; }
    
    /* 메쉬 그라데이션 배경 — 상위까지 적용해 흰색 덮기 */
    section[data-testid="stAppViewContainer"], section[data-testid="stAppViewContainer"] > div,
    .main, .main .block-container {
        background: linear-gradient(135deg, #e0eafc 0%, #cfdef3 50%, #ffffff 100%) !important;
        background-size: 200% 200% !important;
        animation: gradientFlow 15s ease infinite;
    }
    .main .block-container {
        max-width: 640px;
        padding: 2rem 1.5rem 3rem;
        margin-left: auto;
        margin-right: auto;
        min-height: 100vh;
    }
    @keyframes gradientFlow {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
    }
    
    /* 유리 카드 (글래스모피즘) — blur 15px, shadow 0.07 */
    .content-card, .app-header, .result-card, .chart-card, .intro-card {
        background: rgba(255, 255, 255, 0.65) !important;
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.4);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
    }
    .content-card {
        border-radius: var(--toss-card-radius);
        padding: 2rem;
        margin: 1.5rem 0;
    }
    .app-header {
        border-radius: var(--toss-card-radius);
        padding: 1.75rem 2rem;
        margin-bottom: 1.5rem;
    }
    .app-header .main-title { font-size: 1.75rem; font-weight: 800; color: var(--toss-text); letter-spacing: -0.02em; margin: 0 0 0.25rem 0; }
    .app-header .sub-title { font-size: 1rem; color: var(--toss-text-secondary); margin: 0; line-height: 1.5; }
    .sub-title-rotating { animation: slideUpFade 0.5s ease; }
    @keyframes slideUpFade {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    /* 스텝 인디케이터 */
    .step-indicator {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
        color: var(--toss-text-tertiary);
    }
    .step-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #d4d0ca;
    }
    .step-dot.active {
        background: var(--toss-blue);
        width: 24px;
        border-radius: 4px;
    }
    .step-dot.done {
        background: var(--toss-blue);
    }
    
    /* 질문 타이틀 */
    .question-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: var(--toss-text);
        margin-bottom: 0.5rem;
        line-height: 1.4;
    }
    .question-desc {
        font-size: 0.95rem;
        color: var(--toss-text-secondary);
        margin-bottom: 1.5rem;
        line-height: 1.5;
    }
    
    /* 선택 카드 버튼 (회사 / 예·아니오) */
    .choice-card {
        display: block;
        width: 100%;
        padding: 1rem 1.25rem;
        margin-bottom: 0.75rem;
        background: #fff;
        border: 2px solid var(--toss-border);
        border-radius: 14px;
        font-size: 1rem;
        font-weight: 600;
        color: var(--toss-text);
        text-align: left;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .choice-card:hover {
        border-color: var(--toss-blue);
        background: rgba(49, 130, 246, 0.04);
    }
    .choice-card.selected {
        border-color: var(--toss-blue);
        background: rgba(49, 130, 246, 0.08);
    }
    
    /* 토스 블루 버튼 (전체 너비) */
    .toss-primary-btn {
        display: inline-block;
        width: 100%;
        padding: 1rem 1.5rem;
        background: var(--toss-blue);
        color: #fff !important;
        border: none;
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        text-align: center;
        cursor: pointer;
        transition: background 0.2s;
    }
    .toss-primary-btn:hover { background: #2b73db; color: #fff !important; }
    .toss-secondary-btn {
        display: inline-block;
        width: 100%;
        padding: 1rem 1.5rem;
        background: #fff;
        color: var(--toss-blue) !important;
        border: 2px solid var(--toss-blue);
        border-radius: 12px;
        font-size: 1rem;
        font-weight: 600;
        text-align: center;
        cursor: pointer;
        margin-top: 0.75rem;
        transition: all 0.2s;
    }
    .toss-secondary-btn:hover {
        background: rgba(49, 130, 246, 0.06);
        color: var(--toss-blue) !important;
    }
    
    /* Success / Fail 메시지 */
    .result-hero {
        text-align: center;
        padding: 2rem 0 1.5rem;
    }
    .result-hero .emoji {
        font-size: 3rem;
        margin-bottom: 1rem;
    }
    .result-hero .title {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--toss-text);
        margin-bottom: 0.5rem;
    }
    .result-hero.success .title { color: var(--toss-green); }
    .result-hero.success { background: linear-gradient(180deg, #f0faf6 0%, transparent 100%); border-radius: 16px; margin: 0 -0.5rem; padding: 2rem 0.5rem 1.5rem; }
    .result-hero .sub {
        font-size: 1rem;
        color: var(--toss-text-secondary);
        line-height: 1.5;
    }
    
    /* 결과 카드 (정밀 계산용) */
    .result-card {
        border-radius: 16px;
        padding: 1.5rem;
        margin: 1rem 0;
        position: relative;
        overflow: hidden;
    }
    .result-card::before {
        content: '';
        position: absolute;
        left: 0; top: 0; bottom: 0;
        width: 4px;
        background: var(--toss-border);
        border-radius: 4px 0 0 4px;
    }
    .result-card.card-avg::before { background: var(--toss-text-secondary); }
    .result-card.card-severance::before { background: var(--toss-text); }
    .result-card.eligible::before { background: var(--toss-green); }
    .result-card.not-eligible::before { background: var(--toss-text-tertiary); }
    .result-card h3 { font-size: 0.85rem; color: var(--toss-text-tertiary); margin-bottom: 0.5rem; font-weight: 500; }
    .result-card .value { font-size: 1.75rem; font-weight: 700; color: var(--toss-text); font-variant-numeric: tabular-nums; }
    .result-card small { font-size: 0.8rem; color: var(--toss-text-tertiary); }
    .result-card.eligible .value { color: var(--toss-green); }
    .result-card.not-eligible .value { color: #6b7684; }
    .pill-eligible {
        display: inline-block;
        background: var(--toss-green);
        color: #fff;
        padding: 0.35rem 0.9rem;
        border-radius: 9999px;
        font-size: 0.95rem;
        font-weight: 600;
    }
    .pill-not-eligible {
        display: inline-block;
        background: #f2f4f6;
        color: #6b7684;
        padding: 0.35rem 0.9rem;
        border-radius: 9999px;
        font-size: 0.95rem;
        font-weight: 600;
    }
    
    /* 차트 카드 */
    .chart-card { border-radius: 16px; padding: 1.5rem; margin: 1rem 0 2rem 0; }
    .chart-card .chart-title { font-size: 1.1rem; font-weight: 600; color: var(--toss-text); margin-bottom: 0.5rem; }
    .chart-card .chart-sub { font-size: 0.85rem; color: var(--toss-text-tertiary); margin-bottom: 1rem; }
    
    .section-header { font-size: 1.1rem; font-weight: 600; color: var(--toss-text); margin: 1.5rem 0 0.75rem 0; }
    
    .app-footer { margin: 3rem -1.5rem -3rem -1.5rem; padding: 1.5rem 2rem; text-align: center; background: transparent; }
    .app-footer p { font-size: 0.875rem; color: var(--toss-text-tertiary); margin: 0; }
    
    /* 현재까지 선택한 단계 (진행 요약) — 실제 선택값 표시 */
    .progress-summary {
        padding: 0.85rem 1.1rem; margin-bottom: 1rem; border-radius: 12px;
        background: rgba(49, 130, 246, 0.06); border-left: 4px solid var(--toss-blue);
        font-size: 0.88rem; color: var(--toss-text-secondary); line-height: 1.55;
    }
    .progress-summary .current { font-weight: 700; color: var(--toss-blue); }
    .progress-summary .done { color: var(--toss-text-tertiary); }
    /* 전체 화면 전환 애니메이션 — 단계 전환 시 부드럽게 슬라이드·페이드 */
    .page-transition-wrap {
        animation: pageSlideIn 0.38s ease-out;
    }
    .content-card.step-transition {
        animation: pageSlideIn 0.38s ease-out;
    }
    .step-indicator.step-transition { animation: pageSlideIn 0.38s ease-out; }
    @keyframes pageSlideIn {
        from { opacity: 0; transform: translateX(18px); }
        to { opacity: 1; transform: translateX(0); }
    }
    
    /* 버튼: 즉시 반응(착착), 최소 transition */
    .stButton > button {
        width: 100%; border-radius: 12px; min-height: 48px; font-weight: 600; outline: none !important;
        background-color: #3182f6 !important; color: #fff !important; border: none !important;
        transition: background-color 0.06s ease, box-shadow 0.05s ease, transform 0.05s ease !important;
    }
    .stButton > button:hover { background-color: #2b73db !important; color: #fff !important; }
    .stButton > button:active { transform: scale(0.98); box-shadow: 0 0 0 2px rgba(43, 115, 219, 0.35) !important; }
    .stButton > button:focus { box-shadow: 0 0 0 2px rgba(43, 115, 219, 0.4) !important; }
    .stButton > button[kind="secondary"],
    .stButton > button[data-testid="baseButton-secondary"] {
        background: transparent !important; color: #3182f6 !important; border: 1px solid #3182f6 !important;
    }
    .stButton > button[kind="secondary"]:hover,
    .stButton > button[data-testid="baseButton-secondary"]:hover {
        background: rgba(49, 130, 246, 0.08) !important; color: #3182f6 !important;
    }
    
    /* 로딩 스피너 */
    .loading-spinner { width: 48px; height: 48px; border: 4px solid rgba(49, 130, 246, 0.2); border-top-color: #3182f6; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
    @keyframes spin { to { transform: rotate(360deg); } }
    
    /* 인트로: 상단 카드 영역 배경 투명해 버블·그라데이션 보이게 */
    .content-card.intro-page { background: transparent !important; box-shadow: none !important; border: none !important; overflow: visible !important; }
    /* 인트로 배경: 그라데이션·버블을 인트로 블록 안에 넣어 항상 노출 */
    .intro-bg-layer {
        position: relative; min-height: 420px; margin: -1rem 0; overflow: visible;
        background: linear-gradient(135deg, #e0eafc 0%, #cfdef3 45%, #e8e4f4 80%, #ffffff 100%) !important;
        background-size: 200% 200% !important;
        animation: gradientFlow 15s ease infinite;
        border-radius: 24px;
    }
    .intro-bubbles { position: absolute; left: -15%; top: -25%; right: -15%; bottom: -25%; width: 130%; min-height: 500px; pointer-events: none; z-index: 0; overflow: visible; }
    .intro-bubble { position: absolute; border-radius: 50%; filter: blur(55px); opacity: 0.75; animation: floatBubble 15s ease-in-out infinite; will-change: transform; }
    @keyframes floatBubble {
        0%, 100% { transform: translate(0, 0) scale(1); }
        25% { transform: translate(35px, -30px) scale(1.08); }
        50% { transform: translate(-30px, 25px) scale(0.95); }
        75% { transform: translate(25px, 30px) scale(1.05); }
    }
    .intro-card-glass {
        position: relative; z-index: 1; border-radius: 20px; padding: 2.5rem 2rem; margin-top: 1rem;
        background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    #intro-phrase { min-height: 2.8rem; display: flex; align-items: center; justify-content: center; }
    .intro-copy-rotating { animation: slideUpFadeCopy 0.6s ease; }
    @keyframes slideUpFadeCopy {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .intro-count { font-size: 1.1rem; font-weight: 700; color: #3182f6; margin-bottom: 1.25rem; }
    .app-footer-intro { margin-top: 2rem; padding-top: 1.5rem; text-align: center; font-size: 0.8rem; color: #9ca3af; }
    
    div[data-testid="stVerticalBlock"] > div { margin-bottom: 0.5rem; }
    .dataframe { font-size: 0.9rem; }
</style>
""", unsafe_allow_html=True)

# =============================================================================
# Session state 초기화
# =============================================================================
def init_session_state():
    defaults = {
        "intro_done": False,
        "service": None,
        "step": 1,
        "company": None,
        "company_other": "",
        "eligibility_q1": None,
        "eligibility_q2": None,
        "failed": False,
        "calculation_mode": None,
        "precise_calculated": False,
        "precise_loading_done": False,
        "precise_saved_end_date": None,
        "precise_result": None,
        # 실업급여
        "ub_step": 1,
        "ub_company": None,
        "ub_company_other": "",
        "ub_eligibility_q1": None,
        "ub_eligibility_q2": None,
        "ub_eligibility_q3": None,
        "ub_failed": False,
        "ub_calculation_mode": None,
        "ub_precise_calculated": False,
        "ub_precise_loading_done": False,
        "ub_precise_result": None,
    }
    for k, v in defaults.items():
        if k not in st.session_state:
            st.session_state[k] = v

def reset_to_start():
    st.session_state.intro_done = False
    st.session_state.service = None
    st.session_state.step = 1
    st.session_state.company = None
    st.session_state.company_other = ""
    st.session_state.eligibility_q1 = None
    st.session_state.eligibility_q2 = None
    st.session_state.failed = False
    st.session_state.calculation_mode = None
    st.session_state.precise_calculated = False
    st.session_state.precise_loading_done = False
    st.session_state.precise_saved_end_date = None
    st.session_state.precise_result = None
    st.session_state.ub_step = 1
    st.session_state.ub_company = None
    st.session_state.ub_company_other = ""
    st.session_state.ub_eligibility_q1 = None
    st.session_state.ub_eligibility_q2 = None
    st.session_state.ub_eligibility_q3 = None
    st.session_state.ub_failed = False
    st.session_state.ub_calculation_mode = None
    st.session_state.ub_precise_calculated = False
    st.session_state.ub_precise_loading_done = False
    st.session_state.ub_precise_result = None
    st.rerun()

# =============================================================================
# 앱 헤더 (홈 버튼 + 서비스별 타이틀)
# =============================================================================
def render_app_header(service=None):
    title = "퇴직금 한번에"
    sub = "자격을 확인한 뒤, 퇴직금을 계산해 보세요."
    if service == "unemployment":
        title = "실업급여 확인"
        sub = "수급 자격을 확인한 뒤, 예상 구직급여를 알아보세요."
    col_h, col_t = st.columns([1, 5])
    with col_h:
        if st.button("⌂ 홈", key="header_home", type="secondary", use_container_width=True):
            reset_to_start()
    with col_t:
        st.markdown(
            f"""
            <div class="app-header" style="margin-bottom:0;">
                <h1 class="main-title">{title}</h1>
                <p class="sub-title sub-title-rotating">{sub}</p>
            </div>
            """,
            unsafe_allow_html=True,
        )

# =============================================================================
# 인트로 화면 (퇴직금 / 실업급여 선택)
# =============================================================================
INTRO_PHRASES = [
    "복잡한 퇴직금 계산, 이제 한 번에 해결하세요.",
    "쿠팡, 컬리, CJ 근무자라면 누구나 확인 가능합니다.",
    "서류 뭉치 대신 클릭 몇 번으로 자격 확인까지.",
]

def render_intro():
    count = get_click_count()
    phrase_index = int(time.time()) // 7 % len(INTRO_PHRASES)
    phrase = INTRO_PHRASES[phrase_index]
    st.markdown(
        f"""
        <div class="intro-bg-layer">
            <div class="intro-bubbles">
                <div class="intro-bubble" style="width: 320px; height: 320px; background: #d1e4ff; left: 0%; top: 5%; animation-delay: 0s;"></div>
                <div class="intro-bubble" style="width: 260px; height: 260px; background: #e8dbff; right: 0%; top: 25%; animation-delay: 2s;"></div>
                <div class="intro-bubble" style="width: 280px; height: 280px; background: #d1e4ff; left: 5%; bottom: 10%; animation-delay: 4s;"></div>
                <div class="intro-bubble" style="width: 220px; height: 220px; background: #e8dbff; right: 10%; bottom: 20%; animation-delay: 1s;"></div>
            </div>
            <div class="intro-card-glass">
                <div style="text-align: center; padding: 1rem 0 1rem;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">💵</div>
                    <p style="font-size: 1.5rem; font-weight: 800; color: var(--toss-text); margin-bottom: 0.5rem; line-height: 1.4;">
                        일용직도 퇴직금·실업급여 받을 수 있을까?
                    </p>
                    <p class="intro-copy-rotating" style="font-size: 1.05rem; color: var(--toss-text-secondary); line-height: 1.6; margin-bottom: 1rem;">
                        {phrase}
                    </p>
                    <p class="intro-count">지금까지 <strong style="color:#3182f6;">{count}</strong>명이 확인했어요</p>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
    st.markdown("<br>", unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        if st.button("퇴직금 확인하기", type="primary", key="intro_severance", use_container_width=True):
            increment_click_count("severance")
            st.session_state.intro_done = True
            st.session_state.service = "severance"
            st.rerun()
    with col2:
        if st.button("실업급여 확인하기", type="primary", key="intro_unemployment", use_container_width=True):
            increment_click_count("unemployment")
            st.session_state.intro_done = True
            st.session_state.service = "unemployment"
            st.rerun()
    st.markdown(
        '<div class="app-footer-intro">ⓒ 2026 LEAF-MASTER. All rights reserved.</div>',
        unsafe_allow_html=True,
    )

# =============================================================================
# 컬럼 매핑 및 데이터 처리 (정밀 계산용 — 기존 로직 유지)
# =============================================================================
COLUMN_MAPPING = {
    "근무일": "근무일",
    "지급액": "지급액(보수총액)",
    "사업장": "사업장",
}
ALTERNATIVE_COLUMNS = {
    "근무일": ["근무일", "날짜", "일자", "work_date", "date"],
    "지급액": ["지급액(보수총액)", "지급액", "급여", "보수총액", "금액", "pay", "salary"],
    "사업장": ["사업장", "사업장명", "workplace"],
}

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    new_cols = {}
    for standard_name, candidates in ALTERNATIVE_COLUMNS.items():
        for c in df.columns:
            c_clean = str(c).strip()
            if c_clean in candidates or c_clean == COLUMN_MAPPING.get(standard_name, standard_name):
                new_cols[c] = standard_name
                break
    if new_cols:
        df = df.rename(columns=new_cols)
    return df

def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if "근무일" in out.columns:
        out["근무일"] = pd.to_datetime(out["근무일"], errors="coerce")
        out = out.dropna(subset=["근무일"])
    if "지급액" in out.columns:
        out["지급액"] = pd.to_numeric(out["지급액"].astype(str).str.replace(",", ""), errors="coerce")
        out = out.dropna(subset=["지급액"])
    out = out.sort_values("근무일").reset_index(drop=True)
    return out

def filter_df_by_company(df: pd.DataFrame, company: str, company_other: str = "") -> pd.DataFrame:
    """Step 1에서 선택한 회사(사업장)만 남기고, 여러 회사 이력이 섞이지 않도록 필터.
    고용포털 PDF 내 사업장명 변형(주식회사, 괄호 등)에 대응하도록 키워드를 넓게 둠."""
    if df.empty or "사업장" not in df.columns:
        return df
    company = (company or "").strip()
    company_other = (company_other or "").strip()
    if company == "쿠팡":
        keywords = ["쿠팡", "(주)쿠팡", "주식회사쿠팡", "쿠팡물류", "쿠팡로짓", "쿠팡에이브이", "쿠팡씨엔에스", "(n)nn"]
    elif company == "마켓컬리":
        keywords = ["컬리", "마켓컬리", "(주)마켓컬리", "마켓컬리(주)", "주식회사마켓컬리", "주식회사컬리", "nnnn(n)"]
    elif company == "CJ대한통운":
        keywords = ["CJ", "대한통운", "CJ대한통운", "(주)CJ대한통운", "CJ대한통운(주)", "주식회사CJ대한통운", "CJnnnn"]
    elif company == "기타" and company_other:
        keywords = [company_other]
    else:
        return df
    # 공백·괄호 제거한 사업장명도 매칭에 활용 (포함 여부만 검사)
    pattern = "|".join(re.escape(k) for k in keywords)
    mask = df["사업장"].astype(str).str.strip()
    mask = mask.str.contains(pattern, case=False, na=False)
    return df.loc[mask].reset_index(drop=True)

# =============================================================================
# 근로복지공단 일용근로내역서 PDF 파싱
# =============================================================================
def _norm(s: str) -> str:
    """공백 제거 후 비교용."""
    return (s or "").replace(" ", "").replace("\u3000", "")

def parse_welcomwel_pdf(uploaded_file) -> pd.DataFrame:
    """근로복지공단 일용근로·노무제공내역서 PDF에서 테이블 추출 후 일별 DataFrame 반환."""
    if not HAS_PDFPLUMBER:
        return pd.DataFrame()
    rows_out = []
    with pdfplumber.open(uploaded_file) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables or []:
                if not table or len(table) < 2:
                    continue
                header = [str(c).strip() if c else "" for c in table[0]]
                idx_ym = idx_site = idx_dates = idx_days = idx_pay = -1
                for i, h in enumerate(header):
                    n = _norm(h)
                    if "근로년월" in n or ("근로" in n and "년월" in n) or "근로년" in n:
                        idx_ym = i
                    if "사업장" in h and ("명" in h or "명" in n):
                        idx_site = i
                    if "근로일자" in n or "근로일자" in h or ("일자" in h and "근로" in n):
                        idx_dates = i
                    if "근로일수" in n or "근로일수" in h or ("일수" in h and "근로" in n):
                        idx_days = i
                    if "임금총액" in n or "보수총액" in n or "임금총액" in h or "보수총액" in h:
                        idx_pay = i
                    if idx_pay < 0 and ("임금" in h or "보수" in h) and ("총액" in h or "금액" in h):
                        idx_pay = i
                # 5열 표에서 헤더 미인식 시(폰트 등) 표준 순서: 근로년월, 사업장명, 근로일자, 근로일수, 임금총액
                if len(header) >= 5 and idx_ym < 0 and idx_pay < 0:
                    idx_ym, idx_site, idx_dates, idx_days, idx_pay = 0, 1, 2, 3, 4
                if idx_ym < 0:
                    idx_ym = 1
                if idx_pay < 0:
                    idx_pay = 6 if len(header) > 6 else len(header) - 1
                if idx_dates < 0:
                    idx_dates = 4 if len(header) > 4 else 3
                if idx_days < 0:
                    idx_days = 5 if len(header) > 5 else 4
                if idx_site < 0:
                    idx_site = 2 if len(header) > 2 else 0
                for row in table[1:]:
                    if not row or len(row) <= max(idx_ym, idx_pay):
                        continue
                    ym_raw = str(row[idx_ym] or "").strip()
                    site = str(row[idx_site] or "").strip()
                    dates_raw = str(row[idx_dates] or "").strip()
                    days_raw = str(row[idx_days] or "").strip()
                    pay_raw = re.sub(r"[^\d.]", "", str(row[idx_pay] or "0").replace(",", ""))
                    if not ym_raw or not pay_raw:
                        continue
                    try:
                        pay = float(pay_raw)
                    except ValueError:
                        continue
                    try:
                        n_days = int(float(days_raw)) if days_raw else 0
                    except ValueError:
                        n_days = 0
                    if n_days <= 0:
                        n_days = 1
                    day_list = []
                    for part in re.split(r"[,,\s]+", dates_raw):
                        part = part.strip()
                        if part.isdigit():
                            day_list.append(int(part))
                    if not day_list and n_days > 0:
                        day_list = list(range(1, n_days + 1))
                    ym_match = re.match(r"(\d{4})[/\-.]?\s*(\d{1,2})\s*$", ym_raw) or re.match(r"^(\d{4})(\d{2})$", _norm(ym_raw))
                    if not ym_match:
                        continue
                    y, m = int(ym_match.group(1)), int(ym_match.group(2))
                    daily_pay = pay / n_days
                    for d in day_list:
                        if 1 <= d <= 31:
                            try:
                                dt = datetime(y, m, d)
                                rows_out.append({"근무일": dt, "지급액": daily_pay, "사업장": site or ""})
                            except ValueError:
                                pass
    if not rows_out:
        return pd.DataFrame()
    df = pd.DataFrame(rows_out)
    df = df.sort_values("근무일").drop_duplicates(subset=["근무일", "사업장"], keep="first").reset_index(drop=True)
    return df

def compute_average_wage(df: pd.DataFrame, end_date: datetime = None) -> dict:
    if df.empty or "근무일" not in df.columns or "지급액" not in df.columns:
        return {"average_wage": 0.0, "total_pay": 0.0, "total_days": 0, "start_date": None, "end_date": None, "period_df": pd.DataFrame()}
    if end_date is None:
        end_date = df["근무일"].max()
    if isinstance(end_date, pd.Timestamp):
        end_date = end_date.to_pydatetime()
    start_date = end_date - timedelta(days=90)
    mask = (df["근무일"] >= pd.Timestamp(start_date)) & (df["근무일"] <= pd.Timestamp(end_date))
    period_df = df.loc[mask]
    total_pay = period_df["지급액"].sum()
    total_days = len(period_df)
    average_wage = (total_pay / total_days) if total_days > 0 else 0.0
    return {
        "average_wage": average_wage,
        "total_pay": total_pay,
        "total_days": total_days,
        "start_date": period_df["근무일"].min() if not period_df.empty else None,
        "end_date": period_df["근무일"].max() if not period_df.empty else None,
        "period_df": period_df,
    }

def check_continuous_employment(df: pd.DataFrame) -> dict:
    if df.empty or "근무일" not in df.columns:
        return {"eligible": False, "weeks_15h_plus": 0, "message": "데이터 없음"}
    df = df.copy()
    df["week_start"] = df["근무일"] - pd.to_timedelta(df["근무일"].dt.dayofweek, unit="d")
    weekly_days = df.groupby("week_start").size()
    hours_per_day_estimate = 8
    weekly_hours = weekly_days * hours_per_day_estimate
    weeks_15h_plus = (weekly_hours >= 15).sum()
    eligible = weeks_15h_plus >= 52
    message = (
        f"4주 평균 15시간 이상인 주가 {weeks_15h_plus}주예요 (기준: 52주 이상). "
        + ("요건 충족했어요." if eligible else "조금 더 근속이 필요해요.")
    )
    return {"eligible": eligible, "weeks_15h_plus": int(weeks_15h_plus), "message": message}

def estimate_allowance(df: pd.DataFrame, standard_rate: float = None) -> pd.DataFrame:
    out = df.copy()
    if "지급액" not in out.columns:
        return out
    if standard_rate is None:
        standard_rate = out["지급액"].mean()
    out["표준단가"] = standard_rate
    out["추정_추가수당"] = out["지급액"] - out["표준단가"]
    return out

def compute_severance(df: pd.DataFrame, end_date: datetime = None) -> dict:
    if df.empty or "근무일" not in df.columns:
        return {"severance": 0.0, "work_days": 0, "average_wage": 0.0, "avg_result": None}
    if end_date is None:
        end_date = df["근무일"].max()
    start_date = df["근무일"].min()
    work_days = (pd.Timestamp(end_date) - pd.Timestamp(start_date)).days
    avg_result = compute_average_wage(df, end_date)
    avg_wage = avg_result["average_wage"]
    severance = (avg_wage * 30 * (work_days / 365)) if work_days > 0 else 0.0
    return {"severance": severance, "work_days": work_days, "average_wage": avg_wage, "avg_result": avg_result}

# 쉬운 계산: 직접 입력 기반 퇴직금
def compute_severance_simple(work_days: int, avg_daily_wage: float) -> float:
    if work_days <= 0 or avg_daily_wage <= 0:
        return 0.0
    return avg_daily_wage * 30 * (work_days / 365)

# =============================================================================
# 실업급여 수급 일수 (가입기간·연령)
# =============================================================================
def get_unemployment_days(insured_days: int, age_50_or_over: bool) -> int:
    """고용보험 가입일수와 50세 이상 여부로 수급 가능 일수 반환."""
    years = insured_days / 365.0 if insured_days else 0
    if years < 1:
        return 120
    if years < 3:
        return 180 if age_50_or_over else 150
    if years < 5:
        return 210 if age_50_or_over else 180
    if years < 10:
        return 240 if age_50_or_over else 210
    return 270 if age_50_or_over else 240

def compute_unemployment_estimate(avg_daily_wage: float, insured_days_in_18m: int, age_50_or_over: bool) -> dict:
    """실업급여: 180일 충족 여부, 일당 약 60%, 수급일수, 총 예상액."""
    eligible_180 = insured_days_in_18m >= 180
    daily_benefit = (avg_daily_wage * 0.6) if avg_daily_wage else 0.0
    days = get_unemployment_days(insured_days_in_18m, age_50_or_over) if eligible_180 else 0
    total_estimate = daily_benefit * days if days else 0.0
    return {
        "eligible_180": eligible_180,
        "insured_days_in_18m": insured_days_in_18m,
        "daily_benefit": daily_benefit,
        "days": days,
        "total_estimate": total_estimate,
        "avg_daily_wage": avg_daily_wage,
    }

# =============================================================================
# 스텝 인디케이터 UI / 현재까지 선택한 단계 (실제 선택값 표시)
# =============================================================================
def _company_label(service: str) -> str:
    if service == "unemployment":
        c = st.session_state.get("ub_company") or ""
        o = (st.session_state.get("ub_company_other") or "").strip()
        if c == "기타" and o:
            return o[:12] + ("…" if len(o) > 12 else "")
        return c or "선택 전"
    c = st.session_state.get("company") or ""
    o = (st.session_state.get("company_other") or "").strip()
    if c == "기타" and o:
        return o[:12] + ("…" if len(o) > 12 else "")
    return c or "선택 전"

def _calc_mode_label(service: str) -> str:
    if service == "unemployment":
        m = st.session_state.get("ub_calculation_mode")
    else:
        m = st.session_state.get("calculation_mode")
    if m == "precise":
        return "정밀"
    if m == "simple":
        return "쉬운"
    return "선택 전"

def render_progress_summary_full(service: str, phase: str):
    """모든 단계에서 표시. phase: step1|step2|step3|step4|precise|simple|fail. 실제 선택값 반영."""
    company = _company_label(service)
    calc_mode = _calc_mode_label(service)
    prefix = "실업급여 " if service == "unemployment" else ""
    cur = '<span class="current">'
    cur_end = "</span>"
    done = '<span class="done">'
    done_end = "</span>"
    if phase == "step1":
        s1 = f'{cur}① 회사 선택{cur_end}'
        s2, s3, s4 = "② 자격 확인", "③ 계산 방식 선택", "④ 계산"
    elif phase == "step2":
        s1 = f'{done}① 회사: {company} ✓{done_end}'
        s2 = f'{cur}② 자격 확인{cur_end}'
        s3, s4 = "③ 계산 방식 선택", "④ 계산"
    elif phase == "step3":
        s1 = f'{done}① 회사: {company} ✓{done_end}'
        s2 = "② 자격 확인 ✓"
        s3 = f'{cur}③ 계산 방식 선택{cur_end}'
        s4 = "④ 계산"
    elif phase == "step4":
        s1 = f'{done}① 회사: {company} ✓{done_end}'
        s2 = "② 자격 확인 ✓"
        s3 = f'{cur}③ 계산 방식 선택{cur_end}'
        s4 = "④ 정밀/쉬운 선택"
    elif phase == "precise":
        s1 = f'{done}① 회사: {company} ✓{done_end}'
        s2 = "② 자격 확인 ✓"
        s3 = f'{done}③ {calc_mode} ✓{done_end}'
        s4 = f'{cur}④ {prefix}정밀 계산{cur_end}'
    elif phase == "simple":
        s1 = f'{done}① 회사: {company} ✓{done_end}'
        s2 = "② 자격 확인 ✓"
        s3 = f'{done}③ {calc_mode} ✓{done_end}'
        s4 = f'{cur}④ {prefix}쉬운 계산{cur_end}'
    else:  # fail
        s1 = f'{done}① 회사: {company} ✓{done_end}'
        s2 = f'{cur}② 자격 기준 안내{cur_end}'
        s3, s4 = "③ 계산 방식 선택", "④ 계산"
    html = f'<div class="progress-summary page-transition-wrap">{s1} → {s2} → {s3} → {s4}</div>'
    st.markdown(html, unsafe_allow_html=True)

def render_progress_summary(current_step_label: str):
    """하위 호환: 정밀/쉬운 화면에서만 쓰던 요약. 실제 선택값은 render_progress_summary_full 사용."""
    st.markdown(
        f'<div class="progress-summary">'
        f'① 회사 선택 ✓ → ② 자격 확인 ✓ → ③ 계산 방식 선택 ✓ → <span class="current">④ {current_step_label}</span>'
        f'</div>',
        unsafe_allow_html=True,
    )

def render_step_indicator(current: int, total: int = 4):
    dots = []
    for i in range(1, total + 1):
        cls = "step-dot"
        if i == current:
            cls += " active"
        elif i < current:
            cls += " done"
        dots.append(f'<span class="{cls}"></span>')
    st.markdown(
        f'<div class="step-indicator">Step {current} of {total} &nbsp; {"".join(dots)}</div>',
        unsafe_allow_html=True,
    )

# =============================================================================
# Step 1: 회사 선택
# =============================================================================
def render_step1():
    st.markdown('<p class="question-title">어디에서 근무하셨나요?</p>', unsafe_allow_html=True)
    st.markdown('<p class="question-desc">근무처를 선택해 주세요.</p>', unsafe_allow_html=True)
    
    companies = ["쿠팡", "마켓컬리", "CJ대한통운", "기타"]
    col1, col2 = st.columns(2)
    for i, name in enumerate(companies):
        with col1 if i % 2 == 0 else col2:
            selected = st.session_state.company == name
            if st.button(
                name,
                key=f"company_{name}",
                use_container_width=True,
                type="primary" if selected else "secondary",
            ):
                st.session_state.company = name
                st.session_state.company_other = ""
                st.rerun()
    
    if st.session_state.company == "기타":
        st.session_state.company_other = st.text_input(
            "회사명 (선택)",
            value=st.session_state.get("company_other", ""),
            key="company_other_input",
            placeholder="예: OO물류"
        )
    
    st.markdown("<br>", unsafe_allow_html=True)
    if st.session_state.company:
        if st.button("다음", type="primary", key="next_step1", use_container_width=True):
            st.session_state.step = 2
            st.rerun()

# =============================================================================
# Step 2: 질문 A (1년 이상)
# =============================================================================
def render_step2():
    company = st.session_state.company or "해당 회사"
    st.markdown(
        f'<p class="question-title">{company}에서 첫 출근일부터 마지막 퇴근일까지 1년 넘게 일하셨나요?</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<p class="question-desc">퇴직급여법상 계속근로기간 1년이 필요해요.</p>',
        unsafe_allow_html=True,
    )
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("예", key="q1_yes", use_container_width=True, type="primary" if st.session_state.eligibility_q1 is True else "secondary"):
            st.session_state.eligibility_q1 = True
            st.rerun()
    with col2:
        if st.button("아니오", key="q1_no", use_container_width=True, type="primary" if st.session_state.eligibility_q1 is False else "secondary"):
            st.session_state.eligibility_q1 = False
            st.session_state.failed = True
            st.rerun()
    
    st.markdown("<br>", unsafe_allow_html=True)
    if st.session_state.eligibility_q1 is True:
        if st.button("다음", type="primary", key="next_step2", use_container_width=True):
            st.session_state.step = 3
            st.rerun()
    if st.button("← 이전으로", key="prev_step2", use_container_width=True, type="secondary"):
        st.session_state.step = 1
        st.rerun()

# =============================================================================
# Step 3: 질문 B (주 15시간 이상)
# =============================================================================
def render_step3():
    st.markdown(
        '<p class="question-title">일주일에 평균 2일 이상(주 15시간 이상) 꾸준히 출근하셨나요?</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<p class="question-desc">4주 평균 주당 소정근로시간이 15시간 이상인 주가 지속되어야 해요.</p>',
        unsafe_allow_html=True,
    )
    
    col1, col2 = st.columns(2)
    with col1:
        if st.button("예", key="q2_yes", use_container_width=True, type="primary" if st.session_state.eligibility_q2 is True else "secondary"):
            st.session_state.eligibility_q2 = True
            st.rerun()
    with col2:
        if st.button("아니오", key="q2_no", use_container_width=True, type="primary" if st.session_state.eligibility_q2 is False else "secondary"):
            st.session_state.eligibility_q2 = False
            st.session_state.failed = True
            st.rerun()
    
    st.markdown("<br>", unsafe_allow_html=True)
    if st.session_state.eligibility_q2 is True:
        if st.button("다음", type="primary", key="next_step3", use_container_width=True):
            st.session_state.step = 4
            st.session_state.failed = False
            st.rerun()
    if st.button("← 이전으로", key="prev_step3", use_container_width=True, type="secondary"):
        st.session_state.step = 2
        st.session_state.eligibility_q2 = None
        st.rerun()

# =============================================================================
# Fail 화면
# =============================================================================
def render_fail():
    st.markdown(
        """
        <div class="result-hero">
            <div class="emoji">💬</div>
            <p class="title">아쉽지만 대상이 아닐 수 있어요</p>
            <p class="sub">조건이 조금 다르더라도 받을 수 있는 경우가 있을 수 있어요.<br>아래 기준을 참고해 보세요.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    with st.expander("📌 퇴직급여법 기준 안내", expanded=True):
        st.markdown("""
        **① 계속근로기간 1년 이상**  
        첫 출근일부터 마지막 퇴근일까지 1년이 넘어야 합니다.

        **② 주 15시간 이상 근로**  
        4주 평균 주당 소정근로시간이 15시간 이상인 주가 지속되어야 합니다.

        **③ 근로 단절 주의 (90일 규칙)**  
        통상적으로 90일(3개월) 이상 출근 기록이 없다면 계속근로가 단절된 것으로 보아, 이전 근무 기간이 합산되지 않을 수 있습니다.
        """)
    if st.button("처음부터 다시 보기", type="secondary", key="reset_fail", use_container_width=True):
        reset_to_start()

# =============================================================================
# Step 4: Success — 계산 방식 선택
# =============================================================================
def render_success_choice():
    st.markdown(
        """
        <div class="result-hero success">
            <div class="emoji">🎉</div>
            <p class="title">축하합니다! 대상자일 가능성이 높아요</p>
            <p class="sub">아래에서 계산 방식을 선택해 주세요.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    
    if st.button(
        "📁 정밀 계산 (파일 업로드)",
        type="primary",
        key="mode_precise",
        use_container_width=True,
    ):
        st.session_state.calculation_mode = "precise"
        st.rerun()
    st.caption("일용근로내역서 PDF를 올리면 자동으로 계산해 드려요.")
    
    st.markdown("<br>", unsafe_allow_html=True)
    
    if st.button(
        "✏️ 쉬운 계산 (직접 입력)",
        key="mode_simple",
        use_container_width=True,
    ):
        st.session_state.calculation_mode = "simple"
        st.rerun()
    st.caption("입력한 기간과 급여로 간단히 계산해 드려요.")
    
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("← 이전으로", key="prev_step4", use_container_width=True, type="secondary"):
        st.session_state.step = 3
        st.session_state.eligibility_q2 = None
        st.session_state.calculation_mode = None
        st.rerun()

# =============================================================================
# 실업급여 — Step 1~4, Fail, Success, 정밀/쉬운
# =============================================================================
def render_ub_step1():
    st.markdown('<p class="question-title">어디에서 근무하셨나요?</p>', unsafe_allow_html=True)
    st.markdown('<p class="question-desc">근무처를 선택해 주세요.</p>', unsafe_allow_html=True)
    companies = ["쿠팡", "마켓컬리", "CJ대한통운", "기타"]
    col1, col2 = st.columns(2)
    for i, name in enumerate(companies):
        with col1 if i % 2 == 0 else col2:
            selected = st.session_state.ub_company == name
            if st.button(name, key=f"ub_company_{name}", use_container_width=True, type="primary" if selected else "secondary"):
                st.session_state.ub_company = name
                st.session_state.ub_company_other = ""
                st.rerun()
    if st.session_state.ub_company == "기타":
        st.text_input("회사명 (선택)", value=st.session_state.get("ub_company_other", ""), key="ub_company_other", placeholder="예: OO물류")
    st.markdown("<br>", unsafe_allow_html=True)
    if st.session_state.ub_company:
        if st.button("다음", type="primary", key="ub_next_1", use_container_width=True):
            st.session_state.ub_step = 2
            st.rerun()

def render_ub_step2():
    st.markdown(
        '<p class="question-title">이직일 기준으로 이직 전 18개월 동안 180일 이상 고용보험에 가입되어 있었나요?</p>',
        unsafe_allow_html=True,
    )
    st.markdown('<p class="question-desc">실업급여 수급 요건이에요.</p>', unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        if st.button("예", key="ub_q1_yes", use_container_width=True, type="primary" if st.session_state.ub_eligibility_q1 is True else "secondary"):
            st.session_state.ub_eligibility_q1 = True
            st.rerun()
    with col2:
        if st.button("아니오", key="ub_q1_no", use_container_width=True, type="primary" if st.session_state.ub_eligibility_q1 is False else "secondary"):
            st.session_state.ub_eligibility_q1 = False
            st.session_state.ub_failed = True
            st.rerun()
    st.markdown("<br>", unsafe_allow_html=True)
    if st.session_state.ub_eligibility_q1 is True:
        if st.button("다음", type="primary", key="ub_next_2", use_container_width=True):
            st.session_state.ub_step = 3
            st.rerun()
    if st.button("← 이전으로", key="ub_prev_2", use_container_width=True, type="secondary"):
        st.session_state.ub_step = 1
        st.rerun()

def render_ub_step3():
    st.markdown(
        '<p class="question-title">최근 1개월간 근로일수가 10일 미만이었나요?</p>',
        unsafe_allow_html=True,
    )
    st.markdown(
        '<p class="question-desc">일용직은 자발적/비자발적 퇴사 구분보다 실업 상태 유지 여부가 중요해요. 근로일수가 적으면 실업 상태에 가깝다고 볼 수 있어요.</p>',
        unsafe_allow_html=True,
    )
    col1, col2 = st.columns(2)
    with col1:
        if st.button("예", key="ub_q2_yes", use_container_width=True, type="primary" if st.session_state.ub_eligibility_q2 is True else "secondary"):
            st.session_state.ub_eligibility_q2 = True
            st.rerun()
    with col2:
        if st.button("아니오", key="ub_q2_no", use_container_width=True, type="primary" if st.session_state.ub_eligibility_q2 is False else "secondary"):
            st.session_state.ub_eligibility_q2 = False
            st.session_state.ub_failed = True
            st.rerun()
    st.markdown("<br>", unsafe_allow_html=True)
    if st.session_state.ub_eligibility_q2 is True:
        if st.button("다음", type="primary", key="ub_next_3", use_container_width=True):
            st.session_state.ub_step = 4
            st.rerun()
    if st.button("← 이전으로", key="ub_prev_3", use_container_width=True, type="secondary"):
        st.session_state.ub_step = 2
        st.session_state.ub_eligibility_q2 = None
        st.rerun()

def render_ub_step4():
    st.markdown(
        '<p class="question-title">재취업할 의사와 구직 활동이 가능한 상태인가요?</p>',
        unsafe_allow_html=True,
    )
    st.markdown('<p class="question-desc">실업인정을 위해 구직 활동이 필요해요.</p>', unsafe_allow_html=True)
    col1, col2 = st.columns(2)
    with col1:
        if st.button("예", key="ub_q3_yes", use_container_width=True, type="primary" if st.session_state.ub_eligibility_q3 is True else "secondary"):
            st.session_state.ub_eligibility_q3 = True
            st.rerun()
    with col2:
        if st.button("아니오", key="ub_q3_no", use_container_width=True, type="primary" if st.session_state.ub_eligibility_q3 is False else "secondary"):
            st.session_state.ub_eligibility_q3 = False
            st.session_state.ub_failed = True
            st.rerun()
    st.markdown("<br>", unsafe_allow_html=True)
    if st.session_state.ub_eligibility_q3 is True:
        if st.button("다음", type="primary", key="ub_next_4", use_container_width=True):
            st.session_state.ub_failed = False
            st.session_state.ub_step = 5
            st.rerun()
    if st.button("← 이전으로", key="ub_prev_4", use_container_width=True, type="secondary"):
        st.session_state.ub_step = 3
        st.session_state.ub_eligibility_q3 = None
        st.rerun()

def render_ub_fail():
    st.markdown(
        """
        <div class="result-hero">
            <div class="emoji">💬</div>
            <p class="title">아쉽지만 실업급여 수급이 어렵거나 조건을 더 확인해 보셔야 해요</p>
            <p class="sub">아래 요건을 참고해 주세요.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    with st.expander("📌 실업급여 수급 요건 안내", expanded=True):
        st.markdown("""
        **① 18개월 중 180일 이상 가입**  
        이직일 기준 이직 전 18개월 동안 고용보험 가입일이 180일 이상이어야 합니다.

        **② 실업 상태 (일용직)**  
        일용직은 자발적/비자발적 퇴사 구분보다 실업 상태 유지 여부가 중요해요. 최근 1개월간 근로일수가 10일 미만인지 등으로 실업 상태에 해당하는지 확인할 수 있어요.

        **③ 구직의사·구직활동**  
        재취업 의사와 구직 활동이 가능한 상태여야 합니다.
        """)
    if st.button("처음부터 다시 보기", type="secondary", key="ub_reset_fail", use_container_width=True):
        reset_to_start()

def render_ub_success_choice():
    st.markdown(
        """
        <div class="result-hero success">
            <div class="emoji">🎉</div>
            <p class="title">축하해요! 실업급여 수급 자격이 있을 가능성이 높아요</p>
            <p class="sub">아래에서 계산 방식을 선택해 주세요.</p>
        </div>
        """,
        unsafe_allow_html=True,
    )
    if st.button("📁 정밀 계산 (PDF 업로드)", type="primary", key="ub_mode_precise", use_container_width=True):
        st.session_state.ub_calculation_mode = "precise"
        st.rerun()
    st.caption("일용근로내역서 PDF로 가입일수·예상 구직급여를 계산해 드려요.")
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("✏️ 쉬운 계산 (직접 입력)", key="ub_mode_simple", use_container_width=True):
        st.session_state.ub_calculation_mode = "simple"
        st.rerun()
    st.caption("이직일·가입일수·연령 등을 입력해 간단히 계산해 드려요.")
    st.markdown("<br>", unsafe_allow_html=True)
    if st.button("← 이전으로", key="ub_prev_5", use_container_width=True, type="secondary"):
        st.session_state.ub_step = 4
        st.session_state.ub_eligibility_q3 = None
        st.session_state.ub_calculation_mode = None
        st.rerun()

def render_ub_precise():
    render_progress_summary_full("unemployment", "precise")
    if st.button("← 계산 방식 다시 선택", key="ub_back_precise", type="secondary"):
        st.session_state.ub_calculation_mode = None
        st.session_state.ub_precise_calculated = False
        st.session_state.ub_precise_loading_done = False
        st.session_state.ub_precise_result = None
        if "ub_precise_df" in st.session_state:
            del st.session_state["ub_precise_df"]
        st.rerun()
    if st.session_state.get("ub_precise_loading_done"):
        res = st.session_state.get("ub_precise_result")
        if isinstance(res, dict) and "daily_benefit" in res:
            st.markdown(
                '<p class="question-desc" style="margin-bottom:1rem;">근로내역을 기준으로 한 예상이에요. 정확한 금액은 고용센터에 확인해 주세요.</p>',
                unsafe_allow_html=True,
            )
            col1, col2, col3 = st.columns(3)
            with col1:
                st.markdown(f"""
                <div class="result-card card-avg">
                    <h3>예상 구직급여 (일당)</h3>
                    <div class="value">₩{res.get('daily_benefit', 0):,.0f}</div>
                    <small>평균임금의 약 60%</small>
                </div>
                """, unsafe_allow_html=True)
            with col2:
                st.markdown(f"""
                <div class="result-card card-severance">
                    <h3>수급 가능 일수</h3>
                    <div class="value">{res.get('days', 0)}일</div>
                    <small>가입기간·연령 기준</small>
                </div>
                """, unsafe_allow_html=True)
            with col3:
                st.markdown(f"""
                <div class="result-card eligible">
                    <h3>대략 총 예상 금액</h3>
                    <div class="value">₩{res.get('total_estimate', 0):,.0f}</div>
                    <small>18개월 중 가입 {res.get('insured_days_in_18m', 0)}일</small>
                </div>
                """, unsafe_allow_html=True)
            return
    if st.session_state.get("ub_precise_calculated") and not st.session_state.get("ub_precise_loading_done"):
        df = st.session_state.get("ub_precise_df")
        saved_end = st.session_state.get("ub_precise_saved_end_date")
        if df is not None and not df.empty and saved_end is not None:
            end_dt = datetime.combine(saved_end, datetime.min.time())
            avg_result = compute_average_wage(df, end_dt)
            avg_daily = avg_result["average_wage"]
            start_18m = end_dt - timedelta(days=540)
            mask = (df["근무일"] >= pd.Timestamp(start_18m)) & (df["근무일"] <= pd.Timestamp(end_dt))
            insured_days = len(df.loc[mask])
            age_50 = st.session_state.get("ub_precise_saved_age_50", False)
            est = compute_unemployment_estimate(avg_daily, insured_days, age_50)
            st.session_state.ub_precise_result = est
            if "ub_precise_df" in st.session_state:
                del st.session_state["ub_precise_df"]
            st.session_state.ub_precise_loading_done = True
            st.rerun()
        st.markdown(
            """
            <div class="result-hero" style="padding:3rem 0;">
                <div class="loading-spinner"></div>
                <p class="title" style="font-size:1.1rem;">계산중...</p>
                <p class="sub">잠시만 기다려 주세요.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        time.sleep(1.2)
        st.rerun()
    st.markdown('<p class="section-header">📁 실업급여 정밀 계산 — 일용근로내역서 PDF</p>', unsafe_allow_html=True)
    render_guide_expander()
    st.markdown("<br>", unsafe_allow_html=True)
    uploaded = st.file_uploader("일용근로내역서 PDF", type=["pdf"], label_visibility="collapsed", key="ub_precise_upload")
    if not uploaded:
        st.info("일용근로내역서 PDF를 올려 주세요.")
        return
    if not HAS_PDFPLUMBER:
        st.error("PDF 분석을 위해 pdfplumber를 설치해 주세요.")
        return
    try:
        df = parse_welcomwel_pdf(uploaded)
    except Exception as e:
        st.error(f"PDF를 읽는 중 오류가 났어요. ({e})")
        return
    if df.empty:
        st.warning("PDF에서 근로 내역을 찾지 못했어요.")
        return
    df = preprocess_data(df)
    if df.empty:
        st.warning("정리된 근로 데이터가 없어요.")
        return
    ub_company = st.session_state.get("ub_company") or ""
    ub_company_other = st.session_state.get("ub_company_other") or ""
    df = filter_df_by_company(df, ub_company, ub_company_other)
    if df.empty:
        st.warning("선택한 회사(사업장)의 근로 내역이 PDF에서 찾아지지 않았어요. Step 1에서 선택한 회사와 PDF 내 사업장명이 일치하는지 확인해 주세요.")
        return
    max_date = df["근무일"].max()
    if isinstance(max_date, pd.Timestamp):
        max_date = max_date.to_pydatetime().date()
    end_date = st.date_input("이직일 (기준일)", value=max_date, max_value=datetime.now().date(), key="ub_precise_end_date")
    age_50 = st.checkbox("50세 이상이에요 (수급일수 증가)", key="ub_age_50", value=False)
    if st.button("계산하기", type="primary", key="ub_do_precise", use_container_width=True):
        st.session_state.ub_precise_df = df
        st.session_state.ub_precise_saved_end_date = end_date
        st.session_state.ub_precise_saved_age_50 = age_50
        st.session_state.ub_precise_calculated = True
        st.rerun()

def render_ub_simple():
    render_progress_summary_full("unemployment", "simple")
    if st.button("← 계산 방식 다시 선택", key="ub_back_simple", type="secondary"):
        st.session_state.ub_calculation_mode = None
        st.rerun()
    st.markdown('<p class="section-header">✏️ 실업급여 쉬운 계산</p>', unsafe_allow_html=True)
    leave_date = st.date_input("이직일", value=datetime.now().date(), key="ub_simple_leave")
    insured_days = st.number_input("이직 전 18개월 중 고용보험 가입 일수", min_value=0, value=180, key="ub_simple_insured_days")
    avg_daily = st.number_input("1일 평균 임금 (원) — 퇴직 전 3개월 기준", min_value=0.0, value=0.0, step=5000.0, key="ub_simple_avg_daily")
    age_50 = st.checkbox("50세 이상이에요", key="ub_simple_age_50", value=False)
    if insured_days >= 180 and avg_daily > 0:
        est = compute_unemployment_estimate(avg_daily, insured_days, age_50)
        st.markdown('<p class="section-header">예상 실업급여</p>', unsafe_allow_html=True)
        st.markdown(f"""
        <div class="result-card card-severance">
            <h3>예상 구직급여 (일당)</h3>
            <div class="value">₩{est['daily_benefit']:,.0f}</div>
            <small>수급 가능 {est['days']}일 · 총 예상 ₩{est['total_estimate']:,.0f}</small>
        </div>
        """, unsafe_allow_html=True)
    elif insured_days < 180:
        st.info("18개월 중 180일 이상 가입되어야 수급 요건을 충족해요.")

# =============================================================================
# 가이드: 근로내역서는 어디서 받나요?
# =============================================================================
GUIDE_IMAGES_DIR = Path(__file__).resolve().parent / "assets" / "guide"
ASSETS_DIR = Path(__file__).resolve().parent / "assets"
# 가이드 4단계 이미지: guide_step1~4.png 사용. 없으면 아래 파일명으로 assets/ 또는 assets/guide/ 검색
GUIDE_IMAGE_FALLBACKS = [
    "img-a5dcf88d-0b31-4e1b-94c4-ad81a5754f05.png",  # Step1: 증명원 출력 화면
    "img__1_-482db9c4-0c1a-4b15-9d8a-ad2c282f52f2.png",  # Step2: 자격 이력 내역서 폼(고용/일용)
    "img__3_-0e8ed802-122d-4c8d-b0ca-3a6b15fdfaf4.png",  # Step3: 통지수신방법 등
    "img__2_-31ad06cb-b00e-42a5-a4bd-b276ab8de3ac.png",  # Step4: 일용근로·노무제공내역서 PDF
]

def _guide_image_path(step: int) -> Path | None:
    # 사용자 제공 가이드 이미지(guide_stepN.png) 우선, 없으면 _hl, 없으면 fallback 파일명 검색
    for name in [f"guide_step{step}.png", f"guide_step{step}_hl.png", GUIDE_IMAGE_FALLBACKS[step - 1]]:
        for base in (GUIDE_IMAGES_DIR, ASSETS_DIR):
            p = base / name
            if p.exists():
                return p
    return None

def render_guide_expander():
    with st.expander("근로내역서는 어디서 받나요?", expanded=False):
        st.markdown("퇴직금·실업급여 계산에 필요한 근로내역은 **근로복지공단 토탈서비스**에서 발급받을 수 있어요.")
        st.markdown("")
        for i, (title, body) in enumerate([
            ("Step 1. 로그인", "total.comwel.or.kr 에 접속한 뒤 로그인해 주세요. (회원가입·본인인증이 필요하면 먼저 진행해 주세요.)"),
            ("Step 2. 메뉴 선택", "상단 메뉴에서 **증명원 신청/발급**을 누른 뒤, 왼쪽에서 **고용·산재보험 자격 이력 내역서**를 선택해 주세요."),
            ("Step 3. 조회하기", "**보험구분**은 **고용**, **조회구분**은 **일용**으로 선택하고, **출력할 근로년월**을 설정한 뒤 **신청** 버튼을 눌러 주세요."),
            ("Step 4. 내역서 받기", "발급된 **일용근로·노무제공내역서** PDF를 저장한 뒤 이 페이지에서 업로드해 주세요. (증명원 출력 버튼으로 인쇄·저장)"),
        ], 1):
            st.markdown(f"**{title}**")
            st.markdown(body)
            img_path = _guide_image_path(i)
            if img_path is not None:
                st.image(str(img_path), use_container_width=True)
            st.markdown("")
        st.caption("산재보험용이 아니라 **고용보험**용 일용근로내역서를 선택해 주세요.")

# =============================================================================
# 정밀 계산 (PDF 전용 — 근로복지공단 일용근로내역서)
# =============================================================================
def render_precise_calculation():
    render_progress_summary_full(st.session_state.get("service", "severance"), "precise")
    if st.button("← 계산 방식 다시 선택", key="back_from_precise", type="secondary"):
        st.session_state.calculation_mode = None
        st.session_state.precise_calculated = False
        st.session_state.precise_loading_done = False
        st.session_state.precise_result = None
        st.session_state.precise_saved_end_date = None
        if "precise_df" in st.session_state:
            del st.session_state["precise_df"]
        st.rerun()

    # 결과 단계: 저장된 결과 표시
    if st.session_state.get("precise_loading_done") and st.session_state.get("precise_result"):
        res = st.session_state.precise_result
        avg_result = res["avg_result"]
        severance_result = res["severance_result"]
        continuous = res["continuous"]
        period_df = res.get("period_df")
        pw = res.get("period_with_allowance")
        period_with_allowance = pw if isinstance(pw, pd.DataFrame) else pd.DataFrame()
        st.markdown(
            '<p class="question-desc" style="margin-bottom:1rem;">근로내역을 기준으로 산정한 예상 금액이에요. 정확한 금액은 고용센터·노동부에 확인해 주세요.</p>',
            unsafe_allow_html=True,
        )
        if continuous["eligible"]:
            pill_html = '<span class="pill-eligible">받을 수 있어요</span>'
            card_class = "eligible"
            eligibility_sub = "근속 요건 충족했어요"
        else:
            pill_html = '<span class="pill-not-eligible">아직은 받기 어려워요</span>'
            card_class = "not-eligible"
            eligibility_sub = "근속이 조금 더 필요해요"
        col1, col2, col3 = st.columns(3)
        with col1:
            st.markdown(f"""
            <div class="result-card card-avg">
                <h3>💵 평균임금 (최근 3개월)</h3>
                <div class="value">₩{avg_result['average_wage']:,.0f}</div>
                <small>총 지급액 ₩{avg_result['total_pay']:,.0f} / {avg_result['total_days']}일</small>
            </div>
            """, unsafe_allow_html=True)
        with col2:
            st.markdown(f"""
            <div class="result-card card-severance">
                <h3>📋 예상 퇴직금</h3>
                <div class="value">대략 ₩{severance_result['severance']:,.0f} 원</div>
                <small>재직 {severance_result['work_days']}일 기준</small>
            </div>
            """, unsafe_allow_html=True)
        with col3:
            st.markdown(f"""
            <div class="result-card {card_class}">
                <h3>퇴직금 수급 여부</h3>
                <div class="value">{pill_html}</div>
                <small>{eligibility_sub} · {continuous['weeks_15h_plus']}주 (4주 평균 15시간 이상)</small>
                <p class="eligible-detail" style="margin:0.75rem 0 0; font-size:0.9rem; color:var(--toss-text-secondary); line-height:1.45;">{continuous["message"]}</p>
            </div>
            """, unsafe_allow_html=True)
        if period_df is not None and len(period_df) > 0:
            # 주별 근무일수 차트 (언제 며칠 근무했는지)
            period_df_copy = period_df.copy()
            period_df_copy["week_start"] = period_df_copy["근무일"] - pd.to_timedelta(period_df_copy["근무일"].dt.dayofweek, unit="d")
            weekly_days = period_df_copy.groupby("week_start", as_index=False).size().rename(columns={"size": "근무일수"})
            if not weekly_days.empty and HAS_PLOTLY:
                st.markdown('<div class="chart-card"><p class="chart-title">근무 일정</p><p class="chart-sub">주별 근무일수 (언제 며칠 근무했는지)</p>', unsafe_allow_html=True)
                fig_weekly = px.bar(weekly_days, x="week_start", y="근무일수", labels={"week_start": "주", "근무일수": "근무일수 (일)"})
                fig_weekly.update_layout(height=280, margin=dict(l=20, r=20, t=10, b=20), showlegend=False)
                fig_weekly.update_traces(marker_color="#3182f6", marker_line_color="#3182f6")
                st.plotly_chart(fig_weekly, use_container_width=True)
                st.markdown("</div>", unsafe_allow_html=True)
            st.markdown('<div class="chart-card"><p class="chart-title">요즘 받은 급여 한눈에</p><p class="chart-sub">최근 3개월 일별 지급액</p>', unsafe_allow_html=True)
            if HAS_PLOTLY:
                fig = px.bar(period_df, x="근무일", y="지급액", labels={"근무일": "날짜", "지급액": "지급액 (원)"})
                fig.update_layout(height=320, margin=dict(l=20, r=20, t=10, b=20), showlegend=False)
                fig.update_traces(marker_color="#3182f6", marker_line_color="#3182f6")
                st.plotly_chart(fig, use_container_width=True)
            else:
                st.bar_chart(period_df.set_index("근무일")["지급액"])
            st.markdown("</div>", unsafe_allow_html=True)
        if not period_with_allowance.empty:
            st.markdown('<p class="section-header">수당 추정 (실제 지급액 − 표준 단가)</p>', unsafe_allow_html=True)
            st.dataframe(
                period_with_allowance[["근무일", "지급액", "표준단가", "추정_추가수당"]].style.format(
                    {"지급액": "{:,.0f}", "표준단가": "{:,.0f}", "추정_추가수당": "{:,.0f}"}
                ),
                use_container_width=True,
                height=280,
            )
        return

    # 로딩 단계: 4초 로딩 화면 표시 후 계산 실행 → 결과 화면
    if st.session_state.get("precise_calculated") and not st.session_state.get("precise_loading_done"):
        st.markdown(
            """
            <div class="result-hero" style="padding:3rem 0;">
                <div class="loading-spinner"></div>
                <p class="title" style="font-size:1.1rem;">계산중...</p>
                <p class="sub">잠시만 기다려 주세요.</p>
            </div>
            """,
            unsafe_allow_html=True,
        )
        time.sleep(4)
        df = st.session_state.get("precise_df")
        saved_end = st.session_state.get("precise_saved_end_date")
        if df is not None and not df.empty and saved_end is not None:
            end_date_dt = datetime.combine(saved_end, datetime.min.time())
            avg_result = compute_average_wage(df, end_date_dt)
            severance_result = compute_severance(df, end_date_dt)
            continuous = check_continuous_employment(df)
            period_df = avg_result.get("period_df")
            period_with_allowance = estimate_allowance(period_df, None) if period_df is not None and not period_df.empty else pd.DataFrame()
            st.session_state.precise_result = {
                "avg_result": avg_result,
                "severance_result": severance_result,
                "continuous": continuous,
                "period_df": period_df,
                "period_with_allowance": period_with_allowance,
            }
            if "precise_df" in st.session_state:
                del st.session_state["precise_df"]
        st.session_state.precise_loading_done = True
        st.rerun()

    # 입력 단계: 업로드 + 퇴직일 + 계산하기
    st.markdown('<p class="section-header">📁 정밀 계산 — 일용근로내역서 PDF</p>', unsafe_allow_html=True)
    st.caption("근로복지공단에서 받은 일용근로내역서 PDF를 올리면 퇴직금·평균임금을 계산해 드려요.")
    render_guide_expander()
    st.markdown("<br>", unsafe_allow_html=True)
    uploaded_file = st.file_uploader(
        "일용근로내역서 PDF 올리기",
        type=["pdf"],
        label_visibility="collapsed",
        key="precise_upload",
    )
    if not uploaded_file:
        st.info("일용근로내역서 PDF를 올려 주세요.")
        return
    if not HAS_PDFPLUMBER:
        st.error("PDF 분석을 위해 pdfplumber를 설치해 주세요. (pip install pdfplumber)")
        return
    try:
        df = parse_welcomwel_pdf(uploaded_file)
    except Exception as e:
        st.error(f"PDF를 읽는 중 오류가 났어요. 일용근로내역서 PDF인지 확인해 주세요. ({e})")
        return
    if df.empty:
        st.warning("PDF에서 근로 내역을 찾지 못했어요. 근로복지공단에서 발급한 **고용보험** 일용근로내역서인지 확인해 주세요.")
        return
    df = preprocess_data(df)
    if df.empty:
        st.warning("정리된 근로 데이터가 없어요. PDF 형식을 다시 확인해 주세요.")
        return
    company = st.session_state.get("company") or ""
    company_other = st.session_state.get("company_other") or ""
    df = filter_df_by_company(df, company, company_other)
    if df.empty:
        st.warning("선택한 회사(사업장)의 근로 내역이 PDF에서 찾아지지 않았어요. Step 1에서 선택한 회사와 PDF 내 사업장명이 일치하는지 확인해 주세요.")
        return
    max_date = df["근무일"].max()
    if isinstance(max_date, pd.Timestamp):
        max_date = max_date.to_pydatetime().date()
    end_date = st.date_input(
        "퇴직일 (평균임금·퇴직금 기준)",
        value=max_date,
        max_value=datetime.now().date(),
        key="precise_end_date",
    )
    if st.button("계산하기", type="primary", key="do_precise_calc", use_container_width=True):
        st.session_state.precise_df = df
        st.session_state.precise_saved_end_date = end_date
        st.session_state.precise_calculated = True
        st.rerun()

# =============================================================================
# 쉬운 계산 (직접 입력)
# =============================================================================
def render_simple_calculation():
    render_progress_summary_full(st.session_state.get("service", "severance"), "simple")
    if st.button("← 계산 방식 다시 선택", key="back_from_simple", type="secondary"):
        st.session_state.calculation_mode = None
        st.rerun()
    st.markdown('<p class="section-header">✏️ 쉬운 계산 — 직접 입력</p>', unsafe_allow_html=True)
    start = st.date_input("첫 출근일", value=datetime.now().date() - timedelta(days=365), key="simple_start")
    end = st.date_input("마지막 퇴근일", value=datetime.now().date(), key="simple_end")
    work_days = (end - start).days
    st.caption(f"재직일수: {work_days}일")
    
    avg_choice = st.radio(
        "평균임금 입력 방식",
        ["퇴직 전 3개월 총 급여로 계산", "1일 평균 임금 직접 입력"],
        key="simple_avg_choice",
        horizontal=True,
    )
    if avg_choice == "퇴직 전 3개월 총 급여로 계산":
        total_pay_3m = st.number_input("퇴직 전 3개월 총 급여 (원)", min_value=0, value=0, step=100000, key="simple_total_pay")
        work_days_3m = st.number_input("그 기간 동안 실제 근무한 일수", min_value=0, value=0, key="simple_days_3m")
        avg_daily = (total_pay_3m / work_days_3m) if work_days_3m > 0 else 0.0
    else:
        avg_daily = st.number_input("1일 평균 임금 (원)", min_value=0.0, value=0.0, step=1000.0, key="simple_avg_daily")
    
    if work_days > 0 and avg_daily > 0:
        severance = compute_severance_simple(work_days, avg_daily)
        st.markdown('<p class="section-header">예상 퇴직금</p>', unsafe_allow_html=True)
        st.markdown(f"""
        <div class="result-card card-severance">
            <h3>📋 예상 퇴직금</h3>
            <div class="value">₩{severance:,.0f}</div>
            <small>재직 {work_days}일 · 1일 평균 ₩{avg_daily:,.0f} 기준</small>
        </div>
        """, unsafe_allow_html=True)

# =============================================================================
# 메인
# =============================================================================
def main():
    init_session_state()
    service = st.session_state.get("service")

    # 인트로 화면 — 버블 배경, 7초마다 문구 로테이션(자동 리프레시)
    if not st.session_state.get("intro_done"):
        if HAS_AUTOREFRESH:
            st_autorefresh(interval=7000, key="intro_phrase_rot")
        st.markdown('<div class="content-card intro-page">', unsafe_allow_html=True)
        render_intro()
        st.markdown('</div>', unsafe_allow_html=True)
        return

    # 공통 헤더 (홈 + 서비스별 타이틀)
    render_app_header(service)

    # ————— 실업급여 플로우 —————
    if service == "unemployment":
        if st.session_state.get("ub_failed") and st.session_state.ub_step in (2, 3, 4):
            render_progress_summary_full("unemployment", "fail")
            st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
            render_ub_fail()
            st.markdown('</div>', unsafe_allow_html=True)
            st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 내용은 고용센터에 확인해 주세요.</p></div>', unsafe_allow_html=True)
            return
        if st.session_state.get("ub_calculation_mode") == "precise":
            st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
            render_ub_precise()
            st.markdown('</div>', unsafe_allow_html=True)
            st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 내용은 고용센터에 확인해 주세요.</p></div>', unsafe_allow_html=True)
            return
        if st.session_state.get("ub_calculation_mode") == "simple":
            st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
            render_ub_simple()
            st.markdown('</div>', unsafe_allow_html=True)
            st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 내용은 고용센터에 확인해 주세요.</p></div>', unsafe_allow_html=True)
            return
        step = st.session_state.get("ub_step", 1)
        phase = "step4" if step >= 4 else "step3" if step == 3 else "step2" if step == 2 else "step1"
        render_progress_summary_full("unemployment", phase)
        st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
        if step == 1:
            render_ub_step1()
        elif step == 2:
            render_ub_step2()
        elif step == 3:
            render_ub_step3()
        elif step == 4:
            render_ub_step4()
        else:
            render_ub_success_choice()
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 내용은 고용센터에 확인해 주세요.</p></div>', unsafe_allow_html=True)
        return

    # ————— 퇴직금 플로우 —————
    # Fail 화면 (질문에서 아니오 선택 시)
    if st.session_state.get("failed") and st.session_state.step in (2, 3):
        render_progress_summary_full("severance", "fail")
        st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
        render_fail()
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 내용은 고용주·노동부에 확인해 주세요.</p></div>', unsafe_allow_html=True)
        return
    
    # 계산 모드 선택 후: 정밀 / 쉬운
    if st.session_state.calculation_mode == "precise":
        st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
        render_precise_calculation()
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 금액은 고용주·노동부에 확인해 주세요.</p></div>', unsafe_allow_html=True)
        return
    if st.session_state.calculation_mode == "simple":
        st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
        render_simple_calculation()
        st.markdown('</div>', unsafe_allow_html=True)
        st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 금액은 고용주·노동부에 확인해 주세요.</p></div>', unsafe_allow_html=True)
        return
    
    # 단계별 플로우
    step = st.session_state.step
    phase = "step4" if step >= 4 else "step3" if step == 3 else "step2" if step == 2 else "step1"
    render_progress_summary_full("severance", phase)
    st.markdown('<div class="content-card step-transition">', unsafe_allow_html=True)
    if step == 1:
        render_step1()
    elif step == 2:
        render_step2()
    elif step == 3:
        render_step3()
    elif step == 4:
        render_success_choice()
    
    st.markdown('</div>', unsafe_allow_html=True)
    st.markdown('<div class="app-footer"><p>참고용이에요. 정확한 내용은 고용주·노동부에 확인해 주세요.</p></div>', unsafe_allow_html=True)


if __name__ == "__main__":
    main()
