import express from "express";
import supabase from "../config/db.js";
import response from "../helpers/responses.js";
import axios from "axios";

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

    return response.sendSuccess(res, {
      session: data.session,
      message: "Successfully sent OTP to phone number",
    });
  } catch (error) {
    console.error("Signin error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

const signInWithWeb = async (req, res) => {
  const { email, password } = req.body;

  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (userError) {
    return response.sendBadRequest(res, userError.message);
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return response.sendBadRequest(res, error.message);
    }

    return response.sendSuccess(res, {
      user,
      session: data.session,
      message: "Successfully signed in",
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
      return response.sendBadRequest(res, userError.message);
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
    // Validasi autentikasi
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return response.sendUnauthorized(res, "Authentication required");
    }

    // Validasi data input
    const {
      email,
      full_name,
      address,
      latitude,
      longitude,
      age,
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
      !age ||
      !blood_type ||
      !user_type
    ) {
      return response.sendBadRequest(res, "Missing required fields");
    }

    // Simpan data ke Supabase
    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          email: email,
          phone_number: user.phone,
          full_name,
          address,
          location: `SRID=4326;POINT(${longitude} ${latitude})`,
          age,
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

    const user_phone = `+${user.phone}`
    const bodyToWANotifier = {
      "whatsapp_number": user_phone,
      "first_name": full_name,
      "lists": [
        "Default"
      ],
      "status": "subscribed",
      "replace": false
    };

    // Panggil API WAnotifier - jika gagal, akan masuk ke blok catch
    try {
      const waResponse = await axios.post(
        'https://app.wanotifier.com/api/v1/contacts/?key=I4E2g6TmwOEymmWdKk5DKsrXW3NRdO', 
        bodyToWANotifier
      );
      console.log("User added to WAnotifier successfully:", waResponse.data);
    } catch (waError) {
      console.error("Error adding user to WAnotifier:", waError);
      
      // Rollback - hapus user dari Supabase karena WAnotifier gagal
      const { error: deleteError } = await supabase
        .from("users")
        .delete()
        .match({ email: email, phone_number: user.phone });
      
      if (deleteError) {
        console.error("Error during rollback:", deleteError);
      }
      
      return response.sendBadRequest(res, "Failed to register with notification service: " + waError.message);
    }

    return response.sendCreated(res, {
      message: "User profile created and phone_number added to WAnotifier successfully",
      user: data[0],
    });
  } catch (error) {
    console.error("Complete profile error:", error);
    return response.sendInternalError(res, "An unexpected error occurred");
  }
};

userRouter.post("/daftar", completeUserProfile);
userRouter.post("/masuk", signInWithPhone);
userRouter.post("/masuk-web", signInWithWeb);
userRouter.post("/verifyOTP", verifyOTP);

export default userRouter;
