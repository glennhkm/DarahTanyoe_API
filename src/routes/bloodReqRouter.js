import express from "express";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";
import { DateTime } from "luxon";

const bloodReqRouter = express.Router();

const createBloodReq = async (req, res) => {
  const requestBody = req.body;
  const date = requestBody.expiry_date;

  const formattedDate = DateTime.fromFormat(date, "d-M-yyyy H:mm", {
    zone: "utc",
  }).toISO();

  try {
    const { error } = await supabase.from("blood_requests").insert([
      {
        ...requestBody,
        expiry_date: formattedDate,
      },
    ]);

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendCreated(res, {
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

const getBloodReqByPartnerId = async (req, res) => {
  const { userMitraId } = req.params;

  try {
    // 1️⃣ Cari partner_id berdasarkan userMitraId
    const { data: partnerData, error: partnerError } = await supabase
      .from("partners")
      .select("id")
      .eq("userId", userMitraId)
      .single(); // Ambil satu data saja

    if (partnerError || !partnerData) {
      return response.sendNotFound(res, "Partner not found");
    }

    const partnerId = partnerData.id; // Ambil partner_id yang ditemukan

    // 2️⃣ Cari blood_requests berdasarkan partner_id
    const { data: bloodRequests, error: bloodRequestsError } = await supabase
      .from("blood_requests")
      .select("*, partners(name)") // Ambil semua data dari blood_requests & partners
      .eq("partner_id", partnerId);

    if (bloodRequestsError) {
      return response.sendInternalError(res, bloodRequestsError.message);
    }

    return response.sendSuccess(res, {
      data: bloodRequests,
      message: "Successfully retrieved blood requests",
    });
  } catch (error) {
    console.error("Get blood requests error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};


bloodReqRouter.post("/create", createBloodReq);
bloodReqRouter.get("/:requesterId", getBloodReqByUserId);
bloodReqRouter.get("/partner/:userMitraId", getBloodReqByPartnerId);
export default bloodReqRouter;
