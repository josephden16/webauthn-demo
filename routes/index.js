import express from "express";

import {
  generateRegistrationOptionsCtrl,
  verifyRegistrationCtrl,
  generateAuthenticationOptionsCtrl,
  verifyAuthenticationCtrl,
} from "../controller/index.js";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ message: "Hi!" });
});

router.get("/register/start", generateRegistrationOptionsCtrl);
router.post("/register/verify", verifyRegistrationCtrl);
router.get("/login/start", generateAuthenticationOptionsCtrl);
router.post("/login/verify", verifyAuthenticationCtrl);

export default router;
