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


def _is_data_row_no_header(row: list) -> bool:
    """2페이지 이후: 헤더 없이 데이터 행을 식별.

    - 첫 번째 열이 '1', '2.', '3)' 같이 숫자로 시작하면 데이터로 간주
    - 둘째 열이 '20XX/XX', '20XX-XX', '20XX.XX', '20XX년 XX월' 등 유효한 연월이면 데이터로 간주
    """
    if not row or len(row) < 2:
        return False
    c0 = str(row[0] or "").strip()
    c1 = str(row[1] or "").strip()
    # 일련번호: "1", "1.", "1)", "  12 " 등
    if re.match(r"^\s*\d+\s*([).])?\s*$", c0):
        return True
    # 둘째 열이 연월이면 데이터 행
    if _parse_ym(c1):
        return True
    return False


def _is_header_row(row: list, header: list) -> bool:
    """반복 헤더 행 여부 감지 (다음 페이지에서 헤더가 데이터로 잡히는 경우)"""
    if not row:
        return False
    row_text = " ".join(str(c or "").strip() for c in row)
    header_text = " ".join(str(c or "").strip() for c in header)
    if row_text == header_text:
        return True
    # 첫 셀이 숫자가 아닌 짧은 텍스트이고 두 번째 셀이 날짜가 아니면 헤더
    first = str(row[0] or "").strip()
    if first and not first.isdigit() and len(first) <= 8:
        second = str(row[1] or "").strip() if len(row) > 1 else ""
        if second and _parse_ym(second) is None and len(second) <= 12:
            # 세 번째 셀도 짧으면 헤더
            third = str(row[2] or "").strip() if len(row) > 2 else ""
            if third and len(third) <= 8:
                return True
    return False


def _extract_tables_robust(page) -> list:
    """여러 전략으로 페이지에서 테이블 추출 시도 (근로복지공단 PDF 최적화)"""
    # 1차: 기본 라인 전략 (대부분의 PDF에 작동)
    try:
        tables = page.extract_tables()
        if tables and any(len(t) > 2 for t in tables):
            return tables
    except Exception:
        pass

    # 2차: snap_tolerance 완화 (얇은 선/가벼운 색상 테두리 처리)
    try:
        tables = page.extract_tables(table_settings={
            "vertical_strategy": "lines",
            "horizontal_strategy": "lines",
            "snap_tolerance": 8,
            "intersection_tolerance": 8,
            "edge_min_length": 3,
        })
        if tables and any(len(t) > 2 for t in tables):
            return tables
    except Exception:
        pass

    # 3차: lines_strict 전략
    try:
        tables = page.extract_tables(table_settings={
            "vertical_strategy": "lines_strict",
            "horizontal_strategy": "lines_strict",
            "snap_tolerance": 5,
        })
        if tables and any(len(t) > 2 for t in tables):
            return tables
    except Exception:
        pass

    # 4차: 텍스트 기반 전략 (선이 없어도 텍스트 정렬로 열 감지)
    try:
        tables = page.extract_tables(table_settings={
            "vertical_strategy": "text",
            "horizontal_strategy": "lines",
            "snap_tolerance": 5,
        })
        if tables and any(len(t) > 2 for t in tables):
            return tables
    except Exception:
        pass

    # 5차: 완전 텍스트 기반
    try:
        tables = page.extract_tables(table_settings={
            "vertical_strategy": "text",
            "horizontal_strategy": "text",
        })
        if tables:
            return tables
    except Exception:
        pass

    return []


def _parse_rows_from_text(page) -> list[dict]:
    """
    테이블 추출이 완전히 실패한 페이지를 텍스트 직접 파싱으로 폴백.
    근로복지공단 근로내역서의 줄별 패턴을 regex로 추출.
    """
    try:
        text = page.extract_text(x_tolerance=3, y_tolerance=3) or ""
    except Exception:
        return []

    rows_out: list[dict] = []

    for line in text.split("\n"):
        line = line.strip()
        if not line or len(line) < 10:
            continue

        # 근로년월 패턴 감지
        ym_match = (
            re.search(r"(\d{4})\s*년\s*(\d{1,2})\s*월", line) or
            re.search(r"(\d{4})\s*[/\-.]\s*(\d{1,2})(?:\s|$|[^\d])", line)
        )
        if not ym_match:
            continue

        y = int(ym_match.group(1))
        m_raw = re.sub(r"\D", "", ym_match.group(2))
        if not m_raw:
            continue
        m = int(m_raw)
        if not (1 <= m <= 12 and 2000 <= y <= 2099):
            continue

        # 금액 패턴 (쉼표 포함 숫자, 최소 5자리 이상 = 만원 단위)
        amounts = re.findall(r"\d{1,3}(?:,\d{3}){1,}", line)
        if not amounts:
            continue

        # 가장 큰 금액을 임금총액으로 사용
        pay_str = max(amounts, key=lambda x: int(x.replace(",", "")))
        try:
            pay = float(pay_str.replace(",", ""))
        except ValueError:
            continue
        if pay <= 0:
            continue

        # 근로일수 패턴 (숫자 + '일')
        days_match = re.search(r"\b(\d{1,2})\s*일\b", line)
        n_days = int(days_match.group(1)) if days_match else 1
        if not (1 <= n_days <= 31):
            n_days = 1

        # 사업장명 추출: 근로년월 뒤, 직종코드 또는 숫자 앞 한글 텍스트
        after_ym_pos = ym_match.end()
        after_ym = line[after_ym_pos:].strip()
        # 한글+영문+특수문자로 이루어진 사업장명 (괄호, 숫자 포함)
        site_match = re.match(r"([가-힣A-Za-z0-9\s\[\]\(\)\/\.\-·_&]+?)(?:\s{2,}|\s*\d{2,}|\s*[가-힣]{1,2}(코드|직종|구분)\b|$)", after_ym)
        site = _normalize_company(site_match.group(1)) if site_match else ""

        daily_pay = pay / n_days
        for d in range(1, n_days + 1):
            try:
                dt = datetime(y, m, d)
                rows_out.append({"근무일": dt, "지급액": daily_pay, "사업장": site})
            except ValueError:
                break

    return rows_out


def _infer_column_indices(header: list) -> tuple[int, int, int, int, int]:
    """헤더 행에서 ym, site, dates, days, pay 열 인덱스 추론. 9열이면 (1,2,4,5,6) 사용."""
    n_cols = len(header)
    idx_ym = idx_site = idx_dates = idx_days = idx_pay = -1
    for i, h in enumerate(header):
        n = _norm(str(h or ""))
        if "근로년월" in n or ("근로" in n and "년월" in n) or "근로년" in n:
            idx_ym = i
        if "사업장" in str(h) and "명" in str(h):
            idx_site = i
        if "근로일자" in n or ("일자" in str(h) and "근로" in n):
            idx_dates = i
        if "근로일수" in n or ("일수" in str(h) and "근로" in n):
            idx_days = i
        if "임금총액" in n or "보수총액" in n or ("임금" in str(h) and "총액" in str(h)):
            idx_pay = i
    if n_cols >= 9 and (idx_ym < 0 or idx_pay < 0):
        return (1, 2, 4, 5, 6)
    if n_cols >= 7 and (idx_ym < 0 or idx_dates < 0 or idx_pay < 0):
        if n_cols == 9:
            return (1, 2, 4, 5, 6)
        if n_cols == 8:
            return (1, 2, 3, 4, 5)
        if n_cols == 7:
            return (0, 1, 2, 3, 4)
    if idx_ym < 0:
        idx_ym = 1
    if idx_site < 0:
        idx_site = 2 if n_cols > 2 else 0
    if idx_dates < 0:
        idx_dates = 4 if n_cols > 4 else 3
    if idx_days < 0:
        idx_days = 5 if n_cols > 5 else 4
    if idx_pay < 0:
        idx_pay = 6 if n_cols > 6 else n_cols - 1
    return (idx_ym, idx_site, idx_dates, idx_days, idx_pay)


def _parse_one_row(
    row: list,
    idx_ym: int,
    idx_site: int,
    idx_dates: int,
    idx_days: int,
    idx_pay: int,
    rows_out: list[dict],
) -> None:
    """한 행을 파싱해 rows_out에 일별 레코드 추가.
    - 근로년월 셀에 여러 연월이 개행(\\n)으로 함께 있을 경우 각 연월별로 분리해 기록
    - 금액 셀의 '원'·콤마(,) 제거 후 숫자로 변환
    """
    n_cols = len(row)
    if n_cols <= max(idx_ym, idx_site, idx_dates, idx_days, idx_pay):
        return
    i_ym, i_site, i_dates, i_days, i_pay = idx_ym, idx_site, idx_dates, idx_days, idx_pay
    if n_cols <= idx_pay:
        return

    site = _normalize_company(str(row[i_site] or ""))
    dates_raw = str(row[i_dates] or "").strip() if i_dates < n_cols else ""
    days_raw = str(row[i_days] or "").strip() if i_days < n_cols else ""
    # 금액: '원'·콤마 제거 후 정수 변환
    pay_str = str(row[i_pay] or "0").replace("원", "").replace(",", "").strip()
    pay_str = re.sub(r"[^\d.]", "", pay_str)
    try:
        pay = float(pay_str) if pay_str else 0.0
    except ValueError:
        return
    if pay <= 0:
        return

    days_clean = re.sub(r"[^\d]", "", str(days_raw or ""))
    try:
        n_days = int(days_clean) if days_clean else 0
    except ValueError:
        n_days = 0
    if n_days <= 0:
        for cell in row:
            if cell:
                mo = re.search(r"(\d{1,2})\s*일", str(cell))
                if mo:
                    n_days = min(31, max(1, int(mo.group(1))))
                    break
    if n_days <= 0:
        n_days = 1

    day_list: list[int] = []
    for part in re.split(r"[,,\s]+", dates_raw):
        part = part.strip()
        if part.isdigit():
            day_list.append(int(part))
    if not day_list and n_days > 0:
        day_list = list(range(1, n_days + 1))

    daily_pay = pay / n_days

    # 근로년월: 한 셀에 "2021/08\n2021/07" 같이 있으면 개행 기준으로 분리해
    # 각 연월(2021-08, 2021-07)에 대해 동일한 근로일자/금액을 별도 레코드로 생성
    ym_raw = str(row[i_ym] or "").strip()
    ym_parts = [p.strip() for p in ym_raw.split("\n") if p.strip()]
    if not ym_parts:
        return

    for ym_part in ym_parts:
        ym_parsed = _parse_ym(ym_part)
        if ym_parsed is None:
            continue
        y, m = ym_parsed

        for d in day_list:
            if 1 <= d <= 31:
                try:
                    dt = datetime(y, m, d)
                    rows_out.append({"근무일": dt, "지급액": daily_pay, "사업장": site or ""})
                except ValueError:
                    continue


def parse_welcomwel_pdf(file_bytes: bytes) -> pd.DataFrame:
    """
    근로복지공단 일용근로·노무제공내역서 PDF → 일별 DataFrame.
    연속 누적: 1페이지는 헤더 기준, 2페이지부터는 헤더 없이
    '첫 열 숫자(일련번호)' 또는 '둘째 열 날짜(20XX/XX)'인 행만 데이터로 수집.
    """
    if not HAS_PDFPLUMBER:
        return pd.DataFrame()

    all_data: list[dict] = []
    col_indices: tuple[int, int, int, int, int] | None = None

    try:
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for page_num, page in enumerate(pdf.pages):
                tables = _extract_tables_robust(page)

                if tables:
                    for ti, table in enumerate(tables or []):
                        if not table:
                            continue
                        try:
                            if page_num == 0 and ti == 0:
                                # 1페이지 첫 테이블: 헤더로 열 인덱스 결정, table[1:] 이 데이터
                                header = [str(c).strip() if c else "" for c in table[0]]
                                col_indices = _infer_column_indices(header)
                                data_rows = table[1:]
                            else:
                                # 2페이지 이후 또는 1페이지 추가 테이블: 헤더 없음 → 데이터 행만 사용
                                # 우선 엄격한 패턴(_is_data_row_no_header)으로 필터링하고,
                                # 아무 행도 남지 않으면 "열 순서만 동일한 일반 데이터 테이블"이라고 보고
                                # 전체 행(빈 행 제외)을 사용하는 완화 전략으로 재시도.
                                data_rows = [
                                    row for row in table
                                    if row and _is_data_row_no_header(row)
                                ]
                                if not data_rows:
                                    data_rows = [row for row in table if row]

                            idx_ym, idx_site, idx_dates, idx_days, idx_pay = col_indices
                            for row in data_rows:
                                if not row:
                                    continue
                                _parse_one_row(
                                    row, idx_ym, idx_site, idx_dates, idx_days, idx_pay, all_data
                                )
                        except Exception:
                            continue
                else:
                    try:
                        text_rows = _parse_rows_from_text(page)
                        all_data.extend(text_rows)
                    except Exception:
                        continue
    except Exception:
        return pd.DataFrame()

    if not all_data:
        return pd.DataFrame()

    df = pd.DataFrame(all_data)
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
