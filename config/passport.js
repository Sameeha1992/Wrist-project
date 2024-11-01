const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/userSchema");
const env = require("dotenv").config();

// passport.use(
//   new GoogleStrategy(
//     {
//       clientID: process.env.GOOGLE_CLIENT_ID,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: process.env.GOOGLE_CALLBACK_URL,
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       console.log("in async profile===>", profile);
//       console.log("in async done===>", done);

//       try {
//         let user = await User.findOne({ googleId: profile.id });
//         if (user) {
//           return done(null, user);
//         } else {
//           user = await User.create({
//             name: profile.displayName,
//             email: profile.emails[0].value,
//             googleId: profile.id,
//           });
//           return done(null, user);
//         }
//       } catch (error) {
//         return done(error, null);
//       }
//     }
//   )
// );

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Find or create the user based on Google profile
    let user = await User.findOne({ googleId: profile.id });
    if (user) {
      return done(null, user);
    } else {
      user = await User.create({
        name: profile.displayName,
        email: profile.emails[0].value,
        googleId: profile.id,
      });
      return done(null, user);
    }
  } catch (error) {
    return done(error, null);
  }
}
));

passport.serializeUser((user, done) => {
  console.log("serializeUser====================> ", user);
  done(null, user._id); // Storing the user ID in the session
});

// Deserialize the user (find the user from the stored id in the session)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id); // Finding user by ID
    done(null, user); // Passing the user object to the next step
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
