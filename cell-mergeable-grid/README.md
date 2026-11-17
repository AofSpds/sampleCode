# CellMergeableGrid

JSP / jQuery-based legacy screens can use this dependency-free JavaScript component without introducing a separate grid library. It renders a JSON array as a normal HTML table, merges configured group-key or non-key columns with rowspan, and creates **one radio per supplier row**.

## Behavior

| Concern | Rule |
| --- | --- |
| Data | Each array element is one row object; no nested data wrapper |
| Identity | 2-key: `key1 + key2`; 3-key: `itemCd + matCd + VendorWebId`. Duplicate complete keys are rejected |
| Grouping | The **first N−1 fields** are radio-group keys; the **last** key identifies the supplier/item row |
| Merge | `merge: true` supports group-key and non-key read-only columns. Only consecutive displayed rows in the same full radio group with strictly equal field values are merged |
| Radio | A separate radio per row. In 2-key mode `name=String(key1)`; in 3-key mode `name=JSON.stringify([itemCd,matCd])`; `value` is the last key |
| Selection | One chosen row per group; different `itemCd + matCd` groups remain independent |
| Display order | **3-key mode defaults to group ASC** (`itemCd`, then `matCd`); 2-key mode retains first-seen ordering. `groupOrder: "input"` opts out; `"asc"` opts in for 2-key mode |
| Retention | Selection survives render() and setRows() if the selected composite key remains |
| Output | getSelectedRows() returns selected **complete row objects** in source order |
| Editors | Text, number, checkbox, select; edits mutate the internal row object. A merged column cannot also be an editor |
| Errors | Component validation and lifecycle error messages are in Korean; option and field names remain identifiable |
| Styles | No component CSS injected; existing table and CSS classes are reused |

The component **automatically groups visual rows by the complete radio-group key** (ascending group-key order by default for 3-key grids, then original order within each group). With three key fields, `itemCd` alone does NOT merge two groups if their `matCd` values differ. In 2-key mode the behavior remains based on key1. **The input array and internal row order are not changed:** `getRows()` and `getSelectedRows()` return complete JSON rows in original input order; selection and editor callbacks still reference original row indices.

## Usage in an existing JSP

Use an existing table element and its actual CSS class. The example class below is a placeholder; match your application's selectors.

~~~html
<!-- Keep the CSS classes and optional colgroup from the existing JSP. -->
<table id="purchaseGrid" class="YOUR_EXISTING_TABLE_CLASS"></table>
<script src="/your-static-path/CellMergeableGrid.js"></script>
<script>
var grid = new CellMergeableGrid("#purchaseGrid", {
    keyFields: ["key1", "key2"],
    columns: [
        { type: "radio", title: "선택" },
        { field: "key1", title: "구분", merge: true },
        { field: "key2", title: "품목" },
        { field: "qty", title: "수량", editor: "number",
          onChange: function (value, row, ctx) { console.log(value, row); } },
        { field: "status", title: "상태",
          renderer: function (value, row, ctx) { return value; },
          onClick: function (row, ctx, event) { console.log(row); } }
    ],
    onSelect: function (row, ctx) {
        console.log("selected key1 group:", ctx.key.key1, row);
    }
});

grid.setRows([
    { key1: "A", key2: "01", qty: 10, status: "대기", hiddenId: 100 },
    { key1: "A", key2: "02", qty: 20, status: "완료", hiddenId: 101 },
    { key1: "B", key2: "01", qty: 30, status: "대기", hiddenId: 102 }
]);

// Native array of complete JSON row objects, no { data: [...] } wrapping.
var selectedRows = grid.getSelectedRows();
var json = JSON.stringify(selectedRows);
</script>
~~~

With A/02 and B/01 selected, getSelectedRows() returns:

~~~json
[
  { "key1": "A", "key2": "02", "qty": 20, "status": "완료", "hiddenId": 101 },
  { "key1": "B", "key2": "01", "qty": 30, "status": "대기", "hiddenId": 102 }
]
~~~


## Item + material + supplier (3-key example)

Use the first two fields for a shared item/material **radio group** and the last field to identify the supplier row. Both itemCd and matCd are rowspan-merged; each supplier still gets its own radio. The original data order is preserved when exporting JSON.

~~~javascript
var grid = new CellMergeableGrid("#grid", {
    keyFields: ["itemCd", "matCd", "VendorWebId"],
    groupOrder: "asc", // itemCd ASC, then matCd ASC (default in 3-key mode)
    columns: [
        { type: "radio", title: "선택" },
        { field: "itemCd", title: "품목", merge: true },
        { field: "matCd", title: "자재코드", merge: true },
        { field: "VendorWebId", title: "업체코드" },
        { field: "vendorName", title: "업체명" },
        { field: "qty", title: "수량", editor: "number" }
    ]
});
grid.setRows([
    { itemCd:"10", matCd:"100510", VendorWebId:"100002", vendorName:"업체A", qty:10 },
    { itemCd:"20", matCd:"200110", VendorWebId:"100002", vendorName:"업체A", qty:20 },
    { itemCd:"10", matCd:"100510", VendorWebId:"100006", vendorName:"업체B", qty:30 }
]);

grid.setSelectedKeys([
    { itemCd:"10", matCd:"100510", VendorWebId:"100006" },
    { itemCd:"20", matCd:"200110", VendorWebId:"100002" }
]);
var selectedRows = grid.getSelectedRows(); // plain JSON array, no wrapper
var json = JSON.stringify(selectedRows);
~~~

**Important:** The input array above deliberately interleaves the two groups. The table visually groups them for correct rowspans, while getRows()/getSelectedRows() retain original input order. For 2-key legacy usage, the existing name and selection rules are unchanged.

## 키가 아닌 일반 컬럼 병합

자재명(`matName`)처럼 `keyFields`에 포함되지 않은 컬럼도 `merge: true`로 병합할 수 있습니다. `keyFields`는 기존처럼 그룹 및 행 식별에 사용하며, 병합하려는 일반 컬럼을 키에 추가할 필요가 없습니다.

~~~javascript
var grid = new CellMergeableGrid("#grid", {
    keyFields: ["itemCd", "matCd", "VendorWebId"],
    columns: [
        { type: "radio", title: "선택" },
        { field: "itemCd", title: "품목", merge: true },
        { field: "matCd", title: "자재코드", merge: true },
        { field: "matName", title: "자재명", merge: true }, // 키가 아닌 컬럼
        { field: "VendorWebId", title: "업체코드" },
        { field: "qty", title: "수량", editor: "number" }
    ]
});
grid.setRows([
    { itemCd:"10", matCd:"100510", VendorWebId:"A", matName:"자재 A", qty:10 },
    { itemCd:"10", matCd:"100510", VendorWebId:"B", matName:"자재 A", qty:20 },
    { itemCd:"10", matCd:"100510", VendorWebId:"C", matName:"자재 B", qty:30 }
]);
// 품목·자재코드는 3행, 자재명 '자재 A'는 앞의 2행만 병합됩니다.

grid.updateRow(
    { itemCd:"10", matCd:"100510", VendorWebId:"B" },
    { matName:"자재 B" }
);
// 변경 후 자재명 '자재 B'가 뒤의 2행에서 병합됩니다.
~~~

- 병합 범위는 같은 라디오 선택 그룹 안의 **화면상 연속된 행**입니다. 값이 같아도 다른 그룹과 합쳐지거나, 중간의 다른 값을 건너뛰어 병합되지 않습니다.
- 각 컬럼은 독립적으로 병합합니다. 비교 기준은 `renderer`의 표시 결과가 아닌 원본 필드 값이며, `===`로 값과 자료형을 함께 비교합니다. 예를 들어 숫자 `0`과 문자열 `"0"`은 병합하지 않습니다.
- `null`끼리 또는 누락된 필드끼리는 병합할 수 있지만, `null`과 누락된 필드는 서로 병합하지 않습니다. 배열·객체는 내용에 대한 깊은 비교를 하지 않습니다.
- 라디오 컬럼과 마지막 행 식별 키(`VendorWebId`)는 병합할 수 없습니다. 동일 필드의 병합 설정은 한 컬럼에만 지정할 수 있습니다.
- 병합 컬럼에는 `editor` 또는 `editable`을 함께 설정할 수 없습니다. 값을 바꿀 때는 `updateRow()` 또는 `setRows()`를 사용하면 병합 범위가 다시 계산됩니다.
- 병합 셀의 `renderer`와 `onClick`은 해당 병합 구간의 첫 번째 표시 행을 기준으로 호출됩니다. `ctx.rowIndex`는 그 행의 원본 JSON 인덱스입니다.

병합은 화면 표현에만 적용되므로 행 데이터, 그룹별 선택 상태 및 JSON 반환 순서는 그대로 유지됩니다.

## Column definitions

- type: "radio" — exactly one such column per grid; **never merged**.
- field — property name on the row JSON object; only declared columns render.
- title — table header text.
- merge: true — may be assigned once per field to a group-key or non-key read-only column. Consecutive displayed rows merge only within the same full radio group and when the field values are strictly equal. The last identity key and radio columns cannot merge; neither can columns with editor or editable enabled.
- renderer: function(value, row, ctx) — return a DOM Node or text; text is safely inserted via textContent.
- renderer: "number" — number formatted with toLocaleString().
- editor: "text" | "number" | "checkbox" | "select" — editable cell. The short alias editable: true means editor: "text".
- options: [{value, label}] — options for editor: "select".
- onClick: function(row, ctx, event) — cell click handler.
- onChange: function(value, row, ctx) — editor's change handler.
- className, headerClass — optionally reuse existing table CSS classes for td/th.

The ctx object contains { rowIndex, field, key, grid }; ctx.key includes **all configured key field names** (two or three). A merged cell uses the first displayed row in its merged span for renderer and onClick callbacks. onSelect(row, ctx) and onCellChange(value, row, ctx) are grid-level callbacks.

Editor changes are committed on the native change event (typically when the control loses focus), without re-rendering the table or stealing focus. After changing data that controls another cell's rendering, call grid.render() if needed.

## API

| Method | Returns / effect |
| --- | --- |
| setRows(jsonArray) | Deep-copies rows, validates composite-key uniqueness, preserves valid selections; groups only display order, with configurable groupOrder |
| getRows() | JSON array containing all rows and edits |
| getSelectedRows() | JSON array containing one complete row per selected radio group (in original input order) |
| getSelectedKeys() | Array of objects containing **all** key fields (2 or 3), in original input order |
| setSelectedKeys(keys) | Restores selection for keys present in current data; rerenders |
| clearSelection() | Clears all radio selections |
| updateRow(key, patch) | Updates non-key properties on one row and rerenders; returns boolean |
| render() | Rerenders while retaining edited data and selections |
| destroy() | Removes generated table/sections and listeners |

getRows() and getSelectedRows() return independent JSON copies. Editing the returned objects does not modify the grid.

## Styling and integration boundaries

**The component does not include or override application CSS.** Passing an existing table (instead of an empty div) retains its class attribute and colgroup, while generating only thead/tbody rows and cells. Optional tableClass, rowClass and column className/headerClass can reuse selectors from the actual JSP and stylesheet.

The demo uses demo/demo.css **only as an illustrative skin**. An application's stylesheet and representative table markup are not included; do not assume the demo's colors, spacing or selectors exactly match your project.

For 2-key usage, radio name remains the key1 string. With 3 keys, the radio group name is a JSON-serialized array of the first two key values, preventing collisions between different composite groups. If multiple grids on the same HTML page contain the same key1 values, HTML's global radio-name behavior can conflict. In that case set radioNamePrefix to a unique per-grid prefix (the name remains derived from key1), or otherwise isolate the groups in their own form.

Key fields must be non-null JSON scalars and should be consistently typed; key columns cannot be edited. Duplicate **complete key tuples** throw an error, but VendorWebId may repeat across different itemCd+matCd groups. JSON row fields that are absent from columns remain intact on round-trip. The library does not include pagination, virtualization, server calls or persistence.

## Open and test

- Open demo/index.html in a browser for an interactive example with shuffled input, group-key merging and non-key material-name merging. Invalid JSON input and component validation failures are shown in Korean.
- Open tests/browser-tests.html in a browser; the page reports pass/fail.
- No npm install, build tooling or jQuery required.

## Integration placement

When integrating into an application, copy CellMergeableGrid.js under its static JavaScript area and mount it on an existing table. Consult the application's stylesheet and page markup for exact selectors before making pixel-fidelity claims.
