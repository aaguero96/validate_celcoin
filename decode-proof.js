const decodeProof = (proof) => {
  if (proof) {
    const regexEndToEndId = /CONTROLE\s+([A-Za-z0-9]{32})/;
    const matchEndToEndId = proof.match(regexEndToEndId);

    return {
      endToEndId: matchEndToEndId[1],
    };
  }

  return {
    endToEndId: "",
  };
};

module.exports = {
  decodeProof,
};
