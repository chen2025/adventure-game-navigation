const http = require('http');
const fs = require('fs');

const { Player } = require('./game/class/player');
const { World } = require('./game/class/world');

const worldData = require('./game/data/basic-world-data');

let player;
let world = new World();
world.loadWorld(worldData);

const server = http.createServer((req, res) => {

  /* ============== ASSEMBLE THE REQUEST BODY AS A STRING =============== */
  let reqBody = '';
  req.on('data', (data) => {
    reqBody += data;
  });

  req.on('end', () => { // After the assembly of the request body is finished
    /* ==================== PARSE THE REQUEST BODY ====================== */
    if (reqBody) {
      req.body = reqBody
        .split("&")
        .map((keyValuePair) => keyValuePair.split("="))
        .map(([key, value]) => [key, value.replace(/\+/g, " ")])
        .map(([key, value]) => [key, decodeURIComponent(value)])
        .reduce((acc, [key, value]) => {
          acc[key] = value;
          return acc;
        }, {});
    }

    /* ======================== ROUTE HANDLERS ========================== */
    // Phase 1: GET /
    if (req.method === 'GET' && req.url === '/') {
      const htmlPage = fs.readFileSync("./views/new-player.html", 'utf-8');
      const resBody = htmlPage.replace(/#{availableRooms}/g, world.availableRoomsToString());

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html");
      res.write(resBody);
      return res.end();
    }

    // Phase 2: POST /player
    if (req.method === 'POST' && req.url === '/player') {
      // Your code herereq.body;
      let name = req.body['name'];
      let roomId = req.body['roomId'];

      player = new Player(name, world.rooms[roomId]);

      res.statusCode = 302;
      res.setHeader("Location", `/rooms/${roomId}`);
      res.end();
      return;
    }

    // Phase 3: GET /rooms/:roomId
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
      const urlParts = req.url.split('/');
      if (urlParts.length === 3) {
        const roomId = urlParts[2];
        const room = world.rooms[roomId];
        // Your code here

        if (!room || !player){
          res.statusCode = 302;
          res.setHeader("Location", '/');
          res.end();
          return;
        }

        if(roomId != player.currentRoom.id){
          res.statusCode = 302;
          res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
          res.end();
          return;
        }

        let htmlPage = fs.readFileSync("./views/room.html", 'utf-8');

        const resBody = htmlPage.replace(/#{roomName}/g, room['name'])
                                .replace(/#{inventory}/g, player.inventoryToString())
                                .replace(/#{roomItems}/g, room.itemsToString())
                                .replace(/#{exits}/g, room.exitsToString());

        res.statusCode = 302;
        res.setHeader("Content-Type", "text/html");
        res.end(resBody);
        return;
      }
    }

    // Phase 4: GET /rooms/:roomId/:direction
    if (req.method === 'GET' && req.url.startsWith('/rooms/')) {
      const urlParts = req.url.split('/');
      if (urlParts.length === 4) {
        const roomId = urlParts[2];
        const direction = urlParts[3];
        const room = world.rooms[roomId];
        // Your code here

        if (!room || !player){
          res.statusCode = 302;
          res.setHeader("Location", '/');
          res.end();
          return;
        }

        if(roomId != player.currentRoom.id){
          let htmlPage = fs.readFileSync("./views/error.html", 'utf-8');

          const resBody = htmlPage.replace(/#{errorMessage}/g, 'invalid room Id')
                                  .replace(/#{roomId}/g, player.currentRoom.id);

          res.statusCode = 302;
          res.setHeader("Content-Type", "text/html");
          res.end(resBody);
          return;
        }

        try{
          player.move(direction[0]);
        }

        catch(error){
          let htmlPage = fs.readFileSync("./views/error.html", 'utf-8');

          const resBody = htmlPage.replace(/#{errorMessage}/g, error)
                                  .replace(/#{roomId}/g, player.currentRoom.id);

          res.statusCode = 302;
          res.setHeader("Content-Type", "text/html");
          res.end(resBody);
          return;
        }

        res.statusCode = 302;
        res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
        res.end();
        return;
      }
    }

    // Phase 5: POST /items/:itemId/:action
    if (req.method === 'POST' && req.url.startsWith('/items/')) {
      const urlParts = req.url.split('/');
      if (urlParts.length === 4) {
        const itemId = urlParts[2];
        const action = urlParts[3];
        // Your code here

        if (!player){
          res.statusCode = 302;
          res.setHeader("Location", '/');
          res.end();
          return;
        }

        try{
          switch (action) {
            case 'drop':
              player.dropItem(itemId);
              break;
            case 'eat':
              player.eatItem(itemId);
              break;
            case 'take':
              player.takeItem(itemId);
              break;
            default:
              throw new Error("Error: Invalid action");
          }
        }

        catch(error){
          let htmlPage = fs.readFileSync("./views/error.html", 'utf-8');

          const resBody = htmlPage.replace(/#{errorMessage}/g, error)
                                  .replace(/#{roomId}/g, player.currentRoom.id);

          res.statusCode = 302;
          res.setHeader("Content-Type", "text/html");
          res.end(resBody);
          return;
        }

        res.statusCode = 302;
        res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
        res.end();
        return;
      }
    }


    // Phase 6: Redirect if no matching route handlers

    if (!player){
      res.statusCode = 302;
      res.setHeader("Location", '/');
      res.end();
      return;
    }
    else{
      res.statusCode = 302;
      res.setHeader("Location", `/rooms/${player.currentRoom.id}`);
      res.end();
      return;
    }
  })
});


const port = 5000;

server.listen(port, () => console.log('Server is listening on port', port));
