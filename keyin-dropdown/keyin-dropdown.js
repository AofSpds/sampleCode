/**
 * Key-in Dropdown (jQuery + jQuery UI Autocomplete)
 * - input 전용. 부모 span을 생성하거나 테이블 구조를 변경하지 않는다.
 * - 목록: code + codeLabel / 선택 후 input.value: code
 * - 기존 input의 name/value를 그대로 사용한다. hidden 필드는 생성하지 않는다.
 * - X/화살표 버튼은 input의 바로 다음 형제 요소로 추가한다.
 */
$.fn.keyinDropdown = function (settings) {
    return this.each(function () {
        var $input = $(this);

        if (!$input.is('input')) {
            throw new Error('keyinDropdown: input 요소만 지원합니다.');
        }
        if ($input.data('keyinDropdownReady')) return;
        if (typeof $.fn.autocomplete !== 'function') {
            throw new Error('keyinDropdown: jQuery UI autocomplete가 필요합니다.');
        }

        var config = $.extend({
                options: [],       // [{ code: 'A', codeLabel: '자재' }]
                ajax: null,        // { url: '...', type: 'GET', data: {}, responseField: 'successList' }
                listWidth: 260,    // 펼친 옵션 목록의 최소 폭(px)
                onKeyin: null,     // 직접 입력: function(text) {}
                onSelect: null,    // 옵션 선택: function(item) {}
                onClear: null,     // X 클릭: function() {}
                onError: null      // AJAX 실패: function(xhr) {}
            }, settings),
            $clear = $('<button type="button" class="keyin-clear" aria-label="입력 지우기">×</button>'),
            $arrow = $('<button type="button" class="keyin-arrow" aria-label="옵션 열기"></button>');

        // 원본 input의 name/value/width/id 유지. hidden이나 wrapper 생성 없음.
        $input.addClass('keyin-dropdown').after($clear, $arrow);

        function toItems(rows) {
            return $.map(rows || [], function (item) {
                var code = item.code == null ? '' : String(item.code),
                    label = item.codeLabel == null ? '' : String(item.codeLabel);

                return {
                    code: code,
                    codeLabel: label,
                    label: code + '  ' + label, // 목록에 코드 + 명칭 표시
                    value: code                // 선택 후 input.value에는 코드 저장
                };
            });
        }

        // 값이 있을 때만 X 버튼 표시. 별도 상태변수는 사용하지 않는다.
        function setClear() {
            $clear.toggleClass('is-visible', $.trim($input.val() || '') !== '');
        }

        $input.autocomplete({
            source: config.ajax && config.ajax.url ? function (request, response) {
                var extra = typeof config.ajax.data === 'function'
                    ? config.ajax.data.call($input[0]) : config.ajax.data;

                $.ajax({
                    url: config.ajax.url,
                    type: config.ajax.type || 'GET',
                    dataType: 'json',
                    data: $.extend({}, extra, { term: request.term }),
                    success: function (result) {
                        // JSON 배열 또는 응답 객체의 지정된 목록 필드 사용
                        var rows = $.isArray(result) ? result
                            : (result && config.ajax.responseField
                                ? result[config.ajax.responseField] : []),
                            term = request.term.toLowerCase();

                        response($.grep(toItems($.isArray(rows) ? rows : []), function (item) {
                            return item.label.toLowerCase().indexOf(term) !== -1;
                        }));
                    },
                    error: function (xhr) {
                        response([]);
                        if (typeof config.onError === 'function') {
                            config.onError.call($input[0], xhr);
                        }
                    }
                });
            } : toItems(config.options),
            minLength: 0,
            delay: config.ajax && config.ajax.url ? 200 : 0,
            appendTo: 'body', // td의 overflow에 목록이 잘리지 않게 한다.
            focus: function () {
                return false; // 키보드 이동 중 입력값 변경 방지
            },
            open: function () {
                $input.autocomplete('widget').outerWidth(
                    Math.max(config.listWidth, $input.outerWidth())
                );
            },
            select: function (event, ui) {
                $input.val(ui.item.code);
                setClear();
                if (typeof config.onSelect === 'function') {
                    config.onSelect.call(this, ui.item);
                }
                return false;
            }
        });

        // 최초 목록 오픈 전에 메뉴 전용 CSS 클래스 설정
        $input.autocomplete('widget').addClass('keyin-dropdown-menu');

        $input.on('input.keyinDropdown', function () {
            // 사용자가 입력한 값이 input.value가 된다.
            setClear();
            if (typeof config.onKeyin === 'function') {
                config.onKeyin.call(this, $input.val());
            }
        }).on('click.keyinDropdown', function () {
            $input.autocomplete('search', ''); // 전체 목록 열기
        });

        $arrow.on('click.keyinDropdown', function () {
            var $menu = $input.autocomplete('widget');
            if ($menu.is(':visible')) {
                $input.autocomplete('close');
            } else {
                $input.focus().autocomplete('search', '');
            }
        });

        $clear.on('click.keyinDropdown', function () {
            $input.autocomplete('close').val('');
            setClear();
            if (typeof config.onClear === 'function') {
                config.onClear.call($input[0]);
            }
        });

        $input.data('keyinDropdownReady', true);
        setClear();
    });
};
