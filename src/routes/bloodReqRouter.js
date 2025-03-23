import express from "express";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";
import { DateTime } from "luxon";

const bloodReqRouter = express.Router();

const createBloodReq = async (req, res) => {
  const requestBody = req.body;
  const date = requestBody.expiry_date;

  // Konversi format "28-3-2025 0:00" menjadi objek tanggal
  const formattedDate = DateTime.fromFormat(date, "d-M-yyyy H:mm", {
    zone: "utc",
  }).toISO();

  try {
    const { data, error } = await supabase.from("blood_requests").insert([
      {
        ...requestBody,
        expiry_date: formattedDate,
      },
    ]);

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendCreated(res, {
      data,
      message: "Blood request created successfully",
    });
  } catch (error) {
    console.error("Create blood request error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

const getBloodReqByUserId = async (req, res) => {
  const { requesterId } = req.params;

  try {
    const { data, error } = await supabase
      .from("blood_requests")
      .select("*, partners(name)") // Ambil semua data dari blood_requests & partners
      .eq("requester_id", requesterId);

    if (error) {
      return response.sendInternalError(res, error.message);
    }

    return response.sendSuccess(res, {
      data,
      message: "Successfully get blood requests with partners data",
    });
  } catch (error) {
    console.error("Get blood requests error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

bloodReqRouter.post("/create", createBloodReq);
bloodReqRouter.get("/:requesterId", getBloodReqByUserId);
export default bloodReqRouter;
