// Handlers for user-related database actions (register, login, profile, etc.)
const bcrypt = require("bcrypt");
const doQuery = require("../database/query");
const hashPassword = require("../utils/hashPassword");
// const generateOTP = require("../utils/generateOTP");
// const {
//   sendOTPEmail,
//   handleEmailVerification,
// } = require("../services/emailService");
const {
  getUserByEmail,
  getUserByPhone,
} = require("../database/queries/userQueries");
const STATUS_CODE = require("../constants/statusCodes");
const {
  validateRequiredRegisterFields,
  validateRegisterInputFormats,
  validateLoginFields,
  validateAuthenticatedUser,
  validateEmailInBody,
  validateUpdateInputFormats,
} = require("../utils/validsController");

const { createActivity } = require("../database/queries/activityQueries");
const { formatDateForInput } = require("../utils/formatDate");

const sendVerificationCode = async (req, res) => {
  const { email } = req.body;

  const otp = generateOTP(); // utils
  await sendOTPEmail(email, otp); // service

  req.session.otp = otp;

  res.json({ message: "sent" });
};

// Verify the OTP for a pending email change and apply it
// const verifyCode = async (req, res, next) => {
//   try {
//     const { code } = req.body;
//     const { pendingEmail, emailOtp } = req.session;

//     if (!pendingEmail || !emailOtp) {
//       return res
//         .status(STATUS_CODE.BAD_REQUEST)
//         .json({ message: "No pending email verification" });
//     }

//     if (!code || String(code) !== String(emailOtp)) {
//       return res
//         .status(STATUS_CODE.BAD_REQUEST)
//         .json({ message: "Invalid verification code" });
//     }

//     const updateQuery = "UPDATE users SET email = ? WHERE email = ?";
//     const result = await doQuery(updateQuery, [
//       pendingEmail,
//       req.session.user.email,
//     ]);

//     if (result.affectedRows === 0) {
//       return res
//         .status(STATUS_CODE.NOT_FOUND)
//         .json({ message: "User not found" });
//     }

//     req.session.user.email = pendingEmail;
//     delete req.session.pendingEmail;
//     delete req.session.emailOtp;

//     res.status(STATUS_CODE.OK).json({ message: "Email verified and updated" });
//   } catch (error) {
//     next(error);
//   }
// };

// Get a list of all users in the system
const getAllUsers = async (req, res, next) => {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    if (req.session.user.role !== "admin")
      return res.status(STATUS_CODE.FORBIDDEN).json({ message: "Forbidden" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    // Get the search term and wrap it in % for the SQL LIKE operator
    const search = req.query.search || "";
    const searchTerm = `%${search}%`;

    const query = ` 
      SELECT u.userId, u.firstName, u.lastName, u.email, u.phone, u.birthDate, u.role, u.status
      FROM users u
      WHERE u.email LIKE ? 
      ORDER BY u.userId DESC
      LIMIT ? OFFSET ?
    `;
    const users = await doQuery(query, [searchTerm, limit, offset]);

    const formattedUsers = users.map((user) => ({
      ...user,
      birthDate: user.birthDate
        ? new Date(user.birthDate).toLocaleDateString("en-GB")
        : "N/A",
    }));

    const countQuery = `SELECT COUNT(*) as totalCount FROM users WHERE email LIKE ?`;
    const countResult = await doQuery(countQuery, [searchTerm]);
    const totalPages = Math.ceil(countResult[0].totalCount / limit);

    const statsQuery = `
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `;
    const statsResult = await doQuery(statsQuery);

    res.status(STATUS_CODE.OK).json({
      message: "Users fetched successfully",
      users: formattedUsers,
      stats: {
        total: Number(statsResult[0].total) || 0,
        active: Number(statsResult[0].active) || 0,
        blocked: Number(statsResult[0].blocked) || 0,
        admins: Number(statsResult[0].admins) || 0,
      },
      pagination: {
        totalUsers: countResult[0].totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// --- GET USERS BY STATUS (WITH SEARCH) ---
const getUsersByStatus = async (req, res, next) => {
  try {
    const { status } = req.params;
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    if (req.session.user.role !== "admin")
      return res.status(STATUS_CODE.FORBIDDEN).json({ message: "Forbidden" });

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const search = req.query.search || "";
    const searchTerm = `%${search}%`;

    const query = ` 
      SELECT u.userId, u.firstName, u.lastName, u.email, u.phone, u.birthDate, u.role, u.status
      FROM users u
      WHERE status = ? AND u.email LIKE ?
      ORDER BY u.userId DESC
      LIMIT ? OFFSET ?
    `;
    const users = await doQuery(query, [status, searchTerm, limit, offset]);

    const formattedUsers = users.map((user) => ({
      ...user,
      birthDate: user.birthDate
        ? new Date(user.birthDate).toLocaleDateString("en-GB")
        : "N/A",
    }));

    const countQuery = `SELECT COUNT(*) as totalCount FROM users WHERE status = ? AND email LIKE ?`;
    const countResult = await doQuery(countQuery, [status, searchTerm]);
    const totalPages = Math.ceil(countResult[0].totalCount / limit);

    const statsQuery = `
      SELECT COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `;
    const statsResult = await doQuery(statsQuery);

    res.status(STATUS_CODE.OK).json({
      message: "Users fetched successfully",
      users: formattedUsers,
      stats: {
        total: Number(statsResult[0].total) || 0,
        active: Number(statsResult[0].active) || 0,
        blocked: Number(statsResult[0].blocked) || 0,
        admins: Number(statsResult[0].admins) || 0,
      },
      pagination: {
        totalUsers: countResult[0].totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Register a new user: validates input, hashes password, inserts into DB
async function register(req, res, next) {
  try {
    const { firstName, lastName, email, password, phone, birthDate } = req.body;
    if (!validateRequiredRegisterFields(req.body, res)) return;
    if (!validateRegisterInputFormats(req.body, res)) return;

    //----if came here all inputs are valid----

    const emailExist = await getUserByEmail(email);
    if (emailExist) {
      return res
        .status(STATUS_CODE.CONFLICT)
        .json({ message: "Email already exists" });
    }

    const phoneExist = await getUserByPhone(phone);
    if (phoneExist) {
      return res
        .status(STATUS_CODE.CONFLICT)
        .json({ message: "Phone already exists" });
    }

    const hashedPassword = await hashPassword(password);

    const insertQuery = `
    INSERT INTO users (firstName,lastName, email, password, phone,birthDate, status, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
    const firstNameClean = firstName.trim();
    const lastNameClean = lastName.trim();
    const firstNameCap =
      firstNameClean[0].toUpperCase() + firstNameClean.slice(1);
    const lastNameCap = lastNameClean[0].toUpperCase() + lastNameClean.slice(1);
    const emailLower = email.trim().toLowerCase();
    const values = [
      firstNameCap,
      lastNameCap,
      emailLower,
      hashedPassword,
      phone,
      birthDate,
      "active",
      "user",
    ];
    const result = await doQuery(insertQuery, values);

    const loggedUser = {
      userId: result.insertId,
      firstName: firstNameCap,
      lastName: lastNameCap,
      email: email,
      phone: phone,
      birthDate: birthDate,
      status: "active",
      role: "user",
    };

    req.session.user = loggedUser;

    return res.status(STATUS_CODE.CREATED).json({
      message: "User registered successfully",
      user: loggedUser,
    });
  } catch (error) {
    next(error);
  }
}
// Login existing user: validates credentials and stores basic user data in session
async function login(req, res, next) {
  const { email, password } = req.body;

  try {
    if (!validateLoginFields(email, password, res)) return;
    const user = await getUserByEmail(email);

    if (!user) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Invalid email or password" });
    }

    if (user.status === "blocked") {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "User is blocked" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Invalid email or password" });
    }
    //format the birthDate to the format YYYY-MM-DD
    const birthDate = formatDateForInput(user.birthDate);
    const emailNormalized = user.email.toLowerCase();

    const loggedUser = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: emailNormalized,
      phone: user.phone,
      role: user.role,
      birthDate: birthDate,
      status: user.status,
    };
    req.session.user = loggedUser;

    res.status(STATUS_CODE.OK).json(loggedUser);
  } catch (error) {
    next(error);
  }
}
const getUserDetailsByEmail = async (req, res, next) => {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    if (req.session.user.role !== "admin") {
      return res.status(STATUS_CODE.FORBIDDEN).json({
        message: "Only admins can access user details",
      });
    }

    const { email } = req.query;

    if (!validateEmailInBody(email, res)) return;

    const query = `
      SELECT 
        userId,
        firstName,
        lastName,
        email,
        phone,
        birthDate,
        role,
        status
      FROM users
      WHERE email = ?
    `;

    const result = await doQuery(query, [email]);

    if (result.length === 0) {
      return res.status(STATUS_CODE.NOT_FOUND).json({
        message: "User not found",
      });
    }

    res.status(STATUS_CODE.OK).json({
      message: "User fetched successfully",
      user: result[0],
    });
  } catch (error) {
    next(error);
  }
};
// Return the logged-in user's profile data from the session
async function getProfile(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    const user = await getUserByEmail(req.session.user.email);
    if (!user) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }
    const birthDate = formatDateForInput(user.birthDate);
    const loggedUser = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      birthDate: birthDate,
      status: user.status,
    };

    res.status(STATUS_CODE.OK).json({
      message: "User profile fetched successfully",
      user: loggedUser,
    });
  } catch (error) {
    next(error);
  }
}

// Logout the current user: destroys session and clears cookie
async function logout(req, res, next) {
  try {
    req.session.destroy((err) => {
      if (err) {
        return next(err);
      }
      res.clearCookie("connect.sid");

      return res.status(STATUS_CODE.OK).json({ message: "Logout successful" });
    });
  } catch (error) {
    next(error);
  }
}

// blocks user by email (it doesnt delete the user, just changes its status to blocked)
const blockUserByEmail = async (req, res, next) => {
  const { email } = req.params;
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    if (req.session.user.role !== "admin") {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "Only admins can block users" });
    }

    if (!validateEmailInBody(email, res)) return;

    const updateQuery = "UPDATE users SET status = 'blocked' WHERE email = ?";
    const result = await doQuery(updateQuery, [email]);

    // MySQL returns 'affectedRows'. If 0, the email doesnt exist!
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }

    await createActivity(
      req.session.user.userId,
      "user_blocked",
      `Blocked: ${email}`,
    );

    res.send({
      success: true,
      message: `User ${email} has been blocked successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

const unblockUserByEmail = async (req, res, next) => {
  try {
    const { email } = req.params;

    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    if (req.session.user.role !== "admin") {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "Only admins can unblock users" });
    }
    if (!validateEmailInBody(email, res)) return;
    const updateQuery = "UPDATE users SET status = 'active' WHERE email = ?";
    const result = await doQuery(updateQuery, [email]);
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }
    await createActivity(
      req.session.user.userId,
      "user_unblocked",
      `Unblocked: ${email}`,
    );
    res.send({
      success: true,
      message: `User ${email} has been unblocked successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;

    const currentUserId = req.session.user.userId;

    const { firstName, lastName, phone, birthDate, password, newEmail } =
      req.body;
    if (!validateUpdateInputFormats(req.body, res)) return;

    const users = await doQuery("SELECT * FROM users WHERE userId = ?", [
      currentUserId,
    ]);
    const user = users[0];

    if (!user) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }
    if (phone && phone !== user.phone) {
      const phoneExist = await getUserByPhone(phone);
      if (phoneExist) {
        return res
          .status(STATUS_CODE.CONFLICT)
          .json({ message: "Phone already exists" });
      }
    }

    const currentEmail = user.email;

    const fields = [];
    const values = [];
    const updatedFields = [];

    // -------------------------
    // NAME FIELDS
    // -------------------------
    if (firstName && firstName !== user.firstName) {
      const clean = firstName.trim();
      fields.push("firstName = ?");
      values.push(clean[0].toUpperCase() + clean.slice(1));
      updatedFields.push("firstName");
    }

    if (lastName && lastName !== user.lastName) {
      const clean = lastName.trim();
      fields.push("lastName = ?");
      values.push(clean[0].toUpperCase() + clean.slice(1));
      updatedFields.push("lastName");
    }

    // -------------------------
    // PHONE
    // -------------------------
    if (phone && phone !== user.phone) {
      const phoneExist = await getUserByPhone(phone);
      if (phoneExist) {
        res.status(STATUS_CODE.CONFLICT);
        throw new Error("Phone already exists!");
      }

      fields.push("phone = ?");
      values.push(phone);
      updatedFields.push("phone");
    }
    console.log("birthDate from frontend:", birthDate);

    const oldBirthDate = new Date(user.birthDate).toISOString().split("T")[0];
    if (birthDate && birthDate !== oldBirthDate) {
      fields.push("birthDate = ?");
      values.push(birthDate);
      updatedFields.push("birthDate");
    }

    // -------------------------
    // EMAIL
    // -------------------------
    if (newEmail && newEmail !== currentEmail) {
      const anotherUser = await getUserByEmail(newEmail);

      if (anotherUser) {
        res.status(STATUS_CODE.CONFLICT);
        throw new Error("Email already exists!");
      }

      fields.push("email = ?");
      values.push(newEmail);
      updatedFields.push("email");
    }

    // -------------------------
    // PASSWORD
    // -------------------------
    if (password) {
      const hashedPassword = await hashPassword(password);
      fields.push("password = ?");
      values.push(hashedPassword);
      updatedFields.push("password");
    }

    // we dont use this
    //     -------------------------
    // EMAIL CHANGE (2-STEP FLOW)
    // -------------------------
    // if (newEmail) {
    //   const normalizedEmail = newEmail.trim().toLowerCase();

    //   if (normalizedEmail !== currentEmail) {
    //     const emailExist = await getUserByEmail(normalizedEmail);

    //     if (emailExist) {
    //       return res
    //         .status(STATUS_CODE.CONFLICT)
    //         .json({ message: "Email already exists" });
    //     }
    //   }
    // }
    //   if (normalizedEmail !== currentEmail) {
    //     const otp = await handleEmailVerification(normalizedEmail);

    //     req.session.pendingEmail = normalizedEmail;
    //     req.session.emailOtp = otp;

    //     return res.json({
    //       message: "Verify new email first",
    //     });
    //   }
    // }

    // -------------------------
    // SAFETY CHECK (IMPORTANT)
    // -------------------------
    if (fields.length === 0) {
      return res.status(400).json({
        message: "No fields to update",
      });
    }

    // -------------------------
    // UPDATE DB
    // -------------------------
    const updateQuery = `
      UPDATE users 
      SET ${fields.join(", ")} 
      WHERE userId = ?
    `;

    const result = await doQuery(updateQuery, [...values, currentUserId]);

    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }

    // -------------------------
    // RESPONSE
    // -------------------------
    let safeBirthDate = birthDate;
    if (!safeBirthDate && user?.birthDate) {
      const d = new Date(user.birthDate);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      safeBirthDate = `${year}-${month}-${day}`;
    }

    const loggedUser = {
      userId: user.userId,
      firstName: firstName ?? user.firstName,
      lastName: lastName ?? user.lastName,
      email: newEmail ?? currentEmail,
      phone: phone ?? user.phone,
      birthDate: safeBirthDate,
      role: user.role,
      status: user.status,
    };

    req.session.user = loggedUser;

    await createActivity(
      currentUserId,
      "profile_updated",
      `Updated: ${updatedFields.join(", ")}`,
    );

    // Force the session to save BEFORE sending the 200 OK.
    // This completely eliminates race conditions with the frontend.
    req.session.save((err) => {
      if (err) return next(err);
      res.status(STATUS_CODE.OK).json({
        message: "User profile updated successfully",
        user: loggedUser,
      });
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  register,
  login,
  getProfile,
  logout,
  blockUserByEmail,
  unblockUserByEmail,
  getUserDetailsByEmail,
  updateUserProfile,
  getUsersByStatus,
};
