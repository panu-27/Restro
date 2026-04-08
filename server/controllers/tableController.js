const Table = require('../models/Table');

exports.getTables = async (req, res) => {
  try {
    const tables = await Table.find().sort('tableId');
    res.json(tables);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTableSection = async (req, res) => {
  try {
    const { section, status, orderId } = req.body;
    const update = {};
    if (status) update[`sections.${section}.status`] = status;
    if (orderId !== undefined) update[`sections.${section}.orderId`] = orderId;

    const table = await Table.findOneAndUpdate(
      { tableId: req.params.tableId },
      update,
      { new: true, upsert: true }
    );
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
