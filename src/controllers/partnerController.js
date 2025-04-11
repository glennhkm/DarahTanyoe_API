import supabase from "../config/db.js";
import response from "../helpers/responses.js";
import axios from "axios";

const createPartner = async (req, res) => {
  const fb_ver = process.env.FACEBOOK_MESSAGE_VERSION;
  const fb_phone = process.env.FACEBOOK_PHONE_NUMBER_ID;

  console.log(fb_ver, fb_phone);
};

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

const confirmRequest = async (req, res) => {
  const { requestId } = req.params;
  const fb_ver = process.env.FACEBOOK_MESSAGE_VERSION;
  const fb_phone = process.env.FACEBOOK_PHONE_NUMBER_ID;
  const fb_access_token = process.env.FACEBOOK_ACCESS_TOKEN;

  try {
    const { data: requestData, error: requestError } = await supabase
      .from("blood_requests")
      .select(
        "id, patient_name, phone_number, blood_type, status, requester_id, partner_id, partners(name, longitude, latitude)"
      )
      .eq("id", requestId)
      .single();

    if (requestError || !requestData) {
      return response.sendNotFound(res, "Blood request not found");
    }

    // Check if the request is in pending status before confirming
    if (requestData.status !== "pending") {
      return response.sendBadRequest(
        res,
        "Only pending requests can be confirmed"
      );
    }

    const { patient_name, phone_number, blood_type } = requestData;
    const { name, longitude, latitude } = requestData.partners;
    const radius = 5000;

    // Get nearby users for notification
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

    // Mengirim Notifikasi WhatsApp ke Setiap User
    // await Promise.all(
    //   nearbyUsers.map(async (user) => {
    //     try {
    //       //   const waPayload = {
    //       //     data: {
    //       //       body_variables: [
    //       //         user.full_name,
    //       //         patient_name,
    //       //         phone_number,
    //       //         blood_type,
    //       //         name,
    //       //       ],
    //       //     },
    //       //     recipients: [
    //       //       {
    //       //         whatsapp_number: user.phone_number,
    //       //         first_name: user.full_name,
    //       //         replace: false,
    //       //       },
    //       //     ],
    //       //   };
    //       const waPayload = {
    //         messaging_product: "whatsapp",
    //         to: user.phone_number,
    //         type: "template",
    //         template: {
    //           name: "darahtanyoe_permintaan_terdekat",
    //           language: {
    //             code: "en",
    //           },
    //           components: [
    //             {
    //               type: "body",
    //               parameters: [
    //                 { type: "text", text: user.full_name },
    //                 { type: "text", text: patient_name },
    //                 { type: "text", text: phone_number },
    //                 { type: "text", text: blood_type },
    //                 { type: "text", text: name },
    //               ],
    //             },
    //           ],
    //         },
    //       };

    //       //   const waResponse = await axios.post(
    //       //     "https://app.wanotifier.com/api/v1/notifications/bK4BD75Ybe?key=I4E2g6TmwOEymmWdKk5DKsrXW3NRdO",
    //       //     waPayload
    //       //   );
    //       const waResponse = await axios.post(
    //         `https://graph.facebook.com/${fb_ver}/${fb_phone}/messages`,
    //         waPayload,
    //         {
    //           headers: {
    //             Authorization: `Bearer ${fb_access_token}`,
    //             "Content-Type": "application/json",
    //           },
    //         }
    //       );
          

    //       console.log(
    //         `✅ WhatsApp notification sent to ${user.phone_number}:`,
    //         waResponse.data
    //       );
    //       // console.log(`📢 WhatsApp notification sent to ${user.phone_number}:`, waResponse.data);
    //     } catch (waError) {
    //       console.error(
    //         `❌ Error sending WhatsApp to ${user.phone_number}:`,
    //         waError.message
    //       );
    //     }
    //   })
    // );

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

    // Update request status to confirmed
    const { data, error } = await supabase
      .from("blood_requests")
      .update({
        status: "confirmed",
        updated_at: new Date(),
      })
      .eq("id", requestId)
      .select();

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendSuccess(res, {
      data,
      message: "Blood request confirmed successfully & notifications sent",
    });
  } catch (error) {
    console.error("Confirm request error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

export default {
  createPartner,
  getPatnerWithBloodStock,
  confirmRequest,
};
