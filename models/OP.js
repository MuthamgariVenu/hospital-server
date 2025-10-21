const mongoose = require("mongoose");

const opSchema = new mongoose.Schema({
  opNumber: String,
  patientName: String,
  doctorName: String,
  department: String,
  status: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model("OP", opSchema);
