const express = require("express");
const router = express.Router();

const auth = require("./auth");
const users = require("./users");
const students = require("./students");
const otp = require("./otp");
const notifications = require("./notifications");
const ai = require("./ai");

// Authentication routes
router.use("/auth", auth);

// User and student routes
router.use("/users", users);
router.use("/students", students);
router.use("/otp", otp);
router.use("/notifications", notifications);
router.use("/ai", ai);

// Legacy alias – frontend currently POSTs to /api/email/send
// Redirects to the new /api/otp/* endpoints so both paths work
router.use("/email", otp);

module.exports = router;
