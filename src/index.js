import express from "express";
import { sendSuccess } from "./response";
import router from "./router";
const app = express();

app.get('/', (req, res) => {
    return sendSuccess(res, 200, "Application started working...");
})
app.use('/api', router);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server started at http:localhost:${PORT}`);
})