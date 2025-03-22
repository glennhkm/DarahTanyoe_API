import express from "express";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";

const userRouter = express.Router();

const signInWithPhone = async (req, res) => {
  const { phone } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      phone: phone,
      options: {
        channel: "whatsapp",
      },
    });

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendSuccess( res, {
      session: data.session,
      message: "Successfully sent OTP to phone number",
    });
  } catch (error) {
    console.error("Signin error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

const verifyOTP = async (req, res) => {
  const { phone, token } = req.body;
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      phone: phone,
      token: token,
      type: "sms",
    });

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    const phone_number = phone.replace("+", "");

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("phone_number", phone_number)
      .maybeSingle();

    if (userError) {
      return response.sendBadRequest(res, userError.message );
    }

    return response.sendSuccess(res, {
      data,
      user: user || {},
      message:
        "Phone number verified successfully. Please complete your profile.",
    });
  } catch (error) {
    console.error("OTP verification error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};


const completeUserProfile = async (req, res) => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return response.sendUnauthorized(res, "Authentication required");
    }

    const {
      email,
      full_name,
      address,
      latitude,
      longitude,
      birth_date,
      blood_type,
      last_donation_date,
      health_notes,
      user_type,
      profile_picture,
    } = req.body;

    if (
      !email ||
      !full_name ||
      !address ||
      latitude === undefined ||
      longitude === undefined ||
      !birth_date ||
      !blood_type ||
      !user_type
    ) {
      return response.sendBadRequest(res, "Missing required fields");
    }


    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email: email,
          password_hash: "managed_by_supabase",
          phone_number: user.phone,
          full_name,
          address,
          latitude,
          longitude,
          birth_date,
          blood_type,
          last_donation_date,
          health_notes,
          total_points: 0,
          user_type,
          profile_picture,
          updated_at: new Date(),
        },
      ])
      .select();

    if (error) {
      console.error("Error creating user profile:", error);
      return response.sendBadRequest(res, error.message);
    }

    return response.sendCreated(res, {
      message: "User profile created successfully",
      user: data[0],
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

userRouter.post("/daftar", completeUserProfile);
userRouter.post("/masuk", signInWithPhone);
userRouter.post("/verifyOTP", verifyOTP);

export default userRouter;
