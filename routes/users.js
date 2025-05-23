// server/routes/users.js

import User from "../models/User.js";
import express from "express";
import authMiddleware from "../middleware/auth.js"; // Import our simplified auth middleware

const router = express.Router(); // Import User model

// @route   POST api/users/register
// @desc    Register a new user
// @access  Public
router.post("/register", async (req, res) => {
	const { username, password } = req.body;

	if (!username || !password) {
		return res.status(400).json({ msg: "Please provide username and password" });
	}
	// Simple password length check
	if (password.length < 3) {
		return res.status(400).json({ msg: "Password must be at least 3 characters long" });
	}

	try {
		let user = await User.findOne({ username });
		if (user) {
			return res.status(400).json({ msg: "User already exists" });
		}

		user = new User({
			username,
			password,
		});

		await user.save();

		// Registration successful, return user ID as a simplified "token"
		res.status(201).json({
			msg: "User registered successfully",
			token: user.id,
			user: {
				id: user.id,
				username: user.username,
			},
		});
	} catch (err) {
		console.error("Registration error:", err.message);
		res.status(500).send("Server error");
	}
});

// @route   POST api/users/login
// @desc    Authenticate user & get token (or session)
// @access  Public
router.post("/login", async (req, res) => {
	const { username, password } = req.body;

	if (!username || !password) {
		return res.status(400).json({ msg: "Please provide username and password" });
	}

	try {
		const user = await User.findOne({ username });
		if (!user) {
			return res.status(400).json({ msg: "User not found or password incorrect" });
		}

		// Directly compare plain text password
		if (password !== user.password) {
			return res.status(400).json({ msg: "User not found or password incorrect" });
		}

		// Login successful, return user ID as a simplified "token"
		res.json({
			msg: "Login successful",
			token: user.id, // Directly use user ID as token
			user: {
				id: user.id,
				username: user.username,
			},
		});
	} catch (err) {
		console.error("Login error:", err.message);
		res.status(500).send("Server error");
	}
});

// @route   POST api/users/logout
// @desc    Logout user (informational, as token is client-side)
// @access  Private 
router.post("/logout", authMiddleware, (req, res) => {

	res.json({ msg: "Logout successful. Please clear the token on the client." });
});

// @route   GET api/users/me
// @desc    Get current logged in user's info (based on token)
// @access  Private (requires token)
router.get("/me", authMiddleware, async (req, res) => {
	try {
		const user = await User.findById(req.user.id).select("-password");
		if (!user) {
			return res.status(404).json({ msg: "User not found" });
		}
		res.json(user);
	} catch (err) {
		console.error("Error getting user info:", err.message);
		res.status(500).send("Server error");
	}
});

export default router;

