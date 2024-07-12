const fs = require("fs");

const changeSlack = () => {
  const slackJson = fs.readFileSync("./slack.json");
  const data = Object.values(JSON.parse(slackJson));
  const jsonString = JSON.stringify(data.flat(), null, 2);
  fs.writeFile("output-slack.json", jsonString, (err) => {
    if (err) {
      console.error("Error writing file", err);
    } else {
      console.log("Successfully wrote file");
    }
  });
};

changeSlack();
