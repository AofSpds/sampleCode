/**
 * Key-in Dropdown (jQuery + jQuery UI Autocomplete)
 * - 콤보박스마다 독립 초기화 / 별도 전역 상태변수 없음
 */
$.fn.keyinDropdown = function (settings) {
    return this.each(function () {
        var $combo = $(this),
            $text = $combo.find('.keyin-text'),
            $code = $combo.find('.keyin-code'),
            config = $.extend({
                options: null,       // 고정 옵션. 생략 시 HTML <option> 사용
                ajax: null,          // 동적 옵션: { url:'...', type:'GET', data:{...} }
                listWidth: 260,      // 펼친 목록의 최소 너비(px)
                onKeyin: null,       // 직접 입력 시 function(text) {}
                onSelect: null,      // 선택 시 function(item) {}
                onClear: null,       // X 버튼 클릭 시 function() {}
                onError: null        // AJAX 조회 실패 시 function(xhr) {}
            }, settings),
            source = config.options != null ? config.options : $combo.find('.keyin-options option').get();

        // 동일 요소에 이벤트를 중복 등록하지 않는다.
        if ($combo.data('keyinDropdownReady')) return;

        // 배열, HTML option, AJAX 응답을 공통 옵션 형식으로 변환한다.
        function fnToItems(rows) {
            return $.map(rows, function (option) {
                var code = option.nodeType ? option.value : option.code,
                    codeLabel = option.nodeType ? $(option).text() : option.codeLabel;

                code = code == null ? '' : String(code);
                codeLabel = codeLabel == null ? '' : String(codeLabel);

                return {
                    code: code,
                    codeLabel: codeLabel,
                    value: codeLabel,                 // 선택 후 입력창: codeLabel
                    label: code + '  ' + codeLabel    // 펼친 목록: code + codeLabel
                };
            });
        }

        var items = fnToItems(source);

        // 입력값이 있을 때만 X 버튼을 표시한다.
        function fnSetClearButton() {
            $combo.toggleClass('has-value', $.trim($text.val() || '') !== '');
        }

        // 목록 필터링 / 방향키 / Enter / ESC는 jQuery UI에서 처리한다.
        $text.autocomplete({
            // ajax 설정 시 입력할 때마다 서버 조회. 없으면 기존 고정 옵션을 사용한다.
            source: config.ajax && config.ajax.url ? function (request, response) {
                var extra = typeof config.ajax.data === 'function'
                    ? config.ajax.data.call($combo[0]) : config.ajax.data;

                $.ajax({
                    url: config.ajax.url,
                    type: config.ajax.type || 'GET',
                    dataType: 'json',
                    data: $.extend({}, extra, { term: request.term }),
                    success: function (rows) {
                        // 응답 형식: [{code:'10', codeLabel:'견적진행'}, ...]
                        // 테스트용 JSON이 전체 목록을 반환해도 검색어로 필터링한다.
                        var list = fnToItems($.isArray(rows) ? rows : []),
                            term = request.term.toLowerCase();

                        response($.grep(list, function (item) {
                            return item.label.toLowerCase().indexOf(term) !== -1;
                        }));
                    },
                    error: function (xhr) {
                        response([]); // 반드시 완료 콜백을 호출하여 로딩 상태를 해제한다.
                        if (typeof config.onError === 'function') {
                            config.onError.call($text[0], xhr);
                        }
                    }
                });
            } : items,
            minLength: 0,
            delay: config.ajax && config.ajax.url ? 200 : 0,
            appendTo: 'body',
            focus: function () {
                return false; // 목록에서 이동할 때는 입력값을 바꾸지 않는다.
            },
            open: function () {
                // 기존 화면의 검색영역의 overflow가 목록을 자르지 않도록 body에 표시한다.
                $text.autocomplete('widget').outerWidth(
                    Math.max(config.listWidth, $combo.outerWidth())
                );
            },
            select: function (event, ui) {
                // 옵션 선택: 화면에는 명칭, 서버 제출용 hidden에는 코드.
                $text.val(ui.item.codeLabel);
                $code.val(ui.item.code);
                fnSetClearButton();

                if (typeof config.onSelect === 'function') {
                    config.onSelect.call(this, ui.item);
                }
                return false;
            }
        });

        // 메뉴 위치 계산 이전부터 목록 CSS가 적용되도록 생성 직후 클래스 지정.
        // jQuery UI 테마 CSS가 누락되어도 목록 위치와 크기가 유지된다.
        $text.autocomplete('widget').addClass('keyin-dropdown-menu');

        // 다른 콤보로 이동하면 기존에 열려 있던 목록을 닫는다.
        $text.on('focus.keyinDropdown', function () {
            $('.keyin-dropdown').not($combo).each(function () {
                var $other = $(this);

                if ($other.data('keyinDropdownReady')) {
                    $other.find('.keyin-text').autocomplete('close');
                }
            });
        });

        // 직접 입력: 선택된 코드 초기화 및 onKeyin 호출.
        $text.on('input.keyinDropdown', function () {
            $code.val('');
            fnSetClearButton();

            if (typeof config.onKeyin === 'function') {
                config.onKeyin.call(this, $text.val());
            }
        });

        // 입력창을 클릭하면 조건 없이 전체 옵션을 보여준다.
        $text.on('click.keyinDropdown', function () {
            $text.autocomplete('search', '');
        });

        // 화살표를 누르면 목록을 열거나 닫는다.
        $combo.on('click.keyinDropdown', '.keyin-arrow', function () {
            var $list = $text.autocomplete('widget');

            if ($list.is(':visible')) {
                $text.autocomplete('close');
            } else {
                $text.focus().autocomplete('search', '');
            }
        });

        // X 클릭: text, code를 비우고 onClear만 호출한다.
        $combo.on('click.keyinDropdown', '.keyin-clear', function () {
            $text.autocomplete('close').val('');
            $code.val('');
            fnSetClearButton();

            if (typeof config.onClear === 'function') {
                config.onClear.call($text[0]);
            }
        });

        $combo.data('keyinDropdownReady', true);
        fnSetClearButton();
    });
};
