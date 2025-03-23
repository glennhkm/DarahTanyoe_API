import express from "express";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";
import axios from "axios";

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

const validateRequest = async (req, res) => {
  const { requestId } = req.params;
  let { isValidate } = req.body;

  try {
    if (typeof isValidate === "string") {
      isValidate = isValidate === "true";
    }
    isValidate = Boolean(isValidate);

    const { data: requestData, error: requestError } = await supabase
      .from("blood_requests")
      .select(
        "id, isValidate, requester_id, partner_id, partners(name, longitude, latitude), users(full_name, phone_number, blood_type)"
      )
      .eq("id", requestId)
      .single();

    if (requestError || !requestData) {
      return response.sendNotFound(res, "Blood request not found");
    }

    console.log("Request data:", requestData);
    const { name, longitude, latitude } = requestData.partners;
    const { full_name: full_name, phone_number: requesterPhone, blood_type: bloodType } = requestData.users;
    const radius = 5000;

    if (isValidate) {
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

      console.log("Nearby users:", nearbyUsers);

      // Mengirim Notifikasi WhatsApp ke Setiap User
      await Promise.all(
        nearbyUsers.map(async (user) => {
          try {
            const waPayload = {
              data: {
                body_variables: [
                  user.full_name,
                  full_name,
                  requesterPhone,
                  bloodType,
                  name,
                ],
              },
              recipients: [
                {
                  whatsapp_number: user.phone_number,
                  first_name: user.full_name,
                  replace: false,
                },
              ],
            };

            const waResponse = await axios.post(
              "https://app.wanotifier.com/api/v1/notifications/bK4BD75Ybe?key=I4E2g6TmwOEymmWdKk5DKsrXW3NRdO",
              waPayload
            );

            console.log(`📢 WhatsApp notification sent to ${user.phone_number}:`, waResponse.data);
          } catch (waError) {
            console.error(`❌ Error sending WhatsApp to ${user.phone_number}:`, waError.message);
          }
        })
      );

      // Menyimpan Notifikasi dalam Database
      const notifications = nearbyUsers.map((user) => ({
        user_id: user.id,
        title: "Ada permintaan darah di sekitar Anda.",
        message: "Ketuk untuk melihat informasi lebih lanjut.",
        type: "app",
        related_to: "request",
        is_read: false,
        created_at: new Date(),
      }));

      const { data: notificationData, error: notificationError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notificationError) {
        console.error("Error saving notifications:", notificationError);
        return response.sendInternalError(res, "Failed to save notifications");
      }

      console.log("Notifications saved:", notificationData);
    }

    // Update status permintaan darah
    const { data, error } = await supabase
      .from("blood_requests")
      .update({ isValidate, status: isValidate ? "verified" : "rejected" })
      .eq("id", requestId)
      .select();

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendSuccess(res, {
      data,
      message: `Blood request validation successfully updated${isValidate ? " & notifications sent" : ""}`,
    });
  } catch (error) {
    console.error("Validate request error:", error);
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
//     isValidate = Boolean(isValidate); // Pastikan selalu Boolean

//     const { data: requestData, error: requestError } = await supabase
//       .from("blood_requests")
//       .select("id, isValidate, partner_id, partners(latitude, longitude)")
//       .eq("id", requestId)
//       .single();

//     if (requestError || !requestData) {
//       return response.sendNotFound(res, "Blood request not found");
//     }

//     if (isValidate === true) {
//       const { latitude, longitude } = requestData.partners;
//       const radius = 5000;

//       const { data: nearbyUsers, error: nearbyError } = await supabase.rpc(
//         "get_nearby_users",
//         {
//           target_long: parseFloat(longitude),
//           target_lat: parseFloat(latitude),
//           radius: parseFloat(radius),
//         }
//       );

//       if (nearbyError) {
//         console.error("Error fetching nearby users:", nearbyError);
//         return response.sendInternalError(res, "Failed to fetch nearby users");
//       }

//       console.log("Nearby users:", nearbyUsers);

//       nearbyUsers.forEach((user) => {
//         console.log(`📢 Sending notification to ${user.email}...`);
//       });


//       const notifications = nearbyUsers.map(user => ({
//         user_id: user.id,
//         title: "Ada permintaan darah di sekitar Anda.",
//         message: "Ketuk untuk melihat informasi lebih lanjut.",
//         type: "app",
//         related_to: "request",
//         is_read: false,
//         created_at: new Date(),
//       }));

//       const { data: notificationData, error: notificationError } = await supabase
//         .from('notifications')
//         .insert(notifications);

//       if (notificationError) {
//         console.error("Error sending notifications:", notificationError);
//         return response.sendInternalError(res, "Failed to send notifications");
//       }

//       console.log("Notifications sent:", notificationData);
//     }

//     const { data, error } = await supabase
//       .from("blood_requests")
//       .update({ isValidate, status: isValidate ? 'verified' : 'rejected' })
//       .eq("id", requestId)
//       .select();

//     if (error) {
//       return response.sendBadRequest(res, error.message);
//     }

//     return response.sendSuccess(res, {
//       data,
//       message: `Blood request validation successfully updated${isValidate ? ' & notifications sent' : ''}`,
//     });
//   } catch (error) {
//     console.error("Validate request error:", error);
//     return response.sendInternalError(res, "An unexpected error occurred");
//   }
// };


partnerRouter.get("/", getPatnerWithBloodStock);
partnerRouter.post("/create", createPartner);
partnerRouter.patch("/validate/:requestId", validateRequest);

export default partnerRouter;
