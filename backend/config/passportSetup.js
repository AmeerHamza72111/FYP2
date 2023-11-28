import passport from "passport";
import dotenv from "dotenv";
import User from "../models/userModel.js";
import generateGravatar from "../utils/generateGravatar.js";

// all passport strategies
import GoogleStrategy from "passport-google-oauth20";
import GithubStrategy from "passport-github2";
import TwitterStrategy from "passport-twitter";
import LinkedInStrategy from "passport-linkedin-oauth2";

// to use .env variables in this file
dotenv.config();
const backendURL = process.env.BACKEND_BASE_URL;

// Funtion to send a flash message depending on which social account the user had originally registered with
const handleAuthError = (err, done) => {
  // Get the email from the option the user is currently trying to login with, and find the corresponding User obj
  const email = err.keyValue.email; // err obj returned from mongoose has the keyValue key
  const pool = new sql.ConnectionPool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
      encrypt: true,
      trustServerCertificate: true,
    },
  });

  pool
    .connect()
    .then(() => {
      const request = new sql.Request(pool);
      request.input("email", sql.NVarChar(255), email);
      request
        .query("SELECT * FROM Users WHERE email = @email")
        .then((result) => {
          const user = result.recordset[0];
          // Check which socialID was stored in this User obj, return the corresponding error in format
          // done(null, false, {flash message}) -> which tells passport not to serialise this user
          if (user.googleID) {
            done(null, false, { message: "Registered using google account" });
          } else if (user.githubID) {
            done(null, false, { message: "Registered using github account" });
          } else if (user.twitterID) {
            done(null, false, { message: "Registered using twitter account" });
          } else if (user.linkedinID) {
            done(null, false, { message: "Registered using linkedin account" });
          }
        })
        .catch((err) => {
          console.error(err);
          done(err);
        })
        .finally(() => {
          pool.close();
        });
    })
    .catch((err) => {
      console.error(err);
      done(err);
    });
};

// Include all passport strategies' setup in this function itself
const setupPassport = () => {
  // setup a session with the logged in user, by serialising this user is
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  // end the current login session after deserialising the user
  passport.deserializeUser((id, done) => {
    const pool = new mssql.ConnectionPool(dbConfig);
    pool.connect().then(() => {
      const request = new mssql.Request(pool);
      request
        .input("id", id)
        .query("SELECT * FROM Users WHERE id = @id")
        .then((result) => {
          if (result.recordset.length > 0) {
            done(null, result.recordset[0]);
          } else {
            done(null, false);
          }
          pool.close();
        })
        .catch((err) => {
          console.log(`${err}`.bgRed.bold);
          pool.close();
        });
    });
  });

  // setup for the google strategy
  passport.use(
    new GoogleStrategy(
      {
        // options for the google strategy
        clientID: process.env.GOOGLE_OAUTH_CLIENT_ID,
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
        callbackURL: `${backendURL}/api/auth/google/redirect`,
      },
      (accessToken, refreshToken, profile, done) => {
        // if a user with this google ID is present, serialise that user, otherwise create a new User
        User.findOne({ googleID: profile.id }).then((foundUser) => {
          if (!foundUser) {
            User.create({
              name: profile.displayName,
              isAdmin: false,
              isConfirmed: profile._json.email_verified,
              googleID: profile.id,
              email: profile._json.email,
              avatar: generateGravatar(profile._json.email), // gravatar is unique for all email IDs
            })
              .then((user) => {
                done(null, user);
              })
              .catch((err) => {
                // In case the User couldn't be created, this means that the email key was duplicate
                // Which implies that the current email has already been registered using some different social account
                // So throw the corresponding flash message
                handleAuthError(err, done);
              });
          } else {
            done(null, foundUser);
          }
        });
      }
    )
  );
  // setup for the github strategy
  passport.use(
    new GithubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: `${backendURL}/api/auth/github/redirect`,
      },
      (accessToken, refreshToken, profile, done) => {
        connection
          .connect()
          .then(() => {
            const request = new sql.Request(connection);
            request.input("githubID", sql.VarChar, profile.id);
            request
              .query("SELECT * FROM Users WHERE githubID = @githubID")
              .then((result) => {
                if (result.recordset.length > 0) {
                  done(null, result.recordset[0]);
                } else {
                  const name = profile.displayName;
                  const isAdmin = false;
                  const isConfirmed = !!profile._json.email;
                  const githubID = profile.id;
                  const avatar = generateGravatar(profile._json.email);
                  const email = profile._json.email;

                  request.input("name", sql.VarChar, name);
                  request.input("isAdmin", sql.Bit, isAdmin);
                  request.input("isConfirmed", sql.Bit, isConfirmed);
                  request.input("githubID", sql.VarChar, githubID);
                  request.input("avatar", sql.VarChar, avatar);
                  request.input("email", sql.VarChar, email);

                  request
                    .query(
                      "INSERT INTO Users (name, isAdmin, isConfirmed, githubID, avatar, email) VALUES (@name, @isAdmin, @isConfirmed, @githubID, @avatar, @email)"
                    )
                    .then(() => {
                      done(null, {
                        name,
                        isAdmin,
                        isConfirmed,
                        githubID,
                        avatar,
                        email,
                      });
                    })
                    .catch((err) => {
                      handleAuthError(err, done);
                    });
                }
              })
              .catch((err) => {
                done(err);
              })
              .finally(() => {
                connection.close();
              });
          })
          .catch((err) => {
            done(err);
          });
      }
    )
  );
};

// setup for the twitter strategy
passport.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: `${backendURL}/api/auth/twitter/redirect`,
      includeEmail: true,
    },
    (accessToken, refreshToken, profile, done) => {
      const pool = new sql.ConnectionPool(config);

      pool
        .connect()
        .then(() => {
          const request = pool.request();

          request
            .query(`SELECT * FROM Users WHERE twitterID = '${profile.id}'`)
            .then((result) => {
              if (result.recordset.length === 0) {
                request
                  .query(
                    `INSERT INTO Users (name, isAdmin, isConfirmed, twitterID, email, avatar) 
              VALUES ('${profile.displayName}', 'false', 'true', '${
                      profile.id
                    }', '${profile._json.email}', '${generateGravatar(
                      profile._json.email
                    )}')`
                  )
                  .then(() => {
                    done(null, {
                      name: profile.displayName,
                      isAdmin: false,
                      isConfirmed: true,
                      twitterID: profile.id,
                      email: profile._json.email,
                      avatar: generateGravatar(profile._json.email),
                    });
                  })
                  .catch((err) => {
                    handleAuthError(err, done);
                  });
              } else {
                done(null, {
                  name: result.recordset[0].name,
                  isAdmin: result.recordset[0].isAdmin,
                  isConfirmed: result.recordset[0].isConfirmed,
                  twitterID: result.recordset[0].twitterID,
                  email: result.recordset[0].email,
                  avatar: result.recordset[0].avatar,
                });
              }
            })
            .catch((err) => {
              handleAuthError(err, done);
            });
        })
        .catch((err) => {
          handleAuthError(err, done);
        });
    }
  )
);

// setup for the linkedin strategy
// passport.use(
//   new LinkedInStrategy(
//     {
//       clientID: process.env.LINKEDIN_CLIENT_ID,
//       clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
//       callbackURL: `${backendURL}/api/auth/linkedin/redirect`,
//       scope: ["r_emailaddress", "r_liteprofile"],
//       state: true,
//     },
//     (accessToken, refreshToken, profile, done) => {
//       const pool = new sql.ConnectionPool(config);
//       pool
//         .connect()
//         .then(() => {
//           const request = new sql.Request(pool);
//           request
//             .input("linkedinID", sql.VarChar(255), profile.id)
//             .query("SELECT * FROM Users WHERE linkedinID = @linkedinID")
//             .then((result) => {
//               if (result.recordset.length === 0) {
//                 request
//                   .input("displayName", sql.VarChar(255), profile.displayName)
//                   .input("email", sql.VarChar(255), profile.emails[0].value)
//                   .input(
//                     "avatar",
//                     sql.VarChar(255),
//                     generateGravatar(profile.emails[0].value)
//                   )
//                   .query(
//                     "INSERT INTO Users (name, isAdmin, isConfirmed, linkedinID, email, avatar) VALUES (@displayName, 0, 1, @linkedinID, @email, @avatar)"
//                   )
//                   .then(() => {
//                     done(null, {
//                       linkedinID: profile.id,
//                       name: profile.displayName,
//                       email: profile.emails[0].value,
//                       isAdmin: false,
//                       isConfirmed: true,
//                       avatar: generateGravatar(profile.emails[0].value),
//                     });
//                   })
//                   .catch((err) => {
//                     console.error(err);
//                     done(err, null);
//                   });
//               } else {
//                 done(null, result.recordset[0]);
//               }
//             })
//             .catch((err) => {
//               console.error(err);
//               done(err, null);
//             });
//         })
//         .catch((err) => {
//           console.error(err);
//           done(err, null);
//         });
//     }
//   )
// );

export default setupPassport;
