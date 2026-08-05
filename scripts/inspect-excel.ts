import * as xlsx from 'xlsx';

const filePath = '/mnt/c/Users/aseps/OneDrive/Teguh Gasda/Transfer ADD 2026 8-1.xls';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames.find(n => n.toLowerCase() === 'transfer');

if (sheetName) {
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  console.log("FIRST 10 ROWS:");
  data.slice(0, 10).forEach((row, i) => console.log(`Row ${i}:`, row));
} else {
  console.log("Sheet 'transfer' not found.");
}
