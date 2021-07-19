const mongoose = require("mongoose");
const crypto = require("crypto");
const schema = new mongoose.Schema(
  {
    player1: { type: String },
    player2: { type: String, default: "none" },
    id_player_1: { type: String },
    id_player_2: { type: String, default: "none" },
    code: { type: String, default: "none" },
    data: { type: Array, default: [], select: false },
    winner: { type: String },
    over: { type: Boolean, default: false },
    room: { type: String, default: "" },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
schema.methods.assignroom = async function () {
  const token = crypto.randomBytes(5).toString("hex");
  this.room = token;
  return token;
};
schema.methods.setcode = async function () {
  const token = crypto.randomBytes(5).toString("hex");
  this.code = token;
  return token;
};
const modle = mongoose.model("data", schema);
module.exports = modle;
