import jwt from "jsonwebtoken";
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import sql from "mssql";
import config from "../config/dbconfig.js";

const protectRoute = asyncHandler(async (req, res, next) => {
  let token;

  // if the header includes a Bearer token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // get only the token string
      token = req.headers.authorization.split(" ")[1];

      // decode the token to get the corresponding user's id
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_ACCESS_TOKEN_SECRET
      );

      // fetch that user from db, but not get the user's password and set this fetched user to the req.user
      const pool = await sql.connect(config);
      const result = await pool
        .request()
        .input("userId", decodedToken.id)
        .query(
          "SELECT id, email, name, avatar, isAdmin, isConfirmed FROM Users WHERE id = @userId"
        );
      req.user = result.recordset[0];
      next();
    } catch (error) {
      console.log(error);
      res.status(401);
      throw new Error("Not authorised. Token failed");
    }
  }
  // if the header includes a token for social login case
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("SocialLogin")
  ) {
    const id = req.headers.authorization.split(" ")[1];
    const pool = await sql.connect(config);
    const result = await pool
      .request()
      .input("id", id)
      .query(
        "SELECT id, email, name, avatar, isAdmin, isConfirmed FROM Users WHERE id = @id"
      );
    sql.close();
    req.user = result.recordset[0];
    token = id;
    next();
  }

  if (!token) {
    res.status(401);
    throw new Error("Not authorized, no token available");
  }
});

const isAdmin = (req, res, next) => {
  if (req.user && req.user.isAdmin) next();
  else {
    res.status(401);
    throw new Error("Not authorised admin");
  }
};

export { protectRoute, isAdmin };
