const usermiddleware = require("../middlewares/auth");

const {userAuth,adminAuth} = require("../middlewares/auth");



const express = require("express");
const user_router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController")
const passport = require("passport");


//Homepage
user_router.get("/",userController.loadLandingPage);
user_router.get("/home",userController.loadHomepage);
user_router.get("/shop",userController.loadShoppingPage)



user_router.get("/signup",userController.loadSignup);
user_router.post("/signup", userController.signup);

user_router.get("/login",usermiddleware.isLogout,userController.loadLogin)
user_router.post("/login",userController.login)
user_router.get("/logout",userController.logout);
user_router.get("/verify-otp", userController.getotp);
user_router.post("/verify-otp", userController.verifyOtp);
user_router.post("/resend-otp", userController.resendOtp);

user_router.get("/productDetails",userController.loadProductDetail);


//Profile Management
user_router.get("/forget-password",profileController. getForgetPassPage);
user_router.post("/forgot-email-valid",profileController.forgotEmailValid);
user_router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp);
user_router.post("/resentForgetOtp",userAuth,profileController.resendForgetOtp)
user_router.get("/reset-password",userAuth,profileController.getResetPassPage);
user_router.post("/reset-password",userAuth,profileController. postNewPassword)


//Porfie Management
user_router.get("/userProfile",userAuth,profileController.userProfile);
user_router.post("/update-profile",userAuth,profileController.updateProfile);
user_router.get("/changePassword",userAuth,profileController.changePassword);
user_router.post("/changePassword",userAuth,profileController.changePasswordValid);





//Cart Management:-

user_router.get("/cart",userAuth,cartController.loadCart);
user_router.post("/addToCart",userAuth,cartController.addtoCart)

//Address management:-
user_router.get("/userAddress",userAuth,profileController. loadAddressPage);
user_router.post("/addaddress",userAuth,profileController.addAddress)
user_router.delete("/deleteaddress",userAuth,profileController.deleteAddress)
// user_router.post("/update-address",userAuth,profileController.updateAddress);





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
    return res.redirect("/");
  }
);




module.exports = user_router;
