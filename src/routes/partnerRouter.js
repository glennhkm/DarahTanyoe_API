import express from "express";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";

const partnerRouter = express.Router();

const createPartner = async (req, res) => {};

const getPatnerWithBloodStock = async (req, res) => {
  try {
    const { data: dataPartners, error } = await supabase
      .from("partners")
      .select("*");

    if (error) {
      return response.sendInternalError(res, error.message);
    }

    const { data: dataBloodStock, error: errorBloodStock } = await supabase
      .from("blood_stocks")
      .select("*");

    if (errorBloodStock) {
      return response.sendInternalError(res, errorBloodStock.message);
    }

    const partners = dataPartners.map((partner) => {
      const bloodStock = dataBloodStock.filter(
        (stock) => stock.partner_id === partner.id
      );

      return {
        ...partner,
        blood_stock:
          bloodStock.length > 0
            ? bloodStock.map((stock) => ({
                blood_type: stock.blood_type,
                quantity: stock.quantity,
              }))
            : [],
      };
    });

    return response.sendSuccess(res, {
      data: partners,
      message: "Successfully get partners with blood stock",
    });
  } catch (error) {
    console.error("Get partners error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

// const validateRequest = async (req, res) => {
//   const { requestId } = req.params;
//   let { isValidate } = req.body;

//   try {
//     if (typeof isValidate === "string") {
//       isValidate = isValidate === "true";
//     }

//     const { data, error } = await supabase
//       .from("blood_requests")
//       .update({ isValidate })
//       .eq("id", requestId)
//       .select();

//     if (error) {
//       return response.sendBadRequest(res, error.message);
//     }

//     if (!data || data.length === 0) {
//       return response.sendNotFound(res, "Blood request not found");
//     }

//     return response.sendSuccess(res, {
//       data,
//       message: "Blood request validation successfully updated",
//     });
//   } catch (error) {
//     console.error("Validate request error:", error);
//     return response.sendInternalError(res, "An unexpected error occurred");
//   }
// };

const validateRequest = async (req, res) => {
  const { requestId } = req.params;
  let { isValidate } = req.body;

  try {
    if (typeof isValidate === "string") {
      isValidate = isValidate === "true";
    }

    // 1️⃣ Ambil data request + latitude & longitude dari partners dalam satu query
    const { data: requestData, error: requestError } = await supabase
      .from("blood_requests")
      .select("id, isValidate, partner_id, partners(latitude, longitude)")
      .eq("id", requestId)
      .single();

    if (requestError || !requestData) {
      return response.sendNotFound(res, "Blood request not found");
    }

    console.log("Request data:", requestData.partners);

    const { latitude, longitude } = requestData.partners;
    const radius = 5000;

    const { data: nearbyUsers, error: nearbyError } = await supabase.rpc(
      "get_nearby_users",
      {
        target_long: parseFloat(longitude),
        target_lat: parseFloat(latitude),
        radius: parseFloat(radius),
      }
    );

    if (nearbyError) {
      console.error("Error fetching nearby users:", nearbyError);
      return response.sendInternalError(res, "Failed to fetch nearby users");
    }

    nearbyUsers.forEach((user) => {
      console.log(`📢 Sending notification to ${user.email}...`);
    });

    // 4️⃣ Update validasi permintaan darah
    const { data, error } = await supabase
      .from("blood_requests")
      .update({ isValidate })
      .eq("id", requestId)
      .select();

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendSuccess(res, {
      data,
      message:
        "Blood request validation successfully updated & notifications sent",
    });
  } catch (error) {
    console.error("Validate request error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

partnerRouter.get("/", getPatnerWithBloodStock);
partnerRouter.post("/create", createPartner);
partnerRouter.patch("/validate/:requestId", validateRequest);

export default partnerRouter;
