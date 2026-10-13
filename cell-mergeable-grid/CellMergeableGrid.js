/*
 * CellMergeableGrid v1.0
 * Dependency-free, browser-global / CommonJS. No component CSS is injected.
 * Designed to reuse an existing MPS <table> and its CSS classes.
 */
(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.CellMergeableGrid = factory();
    }
}(typeof globalThis !== "undefined" ? globalThis : this, function () {
    "use strict";

    function jsonCopy(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function idForGroup(value) {
        return JSON.stringify([value]);
    }

    function idForRow(row, fields) {
        return JSON.stringify([row[fields[0]], row[fields[1]]]);
    }

    function same(a, b) {
        return a === b;
    }

    function addClass(element, className) {
        if (className && typeof className === "string") {
            element.className = (element.className ? element.className + " " : "") + className;
        }
    }

    function isScalar(value) {
        return value !== null && (typeof value === "string" ||
            (typeof value === "number" && isFinite(value)) ||
            typeof value === "boolean");
    }

    function CellMergeableGrid(target, options) {
        options = options || {};
        if (!Array.isArray(options.columns) || options.columns.length === 0) {
            throw new Error("columns must be a nonempty array");
        }

        this.keyFields = options.keyFields || ["key1", "key2"];
        if (!Array.isArray(this.keyFields) || this.keyFields.length !== 2 ||
            typeof this.keyFields[0] !== "string" || typeof this.keyFields[1] !== "string" ||
            this.keyFields[0] === this.keyFields[1]) {
            throw new Error("keyFields must contain two distinct field names");
        }

        this.options = options;
        this.columns = options.columns.slice();
        this._selected = Object.create(null);
        this._rows = [];
        this._destroyed = false;
        this._ownsTable = false;

        var radioColumns = 0;
        var mergeColumns = 0;
        for (var i = 0; i < this.columns.length; i++) {
            var col = this.columns[i];
            if (col.type === "radio") {
                radioColumns++;
            }
            if (col.merge) {
                mergeColumns++;
                if (col.field !== this.keyFields[0]) {
                    throw new Error("v1 supports merging only keyFields[0]");
                }
            }
            if ((col.editor || col.editable) &&
                (col.field === this.keyFields[0] || col.field === this.keyFields[1])) {
                throw new Error("key fields cannot be edited in v1");
            }
        }
        if (radioColumns !== 1 || mergeColumns > 1) {
            throw new Error("define exactly one radio column and at most one merged column");
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

    CellMergeableGrid.prototype._assertAlive = function () {
        if (this._destroyed) {
            throw new Error("grid has been destroyed");
        }
    };

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
            if (!isScalar(row[this.keyFields[0]]) || !isScalar(row[this.keyFields[1]])) {
                throw new Error("both key fields must have scalar, non-null values");
            }
            var identity = idForRow(row, this.keyFields);
            if (seen[identity]) {
                throw new Error("duplicate composite key at row " + i);
            }
            seen[identity] = true;
        }
    };

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

    CellMergeableGrid.prototype.getRows = function () {
        this._assertAlive();
        return jsonCopy(this._rows);
    };

    CellMergeableGrid.prototype.getSelectedRows = function () {
        this._assertAlive();
        var result = [];
        for (var i = 0; i < this._rows.length; i++) {
            var row = this._rows[i];
            if (this._selected[idForGroup(row[this.keyFields[0]])] === idForRow(row, this.keyFields)) {
                result.push(jsonCopy(row));
            }
        }
        return result;
    };

    CellMergeableGrid.prototype.getSelectedKeys = function () {
        var chosen = this.getSelectedRows();
        var result = [];
        for (var i = 0; i < chosen.length; i++) {
            var key = {};
            key[this.keyFields[0]] = chosen[i][this.keyFields[0]];
            key[this.keyFields[1]] = chosen[i][this.keyFields[1]];
            result.push(key);
        }
        return result;
    };

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
            if (!key || !isScalar(key[this.keyFields[0]]) || !isScalar(key[this.keyFields[1]])) {
                throw new Error("invalid composite key");
            }
            var id = idForRow(key, this.keyFields);
            if (present[id]) {
                next[idForGroup(key[this.keyFields[0]])] = id;
            }
        }
        this._selected = next;
        this.render();
        return this;
    };

    CellMergeableGrid.prototype.clearSelection = function () {
        this._assertAlive();
        this._selected = Object.create(null);
        this.render();
        return this;
    };

    CellMergeableGrid.prototype.updateRow = function (key, patch) {
        this._assertAlive();
        if (!key || !patch || typeof patch !== "object" || Array.isArray(patch)) {
            throw new Error("updateRow expects a composite key and a patch object");
        }
        if (Object.prototype.hasOwnProperty.call(patch, this.keyFields[0]) ||
            Object.prototype.hasOwnProperty.call(patch, this.keyFields[1])) {
            throw new Error("key fields cannot be changed by updateRow");
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

    CellMergeableGrid.prototype._context = function (rowIndex, field) {
        var row = this._rows[rowIndex];
        var key = {};
        key[this.keyFields[0]] = row[this.keyFields[0]];
        key[this.keyFields[1]] = row[this.keyFields[1]];
        return { rowIndex: rowIndex, field: field || null, key: key, grid: this };
    };

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

    CellMergeableGrid.prototype._radio = function (rowIndex) {
        var self = this;
        var row = this._rows[rowIndex];
        var groupKey = row[this.keyFields[0]];
        var node = document.createElement("input");
        node.type = "radio";
        node.name = String(this.options.radioNamePrefix || "") + String(groupKey);
        node.value = String(row[this.keyFields[1]]);
        node.checked = this._selected[idForGroup(groupKey)] === idForRow(row, this.keyFields);
        node.setAttribute("aria-label", String(groupKey) + " / " +
            String(row[this.keyFields[1]]) + " 선택");
        node.addEventListener("change", function () {
            if (!node.checked) {
                return;
            }
            self._selected[idForGroup(groupKey)] = idForRow(row, self.keyFields);
            if (typeof self.options.onSelect === "function") {
                self.options.onSelect(jsonCopy(row), self._context(rowIndex, null));
            }
        });
        return node;
    };

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

    CellMergeableGrid.prototype.render = function () {
        this._assertAlive();
        var oldSections = this.table.querySelectorAll("thead, tbody, tfoot");
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
        for (var i = 0; i < this._rows.length; i++) {
            var row = this._rows[i];
            var tr = document.createElement("tr");
            var rowClass = typeof this.options.rowClass === "function" ?
                this.options.rowClass(jsonCopy(row), i) : this.options.rowClass;
            addClass(tr, rowClass || "");

            for (c = 0; c < this.columns.length; c++) {
                var column = this.columns[c];
                if (column.merge && i > 0 &&
                    same(row[this.keyFields[0]], this._rows[i - 1][this.keyFields[0]])) {
                    continue;
                }
                var cell = this._cell(column, i);
                if (column.merge) {
                    var span = 1;
                    while (i + span < this._rows.length &&
                        same(row[this.keyFields[0]], this._rows[i + span][this.keyFields[0]])) {
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

    CellMergeableGrid.prototype.destroy = function () {
        if (this._destroyed) {
            return;
        }
        if (this._ownsTable) {
            this.host.removeChild(this.table);
        } else {
            var sections = this.table.querySelectorAll("thead, tbody, tfoot");
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
