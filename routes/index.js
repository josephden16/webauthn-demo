import express from "express";

import {
  generateRegistrationOptionsCtrl,
  verifyRegistrationCtrl,
  generateAuthenticationOptionsCtrl,
  verifyAuthenticationCtrl,
} from "../controllers/index.js";

const router = express.Router();

router.get("/register/start", generateRegistrationOptionsCtrl);
router.post("/register/verify", verifyRegistrationCtrl);
router.get("/login/start", generateAuthenticationOptionsCtrl);
router.post("/login/verify", verifyAuthenticationCtrl);

export default router;
