import * as XLSX from 'xlsx/xlsx.mjs';
import * as fs from 'fs';
XLSX.set_fs(fs);

const excelPath = 'd:/Projet de code/PAPA suivi action immo/MonPetitPro - tbx base excel.xlsx';
try {
  const buf = fs.readFileSync(excelPath);
  const workbook = XLSX.read(buf, { type: 'buffer' });
  console.log('Sheet Names:', workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`\n--- Sheet: ${sheetName} ---`);
    if (jsonData.length > 0) {
      const headerRow = jsonData.find(row => row.filter(cell => cell !== null && cell !== '').length > 2);
      if (headerRow) {
        console.log(`SHEET: ${sheetName}`);
        headerRow.forEach((h, i) => console.log(`  Col ${i}: ${h}`));
      }
    }
  });
} catch (e) {
  console.error('Error reading Excel:', e);
}
