import express from "express";
import dotenv from "dotenv";
import morgan from "morgan";
import BinanceBot from "./core/BinanceBot";

dotenv.config();

const app = express();
app.use(express.json());
app.use(morgan("tiny"));

BinanceBot();

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});
