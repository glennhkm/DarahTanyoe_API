import supabase from "../config/db.js";
import response from "../helpers/responses.js";

const createBloodDonor = async (req, res) => {
  const requestBody = req.body;

  try {
    const { error } = await supabase.from("donation_offers").insert([
      {
        ...requestBody,
      },
    ]);

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendCreated(res, {
      message: "Blood donor created successfully",
    });
  } catch (error) {
    console.error("Create blood donor error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

const getBloodDonorByUserId = (req, res) => {
  const { userId } = req.params;

  supabase
    .from("donation_offers")
    .select(
      `
        id,
        status,
        health_notes,
        full_name,
        phone_number,
        created_at,
        unique_code,
        blood_requests (
          reason,
          status,
          expiry_date,
          blood_type,
          quantity,
          blood_bags_fulfilled,        
          partners (
            name,
            latitude,
            longitude
          )
        )
      `
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .then(({ data, error }) => {
      if (error) {
        return response.sendInternalError(res, error.message);
      }

      return response.sendSuccess(res, {
        data,
        message: "Successfully get blood donor",
      });
    })
    .catch((error) => {
      console.error("Get blood donor error:", error);
      return response.sendInternalError(res, "An unexpected error occurred");
    });
};

// const patchBloodDonorStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   if (!status) {
//     return response.sendBadRequest(res, "Status is required");
//   }

//   const validStatuses = ["on_progress", "completed", "cancelled"];
//   if (!validStatuses.includes(status)) {
//     return response.sendBadRequest(res, "Invalid status value");
//   }

//   try {
//     const { error } = await supabase
//       .from("donation_offers")
//       .update({ status })
//       .eq("id", id);

//     if (error) {
//       return response.sendInternalError(res, error.message);
//     }

//     return response.sendSuccess(res, {
//       message: "Blood donor status updated successfully",
//     });
//   } catch (error) {
//     console.error("Update blood donor status error:", error);
//     return response.sendInternalError(res, "An unexpected error occurred");
//   }
// };

const patchBloodDonorStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return response.sendBadRequest(res, "Status is required");
  }

  const validStatuses = ["on_progress", "completed", "cancelled"];
  if (!validStatuses.includes(status)) {
    return response.sendBadRequest(res, "Invalid status value");
  }

  try {
    const { data, error } = await supabase.rpc("update_blood_donor_status", {
      donor_id: id,
      new_status: status,
    });

    if (error) {
      return response.sendInternalError(res, error.message);
    }

    if (data.error) {
      if (data.error === "Donation offer not found" || data.error === "Blood request not found") {
        return response.sendBadRequest(res, data.error);
      }
      return response.sendInternalError(res, data.error);
    }

    return response.sendSuccess(res, {
      message: data.message,
    });
  } catch (error) {
    console.error("Update blood donor status error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

const verifyUniqueCode = async (req, res) => {
  const { id } = req.params;
  const { unique_code } = req.body;

  try {
    const { data, error } = await supabase.from("donation_offers")
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

const getDonationOffersByPartnerId = async (req, res) => {
  const { userMitraId } = req.params;

  try {
    // Step 1: Ambil partnerId berdasarkan userMitraId
    const { data: partnerData, error: partnerError } = await supabase
      .from("partners")
      .select("id")
      .eq("userId", userMitraId)
      .single();

    if (partnerError || !partnerData) {
      return response.sendNotFound(res, "Partner not found");
    }

    const partnerId = partnerData.id;

    // Step 2: Ambil semua blood_requests dari partner tersebut
    const { data: bloodRequests, error: bloodRequestsError } = await supabase
      .from("blood_requests")
      .select("id")
      .eq("partner_id", partnerId);

    if (bloodRequestsError) {
      return response.sendInternalError(res, bloodRequestsError.message);
    }

    const requestIds = bloodRequests.map((req) => req.id);

    if (requestIds.length === 0) {
      return response.sendSuccess(res, {
        data: [],
        message: "No donation offers found for this partner",
      });
    }

    // Step 3: Ambil donation_offers yang request_id-nya termasuk dalam requestIds
    const { data: donationOffers, error: donationOffersError } = await supabase
      .from("donation_offers")
      .select("*, blood_requests(*, partners(name, latitude, longitude))")
      .in("request_id", requestIds);

    if (donationOffersError) {
      return response.sendInternalError(res, donationOffersError.message);
    }

    return response.sendSuccess(res, {
      data: donationOffers,
      message: "Successfully retrieved donation offers",
    });
  } catch (error) {
    console.error("Get donation offers error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};


export default {
  createBloodDonor,
  getBloodDonorByUserId,
  getDonationOffersByPartnerId,
  patchBloodDonorStatus,
  verifyUniqueCode,
};
