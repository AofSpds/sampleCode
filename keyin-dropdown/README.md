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

## AJAX로 동적 옵션 조회 (공급업체 / MPS Controller)

Controller: `/ajax/pr/retrieveVendorByMatCdList.do`

```javascript
function initVendorCombo() {
    $('#tbTarget input.js-rtype-combo').filter(function () {
        return !$(this).data('keyinDropdownReady');
    }).keyinDropdown({
        listWidth: 330,
        ajax: {
            url: "<c:url value='/ajax/pr/retrieveVendorByMatCdList.do'/>",
            type: 'GET',
            responseField: 'successList',
            data: function () {
                // #matCd가 화면에서 유일할 때의 예시
                return { matCd: $('#matCd').val() };
            }
        },
        onSelect: function (item) {
            console.log(item.code, item.codeLabel);
        },
        onError: function (xhr) {
            console.log('공급업체 조회 실패:', xhr.status);
        }
    });
}
```

실제 Controller 응답은 **최상위 JSON 객체**이며, 업체 목록은 `successList`에 들어갑니다.

```json
{
  "successList": [
    {
      "VendorWebId": "100002",
      "VendorName": "(주)엘지상사",
      "code": "100002",
      "codeLabel": "(주)엘지상사"
    }
  ]
}
```

- `responseField: 'successList'`를 사용하면 객체에서 배열을 추출합니다. 기존처럼 **JSON 배열 자체를 반환하는 API도 계속 지원**합니다.
- `successList`의 개별 항목은 플러그인에서 읽는 `code`, `codeLabel`을 제공해야 합니다. 테스트 Java 메서드가 `VendorWebId`와 `VendorName`만 반환한다면 대응 별칭을 추가해야 합니다.
- `term`이 검색어로 자동 전달됩니다. 직접 입력 중에는 약 200ms 지연 후 요청하며, 목록을 열 때에도 요청합니다.
- **TR 그룹마다 자재코드가 다르면** `$('#matCd')`는 올바르지 않을 수 있습니다. `data` 함수의 `this`는 현재 콤보 input이므로, 실제 JSP의 자재코드 위치에 맞게 `$(this)`를 기준으로 찾아야 합니다. 그룹 구조가 확정되지 않았으므로 임의로 검색 경로를 가정하지 않습니다.
- ADD/COPY에서는 새 input에 이 AJAX 설정을 초기화하고, **실제 업체 목록은 사용자가 검색/목록 열기 시점에 서버 조회**합니다. 기존 AJAX `source` 함수를 복제하지 않습니다.
- 실패 시 `onError(xhr)`가 호출됩니다. 응답에 지정된 배열이 없으면 목록을 비워 보여줍니다.

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
