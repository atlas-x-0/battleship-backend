// server/routes/games.js
import express from "express";
import mongoose from "mongoose";
import Game from "../models/game.js";
import User from "../models/User.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();




// @route   POST /api/games
// @desc    Create a new game (simplified - receives ship layout from client)
// @access  Private
router.post("/", authMiddleware, async (req, res) => {
	try {
		const userId = req.user.id; // Get user ID from auth middleware
		const { ships1Layout } = req.body; // Expect frontend to send player 1's ship layout and board cell status

		if (
			!ships1Layout ||
			!Array.isArray(ships1Layout.ships) ||
			!Array.isArray(ships1Layout.boardCells)
		) {
			return res
				.status(400)
				.json({ msg: "Valid ship layout and board cell status required" });
		}

		const newGame = new Game({
			player1: userId,
			ships1: ships1Layout.ships,
			board1_cells: ships1Layout.boardCells,
			board2_cells: initializeEmptyBoardCells(),
			ships2: [],
			status: "Open",
			turn: userId,
			createdAt: new Date(),
			startedAt: new Date(),
		});

		await newGame.save();
		const gameToReturn = await Game.findById(newGame._id)
			.populate("player1", "username")
			.populate("player2", "username")
			.populate("winner", "username");
		res.status(201).json(gameToReturn);
	} catch (err) {
		console.error("Error creating game:", err.message, err.stack);
		res.status(500).send("Server error");
	}
});

// @route   GET /api/games
// @desc    Get game list (simplified filtering)
// @access  Public (for some views), Private (for user-specific views)
router.get("/", async (req, res) => {
	const { type, status_filter } = req.query;
	const loggedInUserId = req.user ? req.user.id : null;

	try {
		let query = {};

		if (loggedInUserId) {
			switch (type) {
				case "my_open":
					query = { status: "Open", player1: loggedInUserId, player2: null };
					break;
				case "open_for_others":
					query = {
						status: "Open",
						player1: { $ne: loggedInUserId },
						player2: null,
					};
					break;
				case "my_active":
					query = {
						status: "Active",
						$or: [{ player1: loggedInUserId }, { player2: loggedInUserId }],
					};
					break;
				case "my_completed":
					query = {
						status: "Completed",
						$or: [{ player1: loggedInUserId }, { player2: loggedInUserId }],
					};
					break;
				case "other_games":
					query = {
						status: { $in: ["Active", "Completed"] },
						player1: { $ne: loggedInUserId },
						player2: { $ne: loggedInUserId },
						$or: [{ player2: { $ne: null } }, { status: "Completed" }],
					};
					break;
				default:
					query = {
						$or: [{ player1: loggedInUserId }, { player2: loggedInUserId }],
					};
					if (!type)
						query = {
							$or: [query, { status: { $in: ["Active", "Completed"] } }],
						};
			}
		} else {
			if (status_filter === "Active" || status_filter === "Completed") {
				query = { status: status_filter };
			} else {
				query = { status: { $in: ["Active", "Completed"] } };
			}
		}

		const games = await Game.find(query)
			.populate("player1", "username")
			.populate("player2", "username")
			.populate("winner", "username")
			.sort({ createdAt: -1 });

		res.json(games);
	} catch (err) {
		console.error("Error getting game list:", err.message, err.stack);
		res.status(500).send("Server error");
	}
});

// @route   GET /api/games/:gameId
// @desc    Get specific game details
// @access  Public (with info potentially limited by frontend based on auth state)
router.get("/:gameId", async (req, res) => {
	try {
		if (!mongoose.Types.ObjectId.isValid(req.params.gameId)) {
			return res.status(404).json({ msg: "Game not found (invalid ID)" });
		}

		const game = await Game.findById(req.params.gameId)
			.populate("player1", "username")
			.populate("player2", "username")
			.populate("winner", "username");

		if (!game) {
			return res.status(404).json({ msg: "Game not found" });
		}

		res.json(game);
	} catch (err) {
		console.error("Error getting game details:", err.message, err.stack);
		res.status(500).send("Server error");
	}
});

// @route   PUT /api/games/:gameId/join
// @desc    Player 2 joins an open game (simplified)
// @access  Private
router.put("/:gameId/join", authMiddleware, async (req, res) => {
	try {
		const gameId = req.params.gameId;
		const userId = req.user.id;
		const { ships2Layout } = req.body;

		if (!mongoose.Types.ObjectId.isValid(gameId)) {
			return res.status(400).json({ msg: "Invalid game ID" });
		}

		if (
			!ships2Layout ||
			!Array.isArray(ships2Layout.ships) ||
			!Array.isArray(ships2Layout.boardCells)
		) {
			return res
				.status(400)
				.json({ msg: "Valid ship layout and board cell status required" });
		}

		const game = await Game.findById(gameId);

		if (!game) {
			return res.status(404).json({ msg: "Game not found" });
		}
		if (game.player1.toString() === userId) {
			return res.status(400).json({ msg: "You cannot join your own game" });
		}
		if (game.player2) {
			return res.status(400).json({ msg: "Game is full or already started" });
		}
		if (game.status !== "Open") {
			return res.status(400).json({ msg: "This game is not open to join" });
		}

		game.player2 = userId;
		game.ships2 = ships2Layout.ships;
		game.board2_cells = ships2Layout.boardCells;
		game.status = "Active";

		await game.save();
		const updatedGame = await Game.findById(gameId)
			.populate("player1", "username")
			.populate("player2", "username");
		res.json(updatedGame);
	} catch (err) {
		console.error("Error joining game:", err.message, err.stack);
		res.status(500).send("Server error");
	}
});

// @route   POST /api/games/:gameId/attack
// @desc    Player makes a move (simplified - client sends result)
// @access  Private
router.post("/:gameId/attack", authMiddleware, async (req, res) => {
	try {
		const gameId = req.params.gameId;
		const attackerId = req.user.id;
		const {
			targetPlayerId,
			coordinates,
			hit,
			sunkShipName,
			allPlayerShipsSunk,
		} = req.body;

		if (!mongoose.Types.ObjectId.isValid(gameId)) {
			return res.status(400).json({ msg: "Invalid game ID" });
		}
		if (
			coordinates === undefined ||
			typeof hit !== "boolean" ||
			typeof allPlayerShipsSunk !== "boolean"
		) {
			return res.status(400).json({ msg: "Attack request data incomplete" });
		}

		const game = await Game.findById(gameId);
		if (!game) {
			return res.status(404).json({ msg: "Game not found" });
		}
		if (game.status !== "Active") {
			return res.status(400).json({ msg: "Game not started or already ended" });
		}
		if (game.winner) {
			return res.status(400).json({ msg: "Game already has a winner" });
		}

		let defendingPlayerBoardCells;
		let defendingPlayerShips;
		let nextTurnPlayerId;
		const attackerIsPlayer1 = game.player1.toString() === attackerId;
		const attackerIsPlayer2 =
			game.player2 && game.player2.toString() === attackerId;

		if (!attackerIsPlayer1 && !attackerIsPlayer2) {
			return res.status(403).json({ msg: "You are not a player in this game" });
		}
		if (game.turn !== attackerId) {
			return res.status(400).json({ msg: "Not your turn" });
		}

		if (game.player1.toString() === targetPlayerId) {
			defendingPlayerBoardCells = game.board1_cells;
			defendingPlayerShips = game.ships1;
			nextTurnPlayerId = game.player1.toString();
		} else if (game.player2 && game.player2.toString() === targetPlayerId) {
			defendingPlayerBoardCells = game.board2_cells;
			defendingPlayerShips = game.ships2;
			nextTurnPlayerId = game.player2.toString();
		} else {
			return res.status(400).json({ msg: "Invalid target player" });
		}

		if (
			coordinates.x < 0 ||
			coordinates.x >= BOARD_COLS ||
			coordinates.y < 0 ||
			coordinates.y >= BOARD_ROWS
		) {
			return res.status(400).json({ msg: "Invalid attack coordinates" });
		}

		if (defendingPlayerBoardCells[coordinates.y][coordinates.x].isHit) {
			return res.status(400).json({ msg: "This cell has already been attacked" });
		}
		defendingPlayerBoardCells[coordinates.y][coordinates.x].isHit = true;
		if (hit) {
			defendingPlayerBoardCells[coordinates.y][coordinates.x].isShip = true;
			if (sunkShipName) {
				const shipToUpdate = defendingPlayerShips.find(
					(ship) => ship.name === sunkShipName && !ship.sunk,
				);
				if (shipToUpdate) {
					shipToUpdate.sunk = true;
				}
			}
		}

		if (game.player1.toString() === targetPlayerId) {
			game.board1_cells = defendingPlayerBoardCells;
			game.ships1 = defendingPlayerShips;
		} else {
			game.board2_cells = defendingPlayerBoardCells;
			game.ships2 = defendingPlayerShips;
		}

		game.markModified("board1_cells");
		game.markModified("ships1");
		game.markModified("board2_cells");
		game.markModified("ships2");

		if (allPlayerShipsSunk) {
			game.status = "Completed";
			game.winner = attackerId;
			game.endedAt = new Date();
			game.turn = null;
		} else {
			if (attackerIsPlayer1 && game.player2)
				game.turn = game.player2.toString();
			else if (attackerIsPlayer2) game.turn = game.player1.toString();
			else game.turn = null;
		}

		await game.save();
		const updatedGame = await Game.findById(gameId)
			.populate("player1", "username")
			.populate("player2", "username")
			.populate("winner", "username");
		res.json(updatedGame);
	} catch (err) {
		console.error("Error processing attack:", err.message, err.stack);
		res.status(500).send(`Server error${err.message}`);
	}
});

// @route PUT /api/games/:gameId/surrender
// @desc Player surrenders the game
// @access Private
router.put("/:gameId/surrender", authMiddleware, async (req, res) => {
	try {
		const gameId = req.params.gameId;
		const surrenderingPlayerId = req.user.id;

		if (!mongoose.Types.ObjectId.isValid(gameId)) {
			return res.status(400).json({ msg: "Invalid game ID" });
		}

		const game = await Game.findById(gameId);
		if (!game) {
			return res.status(404).json({ msg: "Game not found" });
		}
		if (game.status !== "Active") {
			return res
				.status(400)
				.json({ msg: "Game is not currently active, cannot surrender" });
		}
		if (game.winner) {
			return res.status(400).json({ msg: "Game already has a winner" });
		}

		let winningPlayerId;
		if (game.player1.toString() === surrenderingPlayerId) {
			if (!game.player2)
				return res.status(400).json({ msg: "Opponent does not exist, cannot surrender" });
			winningPlayerId = game.player2.toString();
		} else if (
			game.player2 &&
			game.player2.toString() === surrenderingPlayerId
		) {
			winningPlayerId = game.player1.toString();
		} else {
			return res.status(403).json({ msg: "You are not a player in this game, cannot surrender" });
		}

		game.status = "Completed";
		game.winner = winningPlayerId;
		game.endedAt = new Date();
		game.turn = null;

		await game.save();
		const updatedGame = await Game.findById(gameId)
			.populate("player1", "username")
			.populate("player2", "username")
			.populate("winner", "username");
		res.json(updatedGame);
	} catch (err) {
		console.error("Error processing surrender:", err.message, err.stack);
		res.status(500).send(`Server error: ${err.message}`);
	}
});

// Removed other complex helper functions like AI logic, detailed ship placement validation etc.
// to keep backend lightweight.

export default router;
