const usermiddleware = require("../middlewares/auth");


const express = require("express");
const user_router = express.Router();
const userController = require("../controllers/user/userController");
const passport = require("passport");

user_router.get("/",  userController.loadLandingPage);
user_router.get("/home",  userController.loadHomepage);


user_router.get("/signup",userController.loadSignup);
user_router.post("/signup", userController.signup);

user_router.get("/login",userController.loadLogin)
user_router.post("/login",userController.login)

user_router.get("/verify-otp", userController.getotp);
user_router.post("/verify-otp", userController.verifyOtp);
user_router.post("/resend-otp", userController.resendOtp);



user_router.get("/auth/google",
  passport.authenticate('google', { scope: ['profile', 'email'], prompt : 'select_account' })
);
user_router.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/signup" }),
  (req, res) => {
    req.session.user = req.user;
    console.log(req.isAuthenticated());
    console.log("here");
    req.session.user = req.user._id;
    return res.redirect("/home");
  }
);




module.exports = user_router;
