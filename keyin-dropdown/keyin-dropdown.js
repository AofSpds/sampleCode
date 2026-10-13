/**
 * Key-in Dropdown (jQuery 1.9.1 + jQuery UI Autocomplete)
 * - 콤보박스마다 독립 초기화 / 별도 전역 상태변수 없음
 */
$.fn.keyinDropdown = function (settings) {
    return this.each(function () {
        var $combo = $(this),
            $text = $combo.find('.keyin-text'),
            $code = $combo.find('.keyin-code'),
            config = $.extend({
                options: null,       // [{ code:'A', codeLabel:'자재' }] / 생략 시 HTML option 사용
                listWidth: 260,      // 펼친 목록의 최소 너비(px)
                onKeyin: null,       // 직접 입력 시 function(text) {}
                onSelect: null,      // 선택 시 function(item) {}
                onClear: null        // X 버튼 클릭 시 function() {}
            }, settings),
            source = config.options != null ? config.options : $combo.find('.keyin-options option').get();

        // 동일 요소에 이벤트를 중복 등록하지 않는다.
        if ($combo.data('keyinDropdownReady')) return;

        // JavaScript 배열 또는 기존 <option>을 동일한 형태로 변환한다.
        var items = $.map(source, function (option) {
            var code = option.nodeType ? option.value : option.code,
                codeLabel = option.nodeType ? $(option).text() : option.codeLabel;

            code = code == null ? '' : String(code);
            codeLabel = codeLabel == null ? '' : String(codeLabel);

            return {
                code: code,
                codeLabel: codeLabel,
                value: codeLabel,                 // 선택 후 표시값
                label: code + '  ' + codeLabel    // 펼친 목록: code + codeLabel
            };
        });

        // 입력값이 있을 때만 X 버튼을 표시한다.
        function fnSetClearButton() {
            $combo.toggleClass('has-value', $.trim($text.val()).length > 0);
        }

        // 목록 필터링 / 방향키 / Enter / ESC는 jQuery UI에서 처리한다.
        $text.autocomplete({
            source: items,
            minLength: 0,
            delay: 0,
            appendTo: 'body',
            focus: function () {
                return false; // 목록에서 이동할 때는 입력값을 바꾸지 않는다.
            },
            open: function () {
                // 기존 화면의 검색영역의 overflow가 목록을 자르지 않도록 body에 표시한다.
                $text.autocomplete('widget').addClass('keyin-dropdown-menu').outerWidth(
                    Math.max(config.listWidth, $combo.outerWidth())
                );
            },
            select: function (event, ui) {
                // 옵션 선택: 화면에는 명칭, 서버 제출용 hidden에는 코드.
                $text.val(ui.item.codeLabel);
                $code.val(ui.item.code);
                fnSetClearButton();

                if ($.isFunction(config.onSelect)) {
                    config.onSelect.call(this, ui.item);
                }
                return false;
            }
        });

        // 직접 입력: 선택된 코드 초기화 및 onKeyin 호출.
        $text.on('input.keyinDropdown', function () {
            $code.val('');
            fnSetClearButton();

            if ($.isFunction(config.onKeyin)) {
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

            if ($.isFunction(config.onClear)) {
                config.onClear.call($text[0]);
            }
        });

        $combo.data('keyinDropdownReady', true);
        fnSetClearButton();
    });
};
