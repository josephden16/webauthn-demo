import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import memoryStore from "memorystore";
import session from "express-session";
import morgan from "morgan";

dotenv.config();
const { PORT, MONGODB_URL } = process.env;

const app = express();

const MemoryStore = memoryStore(session);

mongoose.connect(MONGODB_URL).then(() => {
  console.log("Database Connection Successful! 🚀");
});

// express configs
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", credentials: true }));
app.use(express.static("public"));

app.use(
  session({
    name: "webauthn demo",
    secret: "this_should_be_a_secret",
    saveUninitialized: true,
    resave: false,
    cookie: {
      maxAge: 86400000,
      httpOnly: true, // Ensure to not expose session cookies to clientside scripts
      secure: false,
    },
    store: new MemoryStore({
      checkPeriod: 86_400_000, // prune expired entries every 24h
    }),
  })
);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
