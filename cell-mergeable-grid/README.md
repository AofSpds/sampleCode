# CellMergeableGrid

JSP / jQuery-based legacy screens can use this dependency-free JavaScript component without introducing a separate grid library. It renders a JSON array as a normal HTML table, merges **only key1 cells** with rowspan, and creates **one radio per row**.

## Behavior

| Concern | Rule |
| --- | --- |
| Data | Each array element is one row object; no nested data wrapper |
| Identity | key1 + key2; duplicate combinations are rejected |
| Merge | Only the configured key1 column; **adjacent equal values** share a rowspan |
| Radio | Each individual row has one radio; its HTML name is **String(key1)** by default |
| Grouping | One selected row per key1 (different key1 groups select independently) |
| Retention | Selection survives render() and setRows() if the selected composite key remains |
| Output | getSelectedRows() returns selected **complete row objects** in source order |
| Editors | Text, number, checkbox, select; edits mutate the internal row object |
| Styles | No component CSS injected; existing table and CSS classes are reused |

The component **does not sort or rearrange rows**. To merge all records belonging to one key1 into a single cell, supply rows grouped contiguously by key1. Noncontiguous occurrences still belong to the same radio group, but render as separate rowspan runs.

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

## Column definitions

- type: "radio" — exactly one such column per grid; **never merged**.
- field — property name on the row JSON object; only declared columns render.
- title — table header text.
- merge: true — applies only to keyFields[0] (key1) in v1.
- renderer: function(value, row, ctx) — return a DOM Node or text; text is safely inserted via textContent.
- renderer: "number" — number formatted with toLocaleString().
- editor: "text" | "number" | "checkbox" | "select" — editable cell. The short alias editable: true means editor: "text".
- options: [{value, label}] — options for editor: "select".
- onClick: function(row, ctx, event) — cell click handler.
- onChange: function(value, row, ctx) — editor's change handler.
- className, headerClass — optionally reuse existing table CSS classes for td/th.

The ctx object contains { rowIndex, field, key, grid }; ctx.key uses both configured key field names. onSelect(row, ctx) and onCellChange(value, row, ctx) are grid-level callbacks.

Editor changes are committed on the native change event (typically when the control loses focus), without re-rendering the table or stealing focus. After changing data that controls another cell's rendering, call grid.render() if needed.

## API

| Method | Returns / effect |
| --- | --- |
| setRows(jsonArray) | Deep-copies rows, validates composite-key uniqueness, preserves valid selections, rerenders |
| getRows() | JSON array containing all rows and edits |
| getSelectedRows() | JSON array containing one complete row per selected key1 group |
| getSelectedKeys() | Array of {key1, key2} key objects using configured field names |
| setSelectedKeys(keys) | Restores selection for keys present in current data; rerenders |
| clearSelection() | Clears all radio selections |
| updateRow(key, patch) | Updates non-key properties on one row and rerenders; returns boolean |
| render() | Rerenders while retaining edited data and selections |
| destroy() | Removes generated table/sections and listeners |

getRows() and getSelectedRows() return independent JSON copies. Editing the returned objects does not modify the grid.

## Styling and integration boundaries

**The component does not include or override application CSS.** Passing an existing table (instead of an empty div) retains its class attribute and colgroup, while generating only thead/tbody rows and cells. Optional tableClass, rowClass and column className/headerClass can reuse selectors from the actual JSP and stylesheet.

The demo uses demo/demo.css **only as an illustrative skin**. An application's stylesheet and representative table markup are not included; do not assume the demo's colors, spacing or selectors exactly match your project.

By default, radio name is the key1 string **without a prefix** as requested. If multiple grids on the same HTML page contain the same key1 values, HTML's global radio-name behavior can conflict. In that case set radioNamePrefix to a unique per-grid prefix (the name remains derived from key1), or otherwise isolate the groups in their own form.

Key fields must be non-null JSON scalars and should be consistently typed; key columns cannot be edited in v1. Duplicate (key1,key2) pairs throw an error. JSON row fields that are absent from columns remain intact on round-trip. The library does not include pagination, virtualization, server calls or persistence.

## Open and test

- Open demo/index.html in a browser for an interactive example.
- Open tests/browser-tests.html in a browser; the page reports pass/fail.
- No npm install, build tooling or jQuery required.

## Integration placement

When integrating into an application, copy CellMergeableGrid.js under its static JavaScript area and mount it on an existing table. Consult the application's stylesheet and page markup for exact selectors before making pixel-fidelity claims.
