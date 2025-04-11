import express from "express";
import notificationController from "../controllers/notificationController.js";

const notificationRouter = express.Router();

notificationRouter.get("/:userId", notificationController.getNotificationByUserId);

export default notificationRouter;