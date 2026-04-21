const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

const io = require("socket.io")(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});

let rooms = {}; 

io.on("connection", (socket) => {
    console.log("Ktoś wbija: " + socket.id);

    socket.on("create_room", () => {
        const roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        rooms[roomCode] = { players: [] };
        socket.join(roomCode);
        rooms[roomCode].players.push({ id: socket.id, characterId: null });
        socket.emit("room_created", roomCode);
    });

    socket.on("join_room", (roomCode) => {
        if (rooms[roomCode] && rooms[roomCode].players.length < 2) {
            socket.join(roomCode);
            rooms[roomCode].players.push({ id: socket.id, characterId: null });
            io.to(roomCode).emit("game_ready");
        }
    });

    socket.on("pick_character", (data) => {
        const room = rooms[data.roomCode];
        if (!room) return;
        const player = room.players.find(p => p.id === socket.id);
        if (player) player.characterId = data.characterId;

        if (room.players.length === 2 && room.players.every(p => p.characterId !== null)) {
            const p1 = room.players[0];
            const p2 = room.players[1];
            io.to(p1.id).emit("game_start", { opponentId: p2.characterId, isMyTurn: true });
            io.to(p2.id).emit("game_start", { opponentId: p1.characterId, isMyTurn: false });
        }
    });

    socket.on("send_message", (data) => {
        socket.to(data.roomCode).emit("receive_message", data.message);
    });

    socket.on("end_turn", (roomCode) => {
        socket.to(roomCode).emit("your_turn");
    });

    socket.on("player_won", (roomCode) => {
        socket.to(roomCode).emit("you_lost");
    });

    socket.on("player_lost", (roomCode) => {
        socket.to(roomCode).emit("you_won");
    });

    socket.on("disconnect", () => {
        console.log("Ktoś wyszedł");
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Serwer śmiga na porcie " + PORT);
});