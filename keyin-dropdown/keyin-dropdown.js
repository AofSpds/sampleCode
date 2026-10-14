/**
 * Key-in Dropdown
 * jQuery + jQuery UI Autocomplete / input 전용
 * 사용: $('#rTypeCombo').keyinDropdown({ options: [...], onSelect: function (item) {} });
 */
$.fn.keyinDropdown = function (settings) {
    return this.each(function () {
        var $text = $(this);

        // 같은 입력창을 중복 초기화하지 않는다.
        if ($text.data('keyinDropdownReady')) return;
        if (!$text.is('input')) {
            throw new Error('keyinDropdown: input 요소에만 사용할 수 있습니다.');
        }
        if (typeof $.fn.autocomplete !== 'function') {
            throw new Error('keyinDropdown: jQuery UI Autocomplete가 필요합니다.');
        }

        var config = $.extend({
                options: [],        // [{ code:'A', codeLabel:'자재' }]
                ajax: null,         // { url:'...', type:'GET', data:{...} }
                name: '',           // 서버로 전달할 hidden code 필드명
                initialCode: '',    // 최초 선택된 코드 (선택)
                listWidth: 260,     // 펼친 옵션 목록의 최소 폭(px)
                onKeyin: null,      // 직접 입력 이벤트 function(text) {}
                onSelect: null,     // 옵션 선택 이벤트 function(item) {}
                onClear: null,      // X 초기화 이벤트 function() {}
                onError: null       // AJAX 오류 이벤트 function(xhr) {}
            }, settings),
            width = $text.outerWidth();

        // JSP에는 input만 배치하고, 콤보 구성 요소는 여기에서 만든다.
        $text.wrap('<span class="keyin-dropdown"></span>');
        var $combo = $text.parent().outerWidth(width),
            $code = $('<input type="hidden" class="keyin-code">').appendTo($combo);

        $text.addClass('keyin-text').removeClass('keyin-dropdown');
        $text[0].style.width = ''; // 기존 input의 인라인 width를 wrapper로 이전

        if (config.name) $code.attr('name', config.name);
        $code.val(config.initialCode || $text.attr('data-code') || '');
        $combo.append(
            '<button type="button" class="keyin-clear" aria-label="입력 지우기">×</button>' +
            '<button type="button" class="keyin-arrow" aria-label="옵션 열기"></button>'
        );

        // 코드 목록을 Autocomplete의 {label, value} 형식으로 변환한다.
        function fnToItems(rows) {
            return $.map(rows || [], function (item) {
                var code = item.code == null ? '' : String(item.code),
                    codeLabel = item.codeLabel == null ? '' : String(item.codeLabel);

                return {
                    code: code,
                    codeLabel: codeLabel,
                    label: code + '  ' + codeLabel, // 목록 표시값
                    value: codeLabel               // 선택 후 입력창 표시값
                };
            });
        }

        // 입력값이 존재할 때만 X 버튼을 표시한다.
        function fnSetClearButton() {
            $combo.toggleClass('has-value', $.trim($text.val() || '') !== '');
        }

        // 고정 options 또는 AJAX 조회 결과를 목록에 표시한다.
        $text.autocomplete({
            source: config.ajax && config.ajax.url ? function (request, response) {
                var params = typeof config.ajax.data === 'function'
                    ? config.ajax.data.call($text[0]) : config.ajax.data;

                $.ajax({
                    url: config.ajax.url,
                    type: config.ajax.type || 'GET',
                    dataType: 'json',
                    data: $.extend({}, params, { term: request.term }),
                    success: function (rows) {
                        var items = fnToItems($.isArray(rows) ? rows : []),
                            term = request.term.toLowerCase();

                        response($.grep(items, function (item) {
                            return item.label.toLowerCase().indexOf(term) !== -1;
                        }));
                    },
                    error: function (xhr) {
                        response([]);
                        if (typeof config.onError === 'function') {
                            config.onError.call($text[0], xhr);
                        }
                    }
                });
            } : fnToItems(config.options),
            minLength: 0,
            delay: config.ajax && config.ajax.url ? 200 : 0,
            appendTo: 'body',
            focus: function () {
                return false; // 키보드 이동 중 입력창 값을 변경하지 않는다.
            },
            open: function () {
                $text.autocomplete('widget').outerWidth(
                    Math.max(config.listWidth, $combo.outerWidth())
                );
            },
            select: function (event, ui) {
                $text.val(ui.item.codeLabel);
                $code.val(ui.item.code);
                fnSetClearButton();

                if (typeof config.onSelect === 'function') {
                    config.onSelect.call(this, ui.item);
                }
                return false;
            }
        });

        // 메뉴가 열리기 전부터 CSS가 적용되도록 클래스를 지정한다.
        $text.autocomplete('widget').addClass('keyin-dropdown-menu');

        // 직접 입력 시 기존 선택 코드를 지운다.
        $text.on('input.keyinDropdown', function () {
            $code.val('');
            fnSetClearButton();
            if (typeof config.onKeyin === 'function') {
                config.onKeyin.call(this, $text.val());
            }
        });

        // 클릭 또는 화살표로 목록을 연다.
        $text.on('click.keyinDropdown', function () {
            $text.autocomplete('search', '');
        });
        $combo.on('click.keyinDropdown', '.keyin-arrow', function () {
            var $list = $text.autocomplete('widget');
            if ($list.is(':visible')) {
                $text.autocomplete('close');
            } else {
                $text.focus().autocomplete('search', '');
            }
        });

        // X 클릭 시 표시값과 실제 코드값을 함께 초기화한다.
        $combo.on('click.keyinDropdown', '.keyin-clear', function () {
            $text.autocomplete('close').val('');
            $code.val('');
            fnSetClearButton();
            if (typeof config.onClear === 'function') {
                config.onClear.call($text[0]);
            }
        });

        $text.data('keyinDropdownReady', true);
        fnSetClearButton();
    });
};
