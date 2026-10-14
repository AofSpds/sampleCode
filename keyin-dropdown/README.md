# Key-in Dropdown

jQuery 1.9.1 + jQuery UI Autocomplete 기반의 **input 전용** Key-in Dropdown입니다.

## HTML (JSP)

```html
<td colspan="3">
    <input type="text" id="rTypeCombo" value="ALL"
           style="width:250px;" autocomplete="off">
</td>
```

- 원본 input을 그대로 사용합니다. **span/wrapper를 생성하거나 지원하지 않습니다.**
- hidden code 필드, X 버튼, 화살표 버튼만 input 뒤에 형제 요소로 자동 추가합니다.
- `td`, `colspan`, input `id` 및 `width`는 변경하지 않습니다.
- 실제 서버 전송용 hidden `name`을 지정하고, 직접 입력 문자열도 서버에 전송할 경우 input에 별도 `name`을 지정합니다.

## 고정 옵션

```javascript
$(function () {
    $('#rTypeCombo').keyinDropdown({
        name: 'rTypeCd',
        initialCode: 'ALL',
        listWidth: 330,
        options: [
            { code: 'ALL', codeLabel: '전체' },
            { code: 'A', codeLabel: '자재' },
            { code: 'B', codeLabel: '시설투자' }
        ],
        onKeyin: function (text) { /* 직접 입력 */ },
        onSelect: function (item) { /* item.code, item.codeLabel */ },
        onClear: function () { /* X 초기화 */ }
    });
});
```

목록에는 `code + codeLabel`이 표시되고, **선택하면 input.value에는 code**가 들어갑니다. `codeLabel`은 목록 표시 및 onSelect 이벤트용입니다.
- 초기 입력값도 code로 작성하세요. 예: `value="ALL"` (이전 `value="전체"` 사용하지 않음).
- 수동 Key-in 입력한 코드도 hidden 필드에 동기화합니다. X 클릭 시 양쪽 값을 비웁니다.
- `name: 'rTypeCd'` 옵션을 유지하면 생성되는 hidden 필드로 코드가 제출됩니다. 별도로 표시 input에 같은 name을 주면 중복 제출되므로 주의하세요.
- TR 값 복사 루프가 input의 `name`만 기준으로 동작한다면, 현재 구조에서는 복제한 행의 입력값 복사 정책을 별도로 확인해야 합니다.

## AJAX 옵션

```javascript
$('input[id="statusCombo"]:visible').first().keyinDropdown({
    name: 'statusCd',
    ajax: {
        url: '/code-list.do', // 프로젝트의 실제 Controller 주소로 교체
        type: 'GET',
        data: function () { return { plant: $('#plant').val() }; }
    },
    onSelect: function (item) { console.log(item.code, item.codeLabel); },
    onError: function (xhr) { console.log(xhr.status); }
});
```

기본 응답 계약: `[{"code":"10","codeLabel":"견적진행"}, ...]` JSON 배열.
서버에는 입력된 검색어를 `term`으로 전달하며 200ms 지연 후 요청합니다.
실제 API가 객체를 반환한다면 응답 변환이 필요합니다.

## 동일 ID가 다섯 개인 레거시 화면

실제 진단 결과 `rTypeCombo` ID를 가진 input이 **5개** 존재하며, 초기화된 0번은 숨겨져 있고 화면에 노출된 것은 1번입니다.
`$('#rTypeCombo')`는 첫 input에만 접근하므로 화면의 콤보가 초기화되지 않았습니다.

테이블 렌더링과 복제가 **완료된 뒤** 현재 화면에 표시되는 input을 대상으로 실행하세요.

```javascript
$('input[id="rTypeCombo"]:visible').first().keyinDropdown({
    name: 'rTypeCd',
    initialCode: 'ALL',
    options: [
        { code: 'ALL', codeLabel: '전체' },
        { code: 'A', codeLabel: '자재' },
        { code: 'B', codeLabel: '시설투자' }
    ]
});
```

여기서 `:visible`은 jQuery가 표시 상태를 판단한 것으로 **뷰포트 안에 실제 노출된다는 뜻은 아닙니다.** 현재 진단에서는 최초 `:visible` 입력이 실제 전면 입력(1번)이므로 사용 가능한 최소 우회책입니다.
복제 순서가 달라질 수 있다면 `getBoundingClientRect()`와 `elementFromPoint()`로 실제 전면 요소를 선택하거나, 화면별 고유 ID/클래스를 부여하는 것이 바람직합니다.
`$(function () {})`만으로 table cloning 완료가 보장되는 것은 아니므로, 실제 화면에서 `fixedTable` 등 행 복제·렌더링 이후 초기화하세요.

## 개발자 도구 점검

```javascript
$('input[id="rTypeCombo"]').length                     // 현행: 5
$('input[id="rTypeCombo"]:visible').first().data('keyinDropdownReady')
$('input[id="rTypeCombo"]:visible').first().nextAll('.keyin-arrow').length
```

정상 초기화라면 첫 번째 표시는 `true`, 두 번째 결과는 `1`이 됩니다.
CSS와 JS 파일 둘 다 최신 버전으로 교체하고 브라우저를 새로고침하세요. 초기화된 DOM에는 래퍼 span이 없어야 합니다.

## 테스트

- `demo.html`: 고정 옵션, AJAX 옵션 예시 (실제 API 연동 아님)
- `mock-options.json`: AJAX 예제 데이터
- 라이브러리 버전: jQuery 1.9.1 확인, jQuery UI 실제 버전 미확인. 데모는 jQuery UI 1.10.4 사용.
- 실제 팝업 전체 CSS 및 테이블 복제 로직과의 통합 테스트 필요

## 그룹 추가/복사 시 초기화

드롭다운을 **클릭할 때마다 options를 다시 생성할 필요는 없습니다.** options 배열을 한 번 선언한 후, 최초 로딩과 TR 그룹 추가/복사가 끝날 때 *새로운 입력창*만 초기화합니다.

```javascript
var rTypeOptions = [
    { code: 'ALL', codeLabel: '전체' },
    { code: 'A', codeLabel: '자재' },
    { code: 'B', codeLabel: '시설투자' },
    { code: 'C', codeLabel: '용역' }
];

// ready에서 1회, btnCopy/btnAdd의 append 및 값 복사 완료 뒤 다시 호출
function initRTypeCombo() {
    $('#tbTarget input.js-rtype-combo').filter(function () {
        return !$(this).data('keyinDropdownReady');
    }).keyinDropdown({
        name: 'rTypeCd',
        initialCode: 'ALL',
        listWidth: 330,
        options: rTypeOptions
    });
}
```

반복되는 TR 템플릿의 입력창에는 `id="rTypeCombo"` 대신 `class="js-rtype-combo"`를 사용하세요. 한 문서에 동일 ID가 5개 존재했던 이력이 있으므로 `$('#rTypeCombo')`로는 실제 화면 요소를 선택하지 못할 수 있습니다.

복사 대상의 input에 기존 code가 있다면 초기화할 때 이를 우선 보존합니다. **동적 그룹 복사 시 기존 hidden이나 버튼을 포함한 초기화 완료 DOM을 복사하지 말고 원본 HTML 템플릿을 사용**하세요.

**주의:** 현재 플러그인은 이전 JSP 호출을 위해 hidden 필드를 유지합니다. TR 복사 루프가 `name`을 기반으로 값을 복사한다면, input과 hidden 중 어떤 필드를 서버 제출/복사의 기준으로 삼는지 일관성을 정해야 합니다.
