const { compareDates } = require("./compare-dates");
const { databaseConfig } = require("./database");
const { dateToString } = require("./date-to-string");
const { findInSlack } = require("./find-in-slack");
const { leftCelcoinBuys } = require("./left-celcoin-buys");
const { readReport } = require("./read-report");
const { readSlack } = require("./read-slack");
const { registeredQueries } = require("./register-queries");
const { queryOnDatabase } = require("./query-on-database");

const table = "buys";
const startDate = "2023-07-30 00:00:00";
const endDate = "2024-07-11 23:59:59";

// modificar a buying_history

const main = async () => {
  const database = await databaseConfig();

  const { rows: databaseBuys } = await database.query(
    `SELECT * FROM ${table} WHERE date >= '${startDate}' AND date <= '${endDate}' ORDER BY date DESC`
  );
  // const celcoinBuys = await readReport();
  // const slackData = readSlack();

  const queriesToRegister = [];
  const duplicatedBuys = [];
  const buysWithoutUserId = [];
  const usedReversePaymentProtocol = (
    await database.query(`
      SELECT "celcoin_protocol" FROM "validate_celcoin_reverse_payments"
    `)
  ).rows;

  const usedCelcoinBuy = [];
  // UPDATE total_amount from buys
  for (let i = 0; i < databaseBuys.length; i += 1) {
    const databaseBuy = databaseBuys[i];

    if (duplicatedBuys.includes(databaseBuy["buy_id"])) {
      continue;
    }

    if (!databaseBuy["end_to_end_id"]) {
      const query = `DELETE FROM ${table} WHERE buy_id = '${databaseBuy["buy_id"]}'`;
      queriesToRegister.push(query);
      await queryOnDatabase(database, query);
      continue;
    }

    if (!databaseBuy["user_id"]) {
      buysWithoutUserId.push(databaseBuy["end_to_end_id"]);
      continue;
    }

    const findInBuys = databaseBuys.filter(
      (e) => e["end_to_end_id"] === databaseBuy["end_to_end_id"]
    );

    if (findInBuys.length > 1) {
      for (let k = 1; k < findInBuys.length; k += 1) {
        const query = `DELETE FROM ${table} WHERE buy_id = '${findInBuys[k]["buy_id"]}'`;
        queriesToRegister.push(query);
        await queryOnDatabase(database, query);
        duplicatedBuys.push(findInBuys[k]["buy_id"]);
      }
    }

    const findByEndToEndId = celcoinBuys.find((e) => {
      if (!e.endToEndId) {
        return false;
      }
      const validation1 = e.endToEndId
        .toLowerCase()
        .includes(databaseBuy["end_to_end_id"].toLowerCase());
      const validation2 = databaseBuy["end_to_end_id"]
        .toLowerCase()
        .includes(e.endToEndId.toLowerCase());
      return validation1 || validation2;
    });

    if (findByEndToEndId) {
      usedCelcoinBuy.push(findByEndToEndId);

      if (findByEndToEndId.status === "Desfeito Autorizador") {
        const query = `DELETE FROM ${table} WHERE buy_id = '${databaseBuy["buy_id"]}'`;
        queriesToRegister.push(query);
        await queryOnDatabase(database, query);
        continue;
      }

      const findReversePayment = celcoinBuys.filter((e) => {
        const validateDate = compareDates(e.date, databaseBuy["date"]);
        const validateValue =
          e.value === Number(databaseBuy["total_amount"]) ||
          Number(databaseBuy["total_amount"]) === 0;
        const validateType = e.type === "RecivementReversePayment";
        return validateDate && validateValue && validateType;
      });

      if (findReversePayment.length > 0) {
        if (
          usedReversePaymentProtocol.some(
            (e) => e === findReversePayment[0].protocol
          )
        ) {
          continue;
        }
        if (databaseBuy["payment_mean"] !== "revertido") {
          const query = `UPDATE ${table} SET payment_mean = 'revertido', total_amount = '${findByEndToEndId.value}' WHERE buy_id = '${databaseBuy["buy_id"]}'`;
          queriesToRegister.push(query);
          await queryOnDatabase(database, query);
          usedReversePaymentProtocol.push(findReversePayment[0].protocol);
          continue;
        }
        if (databaseBuy["total_amount"] === "0") {
          const query = `UPDATE ${table} SET payment_mean = 'revertido', total_amount = '${findByEndToEndId.value}' WHERE buy_id = '${databaseBuy["buy_id"]}'`;
          queriesToRegister.push(query);
          await queryOnDatabase(database, query);
          usedReversePaymentProtocol.push(findReversePayment[0].protocol);
          continue;
        }
        continue;
      }

      if (Number(databaseBuy["total_amount"]) !== findByEndToEndId.value) {
        const query = `UPDATE ${table} SET total_amount = '${findByEndToEndId.value}' WHERE buy_id = '${databaseBuy["buy_id"]}'`;
        queriesToRegister.push(query);
        await queryOnDatabase(database, query);
        continue;
      }
      continue;
    }

    const query = `DELETE FROM ${table} WHERE buy_id = '${databaseBuy["buy_id"]}'`;
    queriesToRegister.push(query);
    await queryOnDatabase(database, query);
    continue;
  }

  const notUsedCelcoinBuys = celcoinBuys.filter(
    (e) => !usedCelcoinBuy.some((i) => e.protocol === i.protocol)
  );

  const finalUsedCelcoinBuys = [];
  // INSERT in buys
  for (let i = 0; i < notUsedCelcoinBuys.length; i += 1) {
    const celcoinBuy = notUsedCelcoinBuys[i];

    if (celcoinBuy.type === "RecivementPayment") {
      finalUsedCelcoinBuys.push(celcoinBuy);
      continue;
    }

    if (
      buysWithoutUserId.some((e) => e.includes(celcoinBuy.endToEndId)) &&
      celcoinBuy.endToEndId !== ""
    ) {
      finalUsedCelcoinBuys.push(celcoinBuy);
      continue;
    }

    if (celcoinBuy.type !== "Payment") {
      continue;
    }

    if (celcoinBuy.status === "Desfeito Autorizador") {
      finalUsedCelcoinBuys.push(celcoinBuy);
      continue;
    }

    const findReversePayment = celcoinBuys.filter((e) => {
      const validateDate = compareDates(e.date, celcoinBuy.date);
      const validateValue = e.value === celcoinBuy.value;
      const validateType = e.type === "RecivementReversePayment";
      return validateDate && validateValue && validateType;
    });

    const buy = findInSlack(celcoinBuy.endToEndId, slackData);

    if (findReversePayment.length > 0) {
      if (
        usedReversePaymentProtocol.some(
          (e) => e === findReversePayment[0].protocol
        )
      ) {
        continue;
      }
      const query = `
        INSERT INTO ${table} (
          medications,
          end_to_end_id,
          user_id,
          total_amount,
          payment_mean,
          date,
          status,
          quantity
        ) VALUES(
          ARRAY[${buy["id_dos_medicamentos"].map((e) => "'" + e + "'")}],
          '${buy["endtoendid_celcoin"] || buy["endtoendid"]}',
          '${buy["id_do_usuario"] || buy["userID"]}',
          '${celcoinBuy.value}',
          'revertido',
          '${dateToString(celcoinBuy.date)}',
          'OK: Compra Aprovada',
          ARRAY[${buy["id_dos_medicamentos"].map((e) => 1)}]
        )`;
      queriesToRegister.push(query);
      await queryOnDatabase(database, query);
      usedReversePaymentProtocol.push(findReversePayment[0].protocol);
      continue;
    }

    if (celcoinBuy.type === "RecivementReversePayment") {
      continue;
    }

    finalUsedCelcoinBuys.push(celcoinBuy);

    if (!celcoinBuy.endToEndId) {
      queriesToRegister.push(
        `Error to end_to_end_id na celcoin ${celcoinBuy.date}`
      );
      continue;
    }

    if (!buy) {
      queriesToRegister.push(
        `Error not found by endToEndId ${celcoinBuy.endToEndId}`
      );
      continue;
    }

    if (!buy["id_dos_medicamentos"]) {
      const query = `
        INSERT INTO ${table} (
          medications,
          end_to_end_id,
          user_id,
          total_amount,
          payment_mean,
          date,
          status,
          quantity
        ) VALUES(
          ARRAY[''],
          '${buy["endtoendid_celcoin"] || buy["endtoendid"]}',
          '${buy["id_do_usuario"] || buy["userID"]}',
          '${celcoinBuy.value}',
          'compra',
          '${dateToString(celcoinBuy.date)}',
          'OK: Compra Aprovada',
          ARRAY[1]
        )`;
      queriesToRegister.push(query);
      await queryOnDatabase(database, query);
      continue;
    }

    const query = `
      INSERT INTO ${table} (
        medications,
        end_to_end_id,
        user_id,
        total_amount,
        payment_mean,
        date,
        status,
        quantity
      ) VALUES(
        ARRAY[${buy["id_dos_medicamentos"].map((e) => "'" + e + "'")}],
        '${buy["endtoendid_celcoin"] || buy["endtoendid"]}',
        '${buy["id_do_usuario"] || buy["userID"]}',
        '${celcoinBuy.value}',
        'compra',
        '${dateToString(celcoinBuy.date)}',
        'OK: Compra Aprovada',
        ARRAY[${buy["id_dos_medicamentos"].map((e) => 1)}]
      )`;
    queriesToRegister.push(query);
    await queryOnDatabase(database, query);
    continue;
  }

  const finalCelcoinBuys = notUsedCelcoinBuys.filter(
    (e) => !finalUsedCelcoinBuys.some((i) => e.protocol === i.protocol)
  );

  // TXT FILES
  registeredQueries(queriesToRegister);
  leftCelcoinBuys(finalCelcoinBuys.map((e) => Object.values(e).join(",")));

  await database.end();
};

main();
