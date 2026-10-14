# Key-in Dropdown

기존 레거시 화면에 사용할 수 있는 **input 전용** jQuery UI Autocomplete 컴포넌트입니다.
JS는 ES5 스타일(`var`, `function`)이며 jQuery 1.9.1 호환을 기준으로 합니다.
실제 운영 화면의 jQuery UI 버전은 확인 후 검증해야 합니다.

## 파일

- `keyin-dropdown.js`: 단일 입력창을 콤보박스로 만드는 플러그인
- `keyin-dropdown.css`: 기존 select에 가까운 디자인
- `demo.html`: 고정 옵션 + AJAX 예시
- `mock-options.json`: 로컬 AJAX 예제용 JSON

## JSP

**기존 `td` 또는 `colspan`은 그대로 두고 input 하나만 배치합니다.**

```html
<td colspan="3">
    <input type="text" id="rTypeCombo" value="전체"
           style="width:250px;" autocomplete="off">
</td>
```

```javascript
$(function () {
    $('#rTypeCombo').keyinDropdown({
        name: 'rTypeCd',        // 자동 생성되는 hidden 필드명
        initialCode: 'ALL',    // 최초 선택 코드
        listWidth: 330,        // 펼친 목록의 최소 폭
        options: [
            { code: 'ALL', codeLabel: '전체' },
            { code: 'A', codeLabel: '자재' },
            { code: 'B', codeLabel: '시설투자' },
            { code: 'C', codeLabel: '용역' }
        ],
        onKeyin: function (text) { /* 직접 입력 시 */ },
        onSelect: function (item) { /* item.code, item.codeLabel */ },
        onClear: function () { /* X 초기화 시 */ }
    });
});
```

- `<span class="keyin-dropdown">...</span>`으로 초기화하는 구 방식은 **지원하지 않습니다.** 내부의 span/버튼/hidden은 JS가 자동 생성합니다.
- 입력창의 `width`가 컴포넌트 폭이 됩니다. 셀 너비까지 채울 필요가 없으면 `width:100%` 대신 픽셀 값을 지정하세요.
- `options`는 화면의 DOM `<option>` 요소가 아니라 Autocomplete 데이터입니다. 버튼이나 입력창 클릭 시 목록을 확인합니다.
- 기본 hidden 코드값과 입력창 표시값은 분리됩니다. 직접 입력 시 hidden 값은 비워지고, 선택 시 해당 code가 들어갑니다.
- 코드값은 `name`으로, 직접 입력 문자열도 서버에 전송해야 한다면 **표시용 input에도 별도의 name**을 지정하세요.

## AJAX

```javascript
$('#statusCombo').keyinDropdown({
    name: 'statusCd',
    ajax: {
        url: '/your-code-list.do', // 실제 프로젝트 Controller 경로로 교체
        type: 'GET',
        data: function () {
            return { plant: $('#plant').val() };
        }
    },
    onSelect: function (item) {
        console.log(item.code, item.codeLabel);
    },
    onError: function (xhr) {
        console.log(xhr.status);
    }
});
```

- API 기본 계약: `[{"code":"10","codeLabel":"견적진행"}, ...]` 최상위 JSON 배열
- 검색어는 `term` 파라미터로 전송하고 200ms debounce를 적용합니다.
- `onError`는 선택사항입니다. 실제 URL/응답 구조에 맞춰 변경해야 합니다.
- 독립 데모의 AJAX를 확인하려면 `python -m http.server 8000`으로 HTTP 서버를 열고 `/demo.html`을 실행하세요.

## MPS 팝업에서 확인할 항목

팝업 DevTools의 **Sources 화면이 브레이크포인트에서 멈췄다면 F8로 Resume**해야 플러그인 변환 코드가 실행됩니다.

```javascript
typeof $.fn.keyinDropdown                // 'function'
typeof $.fn.autocomplete                 // 'function' (jQuery UI 로드 확인)
$('#rTypeCombo').length                  // 1
$('#rTypeCombo').data('keyinDropdownReady') // 초기화 후 true
$('#rTypeCombo').parent().attr('class')  // keyin-dropdown
$('#rTypeCombo').autocomplete('option', 'source') // options면 배열
```

JS/CSS는 팝업에서 읽히는 위치에 각각 등록해야 합니다. jQuery UI가 없다면 내부 요소를 생성하기 전에 예외가 발생하므로 원래 input이 그대로 남습니다. 실제 JSP에서는 중복 jQuery 로딩을 피하세요.

## 테스트 범위

GitHub 커밋에는 HTML input만 사용하는 예제와 AJAX 데모를 포함합니다. 로컬 mock 검사와 자바스크립트 구문 검증은 별도이며, 실제 MPS JSP 전체 CSS·스크립트 조합에 대한 브라우저 통합 검증은 필요합니다.
