const socketio = require("socket.io");
const http = require("http");
const express = require("express");
const mongoose = require("mongoose");
const controller = require("./controller");
dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });
const DB = process.env.DATABASE.replace(
  /<PASSWORD>/g,
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then((res) => {
    console.log("database connected");
  });
let app = express();
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  // res.header("Access-Control-Allow-Headers", "X-Requested-With");
  // res.header("Access-Control-Allow-Headers", "Content-Type");
  // res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});
let server = http.createServer(app);
let io = socketio(server, {
  transports: ["websocket", "polling", "flashsocket"],
  cors: {
    origin: "*",
  },
});
io.on("connection", (client) => {
  client.emit("init", client.id);
  client.on("random_join", async (msg) => {
    let [game, meg] = await controller.random_play(msg, client.id);
    client.join(game.room);
    client.emit(meg, game);
    client.broadcast.to(game.room).emit(meg, game);
  });
  client.on("move", async (data) => {
    let state = data.state;

    if (state.id_to_play === "player1") {
      state.id_to_play = "player2";
    } else {
      state.id_to_play = "player1";
    }
    let gameid = data.gameid;
    let game = await controller.saveMove(state, gameid);
    if (game) {
      client.emit("move", state);
      client.broadcast.to(game.room).emit("move", state);
    }
  });
  client.on("over", async (data) => {
    let game = await controller.winner(data.winner, data.gameid);
    // console.log(data.message);
    if (game) {
      client.emit("over", data.message);
      client.broadcast.to(game.room).emit("over", data.message);
    }
  });
  client.on("leave", async (data) => {
    await leaveroom(client, data);
  });
  client.on("disconnect", async () => {
    await forceleave(client);
  });
});
async function leaveroom(socket, gameid) {
  let game = await controller.closegame(gameid);
  if (game) {
    socket.broadcast
      .to(game.room)
      .emit(
        "leave",
        `${socket.id == game.id_player_1 ? "Player1" : "Player2"} left the room`
      );
    socket.leave(game.room);
  }
}
async function forceleave(socket) {
  let game = await controller.forceclose(socket.id);
  if (game) {
    socket.broadcast
      .to(game.room)
      .emit(
        "over",
        `${socket.id == game.id_player_1 ? "Player1" : "Player2"} left the room`
      );
  }
}
server.listen(process.env.PORT, () => {
  console.log("connected to server");
});
