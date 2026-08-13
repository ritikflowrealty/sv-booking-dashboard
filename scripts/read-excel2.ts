import * as XLSX from "xlsx";

const workbook = XLSX.readFile("d:\\SV and Booking Dashboard\\Sales_Performance_Report_FY2627 (1).xlsx");

const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as (string | number)[][];

// Print all rows to see full structure
for (let i = 30; i < Math.min(120, data.length); i++) {
  if (data[i] && data[i].length > 0) {
    console.log(i, JSON.stringify(data[i]));
  }
}
