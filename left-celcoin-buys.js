const fs = require("fs");

const leftCelcoinBuys = (arr) => {
  const left = arr.join("\n");

  fs.writeFile("left-celcoin-buys.txt", left, (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("File has been written successfully");
    }
  });
};

module.exports = {
  leftCelcoinBuys,
};
