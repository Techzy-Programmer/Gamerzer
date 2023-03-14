const json_btn = document.querySelector('#dash > .stats #toJSON');
const table_rows = document.querySelectorAll('#dash > .stats tbody tr');
const table_headings = document.querySelectorAll('#dash > .stats thead th');
const inputSearch = document.querySelector('#dash > .stats .input-group input');

// functionality to sort using headers
table_headings.forEach((head, i) => {
    let sort_asc = true;
    head.onclick = () => {
        table_headings.forEach(head => head.classList.remove('active')); head.classList.add('active');
        document.querySelectorAll('#dash > .stats td').forEach(td => td.classList.remove('active'));
        table_rows.forEach(row => row.querySelectorAll('td')[i].classList.add('active'))
        head.classList.toggle('asc', sort_asc);
        sort_asc = head.classList.contains('asc') ? false : true;
        sortTable(i, sort_asc);
    }
});

export function initTable() {
    const pdf_btn = document.querySelector('#dash > .stats #toPDF');
    inputSearch.addEventListener('input', searchTable);
    pdf_btn.onclick = toPDF;

    json_btn.onclick = () => {
        const customers_table = document.querySelector('#dash > .stats table');
        const json = toJSON(customers_table); // convert to JSON
        downloadFile(json, 'gamerzer-statistics.json');
    }
}

// Search for data inside of HTML table
function searchTable() {
    table_rows.forEach((row, i) => {
        const delay = i / 25;
        let table_data = row.textContent.toLowerCase();
        const search_data = inputSearch.value.toLowerCase();
        const found = table_data.indexOf(search_data) > -1;
        let isHidden = row.classList.contains('hide');
        row.style.setProperty('--delay', delay + 's');

        if (isHidden) {
            if (found) {
                row.style.setProperty('display', 'table-row');
                setTimeout(() => row.classList.remove('hide'), 50);
            }
        }
        else {
            if (!found) {
                row.classList.add('hide');
                let animTime = delay + 0.5;
                setTimeout(() => row.style.setProperty('display', 'none'), animTime * 1000);
            }
        }
    });

    document.querySelectorAll('#dash > .stats tbody tr:not(.hide)').forEach((visible_row, i) =>
        visible_row.style.backgroundColor = (i % 2 == 0) ? 'transparent' : '#0000000b');
}

function sortTable(column, sort_asc) {
    [...table_rows].sort((a, b) => {
        const first_row = a.querySelectorAll('td')[column].textContent.toLowerCase();
        const second_row = b.querySelectorAll('td')[column].textContent.toLowerCase();
        return sort_asc ? (first_row < second_row ? 1 : -1) : (first_row < second_row ? -1 : 1);

    }).map(sorted_row => document.querySelector('tbody').appendChild(sorted_row));
}

// Let's convert HTML table to PDF
function toPDF() {
    const html_code = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <link rel="stylesheet" href="../styles/look.css">
        </head>
        <body>
            <div id="dash" style="display: flex;">
                ${document.querySelector('#dash > .stats').innerHTML}
            </div>
            <script>
                window.addEventListener('afterprint', (event) => {
                    close();
                });
            </script
        </body>
    </html>
    `;

    const new_window = window.open();
    new_window.document.write(html_code);
    setTimeout(() => new_window.print(), 250);
}

// Let's convert HTML table to JSON data
function toJSON(table) {
    let t_headings = table.querySelectorAll('th');
    let t_rows = table.querySelectorAll('tr');
    let table_data = [];
    let t_head = [];

    for (let t_heading of t_headings) {
        let actual_head = t_heading.textContent.trim().split(' ');
        t_head.push(actual_head.splice(0, actual_head.length - 1).join(' ').toLowerCase());
    }

    t_rows.forEach(row => {
        const row_object = {};
        const t_cells = row.querySelectorAll('td');
        t_cells.forEach((t_cell, cell_index) => row_object[t_head[cell_index]] = t_cell.textContent.trim());
        if (Object.keys(row_object).length > 0) table_data.push(row_object);
    });

    return JSON.stringify(table_data, null, 4);
}

// File download function
function downloadFile(data, fileName = '') {
    const a = document.createElement('a');
    a.style.visibility = 'hidden'; a.download = fileName;
    a.href = `data:application/json;charset=utf-8,${encodeURIComponent(data)}`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
}
