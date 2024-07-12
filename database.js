const { Client } = require("pg");
require("dotenv").config();

const databaseConfig = async () => {
  const client = new Client({
    user: process.env.USER,
    host: process.env.HOST,
    database: process.env.DATABASE,
    password: process.env.PASSWORD,
    port: Number(process.env.PORT),
  });

  await client.connect();

  return client;
};

module.exports = {
  databaseConfig,
};
