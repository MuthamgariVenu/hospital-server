const mongoose = require("mongoose");

const OPSchema = new mongoose.Schema(
  {
    patientName: String,
    patientNumber: String,
    doctorName: String,
    department: String,
    time: String,
    opNumber: String,
    status: String,
    date: { type: Date, default: Date.now }, // ✅ important
  },
  { timestamps: true } // adds createdAt, updatedAt too
);

module.exports = mongoose.model("OP", OPSchema);
