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

exports.createTable = async (req, res) => {
  try {
    const { tableId, seats } = req.body;
    let table = await Table.findOne({ tableId });
    if (table) return res.status(400).json({ error: 'Table already exists' });

    table = new Table({ tableId, seats });
    await table.save();
    res.status(201).json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteTable = async (req, res) => {
  try {
    const tableId = req.params.tableId;
    await Table.findOneAndDelete({ tableId });
    res.json({ message: 'Table deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateTableSeats = async (req, res) => {
  try {
    const tableId = req.params.tableId;
    const { seats } = req.body;
    const table = await Table.findOneAndUpdate(
      { tableId },
      { seats },
      { new: true }
    );
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
