# -*- coding: utf-8 -*-
"""근로복지공단 일용근로내역서 PDF 파싱 서비스"""
import re
import io
from datetime import datetime
import pandas as pd

try:
    import pdfplumber
    HAS_PDFPLUMBER = True
except ImportError:
    HAS_PDFPLUMBER = False

COMPANY_KEYWORDS: dict[str, list[str]] = {
    "쿠팡": [
        "쿠팡", "(주)쿠팡", "주식회사쿠팡", "쿠팡물류", "쿠팡로짓", "쿠팡에이브이", "쿠팡씨엔에스",
        "쿠팡풀필먼트서비스", "쿠팡풀필먼트서비스 유한회사", "쿠팡로지스틱스",
    ],
    "마켓컬리": [
        "컬리", "마켓컬리", "(주)마켓컬리", "마켓컬리(주)", "주식회사마켓컬리", "주식회사컬리",
        "이음이앤지", "라온이엔지",
    ],
    "CJ대한통운": [
        "CJ", "대한통운", "CJ대한통운", "(주)CJ대한통운", "CJ대한통운(주)", "주식회사CJ대한통운",
    ],
}


def _norm(s: str) -> str:
    return (s or "").replace(" ", "").replace("\u3000", "")


def _normalize_company(s: str) -> str:
    """사업장명 정규화: 줄바꿈·연속공백 → 단일 공백, 앞뒤 공백 제거"""
    return re.sub(r"\s+", " ", (s or "").strip())


def _parse_ym(ym_raw: str) -> tuple[int, int] | None:
    """근로년월 파싱 - 다양한 형식 지원 (한국어 포함)"""
    if not ym_raw:
        return None
    # 한국어 형식: 2024년 1월, 2024년01월
    ko = re.search(r"(\d{4})\s*년\s*(\d{1,2})\s*월?", ym_raw)
    if ko:
        y, m = int(ko.group(1)), int(ko.group(2))
        if 1 <= m <= 12 and 2000 <= y <= 2099:
            return y, m
    # 숫자만 6자리: 202401
    digits = re.sub(r"\D", "", ym_raw)
    if len(digits) == 6:
        y, m = int(digits[:4]), int(digits[4:6])
        if 1 <= m <= 12 and 2000 <= y <= 2099:
            return y, m
    # 구분자 형식: 2024/01, 2024-01, 2024.01, 2024. 1
    sep = re.match(r"(\d{4})\s*[/\-.]\s*(\d{1,2})", ym_raw.strip())
    if sep:
        y, m = int(sep.group(1)), int(sep.group(2))
        if 1 <= m <= 12 and 2000 <= y <= 2099:
            return y, m
    return None


def filter_df_by_company(df: pd.DataFrame, company: str, company_other: str = "") -> pd.DataFrame:
    if df.empty or "사업장" not in df.columns:
        return df
    company = (company or "").strip()
    company_other = (company_other or "").strip()

    keywords = COMPANY_KEYWORDS.get(company)

    if keywords is None:
        if company == "기타" and company_other:
            # 정규화된 사업장명으로 정확한 매칭 시도
            norm_target = _normalize_company(company_other)
            site_norm = df["사업장"].astype(str).apply(_normalize_company)

            # 1차: 정확한 완전 일치
            mask = site_norm == norm_target
            if mask.any():
                return df.loc[mask].reset_index(drop=True)

            # 2차: 포함 여부 (긴 사업장명의 일부가 일치하는 경우)
            mask = site_norm.str.contains(re.escape(norm_target), case=False, na=False, regex=True)
            if mask.any():
                return df.loc[mask].reset_index(drop=True)

            # 3차: 역방향 포함 (선택된 이름이 저장된 사업장명을 포함)
            mask = site_norm.apply(lambda x: norm_target in x or x in norm_target)
            return df.loc[mask].reset_index(drop=True)
        else:
            return df

    # 미리 정의된 회사 키워드 목록으로 매칭
    pattern = "|".join(re.escape(k) for k in keywords)
    site_norm = df["사업장"].astype(str).apply(_normalize_company)
    mask = site_norm.str.contains(pattern, case=False, na=False)
    return df.loc[mask].reset_index(drop=True)


def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    if "근무일" in out.columns:
        out["근무일"] = pd.to_datetime(out["근무일"], errors="coerce")
        out = out.dropna(subset=["근무일"])
    if "지급액" in out.columns:
        out["지급액"] = pd.to_numeric(
            out["지급액"].astype(str).str.replace(",", ""), errors="coerce"
        )
        out = out.dropna(subset=["지급액"])
    out = out.sort_values("근무일").reset_index(drop=True)
    return out


def _is_header_row(row: list, header: list) -> bool:
    """반복 헤더 행 여부 감지 (다음 페이지에서 헤더가 데이터로 잡히는 경우)"""
    if not row:
        return False
    row_text = " ".join(str(c or "").strip() for c in row)
    header_text = " ".join(str(c or "").strip() for c in header)
    if row_text == header_text:
        return True
    # 일련번호 열이 숫자가 아닌 텍스트면 헤더 행일 가능성
    first = str(row[0] or "").strip()
    if first and not first.isdigit() and len(first) <= 6:
        # 근로년월 열이 숫자 패턴이 아니면 헤더
        second = str(row[1] or "").strip() if len(row) > 1 else ""
        if second and _parse_ym(second) is None and len(second) <= 10:
            return True
    return False


def parse_welcomwel_pdf(file_bytes: bytes) -> pd.DataFrame:
    """근로복지공단 일용근로·노무제공내역서 PDF → 일별 DataFrame"""
    if not HAS_PDFPLUMBER:
        return pd.DataFrame()
    rows_out: list[dict] = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            for table in tables or []:
                if not table or len(table) < 2:
                    continue
                header = [str(c).strip() if c else "" for c in table[0]]
                n_cols = len(header)

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

                # 실제 근로내역서 9열: 일련번호, 근로년월, 사업장명, 직종명, 근로일자, 근로일수, 임금총액, 보수총액, 근로자구분
                if n_cols >= 7 and (idx_ym < 0 or idx_dates < 0 or idx_days < 0 or idx_pay < 0):
                    # 헤더가 한글로 읽히지 않는 경우 위치 기반 폴백
                    if n_cols == 9:
                        idx_ym, idx_site, idx_dates, idx_days, idx_pay = 1, 2, 4, 5, 6
                    elif n_cols == 8:
                        idx_ym, idx_site, idx_dates, idx_days, idx_pay = 1, 2, 3, 4, 5
                    elif n_cols == 7:
                        idx_ym, idx_site, idx_dates, idx_days, idx_pay = 0, 1, 2, 3, 4
                    elif n_cols >= 10:
                        # 열이 많은 경우: 9열 기준 적용
                        idx_ym, idx_site, idx_dates, idx_days, idx_pay = 1, 2, 4, 5, 6
                # 5열 표에서 헤더 미인식 시 표준 순서 적용
                elif n_cols >= 5 and idx_ym < 0 and idx_pay < 0:
                    idx_ym, idx_site, idx_dates, idx_days, idx_pay = 0, 1, 2, 3, 4

                # 최후 폴백
                if idx_ym < 0:
                    idx_ym = 1
                if idx_pay < 0:
                    idx_pay = 6 if n_cols > 6 else n_cols - 1
                if idx_dates < 0:
                    idx_dates = 4 if n_cols > 4 else 3
                if idx_days < 0:
                    idx_days = 5 if n_cols > 5 else 4
                if idx_site < 0:
                    idx_site = 2 if n_cols > 2 else 0

                for row in table[1:]:
                    if not row or len(row) <= max(idx_ym, idx_pay, idx_site):
                        continue
                    # 반복 헤더 행 스킵
                    if _is_header_row(row, header):
                        continue

                    ym_raw    = str(row[idx_ym]    or "").strip()
                    # 사업장명: 줄바꿈·연속공백 정규화
                    site      = _normalize_company(str(row[idx_site] or ""))
                    dates_raw = str(row[idx_dates] or "").strip() if idx_dates < len(row) else ""
                    days_raw  = str(row[idx_days]  or "").strip() if idx_days < len(row) else ""
                    # 실제 근로내역서: "1,541,300원" 형식 (쉼표·원 제거)
                    pay_raw   = re.sub(r"[^\d.]", "", str(row[idx_pay] or "0").replace(",", ""))

                    if not ym_raw or not pay_raw:
                        continue

                    ym_parsed = _parse_ym(ym_raw)
                    if ym_parsed is None:
                        continue
                    y, m = ym_parsed

                    try:
                        pay = float(pay_raw)
                    except ValueError:
                        continue

                    if pay <= 0:
                        continue

                    # 근로일수: "12일" 형식 지원
                    days_clean = re.sub(r"[^\d]", "", str(days_raw or ""))
                    try:
                        n_days = int(days_clean) if days_clean else 0
                    except ValueError:
                        n_days = 0
                    if n_days <= 0:
                        n_days = 1

                    # 근로일자: 쉼표/공백 구분 숫자 목록
                    day_list: list[int] = []
                    for part in re.split(r"[,,\s]+", dates_raw):
                        part = part.strip()
                        if part.isdigit():
                            day_list.append(int(part))
                    if not day_list and n_days > 0:
                        day_list = list(range(1, n_days + 1))

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
    df = (
        df.sort_values("근무일")
        .drop_duplicates(subset=["근무일", "사업장"], keep="first")
        .reset_index(drop=True)
    )
    return df


def extract_unique_companies(file_bytes: bytes) -> list[str]:
    """PDF에서 사업장명 컬럼의 고유 법인명 리스트 추출 (정렬)"""
    df = parse_welcomwel_pdf(file_bytes)
    if df.empty or "사업장" not in df.columns:
        return []
    # parse_welcomwel_pdf에서 이미 _normalize_company 적용됨
    names = df["사업장"].astype(str).str.strip()
    names = names[names.str.len() > 0]
    return sorted(names.unique().tolist(), key=str)
