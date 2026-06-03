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
  validateUpdateProfileInputFormats,
} = require("../utils/validsController");

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
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "You are not authorized to access this resource" });
    const query = ` Select 
    u.userId,
        u.firstName,
        u.lastName,
        u.email,
        u.phone,
        u.birthDate,
        u.role,
        u.status
    FROM users u
    ORDER BY u.userId DESC
    `;

    const users = await doQuery(query);
    res.status(STATUS_CODE.OK).json({
      message: "Users fetched successfully",
      users: users,
      count: users.length,
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

    const birthDate = user.birthDate.toLocaleDateString();
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
// async function getProfile(req, res, next) {
//   try {

//     if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
//       return;
//     const user =  await getUserByEmail(req.session.user.email);
//     if (!user) {
//       return res
//         .status(STATUS_CODE.NOT_FOUND)
//         .json({ message: "User not found" });
//     }
//     const loggedUser = {
//       userId: user.userId,
//       firstName: user.firstName,
//       lastName: user.lastName,
//       email: user.email,
//       phone: user.phone,
//       role: user.role,
//       birthDate: user.birthDate.toLocaleDateString(),
//       status: user.status,
//     };

//     res.status(STATUS_CODE.OK).json({
//       message: "User profile fetched successfully",
//       user: loggedUser,
//     });
//   } catch (error) {
//     next(error);
//   }
// }
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
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    if (req.session.user.role !== "admin") {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "Only admins can block users" });
    }

    const { email } = req.body;
    if (!validateEmailInBody(email, res)) return;

    const updateQuery = "UPDATE users SET status = 'blocked' WHERE email = ?";
    const result = await doQuery(updateQuery, [email]);

    // MySQL returns 'affectedRows'. If 0, the email doesnt exist!
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }

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
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!"))
      return;
    if (req.session.user.role !== "admin") {
      return res
        .status(STATUS_CODE.FORBIDDEN)
        .json({ message: "Only admins can unblock users" });
    }
    const { email } = req.body;
    if (!validateEmailInBody(email, res)) return;
    const updateQuery = "UPDATE users SET status = 'active' WHERE email = ?";
    const result = await doQuery(updateQuery, [email]);
    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }
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
    const currentEmail = req.session.user.email;

    const { firstName, lastName, phone, birthDate, password, newEmail } =
      req.body;

    if (!validateUpdateProfileInputFormats(req.body, res)) return;

    const user = await getUserByEmail(currentEmail);

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

    const fields = [];
    const values = [];

    // -------------------------
    // NAME FIELDS
    // -------------------------
    if (firstName) {
      const clean = firstName.trim();
      fields.push("firstName = ?");
      values.push(clean[0].toUpperCase() + clean.slice(1));
    }

    if (lastName) {
      const clean = lastName.trim();
      fields.push("lastName = ?");
      values.push(clean[0].toUpperCase() + clean.slice(1));
    }

    if (phone) {
      fields.push("phone = ?");
      values.push(phone);
    }

    if (birthDate) {
      fields.push("birthDate = ?");
      values.push(birthDate);
    }

    // -------------------------
    // PASSWORD
    // -------------------------
    if (password) {
      const hashedPassword = await hashPassword(password);
      fields.push("password = ?");
      values.push(hashedPassword);
    }

    // -------------------------
    // EMAIL CHANGE (2-STEP FLOW)
    // -------------------------
    if (newEmail) {
      const normalizedEmail = newEmail.trim().toLowerCase();

      if (normalizedEmail !== currentEmail) {
        const emailExist = await getUserByEmail(normalizedEmail);

        if (emailExist) {
          return res
            .status(STATUS_CODE.CONFLICT)
            .json({ message: "Email already exists" });
        }
      }
    }

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
      WHERE email = ?
    `;

    const result = await doQuery(updateQuery, [...values, currentEmail]);

    if (result.affectedRows === 0) {
      return res
        .status(STATUS_CODE.NOT_FOUND)
        .json({ message: "User not found" });
    }

    // -------------------------
    // RESPONSE
    // -------------------------
    res.status(STATUS_CODE.OK).json({
      message: "User profile updated successfully",
      user: {
        userId: user.userId,
        firstName: firstName ?? user.firstName,
        lastName: lastName ?? user.lastName,
        email: currentEmail,
        phone: phone ?? user.phone,
        birthDate: birthDate ?? user.birthDate,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    next(error);
  }
};
module.exports = {
  getAllUsers,
  register,
  login,
  // getProfile,
  logout,
  blockUserByEmail,
  unblockUserByEmail,
  getUserDetailsByEmail,
  updateUserProfile,
};
