const fs = require("fs");

const findInSlack = (endToEndId, slackData) => {
  const data = slackData.find((e) => e.text.includes(endToEndId));
  if (data) {
    const text = JSON.parse(data.text.replace("<", "").replace(">", ""));
    return text;
  }

  return null;
};

module.exports = {
  findInSlack,
};
