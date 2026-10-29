/**
 * Key-in Dropdown (jQuery 1.9.1 + jQuery UI Autocomplete)
 * - 부모 wrapper 없이 기존 input에 적용한다.
 * - displayMode 'code'(기본): 기존 input의 name/value가 코드이며 hidden을 만들지 않는다.
 * - 다른 displayMode: 기존 input은 표시용, 동일 name을 가진 hidden input은 전송용 코드다.
 * - X/화살표 버튼은 표시 input의 바로 다음 형제 요소다.
 */
// 사용 예: $('input.js-rtype-combo').keyinDropdown({ displayMode: 'codeLabel', ajax: {...} });
// 선택자로 잡은 input을 각각 초기화하며, 기존 input을 감싸는 wrapper는 만들지 않는다.
$.fn.keyinDropdown = function (settings) {
    return this.each(function () {
        var $input = $(this);

        // select나 div에는 적용하지 않는 input 전용 컴포넌트다.
        if (!$input.is('input')) {
            throw new Error('keyinDropdown: input 요소만 지원합니다.');
        }
        // 최초 JSP 로딩 및 ADD/COPY 뒤에 다시 호출해도 이미 초기화한 행은 건너뛴다.
        if ($input.data('keyinDropdownReady')) return;
        if (typeof $.fn.autocomplete !== 'function') {
            throw new Error('keyinDropdown: jQuery UI autocomplete가 필요합니다.');
        }

        // 기본 설정과 호출 측 설정 병합: options는 정적 목록, ajax는 서버 조회 설정이다.
        var config = $.extend({
                options: [],       // [{ code: '100002', codeLabel: '(주)엘지상사' }]
                ajax: null,        // { url, type, data, responseField: 'successList' }
                displayMode: 'code', // code / codeLabel / both / custom
                displayFormat: null, // custom: function(item) { return ...; }
                listWidth: 260,
                onKeyin: null,
                onSelect: null,
                onClear: null,
                onError: null
            }, settings),
            separateCode = config.displayMode !== 'code',
            initialCode = String($input.val() == null ? '' : $input.val()),
            initialCodeLabel = $input.attr('data-code-label'),
            $codeInput = null,
            $clear = $('<button type="button" class="keyin-clear" aria-label="입력 지우기">×</button>'),
            $arrow = $('<button type="button" class="keyin-arrow" aria-label="옵션 열기"></button>');

        // 표시 모드는 초기화할 때 확정한다. custom은 displayFormat 콜백이 필수다.
        if ($.inArray(config.displayMode, ['code', 'codeLabel', 'both', 'custom']) === -1) {
            throw new Error('keyinDropdown: 알 수 없는 displayMode입니다.');
        }
        if (config.displayMode === 'custom' && typeof config.displayFormat !== 'function') {
            throw new Error('keyinDropdown: custom에는 displayFormat 함수가 필요합니다.');
        }
        if (separateCode && !$input.attr('name')) {
            throw new Error('keyinDropdown: code 이외 모드에서는 원본 input의 name이 필요합니다.');
        }

        // codeLabel/both/custom: 화면 input과 전송할 코드를 분리한다.
        // 기존 input.name을 hidden으로 옮겨 폼 직렬화 시 코드만 한 번 전송한다.
        if (separateCode) {
            // 기존 name은 전송용 hidden으로 이동한다. 화면 input은 serializeArray에서 제외된다.
            $codeInput = $('<input type="hidden" class="keyin-code">')
                .attr('name', $input.attr('name'))
                .val(initialCode);
            $input.removeAttr('name');
            $input.data('keyinDropdownCodeInput', $codeInput);
        }

        // 버튼과 hidden은 input 바로 뒤에 붙인다. 셀/테이블 구조는 변경하지 않는다.
        $input.addClass('keyin-dropdown');
        if ($codeInput) {
            $input.after($clear, $arrow, $codeInput);
        } else {
            $input.after($clear, $arrow);
        }

        // 서버/정적 옵션을 jQuery UI 형식으로 변환한다.
        // label은 검색·목록 표시용, value와 code는 공급업체 코드다.
        function toItems(rows) {
            return $.map(rows || [], function (item) {
                var code = item.code == null ? '' : String(item.code),
                    codeLabel = item.codeLabel == null ? '' : String(item.codeLabel);

                // 추가 응답 필드도 custom 표시 및 onSelect에서 사용 가능
                return $.extend({}, item, {
                    code: code,
                    codeLabel: codeLabel,
                    label: code + '  ' + codeLabel,
                    value: code
                });
            });
        }

        // 선택 후 화면에 보여 줄 문자열을 결정한다. 전송값은 항상 item.code다.
        // code: 코드 / codeLabel: 명칭 / both: 코드+명칭 / custom: 표시 함수 결과
        function displayText(item) {
            if (config.displayMode === 'codeLabel') return item.codeLabel;
            if (config.displayMode === 'both') {
                return item.code + (item.codeLabel ? ' ' + item.codeLabel : '');
            }
            if (config.displayMode === 'custom') {
                var text = config.displayFormat.call($input[0], item);
                return text == null ? '' : String(text);
            }
            return item.code;
        }

        // 화면 문자열 또는 전송 코드가 남아 있으면 X 버튼을 표시한다.
        function setClear() {
            var hasValue = $.trim($input.val() || '') !== ''
                || ($codeInput && $.trim($codeInput.val() || '') !== '');
            $clear.toggleClass('is-visible', !!hasValue);
        }

        // 선택 항목 저장: 화면 표시값 갱신 → hidden 코드 갱신 → 항목 데이터 보관.
        // onSelect는 호출자가 필요하면 change 이벤트 등을 별도로 발생시킬 수 있다.
        function setSelected(item) {
            $input.val(displayText(item));
            if ($codeInput) $codeInput.val(item.code);
            $input.data('keyinDropdownSelected', item);
            setClear();
        }

        // 실제 AJAX는 목록 검색/오픈 시 실행하며, 초기 코드의 명칭 복원에도 사용한다.
        // ajax.data 함수의 this는 현재 콤보 input이다(그룹별 matCd/plant 조회에 사용).
        function loadRows(term, onSuccess, onFailure) {
            var extra = typeof config.ajax.data === 'function'
                ? config.ajax.data.call($input[0]) : config.ajax.data;
            var requestData = $.extend({}, extra, { term: term });
            // JSON POST는 선택 옵션이며, 미설정 시 기존 폼 파라미터 전송을 유지한다.
            var isJson = config.ajax.contentType &&
                config.ajax.contentType.indexOf('application/json') === 0;

            $.ajax({
                url: config.ajax.url,
                type: config.ajax.type || 'GET',
                dataType: 'json',
                contentType: config.ajax.contentType,
                data: isJson ? JSON.stringify(requestData) : requestData,
                    // 응답이 배열이면 그대로, 객체이면 responseField(예: successList)에서 추출한다.
                success: function (result) {
                    var rows = $.isArray(result) ? result
                        : (result && config.ajax.responseField
                            ? result[config.ajax.responseField] : []);
                    onSuccess($.isArray(rows) ? rows : []);
                },
                    // 자동완성 요청 중단용 실패 콜백과 외부 onError 콜백을 모두 처리한다.
                error: function (xhr) {
                    if (typeof onFailure === 'function') onFailure(xhr);
                    if (typeof config.onError === 'function') {
                        config.onError.call($input[0], xhr);
                    }
                }
            });
        }

        // jQuery UI Autocomplete 연결: AJAX 설정이 있으면 원격 목록, 없으면 정적 목록.
        $input.autocomplete({
                // 검색어는 code와 codeLabel을 합친 label에서 비교한다.
                // 빈 검색어('')로 호출하면 해당 자재의 목록 전체를 보여준다.
            source: config.ajax && config.ajax.url ? function (request, response) {
                var term = request.term.toLowerCase();

                loadRows(request.term, function (rows) {
                    response($.grep(toItems(rows), function (item) {
                        return item.label.toLowerCase().indexOf(term) !== -1;
                    }));
                }, function () {
                    response([]);
                });
            } : toItems(config.options),
            // 검색어가 없어도 목록 열기 가능. AJAX일 때만 검색 지연 200ms 적용.
            minLength: 0,
            delay: config.ajax && config.ajax.url ? 200 : 0,
            // 목록은 body에 붙여 테이블 셀의 overflow에 의해 잘리지 않게 한다.
            appendTo: 'body',
            focus: function () {
                return false; // 키보드 이동 중 표시값 변경 방지
            },
                // 옵션 목록 너비는 input 너비와 listWidth 중 더 큰 값이다.
            open: function () {
                $input.autocomplete('widget').outerWidth(
                    Math.max(config.listWidth, $input.outerWidth())
                );
            },
                // 선택 시 표시값과 서버 전송 코드를 함께 갱신한다.
            select: function (event, ui) {
                setSelected(ui.item);
                if (typeof config.onSelect === 'function') {
                    config.onSelect.call(this, ui.item);
                }
                return false;
            }
        });

        // 목록에 전용 CSS 클래스를 붙여 다른 화면의 자동완성과 스타일을 분리한다.
        $input.autocomplete('widget').addClass('keyin-dropdown-menu');

        // 사용자가 직접 문자를 수정하면 이전 선택 코드를 무효화한다.
        // codeLabel/both/custom 모드의 hidden은 빈 값이 되어 잘못된 코드 전송을 막는다.
        $input.on('input.keyinDropdown', function () {
            // 다른 표시 모드에서는 목록 선택 전까지 서버 코드값을 비운다.
            if ($codeInput) $codeInput.val('');
            $input.removeData('keyinDropdownSelected');
            setClear();
            if (typeof config.onKeyin === 'function') {
                config.onKeyin.call(this, $input.val());
            }
        // input 클릭은 현재 표시 내용과 관계없이 전체 옵션 목록을 요청한다.
        }).on('click.keyinDropdown', function () {
            $input.autocomplete('search', '');
        });

        // ▼ 버튼은 현재 목록의 열림/닫힘을 전환한다.
        $arrow.on('click.keyinDropdown', function () {
            var $menu = $input.autocomplete('widget');
            if ($menu.is(':visible')) {
                $input.autocomplete('close');
            } else {
                $input.focus().autocomplete('search', '');
            }
        });

        // X 버튼은 표시값·전송 코드·선택 항목을 모두 비운다.
        $clear.on('click.keyinDropdown', function () {
            $input.autocomplete('close').val('');
            if ($codeInput) $codeInput.val('');
            $input.removeData('keyinDropdownSelected');
            setClear();
            if (typeof config.onClear === 'function') {
                config.onClear.call($input[0]);
            }
        });

        // 초기화 완료 표시: ADD/COPY 후 같은 초기화 함수를 다시 실행해도 중복 바인딩되지 않는다.
        $input.data('keyinDropdownReady', true);

        // 최초 JSP input.value에는 반드시 코드가 들어 있어야 한다.
        // 정적 옵션/서버 렌더링된 명칭이 있으면 즉시 표시한다.
        if (separateCode && initialCode !== '') {
            // 최초 input.value는 code로 해석한다. 정적 옵션부터 일치하는 코드를 찾는다.
            var matching = $.grep(toItems(config.options), function (item) {
                return item.code === initialCode;
            })[0];

            // JSP에 data-code-label이 있으면 별도 서버 조회 없이 초기 표시명을 만들 수 있다.
            if (!matching && initialCodeLabel != null && initialCodeLabel !== '') {
                matching = { code: initialCode, codeLabel: initialCodeLabel };
            }

            // 명칭을 알면 즉시 표시하고, 모르면 AJAX에서 코드를 조회해 복원한다.
            if (matching) {
                setSelected(matching);
            } else if (config.ajax && config.ajax.url) {
                // 기존 코드만 있는 JSP 행은 비동기로 업체명을 조회하여 표시한다.
                // 조회 중 사용자가 수정/선택/삭제했다면 과거 응답으로 덮어쓰지 않는다.
                // 비동기 조회 중 사용자가 값을 변경했다면 예전 결과로 덮어쓰지 않는다.
                loadRows('', function (rows) {
                    if ($codeInput.val() !== initialCode ||
                        $input.data('keyinDropdownSelected')) return;

                    var item = $.grep(toItems(rows), function (row) {
                        return row.code === initialCode;
                    })[0];
                    if (item) setSelected(item);
                });
            }
        }

        setClear();
    });
};
