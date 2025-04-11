import express from "express";
import userController from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.post("/daftar", userController.completeUserProfile);
userRouter.post("/masuk", userController.signInWithPhone);
userRouter.post("/masuk-web", userController.signInWithWeb);
userRouter.post("/verifyOTP", userController.verifyOTP);

export default userRouter;