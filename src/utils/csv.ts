// 轻量 CSV 解析器：支持双引号包裹字段，字段内可含逗号/引号（"" 转义）/换行
// 返回按行划分的二维字符串数组（含表头行），每个单元格已 trim

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const endField = () => {
    row.push(field.trim());
    field = '';
  };
  const endRow = () => {
    endField();
    if (!(row.length === 1 && row[0] === '')) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n' || ch === '\r') {
      endRow();
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      field += ch;
    }
  }

  if (field.length > 0 || row.length > 0) {
    endRow();
  }
  return rows;
}

export function parseFirstLine(text: string): string[] {
  const rows = parseCsv(text);
  return rows[0] ?? [];
}