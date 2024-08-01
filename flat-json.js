const fs = require("fs");

// Function to flatten an array
function flattenArray(array) {
  return array.reduce(
    (acc, value) =>
      acc.concat(Array.isArray(value) ? flattenArray(value) : value),
    []
  );
}

// Read the JSON file
fs.readFile("slack.json", "utf8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  try {
    const jsonArray = JSON.parse(data);

    // Flatten the array
    const flattenedArray = flattenArray(jsonArray);

    // Write the flattened array back to the file
    fs.writeFile(
      "slack.json",
      JSON.stringify(flattenedArray, null, 2),
      (err) => {
        if (err) {
          console.error("Error writing file:", err);
        } else {
          console.log("File successfully rewritten with flattened array.");
        }
      }
    );
  } catch (parseErr) {
    console.error("Error parsing JSON:", parseErr);
  }
});
