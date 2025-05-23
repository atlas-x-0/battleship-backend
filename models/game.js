import mongoose from 'mongoose';

// Schema for ships (embedded in Game document)
const shipSchemaDefinition = { // Define the object separately for easy reference to shipName in board cells
    name: { type: String, required: true }, // e.g., 'carrier', 'battleship'
    length: { type: Number, required: true },
    position: { // 2D coordinates of the ship's head {x, y}
        x: { type: Number, required: true },
        y: { type: Number, required: true }
    },
    orientation: { // 'horizontal' or 'vertical'
        type: String,
        enum: ['horizontal', 'vertical'],
        required: true
    },
    // To determine if a ship is sunk, we need to know which parts of the ship have been hit.
    // We can use a boolean array of the same length as the ship to mark which parts have been hit.
    // Alternatively, a simpler way is to mark sunk=true when all the ship's cells in boardX_cells have isHit=true.
    sunk: { type: Boolean, default: false }
};
const shipSchema = new mongoose.Schema(shipSchemaDefinition, { _id: false });


// Schema for individual board cell
const cellSchema = new mongoose.Schema({
    isShip: { type: Boolean, default: false }, // Whether a part of a ship is on this cell
    isHit: { type: Boolean, default: false },  // Whether this cell has been attacked
    // shipNameRef: { type: String, default: null } // Refers to the name of ship in ships array
    // If ship types repeat (e.g., two destroyers), using name as ref is not unique enough.
    // Consider adding a unique id in shipSchema (not _id, could be UUID or a simple counter)
    // Or associate through coordinates in backend logic.
    // Simplified for now, not adding shipNameRef, backend determines through coordinates.
}, { _id: false });

const gameSchema = new mongoose.Schema({
    player1: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    player2: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    isVsAI: {
        type: Boolean,
        default: false
    },
    // Store the actual ship placement information for both sides
    // This information includes their logical position and orientation
    ships1: [shipSchema], // List of ships for player 1
    ships2: [shipSchema], // List of ships for player 2

    // Board cell status, mainly records whether each cell has been attacked
    // The isShip information can actually be inferred from ships1 and ships2 combined with coordinates,
    // but for ease of query and update, redundantly storing isShip on the cell is also an option.
    // Here we choose to also mark isShip on the cell, so it can be directly judged during an attack.
    board1_cells: { // Board cell status for player 1 (10x10)
        type: [[cellSchema]],
        required: true
    },
    board2_cells: { // Board cell status for player 2 (10x10)
        type: [[cellSchema]],
        required: true
    },
    status: {
        type: String,
        enum: ['Open', 'Placement', 'Active', 'Completed'], // Added Placement status
        default: 'Open',
        required: true
    },
    // Record whose turn it is to place ships or attack
    // If in Placement status, it may need to distinguish whether player1 or player2 is placing
    // If in Active status, it indicates whose turn it is to attack
    turn: { // Can be ObjectId of player1, ObjectId of player2
        // Or more specifically 'player1_placement', 'player2_placement', 'player1_attack', 'player2_attack'
        type: String, // Or ObjectId ref: 'User'
        default: null
    },
    winner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    // (Optional) Record which players have completed ship placement
    player1Ready: { type: Boolean, default: false },
    player2Ready: { type: Boolean, default: false },

    startedAt: Date,
    endedAt: Date,
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Removed initializeBoardCells and related comments from the model, as this logic is now more suitable for route handlers or handled by the frontend

const Game = mongoose.model('Game', gameSchema);
export default Game;
