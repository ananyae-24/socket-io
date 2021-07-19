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
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
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
    let [game, meg] = await controller.random_play(msg, msg.id);
    console.log("joined room", game.room);
    client.join(game.room);
    io.in(game.room).emit(meg, game);
  });
  client.on("move", async (data) => {
    console.log(client.rooms);
    let state = data.state;
    console.log(state);
    if (state.id_to_play === "player1") {
      state.id_to_play = "player2";
    } else {
      state.id_to_play = "player1";
    }
    let gameid = data.gameid;
    let game = await controller.saveMove(state, gameid);
    // console.log(game);
    if (game.room) {
      io.in(game.room).emit("move", state);
    }
  });
  client.on("over", async (data) => {
    let game = await controller.winner(data.winner, data.gameid);
    console.log("over");
    if (game) {
      client.emit("over", data.message);

      client.broadcast.to(game.room).emit("over", data.message);
    }
  });
  client.on("leave", async (data) => {
    console.log("leave");
    await leaveroom(client, data);
  });
  client.on("disconnecting", () => {
    console.log("disconnect");
  });
});
async function leaveroom(socket, data, io) {
  let game = await controller.closegame(data.gameid);
  if (game) {
    socket.broadcast
      .to(game.room)
      .emit(
        "leave",
        `${
          data.id_of_playerleft == game.id_player_1 ? "Player1" : "Player2"
        } left the room`
      );
    socket.leave(game.room);
  }
}
server.listen(process.env.PORT, () => {
  console.log("connected to server");
});
