import * as XLSX from "xlsx";

const workbook = XLSX.readFile("d:\\SV and Booking Dashboard\\Sales_Performance_Report_FY2627 (1).xlsx");

for (const sheetName of workbook.SheetNames) {
  console.log(`\n=== Sheet: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  // Print first 30 rows
  for (let i = 0; i < Math.min(30, data.length); i++) {
    console.log(i, JSON.stringify(data[i]));
  }
}
