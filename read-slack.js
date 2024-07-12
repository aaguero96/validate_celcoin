const fs = require("fs");

const readSlack = () => {
  const slackJson = fs.readFileSync("./slack.json");
  return JSON.parse(slackJson);
};

module.exports = {
  readSlack,
};
