import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

export async function loadTable(filePath: string) {
  const fullPath = path.resolve(__dirname, '../src/tables', filePath);
  const fileContent = fs.readFileSync(fullPath, 'utf8');
  const data: Promise<{ Item: any }[]> = new Promise((resolve, reject) => {
    Papa.parse(fileContent, {
      header: true,
      delimiter: '\t',
      complete: (results) => {
        resolve(results.data as { Item: any }[]);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
  return (await data).map((row: any) => row.Item);
}
