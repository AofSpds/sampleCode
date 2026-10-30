# Key-in Dropdown

레거시 JSP에서 사용하는 **input 전용** Key-in Dropdown입니다. `code` 모드는 기존 input의 `name`/`value`를 유지합니다. `codeLabel`·`both`·`custom` 모드는 표시 input과 전송용 hidden(코드)을 분리합니다. 어느 모드에서도 `span` 래퍼는 만들지 않습니다.

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

**JSP의 최초 `value`는 항상 코드**입니다. `codeLabel`/`both`/`custom`에서도 플러그인이 최초 값을 코드로 간주하고 표시문구를 조회/구성합니다. 공급업체 input에 `value="전체"`를 넣지 마세요. 미선택은 `value=""`입니다.

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
- `code` 모드의 COPY는 기존 input.value(code) 복사입니다. `codeLabel` 등에서는 **이름이 붙은 hidden의 코드**를 새 행의 초기 input에 복사해야 합니다(아래 COPY 주의 참조).
- 반복되는 행에는 중복 ID 대신 `class`를 사용하세요.
- **초기화된 DOM을 복제하면 X·화살표 버튼도 복제됩니다.** 초기화 전 HTML 템플릿(`#tbSource`)을 사용하세요.

## AJAX로 동적 옵션 조회 (공급업체 / MPS Controller)

`getPartRows($tr)`는 기존 MPS의 `partStart`~`partEnd` 그룹 조회 함수를 사용합니다.

Controller: `/ajax/pr/retrieveVendorByMatCdList.do`

```javascript
function initVendorCombo() {
    $('#tbTarget input.js-rtype-combo').filter(function () {
        return !$(this).data('keyinDropdownReady');
    }).keyinDropdown({
        listWidth: 330,
        displayMode: 'codeLabel', // 화면은 업체명, 전송은 업체코드
        autoSelectSingle: true, // 빈 콤보에서 AJAX 결과 1건이면 자동 선택(기본 false)
        ajax: {
            url: "<c:url value='/ajax/pr/retrieveVendorByMatCdList.do'/>",
            type: 'GET',
            responseField: 'successList',
            data: function () {
                var $partRows = getPartRows($(this).closest('tr'));
                return {
                    matCd: $partRows.find("input[name='matCd']").first().val() || ''
                };
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
- `data` 함수의 `this`는 현재 **표시 input**입니다. `getPartRows($(this).closest("tr"))`로 소속 그룹의 현재 `matCd`를 읽습니다. 자재가 바뀌면 기존 업체 선택값을 X 버튼으로 초기화합니다.
- ADD/COPY에서는 새 input에 이 AJAX 설정을 초기화하고, **실제 업체 목록은 사용자가 검색/목록 열기 시점에 서버 조회**합니다. 기존 AJAX `source` 함수를 복제하지 않습니다.
- 실패 시 `onError(xhr)`가 호출됩니다. 응답에 지정된 배열이 없으면 목록을 비워 보여줍니다.

## AJAX 단일 후보 자동 선택 (선택 옵션)

`autoSelectSingle: true`를 설정한 AJAX 콤보만 자동 선택합니다. 기본값은 `false`이므로 기존 화면의 동작은 바뀌지 않습니다.

- **자동 선택:** 빈 표시 input에서 목록을 열어(`term: ''`) 필터 결과가 정확히 1건이고 `code`가 비어 있지 않으며 전송용 hidden에도 기존 코드가 없는 경우. `setSelected(item)`을 재사용해 표시값·전송 코드를 함께 갱신하고 `onSelect(item)`을 한 번 실행합니다. 자동 선택 후 목록은 닫힌 상태로 유지합니다.
- **기존 동작 유지:** 0건 또는 2건 이상, 검색어 직접 입력으로 1건만 남은 경우, 이미 선택된 코드/표시값이 있는 경우, 정적 `options` 방식.
- **초기화 시 자동조회 없음:** 빈 JSP input을 초기화했다고 자동 조회하지 않습니다. 최초 코드가 있는 경우의 AJAX 명칭 복원은 별도 기존 기능이며 자동 선택 `onSelect`를 발생시키지 않습니다.
- **늦은 AJAX 응답 보호:** 전송 중 입력·X 삭제·선택이 바뀌었거나 새 검색이 시작됐거나 `ajax.data()`의 자재코드/플랜트 등 조회 조건이 달라지면 이전 응답을 자동 선택하지 않습니다. 조건 비교를 위해 `ajax.data()`는 현재 값을 반환해야 합니다.
- 자재코드/플랜트 변경 후 **기존 업체 선택값을 지우는 처리**는 종전처럼 JSP 팝업 콜백/화면 이벤트에서 수행합니다. 이 옵션은 기존 선택을 강제로 변경하지 않습니다.

## displayMode와 서버 전송값

| 설정 | 표시 input | 서버로 전송되는 값 |
| --- | --- | --- |
| `code` (기본) | `100002` | `100002` |
| `codeLabel` | `(주)엘지상사` | `100002` |
| `both` | `100002 (주)엘지상사` | `100002` |
| `custom` | `displayFormat(item)` 결과 | `100002` |

~~~javascript
$('#tbTarget input.js-rtype-combo').keyinDropdown({
    displayMode: 'custom',
    displayFormat: function (item) {
        return item.codeLabel + ' [' + item.code + ']';
    },
    // options: [...] 또는 ajax: {...}
});
~~~

- `code` 모드는 기존 input 하나만 사용하며 hidden을 만들지 않습니다.
- 나머지 모드는 **원래 name을 hidden으로 이동**시킵니다. 예: `input[name=fixedVendorWebId]`는 hidden 코드값, `.js-rtype-combo`는 이름 없는 표시 input입니다. `serializeArray()`/일반 폼 전송 시 코드는 한 번만 전송됩니다.
- `$(this).val()`은 non-code 모드의 표시값입니다. 선택 코드가 필요하면 `$(this).data("keyinDropdownCodeInput").val()` 또는 `onSelect(item).code`를 사용합니다.
- 직접 타이핑하면 hidden 코드는 비웁니다(미선택 문자열을 코드로 잘못 전송하지 않기 위함). 옵션 선택 또는 X 버튼 사용 시 코드와 표시값을 함께 갱신합니다.
- 최초 JSP input의 `value`에 코드가 있고, 정적 `options`에 해당 코드가 있으면 표시명을 즉시 복원합니다. AJAX이면 **초기 조회로 명칭을 확인**하며, 조회 전에는 코드가 임시로 보일 수 있습니다. 조회 결과에 코드가 없다면 잘못된 명칭을 표시하지 않고 코드를 남깁니다.
- 초기 JSP가 `data-code-label="(주)엘지상사"`도 제공하면 초기 AJAX 조회 없이 즉시 표시할 수 있습니다. `custom`은 추가 필드가 필요하면 옵션 조회 결과를 이용해야 합니다.
- **COPY 주의:** 기존 명칭 표시 input에는 `name`이 없습니다. 기존 `obj.each()` 복사 루프에서 `var objName = $(this).attr("name"); if (!objName) return;`로 표시 전용 input을 건너뛰어야 합니다. 원본의 named hidden 코드가 새 JSP 템플릿의 named input으로 복사되도록 하고, 모든 복사가 끝난 후 `initVendorCombo()`를 호출하세요.
- `.val()`로 업체 코드를 수동 변경하는 경우 hidden만 바뀌므로 표시값이 자동 갱신되지 않습니다. MPS의 ADD/COPY는 초기화 전 코드 복사 후 초기화하는 순서를 사용하세요.

## 이벤트와 값

| 동작 | input.value | 이벤트 |
| --- | --- | --- |
| 초기 로딩 | code 모드: JSP 코드 / 기타: 옵션으로 변환된 문구 | 없음 |
| 옵션 선택 | displayMode에 따라 표시 / hidden에 code | `onSelect(item)` |
| 직접 입력 | 입력 문자열 / non-code hidden 코드 비움 | `onKeyin(text)` |
| X 클릭 | 표시값 및 hidden 코드 `''` | `onClear()` |

플러그인 설정의 `name`, `initialCode`는 **사용하지 않습니다**. 서버 전송 이름은 JSP 원본 input의 `name`에 설정합니다. `displayMode`는 초기화 시 정하므로 이미 초기화된 input은 옵션만 바꾸어 재초기화하지 않습니다.

## 기존 중복 ID 주의

이전 팝업에서 같은 `id="rTypeCombo"`가 5개 존재했습니다. `$('#rTypeCombo')`는 숨겨진 첫 input을 잡을 수 있습니다. 반복 화면에서는 반드시 class 기반으로 대상 범위를 제한하고, 테이블 복제 완료 후 초기화하세요.

## 테스트 / 통합 확인

jQuery 1.9.1 문법 호환을 기준으로 작성됐습니다. `demo.html`은 jQuery UI 1.10.4를 예시로 사용하며 운영 시스템 UI 버전은 별도 확인이 필요합니다.

현재 GitHub의 변경은 공통 컴포넌트와 예제만 해당합니다. 실제 JSP의 `btnCopy` / `btnAdd` 호출 위치와 컴포넌트 레이아웃은 현장 통합 테스트가 필요합니다.
