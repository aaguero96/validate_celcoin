const compareDates = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  const differenceInMillis = d1 - d2;

  if (differenceInMillis < 0) {
    return false;
  }

  const differenceInMinutes = differenceInMillis / (1000 * 60);

  return differenceInMinutes <= 14 * 24 * 60;
};

module.exports = {
  compareDates,
};
