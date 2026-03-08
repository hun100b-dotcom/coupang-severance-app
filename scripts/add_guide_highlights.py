#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
가이드 이미지에 토스 스타일 하이라이트(둥근 파란 사각형)를 추가하는 스크립트.
실행: python scripts/add_guide_highlights.py
개인정보 마스킹은 이미지 편집 도구로 수동 적용 후 assets/guide/에 교체해 주세요.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "guide"
BLUE = (49, 130, 246)  # #3182f6
HIGHLIGHT_WIDTH = 4
RADIUS = 12

# (이미지별) 하이라이트할 영역: (x1%, y1%, x2%, y2%) 형태. 0~100 퍼센트.
# 필요 시 좌표를 수정해서 클릭할 부분을 감싸 주세요.
HIGHLIGHTS = {
    1: [(15, 55, 45, 72)],   # Step1: 자주 찾는 서비스 중 "자격 이력 내역서" 카드
    2: [(5, 18, 28, 24), (25, 42, 45, 52), (30, 58, 55, 65)],  # Step2: 상단 탭, 왼쪽 메뉴, 고용/일용·조회
    3: [(20, 45, 80, 72), (35, 78, 55, 88)],   # Step3: 테이블 영역, 신청 버튼
    4: [(5, 18, 28, 24), (25, 35, 55, 45), (35, 75, 65, 88)],  # Step4: 탭, 메뉴, 증명원 출력 버튼
}


def draw_highlight_rect(draw, xy, outline, width):
    """둥근 사각형 또는 일반 사각형으로 클릭 영역 강조."""
    x1, y1, x2, y2 = xy
    if hasattr(draw, "rounded_rectangle"):
        draw.rounded_rectangle([x1, y1, x2, y2], radius=RADIUS, outline=outline, width=width)
    else:
        draw.rectangle([x1, y1, x2, y2], outline=outline, width=width)


def add_highlights_to_image(img_path: Path, out_path: Path, rects_pct: list):
    img = Image.open(img_path).convert("RGB")
    w, h = img.size
    draw = ImageDraw.Draw(img)
    for (x1_pct, y1_pct, x2_pct, y2_pct) in rects_pct:
        x1 = int(w * x1_pct / 100)
        y1 = int(h * y1_pct / 100)
        x2 = int(w * x2_pct / 100)
        y2 = int(h * y2_pct / 100)
        draw_highlight_rect(draw, (x1, y1, x2, y2), BLUE, HIGHLIGHT_WIDTH)
    img.save(out_path, quality=95)
    print(f"Saved: {out_path}")


def main():
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)
    for i in range(1, 5):
        src = ASSETS_DIR / f"guide_step{i}.png"
        if not src.exists():
            print(f"Skip (not found): {src}")
            continue
        rects = HIGHLIGHTS.get(i, [])
        if not rects:
            print(f"Skip (no rects): step {i}")
            continue
        out = ASSETS_DIR / f"guide_step{i}_hl.png"
        add_highlights_to_image(src, out, rects)
    print("Done. 앱에서 _hl 이미지를 사용하려면 app.py의 render_guide_expander에서 _hl을 우선 로드하도록 변경하세요.")


if __name__ == "__main__":
    main()
