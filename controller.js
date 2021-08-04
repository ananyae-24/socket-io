const Data = require("./model");
const mongoose = require("mongoose");
exports.random_play = async (msg, id) => {
  await Data.findOneAndDelete({
    id_player_1: id,
    over: false,
    id_player_2: "none",
  });
  let game = await Data.findOne({
    id_player_1: { $ne: id },
    player2: "none",
    over: false,
    code: "none",
  });

  let msg_;
  if (!game) {
    game = await Data.create({ player1: msg.name, id_player_1: id });
    await game.assignroom();
    await game.save();
    msg_ = "Waiting for other player to join";
  } else {
    game.player2 = msg.name;
    game.id_player_2 = id;
    await game.save();
    msg_ = "Start game";
  }

  return [game, msg_];
};
exports.saveMove = async (move, game_id) => {
  let game = await Data.findById(game_id).select("+data");
  if (game) {
    game.data.push(move);
    await game.save();
    let t = game.toObject({ getters: true });
    delete t.data;
    return t;
  } else return null;
};
exports.friend_play = async (data) => {
  await Data.findOneAndDelete({
    over: false,
    id_player_1: data.id,
  });
  let game = await Data.create({ player1: data.name, id_player_1: data.id });
  await game.assignroom();
  let token = await game.setcode();
  await game.save();
  msg_ = "friend_join";
  return { token, game };
};
exports.friend_join = async (data) => {
  let game = await Data.findOne({ code: data.token, over: false });
  if (game) {
    game.id_player_2 = data.id;
    game.player2 = data.name;
    await game.save();
    return [game, "Start game"];
  }
  return null;
};
exports.closegame = async (id, winner) => {
  let game = await Data.findById(id);
  if (game) {
    game.over = true;
    game.winner = winner;
    return game;
  } else return null;
};
exports.forceclose = async (client_id) => {
  try {
    let game = await Data.findOne({
      $or: [{ id_player_1: client_id }, { id_player_2: client_id }],
      over: false,
    });
    if (game) {
      game.over = true;
      await game.save();
      return game;
    } else return null;
  } catch (err) {
    console.log(err);
  }
};
exports.winner = async (winner, gameid) => {
  let game = await Data.findById(gameid);
  if (game) {
    game.winner = winner;
    game.over = true;
    return game;
  } else return null;
};
exports.closeroom = async (room) => {
  let game = await Data.findOne({ room });
  if (game) {
    game.over = true;
    await game.save();
  }
};
