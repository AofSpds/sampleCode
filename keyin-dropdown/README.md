# Key-in Dropdown

레거시 시스템의 기존 `select` 스타일을 유지하면서 직접 입력(Key-in), 옵션 선택, X 초기화를 지원하는 공통 UI 예제입니다.

## 구성

- `keyin-dropdown.js` — jQuery 공통 메서드 `$.fn.keyinDropdown`
- `keyin-dropdown.css` — 레거시 UI 호환 스타일
- `demo.html` — 고정/HTML/AJAX 세 가지 예제
- `mock-options.json` — AJAX 테스트용 코드 목록 (실제 API가 아님)

**기본 의존성:** 사용자가 확인한 jQuery **1.9.1** 및 jQuery UI Autocomplete. **jQuery UI 버전은 미확인**이며, 독립 데모의 UI 1.10.4는 예시 버전입니다. 실제 JSP에서는 이미 로드된 jQuery/jQuery UI를 재사용하고 CSS/JS 파일만 추가하세요.

브라우저 콘솔에서 실행 버전을 확인합니다.

```javascript
jQuery.fn.jquery     // 현재 화면에서 실행되는 jQuery 버전
jQuery.ui.version    // 현재 화면에서 실행되는 jQuery UI 버전 (UI가 로드된 경우)
```

실제 화면의 jQuery UI 버전을 확인한 후 자동완성 동작을 최종 검증해야 합니다. **독립 데모**는 jQuery 1.9.1과 jQuery UI 1.10.4를 예시로 사용합니다.

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


## 화면 버그 수정 (2026-10-13)

증상: `4 results are available...` 안내 문구가 화면에 노출되고, 드롭다운 옵션 목록이 다른 컨트롤과 겹치거나 잘못 배치됨.

- 원인 추정: jQuery UI 기본 테마 CSS 미적용/충돌로 `.ui-helper-hidden-accessible` 및 `.ui-autocomplete` 기본 스타일이 누락됨
- CSS 보완: 접근성 안내 영역을 화면에서만 숨기고(스크린리더 접근 유지), 자동완성 목록에 `position: absolute`, 기본 리스트 스타일 적용
- JS 보완: 자동완성 메뉴에 `.keyin-dropdown-menu` 클래스를 **최초 메뉴 오픈 전에** 지정하여 위치 계산에 반영. 다른 콤보로 포커스 이동 시 이전 목록 닫기
- 가변폭, X 초기화, `options`, `onKeyin`, `onSelect`, `onClear` 기능 유지

가능하면 실제 프로젝트에서 기존 jQuery UI CSS가 정상 로드되는지도 확인하세요. 본 CSS는 필수 최소 스타일을 보완하지만 jQuery UI 전체 테마를 대체하는 목적은 아닙니다.

브라우저 렌더링 확인은 CSS를 적용한 독립 테스트 DOM에서 수행했습니다. 운영 JSP의 전체 이벤트 경로 및 실제 jQuery UI 버전 조합은 현장 검증이 필요합니다.

## AJAX로 동적 옵션 조회

정적 `options`는 그대로 지원하며, 서버 조회가 필요할 때만 `ajax`를 설정합니다. `ajax`를 지정하면 해당 콤보는 정적 옵션보다 AJAX 응답을 우선합니다.

```javascript
$(function () {
    $('#rTypeCombo').keyinDropdown({
        ajax: {
            url: '/your-api/code-list.do',  // 예시 경로. 실제 Controller URL로 변경
            type: 'GET',
            data: function () {
                return { plant: $('#plant').val() };
            }
        },
        listWidth: 300,
        onKeyin: function (text) {
            // 키보드 직접 입력
        },
        onSelect: function (item) {
            // item.code, item.codeLabel
        },
        onClear: function () {
            // 초기화
        },
        onError: function (xhr) {
            // API 오류 처리(선택)
            console.log('코드 조회 실패:', xhr.status);
        }
    });
});
```

- 서버는 **JSON 배열** `[{"code":"10","codeLabel":"견적진행"}, ...]`을 반환해야 합니다.
- URL은 프로젝트 API에 맞게 교체해야 합니다. 위 `/your-api/code-list.do`는 실제 서비스가 아닙니다.
- 사용자가 입력하거나 목록을 열 때 `term` 파라미터를 전송합니다. `data`는 객체 또는 함수로 지정할 수 있습니다.
- 입력 중 AJAX 호출은 약 **200ms** 대기 후 실행합니다. 목록을 열면 `term=`으로 전체 옵션을 요청합니다.
- 서버가 `term`을 처리하면 서버 검색이 가능합니다. 소량의 전체 목록을 반환해도 화면에서 다시 필터링합니다.
- 실패 시 목록은 빈 배열이 되고 `onError(xhr)`가 호출됩니다. 기존 입력값과 hidden 코드값은 변경하지 않습니다.
- 직접 입력 시 hidden 코드를 비우고, 옵션 선택 시 코드와 명칭을 각각 보관합니다.

### AJAX 데모 실행

`mock-options.json`은 단순 테스트 데이터이므로 **HTTP 서버로 실행**해야 합니다. 브라우저에서 `file://`로 `demo.html`을 열면 AJAX가 제한될 수 있습니다.

```bash
cd keyin-dropdown
python -m http.server 8000
```

브라우저에서 `http://localhost:8000/demo.html`을 열면 됩니다. 독립 데모는 CDN에서 jQuery / jQuery UI를 로드하므로 인터넷 연결이 필요합니다. 실제 JSP에서는 이미 로드된 파일을 재사용하세요.

주의: 실제 API가 `{"list":[...]}`와 같은 객체로 응답한다면 AJAX `success` 부분에서 목록 필드 추출을 추가해야 합니다. 현재 기본 계약은 최상위 JSON 배열입니다.
