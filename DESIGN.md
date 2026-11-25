---
version: alpha
name: 타일과 딸기색
description: 밝은 세라믹 타일과 딸기색 포인트를 출장여비 계산기에 적용한 화면 디자인
colors:
  primary: "#A83143"
  on-primary: "#FFFFFF"
  primary-hover: "#782A38"
  primary-soft: "#F7E8E7"
  canvas: "#EEECE8"
  tile-edge: "#D5D0CA"
  tile-highlight: "#FFFDFB"
  surface: "#FFFEFA"
  on-surface: "#342823"
  muted: "#675751"
  divider: "#E3DAD3"
  field: "#FCFAF7"
  field-border: "#D8C9C2"
  result: "#6D2834"
  result-highlight: "#9B394B"
  on-result: "#FFF7EB"
typography:
  heading:
    fontFamily: "Batang, 바탕, AppleMyungjo, Noto Serif CJK KR, Georgia, serif"
    fontSize: 3.65rem
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: -0.065em
  body:
    fontFamily: "Malgun Gothic, 맑은 고딕, Apple SD Gothic Neo, system-ui, sans-serif"
    fontSize: 1rem
    lineHeight: 1.55
rounded:
  field: 7px
  card: 13px
  dialog: 18px
spacing:
  tiles: 26px
  tiles-mobile: 22px
  column-gap: 22px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.field}"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.field}"
    height: 45px
  result-card:
    backgroundColor: "{colors.result}"
    textColor: "{colors.on-result}"
    rounded: "{rounded.card}"
---

# 출장여비 계산기 디자인

## Overview

참조 이미지에는 밝은 정사각 타일, 위에서 내려다본 소품, 부드러운 그림자가 반복된다. 큰 제목은 짙은 갈색 세리프체로 쓰였고, 딸기와 포장의 붉은색이 시선을 끈다. 소품은 세로축을 따라 서로 다른 높이에 배치되어 있고, 주변 여백 덕분에 각 장면이 뚜렷하게 보인다.

계산기에서는 타일을 페이지 배경으로, 그림자를 카드의 경계로, 붉은색을 계산 버튼과 결과 강조에 사용한다. 이미지에서 관찰한 분위기를 바탕으로 화면에서 읽기 쉬운 색을 골랐다. 참조 이미지는 `스크린샷 2026-11-25 135914.png`이며, 현재 화면 스타일은 `@strawberry-theme.css`와 `@styles.css`에 있다.

## Colors

| 역할 | 색 | 쓰임 |
| --- | --- | --- |
| 타일과 카드 | `#EEECE8` · `#FFFEFA` | 배경 격자는 패널 바깥에 드러나고, 입력 영역은 단색 카드 위에 놓인다. |
| 타일의 경계와 반사광 | `#D5D0CA` · `#FFFDFB` | 1px 경계와 1px 밝은 선을 겹쳐 얕은 줄눈을 만든다. |
| 본문과 보조 문구 | `#342823` · `#675751` | 제목과 주요 본문은 짙은 갈색, 도움말과 계산 기준은 밝은 갈색을 쓴다. |
| 딸기색 강조 | `#A83143` · `#782A38` · `#F7E8E7` | 계산 버튼, 선택 상태, 키보드 포커스에 쓴다. 연한 분홍은 보조 동작에 쓴다. |
| 결과 강조 | `#6D2834` · `#9B394B` · `#FFF7EB` | 버건디 결과 카드에 옅은 그라데이션을 더하고, 예상 지급액은 밝게 표시한다. |

## Typography

- 페이지 제목과 카드 제목에는 바탕 계열 세리프체를 사용한다. 페이지 제목은 `clamp(2.3rem, 5vw, 3.65rem)` 범위에서 화면 폭에 맞춰 조정한다.
- 입력값과 도움말은 맑은 고딕 계열을 사용한다. 기본 본문은 `1rem`, 도움말은 `0.875rem`을 기준으로 한다.
- 예상 지급액은 카드에서 가장 크게 표시한다. 항목별 금액은 오른쪽에 정렬하고 숫자 폭을 일정하게 맞춘다.
- 운영체제에 설치된 글꼴을 순서대로 사용해 오프라인에서도 표시한다.

## Layout

- 페이지 최대 폭은 `1120px`이다. 넓은 화면에서는 입력 영역과 결과 영역을 `1.8:1` 비율로 나누고 `22px` 간격을 둔다. 제목과 사용설명서 버튼은 그 위에 배치한다.
- `800px` 이하에서는 입력, 예상 지급액, 계산 기준을 한 열로 쌓는다. `430px` 이하에서는 타일 한 칸을 `26px`에서 `22px`로 줄인다.
- 출장 정보, 지급 조건, 숙박 내역은 얇은 구분선과 여백으로 나눈다. 여백과 배경 소재가 참조 이미지의 세로 흐름을 이어준다.

## Elevation & Depth

밝은 카드는 얇은 경계선과 갈색 계열의 부드러운 그림자로 배경에서 살짝 띄운다. 결과 카드는 버건디 명암으로 위계를 구분하고, 사용설명서 팝업은 반투명한 갈색 배경으로 입력 화면과 구분한다.

## Shapes

배경 타일은 직각으로 반복한다. 카드에는 `13px`, 입력 필드와 버튼에는 `7px`, 사용설명서 팝업에는 `18px` 모서리를 적용한다.

## Components

- **출장 유형 선택**은 중립색 바탕 위에 밝은 선택 면, 붉은 글자, 테두리를 함께 사용한다.
- **입력 필드**는 옅은 단색 바탕에 외곽선을 두고, 항목명은 필드 위에 배치한다.
- **계산 및 출력 버튼**은 계산을 딸기색으로 강조하고, 인쇄와 엑셀 저장은 결과 카드 안의 밝은 버튼으로 배치한다.
- **사용설명서**는 제목과 닫기 버튼을 상단에 두며, 작은 화면에서는 내용 영역을 스크롤할 수 있다. 키보드에서도 버튼과 포커스를 확인할 수 있다.
- **인쇄 결과**는 A4 흰 배경에 검은 글자로 출력한다. 금액과 세부내역은 선과 글자 굵기로 구분한다.

## Do's and Don'ts

- 격자 밀도를 일정하게 유지하고, 입력과 결과는 단색 면 위에 배치해 읽기 쉽게 한다.
- 선택과 포커스는 색뿐 아니라 외곽선과 면의 변화로도 드러낸다.
- 이미지의 시각적 특징은 CSS 색상, 격자, 여백, 서체로 표현한다. 화면에 추가하는 요소는 계산 또는 사용 안내에 필요한 것으로 한정한다.
