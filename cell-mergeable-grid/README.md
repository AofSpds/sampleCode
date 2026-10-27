# CellMergeableGrid

JSP / jQuery-based legacy screens can use this dependency-free JavaScript component without introducing a separate grid library. It renders a JSON array as a normal HTML table, merges configured group-key columns with rowspan, and creates **one radio per supplier row**.

## Behavior

| Concern | Rule |
| --- | --- |
| Data | Each array element is one row object; no nested data wrapper |
| Identity | 2-key: `key1 + key2`; 3-key: `itemCd + matCd + VendorWebId`. Duplicate complete keys are rejected |
| Grouping | The **first N−1 fields** are radio-group keys; the **last** key identifies the supplier/item row |
| Merge | `merge: true` is supported on group-key columns (one or both in 3-key mode). Display rows are automatically grouped by the full radio-group key |
| Radio | A separate radio per row. In 2-key mode `name=String(key1)`; in 3-key mode `name=JSON.stringify([itemCd,matCd])`; `value` is the last key |
| Selection | One chosen row per group; different `itemCd + matCd` groups remain independent |
| Display order | **3-key mode defaults to group ASC** (`itemCd`, then `matCd`); 2-key mode retains first-seen ordering. `groupOrder: "input"` opts out; `"asc"` opts in for 2-key mode |
| Retention | Selection survives render() and setRows() if the selected composite key remains |
| Output | getSelectedRows() returns selected **complete row objects** in source order |
| Editors | Text, number, checkbox, select; edits mutate the internal row object |
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

## Column definitions

- type: "radio" — exactly one such column per grid; **never merged**.
- field — property name on the row JSON object; only declared columns render.
- title — table header text.
- merge: true — may be assigned once to each **group field** (all keyFields except the last). For 3 keys, both itemCd and matCd can be merged, but VendorWebId cannot.
- renderer: function(value, row, ctx) — return a DOM Node or text; text is safely inserted via textContent.
- renderer: "number" — number formatted with toLocaleString().
- editor: "text" | "number" | "checkbox" | "select" — editable cell. The short alias editable: true means editor: "text".
- options: [{value, label}] — options for editor: "select".
- onClick: function(row, ctx, event) — cell click handler.
- onChange: function(value, row, ctx) — editor's change handler.
- className, headerClass — optionally reuse existing table CSS classes for td/th.

The ctx object contains { rowIndex, field, key, grid }; ctx.key includes **all configured key field names** (two or three). onSelect(row, ctx) and onCellChange(value, row, ctx) are grid-level callbacks.

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

- Open demo/index.html in a browser for an interactive example (the input rows deliberately alternate key1 values to demonstrate automatic display grouping).
- Open tests/browser-tests.html in a browser; the page reports pass/fail.
- No npm install, build tooling or jQuery required.

## Integration placement

When integrating into an application, copy CellMergeableGrid.js under its static JavaScript area and mount it on an existing table. Consult the application's stylesheet and page markup for exact selectors before making pixel-fidelity claims.
