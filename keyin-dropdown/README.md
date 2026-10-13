# Key-in Dropdown

레거시 시스템의 기존 `select` 스타일을 유지하면서 직접 입력(Key-in), 옵션 선택, X 초기화를 지원하는 공통 UI 예제입니다.

## 구성

- `keyin-dropdown.js` — jQuery 공통 메서드 `$.fn.keyinDropdown`
- `keyin-dropdown.css` — 레거시 UI 호환 스타일
- `demo.html` — 실행 예제

**기본 의존성:** jQuery 1.9.1 및 jQuery UI Autocomplete. 독립 데모는 CDN을 사용합니다. 실제 JSP에서는 이미 로드된 jQuery, jQuery UI를 재사용하고 CSS/JS 파일만 추가하세요.

## JSP 예제

```html
<span id="rTypeCombo" class="keyin-dropdown" style="width:150px">
    <input type="text" class="keyin-text" autocomplete="off" aria-label="구매요청유형">
    <input type="hidden" class="keyin-code" name="rTypeCd">
    <button type="button" class="keyin-clear" aria-label="입력 지우기">×</button>
    <button type="button" class="keyin-arrow" aria-label="옵션 열기"></button>
</span>
```

```javascript
$(function () {
    $('#rTypeCombo').keyinDropdown({
        options: [
            { code: 'A', codeLabel: '자재' },
            { code: 'B', codeLabel: '시설투자' },
            { code: 'C', codeLabel: '용역' }
        ],
        listWidth: 260,
        onKeyin: function (text) {
            // 사용자가 직접 입력한 문자열
        },
        onSelect: function (item) {
            // 선택한 item.code 및 item.codeLabel
        },
        onClear: function () {
            // X 버튼으로 두 필드 초기화
        }
    });
});
```

`options`를 생략하면 내부 `<select class="keyin-options"><option value="A">자재</option></select>`의 항목을 읽습니다. 이 `select`에는 `name`을 넣지 않아야 중복 전송을 방지할 수 있습니다.

## 이벤트와 값

| 동작 | text input | hidden code | 콜백 |
| --- | --- | --- | --- |
| 직접 입력 | 입력 문자열 | 빈 문자열 | `onKeyin(text)` |
| 옵션 선택 | `codeLabel` | `code` | `onSelect(item)` |
| X 클릭 | 빈 문자열 | 빈 문자열 | `onClear()` |
| 초기 로딩 | JSP에서 지정한 value | JSP에서 지정한 value | 없음 |

목록은 **code + codeLabel**로 표시하고 선택 후 입력창에는 **codeLabel**만 보여줍니다. 서버에서 직접 입력을 받아야 하면 text input에도 별도 `name`을 지정하고 hidden code가 비었을 때의 처리 기준을 정의하세요.

## 코딩 기준

- 실제 제공된 기존 프로젝트 코드 패턴에 맞춰 `$(function () {})`, `var`, jQuery `.on()` 이벤트를 사용
- 콤보별 상태는 `.each()` 스코프 내부에 보관, 임의 전역 상태변수 없음
- 화면에서 호출할 공개 API만 `$.fn.keyinDropdown`으로 한 개 등록
- 기본 폭 130px, 개별 폭 및 펼친 목록 폭 조절 가능
- 화살표의 왼쪽 구분선 없음, X는 값이 있을 때만 표시
- 기존 jQuery UI Autocomplete에 필터링·방향키·Enter·Esc 처리를 위임

**검증 범위:** 제공된 JSP/CSS 화면 정보와 공통 JS 발췌를 기준으로 정리한 초안입니다. 실제 배포 환경에서의 동작 및 jQuery UI 버전·CSS 충돌 여부는 통합 확인이 필요합니다.
