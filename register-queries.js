const fs = require("fs");

const registeredQueries = (arr) => {
  const output = arr.join("\n");

  fs.writeFile("registered-queries.txt", output, (err) => {
    if (err) {
      console.error("Error writing to file", err);
    } else {
      console.log("File has been written successfully");
    }
  });
};

module.exports = {
  registeredQueries,
};
