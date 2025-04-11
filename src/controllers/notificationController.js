import supabase from "../config/db.js";
import response from "../helpers/responses.js";
import axios from "axios";

const getNotificationByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return response.sendInternalError(res, error.message);
    }

    return response.sendSuccess(res, {
      data,
      message: "Successfully get notifications",
    });
  } catch (error) {
    console.error("Get notifications error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

export default {
  getNotificationByUserId,
};
