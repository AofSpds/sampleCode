/**
 * CellMergeableGrid v1.2 — JSON 행 기반 복합키 셀 병합 그리드
 * =====================================================================
 * [구성 원리]
 * 2개 키: keyFields=['key1','key2']
 *   → key1이 Radio 선택 그룹이고 key1+key2가 개별 행 식별자.
 * 3개 키: keyFields=['itemCd','matCd','VendorWebId']
 *   → itemCd+matCd가 그룹이고 세 키 모두가 공급업체 행 식별자.
 * 키 배열의 '마지막 필드'는 그룹 안의 행을 구분하는 용도이며,
 * 앞의 1~2개 필드는 같은 Radio name을 공유하는 그룹을 구성한다.
 *
 * [화면 처리]
 * merge:true는 그룹 키 컬럼에만 적용된다. 3키의 itemCd/matCd
 * 둘 다 병합할 수 있지만 Radio·업체코드·수량은 행마다 따로 표시된다.
 * 3키는 그룹 오름차순(품목 ASC → 자재코드 ASC)이 기본이며
 * 2키는 최초 등장 순서를 유지한다. groupOrder로 변경할 수 있다.
 * 화면 출력 인덱스만 재배치하므로 입력된 JSON 배열의 순서는 보존된다.
 *
 * [선택 및 저장]
 * Radio 선택은 원본 행 번호가 아닌 복합키를 기준으로 기억된다.
 * getSelectedRows()는 그룹별로 선택된 공급업체의 전체 행 객체를
 * 별도의 data 필드나 선택 플래그 없이 JSON 배열로 반환한다.
 *
 * [의존성·스타일]
 * 순수 JavaScript 구현으로 jQuery 및 별도 CSS를 주입하지 않는다.
 * 기존 HTML table의 class/colgroup/tfoot은 그대로 활용한다.
 *
 * @example
 * var grid = new CellMergeableGrid('#grid', {
 *     keyFields: ['itemCd','matCd','VendorWebId'],
 *     groupOrder: 'asc',
 *     columns: [
 *         {type:'radio', title:'선택'},
 *         {field:'itemCd', title:'품목', merge:true},
 *         {field:'matCd', title:'자재코드', merge:true},
 *         {field:'VendorWebId', title:'업체코드'},
 *         {field:'qty', title:'수량', editor:'number'}
 *     ]
 * });
 * grid.setRows(rows);
 * var json = JSON.stringify(grid.getSelectedRows());
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.CellMergeableGrid = factory();
    }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    /**
     * JSON 직렬화 기반의 데이터 복사.
     * setRows()의 입력 데이터와 getRows()/getSelectedRows() 반환값을
     * 외부 객체와 분리한다. 함수·Date·undefined 등 비JSON 타입은 보존되지 않는다.
     */
    function jsonCopy(value) {
        return JSON.parse(JSON.stringify(value));
    }

    // 마지막 키는 개별 행용, 앞의 1~2개 키는 Radio 그룹용으로 구분한다.
    /**
     * Radio 그룹 식별자 생성: 마지막 키를 제외한 그룹 키들을 JSON 배열로 직렬화.
     * 3키 예: itemCd='10',matCd='100510'이면 그룹 ID는 '["10","100510"]'.
     * VendorWebId가 서로 달라도 앞의 두 값이 같으면 같은 그룹이다.
     */
    function idForGroup(row, fields) {
        var values = [];
        for (var i = 0; i < fields.length - 1; i++) {
            values.push(row[fields[i]]);
        }
        return JSON.stringify(values);
    }

    /**
     * 개별 행의 식별자 생성: keyFields의 모든 필드를 JSON 배열로 직렬화.
     * 예: '["10","100510","100002"]'.
     * 행 중복 확인, 선택 복원, updateRow()의 대상 탐색에서 공통으로 사용한다.
     */
    function idForRow(row, fields) {
        var values = [];
        for (var i = 0; i < fields.length; i++) {
            values.push(row[fields[i]]);
        }
        return JSON.stringify(values);
    }

    /**
     * 그룹 동등성 판정. 마지막 행 키(VendorWebId 등)를 제외하고
     * 모든 그룹 키를 비교한다. itemCd가 같아도 matCd가 다르면 다른 그룹이다.
     */
    function sameGroup(left, right, fields) {
        for (var i = 0; i < fields.length - 1; i++) {
            if (left[fields[i]] !== right[fields[i]]) {
                return false;
            }
        }
        return true;
    }

    /** 값과 자료형이 모두 같은지 검사한다(엄격 비교). */
    function same(a, b) {
        return a === b;
    }

    // 숫자로만 구성된 코드는 숫자 비교. 실제 키의 자료형과 값은 변하지 않는다.
    /**
     * 그룹 표시 순서의 오름차순 비교.
     * 숫자 형태의 코드 문자열은 숫자로 비교하여 '2'가 '10'보다 먼저 나온다.
     * 그렇지 않으면 문자열 순서로 비교한다. 실제 복합키는 변경하지 않는다.
     */
    function compareCode(a, b) {
        if (a === b) {
            return 0;
        }
        var left = String(a);
        var right = String(b);
        if (/^[0-9]+$/.test(left) && /^[0-9]+$/.test(right)) {
            var leftNumber = Number(left);
            var rightNumber = Number(right);
            if (isFinite(leftNumber) && isFinite(rightNumber) &&
                leftNumber !== rightNumber) {
                return leftNumber < rightNumber ? -1 : 1;
            }
        }
        return left < right ? -1 : (left > right ? 1 : 0);
    }

    /**
     * 기존 element.className을 유지하면서 CSS 클래스를 추가한다.
     * 셀 테두리, 배경, 높이 등 구체적인 스타일은 사용하는 화면의 CSS가 담당한다.
     */
    function addClass(element, className) {
        if (className && typeof className === "string") {
            element.className = (element.className ? element.className + " " : "") + className;
        }
    }

    /**
     * 키 필드의 유효성 검사: 문자열, 유한 숫자, 불리언만 허용한다.
     * null/undefined/배열/객체를 식별키로 사용하지 않도록 차단한다.
     */
    function isScalar(value) {
        return value !== null && (typeof value === "string" ||
            (typeof value === "number" && isFinite(value)) ||
            typeof value === "boolean");
    }

    /**
     * 그리드를 생성한다.
     *
     * @param {string|Element} target - '#grid', 기존 table 또는 컨테이너
     * @param {Object} options - 키·컬럼·정렬·렌더링·이벤트 설정
     * @param {string[]} options.keyFields - 2~3개 서로 다른 필드명
     * @param {Object[]} options.columns - 화면에 출력할 컬럼 설정 배열
     * @param {'asc'|'input'} [options.groupOrder] - 그룹 ASC 또는 처음 나온 순서
     * @param {Object[]} [options.rows] - 초기 JSON 행 목록
     * @param {string} [options.tableClass] - 기존 table에 추가할 클래스
     * @param {string|function} [options.rowClass] - tr 클래스 또는 계산 함수
     * @param {string} [options.radioNamePrefix] - 다른 테이블과 name 충돌 방지
     * @param {function} [options.onSelect] - Radio 변경 시 (row, ctx)
     * @param {function} [options.onCellChange] - 셀 편집 시 (value, row, ctx)
     *
     * columns의 merge:true는 앞쪽 그룹 키에만 설정할 수 있다.
     * 마지막 키는 행 식별용이므로 병합하거나 편집할 수 없다.
     */
    function CellMergeableGrid(target, options) {
        options = options || {};
        if (!Array.isArray(options.columns) || options.columns.length === 0) {
            throw new Error("columns must be a nonempty array");
        }

        this.keyFields = options.keyFields || ["key1", "key2"];
        if (!Array.isArray(this.keyFields) ||
            (this.keyFields.length !== 2 && this.keyFields.length !== 3)) {
            throw new Error("keyFields must have 2 or 3 distinct field names");
        }
        var knownKeys = Object.create(null);
        for (var k = 0; k < this.keyFields.length; k++) {
            var keyField = this.keyFields[k];
            if (typeof keyField !== "string" || !keyField || knownKeys[keyField]) {
                throw new Error("keyFields must have 2 or 3 distinct field names");
            }
            knownKeys[keyField] = true;
        }

        this.options = options;
        // 3키는 그룹 오름차순, 기존 2키는 처음 등장한 그룹 순서를 기본값으로 사용.
        this.groupOrder = options.groupOrder ||
            (this.keyFields.length === 3 ? "asc" : "input");
        if (this.groupOrder !== "asc" && this.groupOrder !== "input") {
            throw new Error('groupOrder must be "asc" or "input"');
        }
        this.columns = options.columns.slice();
        this._selected = Object.create(null);
        this._rows = [];
        this._destroyed = false;
        this._ownsTable = false;

        var radioColumns = 0;
        var mergedFields = Object.create(null);
        for (var i = 0; i < this.columns.length; i++) {
            var col = this.columns[i];
            if (col.type === "radio") {
                radioColumns++;
            }
            if (col.merge) {
                if (this.keyFields.slice(0, -1).indexOf(col.field) === -1 ||
                    mergedFields[col.field]) {
                    throw new Error("merge is allowed once per radio-group key field");
                }
                mergedFields[col.field] = true;
            }
            if ((col.editor || col.editable) && this.keyFields.indexOf(col.field) !== -1) {
                throw new Error("key fields cannot be edited");
            }
        }
        if (radioColumns !== 1) {
            throw new Error("define exactly one radio column");
        }

        var element = typeof target === "string" ? document.querySelector(target) : target;
        if (!element || !element.nodeType) {
            throw new Error("target element not found");
        }
        this.host = element;
        if (element.tagName.toLowerCase() === "table") {
            this.table = element;
        } else {
            this.table = document.createElement("table");
            this._ownsTable = true;
            element.appendChild(this.table);
        }
        addClass(this.table, options.tableClass || "");
        this.setRows(options.rows || []);
    }

    /** destroy() 이후의 인스턴스 API 사용을 막는다. */
    CellMergeableGrid.prototype._assertAlive = function () {
        if (this._destroyed) {
            throw new Error("grid has been destroyed");
        }
    };

    /**
     * setRows()에 전달된 배열이 올바른지 검사한다.
     * 각 요소는 JSON 행 객체여야 하며 모든 키 필드 값이 유효해야 한다.
     * 3키는 세 필드가 전부 같은 경우만 중복으로 판단한다.
     * 서로 다른 품목 그룹에 같은 업체 코드가 있어도 허용된다.
     */
    CellMergeableGrid.prototype._validateRows = function (rows) {
        if (!Array.isArray(rows)) {
            throw new Error("rows must be a JSON array");
        }
        var seen = Object.create(null);
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            if (!row || typeof row !== "object" || Array.isArray(row)) {
                throw new Error("each row must be a JSON object");
            }
            for (var k = 0; k < this.keyFields.length; k++) {
                if (!isScalar(row[this.keyFields[k]])) {
                    throw new Error("all key fields must have scalar, non-null values");
                }
            }
            var identity = idForRow(row, this.keyFields);
            if (seen[identity]) {
                throw new Error("duplicate composite key at row " + i);
            }
            seen[identity] = true;
        }
    };

    /**
     * 전체 행 데이터 갱신 및 재렌더링.
     * ① 키 중복 검사 → ② 내부 데이터 복사 → ③ 기존 선택 중 유효한 키 유지
     * → ④ render()로 화면 갱신. 다른 데이터에 없는 선택 키는 해제된다.
     *
     * @param {Object[]} rows - 행 JSON 객체 배열
     * @returns {CellMergeableGrid} 체이닝을 위한 그리드 인스턴스
     */
    CellMergeableGrid.prototype.setRows = function (rows) {
        this._assertAlive();
        this._validateRows(rows);
        var newRows = jsonCopy(rows);
        var available = Object.create(null);
        for (var i = 0; i < newRows.length; i++) {
            available[idForRow(newRows[i], this.keyFields)] = true;
        }
        var selected = Object.create(null);
        var keys = Object.keys(this._selected);
        for (var j = 0; j < keys.length; j++) {
            if (available[this._selected[keys[j]]]) {
                selected[keys[j]] = this._selected[keys[j]];
            }
        }
        this._selected = selected;
        this._rows = newRows;
        this.render();
        return this;
    };

    /**
     * 전체 행을 JSON 배열 복사본으로 반환한다.
     * 화면 그룹 ASC와 관계없이 최초 setRows()로 받은 순서가 유지되며,
     * 수량 같은 셀 편집값은 갱신된 상태로 포함된다.
     */
    CellMergeableGrid.prototype.getRows = function () {
        this._assertAlive();
        return jsonCopy(this._rows);
    };

    /**
     * 저장 시 사용할 선택 행 JSON 배열을 반환한다.
     * 3키는 itemCd+matCd 그룹별로 선택된 VendorWebId 행을 최대 하나씩 추출.
     * 반환 객체에는 원본의 모든 필드가 포함되며 data 래퍼는 사용하지 않는다.
     * 선택되지 않은 그룹은 생략하고, 결과는 원본 JSON 행 순서로 제공한다.
     */
    CellMergeableGrid.prototype.getSelectedRows = function () {
        this._assertAlive();
        var result = [];
        for (var i = 0; i < this._rows.length; i++) {
            var row = this._rows[i];
            if (this._selected[idForGroup(row, this.keyFields)] === idForRow(row, this.keyFields)) {
                result.push(jsonCopy(row));
            }
        }
        return result;
    };

    /**
     * 선택된 행들의 복합키 필드만 추출한다.
     * 3키 결과: [{itemCd:'10',matCd:'100510',VendorWebId:'100002'}, ...]
     * 선택 상태의 저장 및 setSelectedKeys()를 통한 복원에 사용한다.
     */
    CellMergeableGrid.prototype.getSelectedKeys = function () {
        var chosen = this.getSelectedRows();
        var result = [];
        for (var i = 0; i < chosen.length; i++) {
            var key = {};
            for (var j = 0; j < this.keyFields.length; j++) {
                key[this.keyFields[j]] = chosen[i][this.keyFields[j]];
            }
            result.push(key);
        }
        return result;
    };

    /**
     * 주어진 복합키들로 전체 Radio 선택 상태를 교체한다.
     * 현재 데이터에 없는 키는 무시되며, 같은 그룹을 여러 번 지정하면
     * 마지막에 제공한 키가 선택된다. 적용 뒤 render()로 화면을 다시 그린다.
     */
    CellMergeableGrid.prototype.setSelectedKeys = function (keys) {
        this._assertAlive();
        if (!Array.isArray(keys)) {
            throw new Error("keys must be an array");
        }
        var present = Object.create(null);
        for (var i = 0; i < this._rows.length; i++) {
            present[idForRow(this._rows[i], this.keyFields)] = true;
        }
        var next = Object.create(null);
        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            if (!key || typeof key !== "object" || Array.isArray(key)) {
                throw new Error("invalid composite key");
            }
            for (var k = 0; k < this.keyFields.length; k++) {
                if (!isScalar(key[this.keyFields[k]])) {
                    throw new Error("invalid composite key");
                }
            }
            var id = idForRow(key, this.keyFields);
            if (present[id]) {
                next[idForGroup(key, this.keyFields)] = id;
            }
        }
        this._selected = next;
        this.render();
        return this;
    };

    /** 모든 그룹의 선택 상태를 비우고 Radio 체크 상태를 초기화한다. */
    CellMergeableGrid.prototype.clearSelection = function () {
        this._assertAlive();
        this._selected = Object.create(null);
        this.render();
        return this;
    };

    /**
     * 전체 복합키로 단일 행을 찾고 일부 일반 필드를 갱신한다.
     * 예: updateRow({itemCd:'10',matCd:'100510',VendorWebId:'100002'}, {qty:50})
     * 키 필드를 변경하면 그룹/행 식별이 깨지므로 예외를 발생시킨다.
     * 행을 찾아 수정하면 재렌더링 후 true, 없으면 false를 반환한다.
     */
    CellMergeableGrid.prototype.updateRow = function (key, patch) {
        this._assertAlive();
        if (!key || !patch || typeof patch !== "object" || Array.isArray(patch)) {
            throw new Error("updateRow expects a composite key and a patch object");
        }
        for (var k = 0; k < this.keyFields.length; k++) {
            if (Object.prototype.hasOwnProperty.call(patch, this.keyFields[k])) {
                throw new Error("key fields cannot be changed by updateRow");
            }
        }
        var id = idForRow(key, this.keyFields);
        for (var i = 0; i < this._rows.length; i++) {
            if (idForRow(this._rows[i], this.keyFields) === id) {
                var fields = Object.keys(patch);
                for (var j = 0; j < fields.length; j++) {
                    this._rows[i][fields[j]] = jsonCopy(patch[fields[j]]);
                }
                this.render();
                return true;
            }
        }
        return false;
    };

    /**
     * 컬럼 콜백 및 onSelect()에 전달하는 이벤트 컨텍스트.
     * ctx = {rowIndex, field, key, grid}
     * rowIndex는 화면 정렬 후 번호가 아닌 원본 JSON 배열의 인덱스이며,
     * key에는 구성된 복합키 필드 2~3개가 전부 들어간다.
     */
    CellMergeableGrid.prototype._context = function (rowIndex, field) {
        var row = this._rows[rowIndex];
        var key = {};
        for (var i = 0; i < this.keyFields.length; i++) {
            key[this.keyFields[i]] = row[this.keyFields[i]];
        }
        return { rowIndex: rowIndex, field: field || null, key: key, grid: this };
    };

    /**
     * 편집된 셀 값을 실제 내부 JSON 행에 반영한다.
     * 실행 순서: 값 변경 → 컬럼 onChange → 전체 onCellChange.
     * 콜백에 전달되는 row는 복사본이므로 내부 데이터 참조를 노출하지 않는다.
     */
    CellMergeableGrid.prototype._changeValue = function (rowIndex, column, value) {
        this._rows[rowIndex][column.field] = value;
        var row = jsonCopy(this._rows[rowIndex]);
        var ctx = this._context(rowIndex, column.field);
        if (typeof column.onChange === "function") {
            column.onChange(value, row, ctx);
        }
        if (typeof this.options.onCellChange === "function") {
            this.options.onCellChange(value, row, ctx);
        }
    };

    /**
     * 컬럼 설정에 따라 HTML 편집 컨트롤을 생성한다.
     * editor:'text'     → 문자열 입력
     * editor:'number'   → 숫자 입력. 공란은 null로 반영
     * editor:'checkbox' → boolean 선택
     * editor:'select'   → 설정한 options 목록의 값/표시명 사용
     * editable:true는 editor:'text'의 단축 설정이다.
     * 입력은 change 이벤트 시 반영하므로 매 타이핑마다 재렌더링하지 않는다.
     */
    CellMergeableGrid.prototype._editor = function (column, rowIndex) {
        var self = this;
        var row = this._rows[rowIndex];
        var editor = column.editor || (column.editable ? "text" : null);
        var node, i, option;
        if (editor === "select") {
            node = document.createElement("select");
            var items = column.options || [];
            for (i = 0; i < items.length; i++) {
                option = document.createElement("option");
                var item = items[i];
                var optValue = item && typeof item === "object" ? item.value : item;
                var optLabel = item && typeof item === "object" ? item.label : item;
                option.value = String(optValue);
                option.textContent = String(optLabel);
                option.selected = same(optValue, row[column.field]);
                node.appendChild(option);
            }
            node.addEventListener("change", function () {
                var selectedItem = items[node.selectedIndex];
                var selectedValue = selectedItem && typeof selectedItem === "object" ?
                    selectedItem.value : selectedItem;
                self._changeValue(rowIndex, column, selectedValue);
            });
            return node;
        }
        node = document.createElement("input");
        if (editor === "checkbox") {
            node.type = "checkbox";
            node.checked = Boolean(row[column.field]);
            node.addEventListener("change", function () {
                self._changeValue(rowIndex, column, node.checked);
            });
        } else if (editor === "text" || editor === "number") {
            node.type = editor;
            node.value = row[column.field] === null || row[column.field] === undefined ?
                "" : String(row[column.field]);
            node.addEventListener("change", function () {
                var value = editor === "number" ? (node.value === "" ? null : Number(node.value)) : node.value;
                if (editor === "number" && value !== null && !isFinite(value)) {
                    return;
                }
                self._changeValue(rowIndex, column, value);
            });
        } else {
            throw new Error("unsupported editor: " + editor);
        }
        return node;
    };

    /**
     * 업체 행마다 병합하지 않는 Radio를 생성한다.
     * 2키: name=key1, value=key2
     * 3키: name='["itemCd값","matCd값"]', value=VendorWebId
     * name이 같으면 브라우저에서 그룹당 하나만 체크할 수 있다.
     * 내부 _selected에는 마지막으로 선택된 행의 전체 복합키를 저장하고
     * onSelect(row, ctx)를 호출한다.
     * 서로 다른 그리드의 Radio name이 겹치면 radioNamePrefix를 설정한다.
     */
    CellMergeableGrid.prototype._radio = function (rowIndex) {
        var self = this;
        var row = this._rows[rowIndex];
        var groupId = idForGroup(row, this.keyFields);
        var groupName = this.keyFields.length === 2 ?
            String(row[this.keyFields[0]]) : groupId;
        var node = document.createElement("input");
        node.type = "radio";
        node.name = String(this.options.radioNamePrefix || "") + groupName;
        node.value = String(row[this.keyFields[this.keyFields.length - 1]]);
        node.checked = this._selected[groupId] === idForRow(row, this.keyFields);
        var labels = [];
        for (var i = 0; i < this.keyFields.length; i++) {
            labels.push(String(row[this.keyFields[i]]));
        }
        node.setAttribute("aria-label", labels.join(" / ") + " 선택");
        node.addEventListener("change", function () {
            if (!node.checked) {
                return;
            }
            self._selected[groupId] = idForRow(row, self.keyFields);
            if (typeof self.options.onSelect === "function") {
                self.options.onSelect(jsonCopy(row), self._context(rowIndex, null));
            }
        });
        return node;
    };

    /**
     * columns 한 항목을 실제 td 셀로 생성한다.
     * Radio / 입력 컨트롤 / renderer / 일반 텍스트 순으로 처리한다.
     * 문자열 결과는 textContent로 출력하여 HTML로 해석하지 않으며,
     * renderer가 DOM Node를 반환한 경우에만 해당 노드를 셀에 삽입한다.
     * onClick 콜백에는 행 복사본·컨텍스트·클릭 이벤트가 제공된다.
     */
    CellMergeableGrid.prototype._cell = function (column, rowIndex) {
        var self = this;
        var row = this._rows[rowIndex];
        var cell = document.createElement("td");
        addClass(cell, column.className || "");
        if (column.type === "radio") {
            cell.appendChild(this._radio(rowIndex));
        } else if (column.editor || column.editable) {
            cell.appendChild(this._editor(column, rowIndex));
        } else {
            var value = row[column.field];
            if (typeof column.renderer === "function") {
                var result = column.renderer(value, jsonCopy(row), this._context(rowIndex, column.field));
                if (result && typeof result.nodeType === "number") {
                    cell.appendChild(result);
                } else {
                    cell.textContent = result === null || result === undefined ? "" : String(result);
                }
            } else if (column.renderer === "number" && typeof value === "number") {
                cell.textContent = value.toLocaleString();
            } else {
                cell.textContent = value === null || value === undefined ? "" : String(value);
            }
        }
        if (typeof column.onClick === "function") {
            cell.addEventListener("click", function (event) {
                column.onClick(jsonCopy(self._rows[rowIndex]),
                    self._context(rowIndex, column.field), event);
            });
        }
        return cell;
    };

    // 화면에서만 그룹을 모으고 실제 입력 JSON 행 순서와 인덱스는 유지한다.
    /**
     * 원본 JSON을 변경하지 않고 화면에 표시할 인덱스 순서를 계산한다.
     * - merge:true 컬럼이 없으면 입력 순서를 그대로 반환한다.
     * - 그룹 키가 같은 행을 하나의 구간으로 모으고 그룹 내부 순서를 유지한다.
     * - groupOrder:'asc'는 품목 ASC → 자재코드 ASC처럼 그룹 키 순서로 정렬.
     * - groupOrder:'input'은 그룹이 처음 등장한 순서로 표시한다.
     *
     * 예: [20/업체A, 10/업체B, 20/업체C] → [10/B, 20/A, 20/C] 화면.
     * 이벤트 rowIndex와 getSelectedRows()는 원본 배열 기준으로 동작한다.
     */
    CellMergeableGrid.prototype._displayOrder = function () {
        var order = [];
        var hasMerge = false;
        for (var c = 0; c < this.columns.length; c++) {
            if (this.columns[c].merge) {
                hasMerge = true;
                break;
            }
        }
        if (!hasMerge) {
            for (var k = 0; k < this._rows.length; k++) {
                order.push(k);
            }
            return order;
        }

        var positionsByKey = Object.create(null);
        var groups = [];
        for (var i = 0; i < this._rows.length; i++) {
            var key = idForGroup(this._rows[i], this.keyFields);
            if (positionsByKey[key] === undefined) {
                positionsByKey[key] = groups.length;
                groups.push([]);
            }
            groups[positionsByKey[key]].push(i);
        }
        if (this.groupOrder === "asc") {
            // 화면에 표시할 그룹만 ASC 정렬. 그룹 안의 공급업체 순서는 그대로 둔다.
            var self = this;
            groups.sort(function (a, b) {
                var left = self._rows[a[0]];
                var right = self._rows[b[0]];
                for (var k = 0; k < self.keyFields.length - 1; k++) {
                    var field = self.keyFields[k];
                    var cmp = compareCode(left[field], right[field]);
                    if (cmp !== 0) {
                        return cmp;
                    }
                }
                return a[0] - b[0]; // 정렬값이 같다면 원본 그룹 등장 순서로 정렬
            });
        }
        for (var g = 0; g < groups.length; g++) {
            for (var j = 0; j < groups[g].length; j++) {
                order.push(groups[g][j]);
            }
        }
        return order;
    };

    /**
     * 기존 테이블의 thead/tbody를 다시 생성한다(colgroup/tfoot 보존).
     * _displayOrder()를 이용해 그룹별 행들을 연속 배치한다.
     * 그룹 첫 행에서는 merge:true 컬럼의 td를 만들고 rowspan을 지정하며,
     * 이후 같은 그룹 행에서는 해당 td를 생성하지 않는다.
     * Radio와 공급업체 필드는 매 행 별도로 생성된다.
     * 외부 CSS를 변경하지 않으므로 border/높이/색상은 페이지에서 설정한다.
     */
    CellMergeableGrid.prototype.render = function () {
        this._assertAlive();
        var oldSections = this.table.querySelectorAll("thead, tbody");
        for (var s = oldSections.length - 1; s >= 0; s--) {
            oldSections[s].parentNode.removeChild(oldSections[s]);
        }

        var thead = document.createElement("thead");
        var heading = document.createElement("tr");
        for (var c = 0; c < this.columns.length; c++) {
            var th = document.createElement("th");
            th.textContent = this.columns[c].title || "";
            addClass(th, this.columns[c].headerClass || this.columns[c].className || "");
            heading.appendChild(th);
        }
        thead.appendChild(heading);
        this.table.appendChild(thead);

        var tbody = document.createElement("tbody");
        var displayOrder = this._displayOrder();
        for (var position = 0; position < displayOrder.length; position++) {
            var i = displayOrder[position];
            var row = this._rows[i];
            var tr = document.createElement("tr");
            var rowClass = typeof this.options.rowClass === "function" ?
                this.options.rowClass(jsonCopy(row), i) : this.options.rowClass;
            addClass(tr, rowClass || "");

            for (c = 0; c < this.columns.length; c++) {
                var column = this.columns[c];
                if (column.merge && position > 0 &&
                    sameGroup(row, this._rows[displayOrder[position - 1]], this.keyFields)) {
                    continue;
                }
                var cell = this._cell(column, i);
                if (column.merge) {
                    var span = 1;
                    while (position + span < displayOrder.length &&
                        sameGroup(row, this._rows[displayOrder[position + span]], this.keyFields)) {
                        span++;
                    }
                    if (span > 1) {
                        cell.rowSpan = span;
                    }
                    cell.style.verticalAlign = "middle";
                }
                tr.appendChild(cell);
            }
            tbody.appendChild(tr);
        }
        this.table.appendChild(tbody);
        return this;
    };

    /**
     * 그리드의 렌더링 결과 및 내부 상태 정리.
     * 새로 생성한 table은 제거하고, 기존 table을 받은 경우에는
     * thead/tbody만 제거하여 CSS 클래스와 colgroup/tfoot은 남겨 둔다.
     * destroy() 호출 후 다시 사용하려면 새 인스턴스를 만들어야 한다.
     */
    CellMergeableGrid.prototype.destroy = function () {
        if (this._destroyed) {
            return;
        }
        if (this._ownsTable) {
            this.host.removeChild(this.table);
        } else {
            var sections = this.table.querySelectorAll("thead, tbody");
            for (var i = sections.length - 1; i >= 0; i--) {
                sections[i].parentNode.removeChild(sections[i]);
            }
        }
        this._rows = [];
        this._selected = Object.create(null);
        this._destroyed = true;
    };

    return CellMergeableGrid;
}));
