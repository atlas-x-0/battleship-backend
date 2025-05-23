# Battleship Backend Service

This is a backend API service designed for an online battleship game. It adopts a lightweight design philosophy, delegating most game logic to the frontend, while the backend is primarily responsible for user authentication, data storage, and API routing.

## Tech Stack and Main Dependencies

This project is based on the Node.js environment and uses Express.js as the main web framework. The following are the key NPM packages required to run this backend service:

*   **`express`**: A Node.js web application framework used for building API routes and handling HTTP requests.
*   **`mongoose`**: A MongoDB Object Document Mapping (ODM) tool for interacting with MongoDB databases in Node.js, defining data models and schemas.
*   **`cookie-parser`**: (Although we've moved to token-based authentication, this library is still imported in `server.js`. Consider removing it if cookies are no longer used) Middleware for parsing cookie headers.
*   **`dotenv`**: (Used in `config/db.js`) Used to load environment variables from `.env` files, such as database connection strings and port numbers.

You need to declare these libraries as dependencies in your `package.json` file and install them via `npm install` or `yarn install`.

**Important**: To ensure the project can properly run ESM (`import/export`) syntax, please make sure to add `"type": "module"` in your `package.json`.

Example:
```json
{
  "name": "battleship-server",
  "version": "1.0.0",
  "type": "module", 
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js" 
  },
  "dependencies": {
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "mongoose": "^7.5.0" 
  },
  "devDependencies": {
    "nodemon": "^3.0.1" 
  }
}
```
*(Version numbers are examples only, please adjust according to actual needs)*

## Project File Structure and Descriptions

The following are the main files in the `server` directory and their functions:

*   **`server.js`**:
    *   Entry file for the backend service.
    *   Initializes the Express application.
    *   Connects to MongoDB database (through `config/db.js`).
    *   Loads and configures middleware (such as `express.json` for parsing JSON request bodies, `cookie-parser`).
    *   Defines and applies main API routes (user routes `/api/users`, game routes `/api/games`).
    *   Starts HTTP server and listens on specified port.

*   **`config.js`**:
    *   Configuration file for storing application-level configuration variables.
    *   Currently mainly contains MongoDB connection URI (`mongoURI`) and server port (`port`).
    *   These values can be read from environment variables, and default values are used if environment variables are not set.

*   **`config/db.js`**:
    *   Responsible for establishing connection to MongoDB database.
    *   Uses `mongoose` library to connect to database specified by `mongoURI`.
    *   Contains error handling logic to output error messages and exit process when database connection fails.
    *   Uses `dotenv` to load environment variables (such as `MONGODB_URI`).

*   **`middleware/auth.js`**:
    *   A simplified authentication middleware.
    *   Used to protect API routes that require user login to access.
    *   Extracts token from the `x-auth-token` field in request headers.
    *   In this simplified version, the token is directly treated as the user's ID and attached to the `req.user` object for use by subsequent route handlers.

*   **`models/User.js`**:
    *   Defines the User Mongoose data model and schema.
    *   User schema includes `username` (string, required, unique, trimmed), `password` (string, required), and `createdAt` (date, defaults to current time).
    *   Passwords are stored in plain text in this simplified version.

*   **`models/game.js`**:
    *   Defines the Game Mongoose data model and schema. This is a core model containing the complete game state:
        *   `player1`, `player2`: Player IDs referencing the user model.
        *   `isVsAI`: Boolean value indicating whether it's a human vs AI game (AI not heavily implemented in current version).
        *   `ships1`, `ships2`: Arrays storing each player's ship information (name, length, position, orientation, sunk status).
        *   `board1_cells`, `board2_cells`: Store each player's board cell states (10x10 2D array, each cell records whether it's part of a ship, whether it's been hit).
        *   `status`: Game status (enum: 'Open', 'Placement', 'Active', 'Completed').
        *   `turn`: Records which player's turn it is (stores player ID string).
        *   `winner`: Winner when game ends (references user model).
        *   `player1Ready`, `player2Ready`: Boolean values indicating whether players are ready (mainly driven by frontend logic in this simplified backend).
        *   `startedAt`, `endedAt`, `createdAt`: Game-related date timestamps.

*   **`routes/users.js`**:
    *   Handles all user-related API routes with prefix `/api/users`.
    *   **`POST /register`**: User registration. Accepts username and password, creates new user. Password stored in plain text. Returns user ID as simplified token on success.
    *   **`POST /login`**: User login. Validates username and password. Returns user ID as simplified token on success.
    *   **`POST /logout`**: User logout. This is a symbolic route since tokens are stateless; client needs to clear token on their own.
    *   **`GET /me`**: Get current logged-in user information. Protected by `authMiddleware`, gets user ID through token and queries user information.

*   **`routes/games.js`**:
    *   Handles all game-related API routes with prefix `/api/games`. Logic in this file has been greatly simplified, with backend mainly serving as data storage layer.
    *   **`POST /`**: Create new game. Protected by `authMiddleware`. Accepts player 1's ship layout and board state, creates new game record.
    *   **`GET /`**: Get game list. Can be filtered by query parameters to support different sections of "all games page" (such as my open games, other players' open games, my active games, etc.). Unauthenticated users can only see active and completed games.
    *   **`GET /:gameId`**: Get specific game details. This route is public; frontend will be responsible for hiding sensitive information based on user login status (such as opponent's unhit ship positions).
    *   **`PUT /:gameId/join`**: Player 2 joins an open game. Protected by `authMiddleware`. Accepts player 2's ship layout and board state, updates game record.
    *   **`POST /:gameId/attack`**: Player makes an attack. Protected by `authMiddleware`. Backend records attack results determined and sent by frontend (target player, coordinates, whether hit, whether ship was sunk, whether all ships are sunk), and updates game state (such as whose turn, win/loss, etc.).
    *   **`PUT /:gameId/surrender`**: Player surrenders. Protected by `authMiddleware`. Updates game state, sets opponent as winner.

This backend service aims to provide a basic API layer so that the frontend can implement complete battleship game functionality.

## API Request Formats and Examples

### User-related

#### Registration
POST /api/users/register
Request body:
```
{
  "username": "testuser1",
  "password": "123456"
}
```
Response:
```
{
  "msg": "User registered successfully",
  "token": "<User ID>",
  "user": { "id": "<User ID>", "username": "testuser1" }
}
```

#### Login
POST /api/users/login
Request body:
```
{
  "username": "testuser1",
  "password": "123456"
}
```
Response: Same as registration

#### Get current user information
GET /api/users/me
Header: x-auth-token: <User ID>

---

### Game-related

#### Create new game
POST /api/games
Header: x-auth-token: <User ID>
Request body:
```
{
  "ships1Layout": {
    "ships": [
      {
        "name": "battleship",
        "length": 4,
        "position": { "x": 0, "y": 0 },
        "orientation": "horizontal",
        "sunk": false
      }
      // ...can add more ships
    ],
    "boardCells": [
      [ { "isShip": true, "isHit": false }, ...10 cells total ],
      ...10 rows total
    ]
  }
}
```

#### Get game details
GET /api/games/:gameId

#### Join game
PUT /api/games/:gameId/join
Header: x-auth-token: <User ID>
Request body:
```
{
  "ships2Layout": {
    "ships": [ ... ],
    "boardCells": [ ... ]
  }
}
```

#### Attack
POST /api/games/:gameId/attack
Header: x-auth-token: <User ID>
Request body:
```
{
  "targetPlayerId": "<Opponent User ID>",
  "coordinates": { "x": 0, "y": 0 },
  "hit": true,
  "sunkShipName": "battleship", // Fill when ship is sunk, otherwise null
  "allPlayerShipsSunk": false
}
```

#### Surrender
PUT /api/games/:gameId/surrender
Header: x-auth-token: <User ID>

---

> For more details, please refer to routes/users.js and routes/games.js.

## Typical Battle Flow and Mock Data Examples

The following is a complete dual-user battle flow with curl examples for each step, convenient for frontend and testing reference:

### 1. User Registration/Login

#### User 1 Registration
```
curl -X POST http://localhost:5001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser1","password":"123456"}'
```
Response:
```
{"msg":"User registered successfully","token":"<User1ID>",...}
```

#### User 2 Registration
```
curl -X POST http://localhost:5001/api/users/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser2","password":"123456"}'
```
Response:
```
{"msg":"User registered successfully","token":"<User2ID>",...}
```

### 2. User 1 Creates Game
```
curl -X POST http://localhost:5001/api/games \
  -H "Content-Type: application/json" \
  -H "x-auth-token: <User1ID>" \
  -d '{
    "ships1Layout": {
      "ships": [
        {"name":"battleship","length":4,"position":{"x":0,"y":0},"orientation":"horizontal","sunk":false}
      ],
      "boardCells": [
        [ { "isShip": true, "isHit": false }, { "isShip": true, "isHit": false }, { "isShip": true, "isHit": false }, { "isShip": true, "isHit": false }, { "isShip": false, "isHit": false }, ...10 cells total ],
        ...10 rows total
      ]
    }
  }'
```
Response:
```
{"_id":"<gameId>", ...}
```

### 3. User 2 Joins Game
```
curl -X PUT http://localhost:5001/api/games/<gameId>/join \
  -H "Content-Type: application/json" \
  -H "x-auth-token: <User2ID>" \
  -d '{
    "ships2Layout": {
      "ships": [
        {"name":"destroyer","length":3,"position":{"x":1,"y":1},"orientation":"vertical","sunk":false}
      ],
      "boardCells": [
        [ { "isShip": false, "isHit": false }, ... ],
        [ { "isShip": true, "isHit": false }, ... ],
        ...10 rows total
      ]
    }
  }'
```
Response:
```
{"_id":"<gameId>", ...}
```

### 4. Attack Flow (Taking Turns)

#### User 1 Attacks User 2
```
curl -X POST http://localhost:5001/api/games/<gameId>/attack \
  -H "Content-Type: application/json" \
  -H "x-auth-token: <User1ID>" \
  -d '{
    "targetPlayerId": "<User2ID>",
    "coordinates": { "x": 1, "y": 1 },
    "hit": true,
    "sunkShipName": null,
    "allPlayerShipsSunk": false
  }'
```
Response:
```
{"_id":"<gameId>", ...}
```

#### User 2 Attacks User 1
```
curl -X POST http://localhost:5001/api/games/<gameId>/attack \
  -H "Content-Type: application/json" \
  -H "x-auth-token: <User2ID>" \
  -d '{
    "targetPlayerId": "<User1ID>",
    "coordinates": { "x": 0, "y": 0 },
    "hit": true,
    "sunkShipName": null,
    "allPlayerShipsSunk": false
  }'
```
Response: Same as above

### 5. Surrender

#### User 2 Surrenders
```
curl -X PUT http://localhost:5001/api/games/<gameId>/surrender \
  -H "x-auth-token: <User2ID>"
```
Response:
```
{"_id":"<gameId>", "status":"Completed", "winner":{...}, ...}
```

---

> Note: For each actual request, IDs/tokens/board content need to be replaced according to actual circumstances. Request body structure and fields should remain consistent.