/**
 * Key-in Dropdown (jQuery 1.9.1 + jQuery UI Autocomplete)
 * - 부모 wrapper 없이 기존 input에 적용한다.
 * - displayMode 'code'(기본): 기존 input의 name/value가 코드이며 hidden을 만들지 않는다.
 * - 다른 displayMode: 기존 input은 표시용, 동일 name을 가진 hidden input은 전송용 코드다.
 * - X/화살표 버튼은 표시 input의 바로 다음 형제 요소다.
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

        if ($.inArray(config.displayMode, ['code', 'codeLabel', 'both', 'custom']) === -1) {
            throw new Error('keyinDropdown: 알 수 없는 displayMode입니다.');
        }
        if (config.displayMode === 'custom' && typeof config.displayFormat !== 'function') {
            throw new Error('keyinDropdown: custom에는 displayFormat 함수가 필요합니다.');
        }
        if (separateCode && !$input.attr('name')) {
            throw new Error('keyinDropdown: code 이외 모드에서는 원본 input의 name이 필요합니다.');
        }

        if (separateCode) {
            // 기존 name은 전송용 hidden으로 이동한다. 화면 input은 serializeArray에서 제외된다.
            $codeInput = $('<input type="hidden" class="keyin-code">')
                .attr('name', $input.attr('name'))
                .val(initialCode);
            $input.removeAttr('name');
            $input.data('keyinDropdownCodeInput', $codeInput);
        }

        $input.addClass('keyin-dropdown');
        if ($codeInput) {
            $input.after($clear, $arrow, $codeInput);
        } else {
            $input.after($clear, $arrow);
        }

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

        function setClear() {
            var hasValue = $.trim($input.val() || '') !== ''
                || ($codeInput && $.trim($codeInput.val() || '') !== '');
            $clear.toggleClass('is-visible', !!hasValue);
        }

        function setSelected(item) {
            $input.val(displayText(item));
            if ($codeInput) $codeInput.val(item.code);
            $input.data('keyinDropdownSelected', item);
            setClear();
        }

        function loadRows(term, onSuccess, onFailure) {
            var extra = typeof config.ajax.data === 'function'
                ? config.ajax.data.call($input[0]) : config.ajax.data;

            $.ajax({
                url: config.ajax.url,
                type: config.ajax.type || 'GET',
                dataType: 'json',
                data: $.extend({}, extra, { term: term }),
                success: function (result) {
                    var rows = $.isArray(result) ? result
                        : (result && config.ajax.responseField
                            ? result[config.ajax.responseField] : []);
                    onSuccess($.isArray(rows) ? rows : []);
                },
                error: function (xhr) {
                    if (typeof onFailure === 'function') onFailure(xhr);
                    if (typeof config.onError === 'function') {
                        config.onError.call($input[0], xhr);
                    }
                }
            });
        }

        $input.autocomplete({
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
            minLength: 0,
            delay: config.ajax && config.ajax.url ? 200 : 0,
            appendTo: 'body',
            focus: function () {
                return false; // 키보드 이동 중 표시값 변경 방지
            },
            open: function () {
                $input.autocomplete('widget').outerWidth(
                    Math.max(config.listWidth, $input.outerWidth())
                );
            },
            select: function (event, ui) {
                setSelected(ui.item);
                if (typeof config.onSelect === 'function') {
                    config.onSelect.call(this, ui.item);
                }
                return false;
            }
        });

        $input.autocomplete('widget').addClass('keyin-dropdown-menu');

        $input.on('input.keyinDropdown', function () {
            // 다른 표시 모드에서는 목록 선택 전까지 서버 코드값을 비운다.
            if ($codeInput) $codeInput.val('');
            $input.removeData('keyinDropdownSelected');
            setClear();
            if (typeof config.onKeyin === 'function') {
                config.onKeyin.call(this, $input.val());
            }
        }).on('click.keyinDropdown', function () {
            $input.autocomplete('search', '');
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
            if ($codeInput) $codeInput.val('');
            $input.removeData('keyinDropdownSelected');
            setClear();
            if (typeof config.onClear === 'function') {
                config.onClear.call($input[0]);
            }
        });

        $input.data('keyinDropdownReady', true);

        // 최초 JSP input.value에는 반드시 코드가 들어 있어야 한다.
        // 정적 옵션/서버 렌더링된 명칭이 있으면 즉시 표시한다.
        if (separateCode && initialCode !== '') {
            var matching = $.grep(toItems(config.options), function (item) {
                return item.code === initialCode;
            })[0];

            if (!matching && initialCodeLabel != null && initialCodeLabel !== '') {
                matching = { code: initialCode, codeLabel: initialCodeLabel };
            }

            if (matching) {
                setSelected(matching);
            } else if (config.ajax && config.ajax.url) {
                // 기존 코드만 있는 JSP 행은 비동기로 업체명을 조회하여 표시한다.
                // 조회 중 사용자가 수정/선택/삭제했다면 과거 응답으로 덮어쓰지 않는다.
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
