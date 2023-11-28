import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import Token from "../models/tokenModel.js";
import generateToken from "../utils/generateToken.js";
import sendMail from "../utils/sendMail.js";
import generateGravatar from "../utils/generateGravatar.js";
import jwt from "jsonwebtoken";
import sql from "mssql";
// const sql = require("mssql");
import config from "../config/dbconfig.js";
import bcrypt from "bcryptjs";
import sendExpertMail from "../utils/sendExpertMail.js";

// @desc Get all the users info
// @route GET /api/users
// @access PRIVATE/ADMIN

const getAllUsers = async (req, res) => {
  try {
    const pool = await sql.connect(config);

    const page = Number(req.query.pageNumber) || 1;
    const pageSize = 20;
    const countResult = await pool
      .request()
      .query("SELECT COUNT(*) AS totalCount FROM [Users]");
    const count = countResult.recordset[0].totalCount;

    const result = await pool
      .request()
      .input("pageSize", sql.Int, pageSize)
      .input("offset", sql.Int, (page - 1) * pageSize)
      .query(
        `SELECT * FROM [Users] ORDER BY createdAt DESC OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY`
      );

    res.json({
      users: result.recordset,
      page,
      pages: Math.ceil(count / pageSize),
      total: count,
    });
  } catch (err) {
    console.error("SQL error", err);
    res.status(500).send("Internal server error");
  }
};

// @desc Delete a user
// @route DELETE /api/users/:id
// @access PRIVATE/ADMIN
const deleteUser = async (req, res) => {
  try {
    await sql.connect(config);
    const { id } = req.params;
    const request = new sql.Request();
    const result = await request.query(`SELECT * FROM Users WHERE id = ${id}`);
    const user = result.recordset[0];

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const deleteRequest = new sql.Request();
    await deleteRequest.query(`DELETE FROM Users WHERE id = ${id}`);

    res.json({
      message: "User removed from DB",
    });
  } catch (error) {
    res.status(500);
    throw new Error(error.message);
  } finally {
    sql.close();
  }
};

// @desc get user by ID
// @route GET /api/users/:id
// @access PRIVATE/ADMIN
const getUserById = async (req, res) => {
  try {
    await sql.connect(config);

    const result =
      await sql.query`SELECT * FROM users WHERE id = ${req.params.id}`;

    if (result.recordset.length) {
      const user = result.recordset[0];
      delete user.password; // remove password field from user object
      res.json(user);
    } else {
      res.status(404);
      throw new Error("User does not exist");
    }
  } catch (error) {
    res.status(500);
    throw new Error("Server error");
  } finally {
    sql.close();
  }
};

// @desc update user from the admin panel
// @route PUT /api/users/:id
// @access PRIVATE/ADMIN

const updateUser = async (req, res) => {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    const request = pool.request();
    const userId = req.params.id;

    // retrieve the user from the database
    const result = await request.query(
      `SELECT * FROM Users WHERE Id='${userId}'`
    );
    const user = result.recordset[0];

    if (!user) {
      res.status(404);
      throw new Error("User not found.");
    }

    // update the user with the values from the request body
    const updatedUser = {
      ...user,
      name: req.body.name || user.name,
      isConfirmed: req.body.email === user.email,
      email: req.body.email || user.email,
      isAdmin: req.body.isAdmin || user.isAdmin,
    };

    // save the updated user to the database
    await request.query(
      `UPDATE Users SET Name='${updatedUser.name}', IsConfirmed='${updatedUser.isConfirmed}', Email='${updatedUser.email}', IsAdmin='${updatedUser.isAdmin}' WHERE Id='${userId}'`
    );

    res.json({
      id: updatedUser.Id,
      email: updatedUser.Email,
      name: updatedUser.Name,
      isAdmin: updatedUser.IsAdmin,
      isConfirmed: updatedUser.IsConfirmed,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    pool.close();
  }
};

// @desc authenticate user and get token
// @route POST /api/users/login
// @access PUBLIC
const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  const pool = await sql.connect(config);
  const userQuery = `SELECT * FROM users WHERE email = '${email}'`;
  const userResult = await pool.request().query(userQuery);
  console.log("In the api");
  const user = userResult.recordset[0];
  if (!user) {
    res.status(401);
    throw new Error("Account not registered with this email");
  }
  console.log(user);
  // generate both the access and the refresh tokens
  const accessToken = generateToken(user.id, "access");
  const refreshToken = generateToken(user.id, "refresh");
  var userInstance;
  if (user) {
    userInstance = new User(
      user.name,
      user.email,
      user.password,
      user.isAdmin,
      user.isSeller,
      user.isExpert,
      user.isConfirmed,
      user.avatar,
      user.googleID,
      user.githubID,
      user.twitterID,
      user.linkedinID
    );
  }
  // if the passwords are matching, then check if a refresh token exists for this user
  if (user && (await userInstance.matchPassword(password))) {
    const existingTokenQuery = `SELECT * FROM tokens WHERE email = '${email}'`;
    const existingTokenResult = await pool.request().query(existingTokenQuery);

    let existingToken = existingTokenResult.recordset[0];

    // if no refresh token available, create one and store it in the db
    if (!existingToken) {
      const newTokenQuery = `INSERT INTO tokens (email, token) VALUES ('${email}', '${refreshToken}')`;
      await pool.request().query(newTokenQuery);
    } else {
      const updateTokenQuery = `UPDATE tokens SET token = '${refreshToken}' WHERE email = '${email}'`;
      await pool.request().query(updateTokenQuery);
    }

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      isSeller: user.isSeller,
      isExpert: user.isExpert,
      isConfirmed: user.isConfirmed,
      avatar: user.avatar,
      accessToken,
      refreshToken,
    });
  } else {
    res.status(401);
    throw new Error(user ? "Invalid Password" : "Invalid email");
  }
});

// @desc register a new user
// @route POST /api/users/
// @access PUBLIC
const registerUser = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    isSeller,
    revenueWeight,
    netIncomeWeight,
    growthWeight,
    marketWeight,
    employeeWeight,
    debtWeight,
    cashOnWeight,
    customerWeight,
    IntellectualWeight,
    ManagementWeight,
  } = req.body;
  console.log(req.body);
  // Create a new SQL Server connection pool using the configuration object
  const pool = await sql.connect(config);
  try {
    // Check if a user with the same email already exists in the database
    const checkEmailQuery = `SELECT COUNT(*) as count FROM users WHERE email = '${email}'`;
    const checkEmailResult = await pool.request().query(checkEmailQuery);

    if (checkEmailResult.recordset[0].count > 0) {
      res.status(400);
      throw new Error("Email already registered");
    }
    // Generate a gravatar URL based on the email address
    const avatar = generateGravatar(email);
    const hashedPassword = await bcrypt.hash(password, 10);

    //worthCalculation
    var sellerWorth;
    sellerWorth =
      revenueWeight * 0.3 +
      netIncomeWeight * 0.25 +
      growthWeight * 0.15 +
      marketWeight * 0.1 +
      employeeWeight * 0.05 +
      debtWeight * -0.1 +
      cashOnWeight * 0.1 +
      customerWeight * 0.05 +
      IntellectualWeight * 0.05 +
      ManagementWeight * 0.1;

    // var SellerWorth = ($5 million x 0.3) + ($1 million x 0.25) + (7% x 0.15) + (15% x 0.1) + (30 x 0.05) + ($2 million x -0.1) + ($750,000 x 0.1) + (80% x 0.05) + (5 x 0.05) + (5 x 0.1)
    // Worth of Business = $3.275 million
    // Insert a new user record into the database
    console.log(sellerWorth);
    var insertUserQuery;
    if (isSeller) {
      insertUserQuery = `
      INSERT INTO users (name, email, password, avatar, isAdmin, isConfirmed,isSeller,sellerWorth)
      VALUES ('${name}', '${email}', '${hashedPassword}', '${avatar}', 0, 0,'${isSeller}','${parseInt(
        sellerWorth
      )}')
      SELECT SCOPE_IDENTITY() AS userId
    `;
    } else {
      insertUserQuery = `
      INSERT INTO users (name, email, password, avatar, isAdmin, isConfirmed)
      VALUES ('${name}', '${email}', '${hashedPassword}', '${avatar}', 0, 0)
      SELECT SCOPE_IDENTITY() AS userId
    `;
    }

    const insertUserResult = await pool.request().query(insertUserQuery);

    if (!insertUserResult.recordset || !insertUserResult.recordset[0].userId) {
      res.status(400);
      throw new Error("User not created");
    }

    const userId = insertUserResult.recordset[0].userId;

    // Send a mail for email verification of the newly registered email id
    await sendMail(userId, email, "email verification");

    // Generate JWT tokens for the new user
    const accessToken = generateToken(userId, "access");
    const refreshToken = generateToken(userId, "refresh");

    res.status(201).json({
      id: userId,
      email: email,
      name: name,
      avatar: avatar,
      isAdmin: false,
      isConfirmed: false,
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (error) {
    res.status(500);
    throw new Error(`Error registering user: ${error.message}`);
  } finally {
    // Close the SQL Server connection pool
    pool.close();
  }
});

// @desc send a mail with the link to verify mail
// @route POST /api/users/confirm
// @access PUBLIC
const mailForEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;

    // Get a connection from the pool
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("email", sql.VarChar, email)
      .query("SELECT * FROM Users WHERE email = @email");

    const user = result.recordset[0];
    if (user) {
      // send a verification email, if this user is not a confirmed email
      if (!user.isConfirmed) {
        // send the mail
        await sendMail(user.id, email, "email verification");
        res.status(201).json({
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          avatar: user.avatar,
          isConfirmed: user.isConfirmed,
        });
      } else {
        res.status(400);
        throw new Error("User already confirmed");
      }
    } else {
      res.status(404);
      throw new Error("User not found");
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    throw new Error("Could not send the mail. Please retry.");
  }
};

// @desc send a mail with the link to reset password
// @route POST /api/users/reset
// @access PUBLIC
const mailForPasswordReset = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;
    const pool = await sql.connect(config);
    // query the database to get the user with the specified email
    const result = await pool
      .request()
      .input("email", sql.NVarChar(255), email)
      .query("SELECT * FROM Users WHERE email = @email");
    const user = result.recordset[0];
    // send a link to reset password only if it's a confirmed account
    if (user && user.isConfirmed) {
      // send the mail and return the user details
      await sendMail(user._id, email, "forgot password");
      res.status(201).json({
        id: user._id,
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        isConfirmed: user.isConfirmed,
      });
    } else {
      res.status(404);
      throw new Error("User not found or account not confirmed");
    }

    // release the connection back to the pool
    await pool.close();
  } catch (error) {
    console.log(error);
    res.status(500);
    throw new Error("Could not send the mail. Please retry.");
  }
});

// @desc reset password of any verified user
// @route PUT /api/users/reset
// @access PUBLIC
const resetUserPassword = asyncHandler(async (req, res) => {
  try {
    const { passwordToken, password } = req.body;
    const decodedToken = jwt.verify(
      passwordToken,
      process.env.JWT_FORGOT_PASSWORD_TOKEN_SECRET
    );

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", decodedToken.id)
      .query("SELECT * FROM Users WHERE id = @id");

    if (result.recordset.length === 1) {
      const user = result.recordset[0];
      user.password = password;

      const updateResult = await pool
        .request()
        .input("id", user.id)
        .input("password", user.password)
        .query(
          "UPDATE Users SET password = @password WHERE id = @id; SELECT @@ROWCOUNT AS affected_rows;"
        );

      if (updateResult.recordset[0].affected_rows === 1) {
        res.status(200).json({
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          isAdmin: user.isAdmin,
        });
      } else {
        res.status(401);
        throw new Error("Unable to update password");
      }
    } else {
      res.status(400);
      throw new Error("User not found.");
    }
  } catch (error) {
    res.status(400);
    throw new Error("Invalid token.");
  } finally {
    await sql.close();
  }
});

// @desc confirm the email address of the registered user
// @route GET /api/users/confirm
// @access PUBLIC
const confirmUser = async (req, res) => {
  try {
    // set the user to a confirmed status, once the corresponding JWT is verified correctly
    const emailToken = req.params.token;
    const decodedToken = jwt.verify(
      emailToken,
      process.env.JWT_EMAIL_TOKEN_SECRET
    );

    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("userId", decodedToken.id)
      .query("SELECT * FROM Users WHERE id = @userId AND isDeleted = 0");

    if (!result.recordset.length) {
      res.status(400);
      throw new Error("User not found");
    }

    const user = result.recordset[0];

    user.isConfirmed = true;
    const updateResult = await pool
      .request()
      .input("isConfirmed", sql.Bit, user.isConfirmed)
      .input("userId", user.id)
      .query("UPDATE Users SET isConfirmed = @isConfirmed WHERE id = @userId");

    if (!updateResult.rowsAffected[0]) {
      res.status(400);
      throw new Error("Unable to update user confirmation");
    }

    const refreshResult = await pool
      .request()
      .input("email", user.email)
      .query("SELECT refreshToken FROM Tokens WHERE email = @email");

    const foundToken = refreshResult.recordset[0].refreshToken;

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin,
      avatar: user.avatar,
      isConfirmed: user.isConfirmed,
      accessToken: generateToken(user.id, "access"),
      refreshToken: foundToken,
    });
  } catch (error) {
    console.log(error);
    res.status(401);
    throw new Error("Not authorised. Token failed");
  }
};

// @desc obtain new access tokens using the refresh tokens
// @route GET /api/users/refresh
// @access PUBLIC
const getAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.body.token;
  const email = req.body.email;

  // search if currently loggedin user has the refreshToken sent
  const currentAccessToken = await Token.findOne({ email });

  if (!refreshToken || refreshToken !== currentAccessToken.token) {
    res.status(400);
    throw new Error("Refresh token not found, login again");
  }

  // If the refresh token is valid, create a new accessToken and return it.
  jwt.verify(
    refreshToken,
    process.env.JWT_REFRESH_TOKEN_SECRET,
    (err, user) => {
      if (!err) {
        const accessToken = generateToken(user.id, "access");
        return res.json({ success: true, accessToken });
      } else {
        return res.json({
          success: false,
          message: "Invalid refresh token",
        });
      }
    }
  );
});

// @desc get user data for google login in the frontend
// @route POST /api/users/passport/data
// @access PUBLIC
const getUserData = async (req, res) => {
  const { id } = req.body;
  try {
    await sql.connect(config);
    const result = await sql.query(`SELECT * FROM Users WHERE id = '${id}'`);
    const user = result.recordset[0];
    if (user) {
      res.json({
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        isConfirmed: user.isConfirmed,
      });
    } else {
      res.status(400);
      throw new Error("User not authorised to view this page");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Error getting user data");
  } finally {
    sql.close();
  }
};

// @desc get data for an authenticated user
// @route GET /api/users/profile
// @access PRIVATE
const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("userId", sql.Int, req.user.id)
      .query("SELECT * FROM Users WHERE id = @userId");

    if (result.recordset.length > 0) {
      const user = result.recordset[0];
      res.json({
        id: user.id,
        email: user.email,
        avatar: user.avatar,
        name: user.name,
        isAdmin: user.isAdmin,
      });
    } else {
      res.status(400);
      throw new Error("User not authorised to view this page");
    }
  } catch (error) {
    console.log(error);
    res.status(500);
    throw new Error("Server Error");
  }
});
// @desc get data for an authenticated user
// @route GET /api/users/profile
// @access PRIVATE
const postContactExpert = asyncHandler(async (req, res) => {
  try {
    const { name, email, message } = req.body;
    const pool = await sql.connect();
    const request = pool.request();

    // insert the product into the database
    const result = await request.query(`
      INSERT INTO ContactExpert (personName, personEmail, personMessage)
      VALUES ('${name}', '${email}', '${message}')
    `);
    const getExpertMail = `SELECT Top 1 EMAIL FROM Users WHERE isExpert = 1`;
    const queryResult = await request.query(getExpertMail);
    const expertMail = queryResult.recordset[0].EMAIL;
    console.log("Expert Mail", expertMail);
    await sendExpertMail(
      name,
      email,
      expertMail,
      message,
      "send mail to expert"
    );
    // send the newly created product in the response
    res.status(201).json({
      name,
      email,
      message,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @route POST /api/users/milestone
// @access PRIVATE
const postSellerMileStone = asyncHandler(async (req, res) => {
  try {
    const { userId, milestone } = req.body;
    const pool = await sql.connect();
    const request = pool.request();
    console.log(userId, milestone);
    // insert the product into the database
    const result = await request.query(`
      INSERT INTO SellerMileStone (user_id,mileStoneDesc)
      VALUES ('${userId}', '${milestone}')
    `);
    console.log("Result", result);
    if (result.rowsAffected.length > 0) {
      // send the newly created product in the response
      res.status(201).json({
        userId,
        milestone,
      });
    } else {
      // send the newly created product in the response
      res.status(400).json({
        message: "Data Not Inserted",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// @desc get user by ID
// @route GET /api/users/sellers/:id
// @access PRIVATE/ADMIN
const getSellerRecordById = async (req, res) => {
  try {
    await sql.connect(config);
    console.log("params ID", req.params.id);
    const result =
      await sql.query`SELECT * FROM SellerMileStone WHERE user_id = ${req.params.id}`;
    console.log(result);
    if (result.recordset.length) {
      const sellerRecord = result.recordset;
      res.json(sellerRecord);
    } else {
      res.status(404);
      throw new Error("Seller Record does not exist");
    }
  } catch (error) {
    res.status(500);
    throw new Error("Server error");
  } finally {
    sql.close();
  }
};

// @desc update data for an authenticated user
// @route PUT /api/users/profile
// @access PRIVATE
const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    await sql.connect(config);
    const userQuery = `SELECT * FROM Users WHERE id = '${req.user.id}'`;
    const userResult = await sql.query(userQuery);
    const user = userResult.recordset[0];

    if (user) {
      // update whichever field is sent in the req body
      const name = req.body.name || user.name;
      const avatar = req.body.avatar || user.avatar;
      const email = req.body.email || user.email;
      const isConfirmed = req.body.email === user.email ? 1 : user.isConfirmed;
      const password = req.body.password || user.password;
      const hashedPassword = await bcrypt.hash(password, 10);
      const updateUserQuery = `
        UPDATE Users SET name = '${name}', avatar = '${avatar}', email = '${email}', isConfirmed = '${isConfirmed}', password = '${hashedPassword}'
        WHERE id = '${user.id}'
      `;
      const updateResult = await sql.query(updateUserQuery);

      const updatedUserQuery = `SELECT * FROM Users WHERE id = '${user.id}'`;
      const updatedUserResult = await sql.query(updatedUserQuery);
      const updatedUser = updatedUserResult.recordset[0];

      // check if the current user logged in is with a social account, in which case do not create/find any access or refresh tokens
      const isSocialLogin =
        updatedUser.googleID ||
        updatedUser.linkedinID ||
        updatedUser.githubID ||
        updatedUser.twitterID;

      let updatedUserObj = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        isAdmin: updatedUser.isAdmin,
        isConfirmed: updatedUser.isConfirmed,
      };

      if (!isSocialLogin) {
        const refreshToken = generateToken(updatedUser.id, "refresh");
        const tokenQuery = `SELECT * FROM Tokens WHERE email = '${updatedUser.email}'`;
        const tokenResult = await sql.query(tokenQuery);
        const existingToken = tokenResult.recordset[0];

        // store a new refresh token for this email
        if (existingToken) {
          const updateTokenQuery = `UPDATE Tokens SET token = '${refreshToken}' WHERE email = '${updatedUser.email}'`;
          await sql.query(updateTokenQuery);
        } else {
          const createTokenQuery = `INSERT INTO Tokens (user, email, token) VALUES ('${updatedUser.id}', '${updatedUser.email}', '${refreshToken}')`;
          await sql.query(createTokenQuery);
        }

        // add these two token to the response
        updatedUserObj = {
          ...updatedUserObj,
          accessToken: generateToken(updatedUser.id, "access"),
          refreshToken,
        };
      }

      res.json(updatedUserObj);
    } else {
      res.status(400);
      throw new Error("User not found.");
    }
  } catch (err) {
    res.status(500);
    throw new Error("Server error");
  } finally {
    sql.close();
  }
});

export {
  authUser,
  getUserProfile,
  postContactExpert,
  getUserData,
  getAccessToken,
  registerUser,
  confirmUser,
  mailForEmailVerification,
  mailForPasswordReset,
  resetUserPassword,
  postSellerMileStone,
  updateUserProfile,
  getAllUsers,
  deleteUser,
  getUserById,
  getSellerRecordById,
  updateUser,
};
