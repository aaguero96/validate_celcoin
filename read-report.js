const fs = require("fs").promises;
const XLSX = require("xlsx");
const { decodeProof } = require("./decode-proof");
const { stringToDate } = require("./string-to-date");

const readReport = async () => {
  const data = await fs.readFile("./report.xlsx");

  const workbook = XLSX.read(data, { type: "array" });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const startCell = { c: 0, r: 1 };

  let endCol = startCell.c;
  while (worksheet[XLSX.utils.encode_cell({ c: endCol, r: startCell.r })]) {
    endCol += 1;
  }
  endCol -= 1;

  let endRow = startCell.r;
  while (worksheet[XLSX.utils.encode_cell({ c: startCell.c, r: endRow })]) {
    endRow++;
  }
  endRow--;

  const range = {
    s: startCell,
    e: { c: endCol, r: endRow },
  };

  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
    range: XLSX.utils.encode_range(range),
  });

  return jsonData.map((e) => {
    const proof = (e["Comprovante"] || "").trim();
    const { endToEndId } = decodeProof(proof);

    const date = e["Data Transacao"] || e["Data Transação"];
    const transaction = e["Transacao"] || e["Transação"];
    const status = e["Status da Transacao"] || e["Status da Transação"];

    return {
      date: stringToDate(date.trim()),
      type: transaction.trim(),
      value: e["Valor"],
      protocol: e["Protocolo"],
      status: status.trim(),
      endToEndId,
    };
  });
};

module.exports = {
  readReport,
};
