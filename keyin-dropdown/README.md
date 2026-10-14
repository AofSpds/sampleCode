# Key-in Dropdown

레거시 JSP에서 사용하는 **input 전용** Key-in Dropdown입니다. 기존 `input`의 `name`과 `value`를 직접 사용하며, 별도의 `span` 래퍼나 `hidden` 입력을 만들지 않습니다.

- 의존성: jQuery 1.9.1, jQuery UI Autocomplete (실제 운영 jQuery UI 버전은 미확인)
- `keyin-dropdown.js`: 공통 플러그인 `$.fn.keyinDropdown`
- `keyin-dropdown.css`: 기존 select 스타일
- `demo.html`: 고정 목록 + AJAX 테스트
- `mock-options.json`: AJAX 테스트 데이터

## JSP 적용

```html
<td colspan="2">
    <input type="text" name="fixedVendorWebId"
           class="js-rtype-combo" value="" style="width:250px;"
           autocomplete="off">
</td>
```

폼에서 보낼 값이 **code**이므로 `value`도 코드입니다. `codeLabel`은 펼친 목록에만 표시됩니다. 예를 들어 `{code:'ALL', codeLabel:'전체'}`라면 초기 `value="ALL"`을 사용하세요.

```javascript
var rTypeOptions = [
    { code: 'ALL', codeLabel: '전체' },
    { code: 'A', codeLabel: '자재' },
    { code: 'B', codeLabel: '시설투자' }
];

function initRTypeCombo() {
    $('#tbTarget input.js-rtype-combo').filter(function () {
        return !$(this).data('keyinDropdownReady');
    }).keyinDropdown({
        options: rTypeOptions,
        listWidth: 330,
        onKeyin: function (text) { /* 직접 입력한 code */ },
        onSelect: function (item) { /* item.code / item.codeLabel */ },
        onClear: function () { /* 입력값 초기화 */ }
    });
}
```

- 최초 화면 준비 후 `initRTypeCombo()` 호출
- ADD / COPY에서 **TR 추가와 값 복사가 모두 끝난 뒤** 다시 호출
- 그룹 식별자는 불필요합니다. 그룹 내 콤보가 없는 TR은 자동으로 건너뜁니다.
- 옵션을 클릭할 때마다 다시 바인딩하지 않습니다. 새 input만 초기화하면 됩니다.
- COPY는 기존 `input.value`(code)를 복사합니다. 초기화해도 기존 값을 덮어쓰지 않습니다.
- 반복되는 행에는 중복 ID 대신 `class`를 사용하세요.
- **초기화된 DOM을 복제하면 X·화살표 버튼도 복제됩니다.** 초기화 전 HTML 템플릿(`#tbSource`)을 사용하세요.

## AJAX로 동적 옵션 조회

DB에서 코드를 가져오는 경우:

```javascript
$('.js-rtype-combo').keyinDropdown({
    ajax: {
        url: '/your-code-list.do', // 실제 서버 Controller 경로로 교체
        type: 'GET',
        data: function () {
            return { plant: $('#plant').val() };
        }
    },
    listWidth: 330,
    onSelect: function (item) { console.log(item.code); },
    onError: function (xhr) { console.log(xhr.status); }
});
```

API 응답은 `[{ "code": "10", "codeLabel": "견적진행" }]` 형태의 JSON 배열이어야 합니다. 검색어는 `term`으로 전달됩니다. 요청 실패 시 `onError`가 실행됩니다. 실제 API가 다른 JSON 형식이면 변환이 필요합니다.

AJAX 방식에서는 새 행마다 **설정만 초기화**하고, 목록을 검색하거나 열 때 서버 조회합니다. COPY 시 기존 AJAX `source` 함수를 직접 복제하지 마세요.

## 이벤트와 값

| 동작 | input.value | 이벤트 |
| --- | --- | --- |
| 초기 로딩 | JSP에 이미 설정된 code 유지 | 없음 |
| 옵션 선택 | `item.code` | `onSelect(item)` |
| 직접 입력 | 사용자 입력 문자열 | `onKeyin(text)` |
| X 클릭 | `''` | `onClear()` |

플러그인 설정의 `name`, `initialCode`는 **제거**되었습니다. 서버 전송에 사용할 이름은 원본 input의 `name` 속성에 설정합니다.

## 기존 중복 ID 주의

이전 팝업에서 같은 `id="rTypeCombo"`가 5개 존재했습니다. `$('#rTypeCombo')`는 숨겨진 첫 input을 잡을 수 있습니다. 반복 화면에서는 반드시 class 기반으로 대상 범위를 제한하고, 테이블 복제 완료 후 초기화하세요.

## 테스트 / 통합 확인

jQuery 1.9.1 문법 호환을 기준으로 작성됐습니다. `demo.html`은 jQuery UI 1.10.4를 예시로 사용하며 운영 시스템 UI 버전은 별도 확인이 필요합니다.

현재 GitHub의 변경은 공통 컴포넌트와 예제만 해당합니다. 실제 JSP의 `btnCopy` / `btnAdd` 호출 위치와 컴포넌트 레이아웃은 현장 통합 테스트가 필요합니다.
