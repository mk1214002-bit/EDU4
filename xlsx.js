'use strict';

const SPREADSHEET_XML = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const OFFICE_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const PACKAGE_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML_HEADER = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const MAX_EXCEL_INTEGER = 999999999999999n;

function escapeSpreadsheetText(text) {
  return text.replace(/[&<>]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[character]);
}

function spreadsheetText(address, text, style = 0) {
  return `<c r="${address}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${escapeSpreadsheetText(text)}</t></is></c>`;
}

function spreadsheetAmount(address, amount, style, formula = '') {
  if (amount > MAX_EXCEL_INTEGER || amount < -MAX_EXCEL_INTEGER) {
    return spreadsheetText(address, amount.toString(), style);
  }
  const calculation = formula ? `<f>${formula}</f>` : '';
  return `<c r="${address}" s="${style}">${calculation}<v>${amount}</v></c>`;
}

function tripSheet(result) {
  const rows = [];
  function addRow(height, cells) {
    const number = rows.length + 1;
    rows.push(`<row r="${number}" ht="${height}" customHeight="1">${cells(number)}</row>`);
  }

  addRow(30, row => spreadsheetText(`A${row}`, '국내 출장여비 계산 결과', 1));
  for (const [label, value] of [['출장 기간', result.period], ['출장 정보', result.description], ['적용 조건', result.conditions]]) {
    addRow(21, row => spreadsheetText(`A${row}`, label, 5) + spreadsheetText(`B${row}`, value));
  }
  addRow(10, () => '');
  addRow(23, row => ['항목', '금액 (원)', '세부내역'].map((label, index) =>
    spreadsheetText(`${'ABC'[index]}${row}`, label, 2)).join(''));

  const firstAmountRow = rows.length + 1;
  let allAmountsNumeric = true;
  for (const [label, amount, details] of result.items) {
    if (amount > MAX_EXCEL_INTEGER || amount < -MAX_EXCEL_INTEGER) allAmountsNumeric = false;
    details.forEach((detail, index) => {
      const units = Array.from(detail).reduce((width, character) => width + (character.charCodeAt(0) > 255 ? 2 : 1), 0);
      const height = 16 * Math.max(1, Math.ceil(units / 70)) + 5;
      addRow(height, row => {
        const item = index === 0 ? spreadsheetText(`A${row}`, label) + spreadsheetAmount(`B${row}`, amount, 3) : '';
        return item + spreadsheetText(`C${row}`, detail);
      });
    });
  }

  const totalFormula = allAmountsNumeric ? `SUM(B${firstAmountRow}:B${rows.length})` : '';
  addRow(25, row => spreadsheetText(`A${row}`, '예상 지급액', 5)
    + spreadsheetAmount(`B${row}`, result.total, 4, totalFormula));

  return `<worksheet xmlns="${SPREADSHEET_XML}">
    <cols><col min="1" max="1" width="31" customWidth="1"/>
      <col min="2" max="2" width="22" customWidth="1"/>
      <col min="3" max="3" width="80" customWidth="1"/></cols>
    <sheetData>${rows.join('')}</sheetData>
    <mergeCells count="4"><mergeCell ref="A1:C1"/><mergeCell ref="B2:C2"/>
      <mergeCell ref="B3:C3"/><mergeCell ref="B4:C4"/></mergeCells>
  </worksheet>`;
}

async function createTripWorkbook(result) {
  const zip = new JSZip();
  const parts = {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
      <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
      <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
    </Types>`,
    '_rels/.rels': `<Relationships xmlns="${PACKAGE_REL}">
      <Relationship Id="rId1" Type="${OFFICE_REL}/officeDocument" Target="xl/workbook.xml"/>
    </Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${SPREADSHEET_XML}" xmlns:r="${OFFICE_REL}">
      <sheets><sheet name="출장여비" sheetId="1" r:id="rId1"/></sheets>
    </workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${PACKAGE_REL}">
      <Relationship Id="rId1" Type="${OFFICE_REL}/worksheet" Target="worksheets/sheet1.xml"/>
      <Relationship Id="rId2" Type="${OFFICE_REL}/styles" Target="styles.xml"/>
    </Relationships>`,
    'xl/worksheets/sheet1.xml': tripSheet(result),
    'xl/styles.xml': `<styleSheet xmlns="${SPREADSHEET_XML}">
      <fonts count="4">
        <font><sz val="11"/><name val="Malgun Gothic"/></font>
        <font><b/><sz val="17"/><color rgb="FF102D3E"/><name val="Malgun Gothic"/></font>
        <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Malgun Gothic"/></font>
        <font><b/><sz val="11"/><color rgb="FF102D3E"/><name val="Malgun Gothic"/></font>
      </fonts>
      <fills count="4">
        <fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FF102D3E"/><bgColor indexed="64"/></patternFill></fill>
        <fill><patternFill patternType="solid"><fgColor rgb="FFE2F4EE"/><bgColor indexed="64"/></patternFill></fill>
      </fills>
      <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
      <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
      <cellXfs count="6">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
        <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
        <xf numFmtId="0" fontId="2" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>
        <xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="3" fontId="3" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
        <xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center"/></xf>
      </cellXfs>
      <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
    </styleSheet>`,
  };
  for (const [name, xml] of Object.entries(parts)) zip.file(name, XML_HEADER + xml);
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
