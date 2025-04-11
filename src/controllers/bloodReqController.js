import axios from "axios";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";
import { DateTime } from "luxon";

const createBloodReq = async (req, res) => {
  const requestBody = req.body;
  const date = requestBody.expiry_date;

  const formattedDate = DateTime.fromFormat(date, "d-M-yyyy H:mm", {
    zone: "utc",
  }).toISO();

  try {
    const { data, error } = await supabase
      .from("blood_requests")
      .insert([
        {
          ...requestBody,
          expiry_date: formattedDate,
        },
      ])
      .select("id") // ini untuk mengembalikan data hasil insert
      .single(); // karena kita hanya insert 1 row

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    // ======== bakal dihapus =========
    // const responseConfirm = await axios.patch('https://gtf-api.vercel.app/partners/confirm/' + data.id)

    // if (responseConfirm.status !== 200) {
    //   return response.sendInternalError(res, "Failed to confirm request");
    // }
    // ======== bakal dihapus =========

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
    // const now = DateTime.now().toUTC().toISO();
    // const { data: cancelledRequests, error: cancelError } = await supabase
    //   .from("blood_requests")
    //   .update({ status: "cancelled" })
    //   .lt("expiry_date", now)
    //   .neq("status", "cancelled")
    //   .select();

    // if (cancelError) {
    //   console.error("Error cancelling expired blood requests:", cancelError.message);
    // } else if (cancelledRequests.length > 0) {
    //   console.log("✅ Auto-cancelled requests:", cancelledRequests);
    // } else {
    //   console.log("ℹ️ No expired blood requests to cancel.");
    // }

    const { data, error } = await supabase
      .from("blood_requests")
      .select("*, partners(name)")
      .eq("requester_id", requesterId)
      .order("created_at", { ascending: false });

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
    // const { data: cancelledRequests, error: cancelError } = await supabase
    //   .from("blood_requests")
    //   .update({ status: "cancelled" })
    //   .lt("expiry_date", new Date().toISOString())
    //   .neq("status", "cancelled")
    //   .select(); // biar kita bisa tahu datanya apa aja

    // if (cancelError) {
    //   console.error(
    //     "Error cancelling expired blood requests:",
    //     cancelError.message
    //   );
    // } else if (cancelledRequests.length > 0) {
    //   console.log("✅ Auto-cancelled requests:", cancelledRequests);
    // } else {
    //   console.log("ℹ️ No expired blood requests to cancel.");
    // }

    const { data: partnerData, error: partnerError } = await supabase
      .from("partners")
      .select("id")
      .eq("userId", userMitraId)
      .single();

    if (partnerError || !partnerData) {
      return response.sendNotFound(res, "Partner not found");
    }

    const partnerId = partnerData.id;

    const { data: bloodRequests, error: bloodRequestsError } = await supabase
      .from("blood_requests")
      .select("*, partners(name, latitude, longitude)")
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

const getNearbyBloodRequests = async (req, res) => {
  const { user_id } = req.params;
  const radius = 10000;

  try {
    // const { data: cancelledRequests, error: cancelError } = await supabase
    //   .from("blood_requests")
    //   .update({ status: "cancelled" })
    //   .lt("expiry_date", new Date().toISOString())
    //   .neq("status", "cancelled")
    //   .select(); // biar kita bisa tahu datanya apa aja

    // if (cancelError) {
    //   console.error(
    //     "Error cancelling expired blood requests:",
    //     cancelError.message
    //   );
    // } else if (cancelledRequests.length > 0) {
    //   console.log("✅ Auto-cancelled requests:", cancelledRequests);
    // } else {
    //   console.log("ℹ️ No expired blood requests to cancel.");
    // }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("location")
      .eq("id", user_id)
      .single();

    if (userError || !userData) {
      return response.sendNotFound(res, "User not found");
    }

    const { data: locationData, error: locationError } = await supabase.rpc(
      "st_asgeojson",
      { geom: userData.location }
    );

    if (locationError || !locationData) {
      return response.sendInternalError(res, "Failed to get user location");
    }

    const userLocation = JSON.parse(locationData);
    const userLongitude = userLocation.coordinates[0];
    const userLatitude = userLocation.coordinates[1];

    const { data: nearbyRequests, error: nearbyError } = await supabase.rpc(
      "get_nearby_blood_requests",
      {
        user_long: userLongitude,
        user_lat: userLatitude,
        radius: radius,
      }
    );

    if (nearbyError) {
      console.error("Error fetching nearby blood requests:", nearbyError);
      return response.sendInternalError(
        res,
        "Failed to fetch nearby blood requests"
      );
    }

    return response.sendSuccess(res, {
      data: nearbyRequests,
      message: "Nearby blood requests retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving nearby blood requests:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

const patchBloodRequestStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return response.sendBadRequest(res, "Status is required");
  }

  const validStatuses = [
    "pending",
    "cancelled",
    "completed",
    "ready",
    "confirmed",
  ];
  if (!validStatuses.includes(status)) {
    return response.sendBadRequest(res, "Invalid status value");
  }

  try {
    const { error } = await supabase
      .from("blood_requests")
      .update({ status })
      .eq("id", id);

    if (error) {
      return response.sendInternalError(res, error.message);
    }

    return response.sendSuccess(res, {
      message: "Blood request status updated successfully",
    });
  } catch (error) {
    console.error("Update blood request status error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

const verifyUniqueCode = async (req, res) => {
  const { id } = req.params;
  const { unique_code } = req.body;

  try {
    const { data, error } = await supabase
      .from("blood_requests")
      .select("id")
      .eq("id", id)
      .eq("unique_code", unique_code);

    if (error) {
      return response.sendInternalError(res, error.message);
    }

    if (data.length === 0) {
      return response.sendNotFound(res, "Unique code not found");
    }

    return response.sendSuccess(res, {
      data,
      message: "Unique code verified successfully",
    });
  } catch (error) {
    console.error("Verify unique code error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

export default {
  createBloodReq,
  getBloodReqByUserId,
  getBloodReqByPartnerId,
  getNearbyBloodRequests,
  patchBloodRequestStatus,
  verifyUniqueCode,
};
