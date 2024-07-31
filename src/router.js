import express from "express";
import {fun} from "./logger";
const router = express.Router()

router.get('/dummy',fun);
export default router;