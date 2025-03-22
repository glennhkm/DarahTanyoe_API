import express from "express";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";

const bloodReqRouter = express.Router();

const createBloodReq = async (req, res) => {
  const requestBody = req.body;

  try {
    const { data, error } = await supabase.from("blood_requests").insert([
      {
        ...requestBody,
      },
    ]);

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendSuccess(res, {
      data,
      message: "Blood request created successfully",
    });
  } catch (error) {
    console.error("Create blood request error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

bloodReqRouter.post("/create", createBloodReq);
export default bloodReqRouter;
