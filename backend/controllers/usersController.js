// Handlers for user-related database actions (register, login, profile, etc.)
const bcrypt = require("bcrypt");
const doQuery = require("../database/query");
const hashPassword = require("../utils/hashPassword");
const { getUserByEmail } = require("../database/queries/userQueries");
const STATUS_CODE = require("../constants/statusCodes");
const {
  validateRequiredRegisterFields,
  validateRegisterInputFormats,
  validateEmailQuery,
  validateLoginFields,
  validateAuthenticatedUser,
  validateEmailInBody,
} = require("../utils/validsController");

// Get a list of all users in the system (for admin/testing)
const getAllUsers = async (req, res, next) => {
  try {
    const query = "Select * from users";
    const result = await doQuery(query);
    res.send(result);
  } catch (error) {
    next(error);
  }
};

const getUserDetailsByEmail = async (req, res, next) => {
  try {
    const { email } = req.query;
    if (!validateEmailQuery(email, res)) return;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: "User not found" });
    }

    res.send(user);
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
    const hashedPassword = await hashPassword(password);

    const insertQuery = `
    INSERT INTO users (firstName,lastName, email, password, phone,birthDate )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

    const firstNameCap = firstName[0].toUpperCase() + firstName.slice(1);
    const lastNameCap = lastName[0].toUpperCase() + lastName.slice(1);
    const values = [
      firstNameCap,
      lastNameCap,
      email,
      hashedPassword,
      phone,
      birthDate,
    ];
    const result = await doQuery(insertQuery, values);

    return res.status(STATUS_CODE.CREATED).json({
      message: "User registered successfully",
      userId: result.insertId,
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

    //--------Input validation--------
    // if (!checkValidEmail(email)) {
    //   throwErr(STATUS_CODE.BAD_REQUEST, "Invalid email format.", res);
    // }

    // if (!checkValidPassword(password)) {
    //   throwErr(
    //     STATUS_CODE.BAD_REQUEST,
    //     "Invalid password. It should be 3-8 characters long and include uppercase letters, lowercase letters, and numbers.",
    //     res,
    //   );
    // }

    //----if came here all inputs are valid----

    const user = await getUserByEmail(email);

    if (!user) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(STATUS_CODE.BAD_REQUEST)
        .json({ message: "Invalid email or password" });
    }

    const loggedUser = {
      userId: user.userId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      birthDate: user.birthDate,
      status: user.status,
    };
    req.session.user = loggedUser;

    res.status(STATUS_CODE.OK).json(loggedUser);
  } catch (error) {
    next(error);
  }
}
// Return the logged-in user's profile data from the session
async function getProfile(req, res, next) {
  try {
    if (!validateAuthenticatedUser(req, res, "Unauthorized, Login first!")) return;

    res.status(STATUS_CODE.OK).json({
      message: "User profile fetched successfully",
      user: req.session.user,
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
  try {
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
      return res.status(STATUS_CODE.NOT_FOUND).json({ message: "User not found" });
    }

    res.send({
      success: true,
      message: `User ${email} has been blocked successfully.`,
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
  getUserDetailsByEmail,
  blockUserByEmail,
};
