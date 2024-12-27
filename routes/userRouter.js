const usermiddleware = require("../middlewares/auth");

const {userAuth,adminAuth} = require("../middlewares/auth");



const express = require("express");
const user_router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController")
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController")
const passport = require("passport");


//Homepage
user_router.get("/",userAuth,userController.loadLandingPage);
user_router.get("/home",userController.loadHomepage);
user_router.get("/shop",userController.loadShoppingPage)



user_router.get("/signup",userController.loadSignup);
user_router.post("/signup", userController.signup);

user_router.get("/login",userController.loadLogin)
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
user_router.get("/reset-password",profileController.getResetPassPage);
user_router.post("/resend-forgot-otp",profileController.resendOtp)
user_router.post("/reset-password",profileController. postNewPassword)


//Porfie Management
user_router.get("/userProfile",userAuth,profileController.userProfile);
user_router.post("/update-profile",userAuth,profileController.updateProfile);
user_router.get("/changePassword",userAuth,profileController.changePassword);
user_router.post("/changePassword",userAuth,profileController.changePasswordValid);





//Cart Management:-

user_router.get("/cart",userAuth,cartController.loadCart);
user_router.post("/addcart",userAuth,cartController.addToCart);
user_router.post("/updateCartQuantity",userAuth,cartController.updateCartQuantity)
user_router.delete("/deleteCart",userAuth,cartController.deleteCart)


//Checkout Management:-

user_router.get("/checkout",userAuth,checkoutController.LoadCheckout);
user_router.post("/place-order",userAuth,checkoutController.placeOrder)
user_router.get("/orderSuccess",userAuth,checkoutController.successOrder)


//Order Management:-

user_router.get("/orders",userAuth,orderController.loadOrderPage);
user_router.get("/view-order/:id",userAuth,orderController.viewOrderDetails);
user_router.post("/cancel-order/:orderId/:itemId",userAuth,orderController.cancelOrder);



//Address management:-
user_router.get("/userAddress",userAuth,profileController. loadAddressPage);
user_router.post("/addaddress",userAuth,profileController.addAddress);
user_router.put("/updateaddress/:id",userAuth,profileController. updateAddress)
user_router.delete("/deleteaddress",userAuth,profileController.deleteAddress)



//Wishlist Management:-
user_router.get("/getWishlist",userAuth,wishlistController.getWishlistPage);
user_router.post("/addToWishlist",userAuth,wishlistController.addToWishlist);
user_router.post("/remove-from-wishlist",userAuth,wishlistController.removeFromWishlist);



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
