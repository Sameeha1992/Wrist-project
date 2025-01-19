const usermiddleware = require("../middlewares/auth");

const {userAuth,adminAuth} = require("../middlewares/auth");
const {isLogout} =require("../middlewares/auth");
const Order = require("../models/orderSchema");
const Razorpay = require('razorpay')



const express = require("express");
const user_router = express.Router();
const userController = require("../controllers/user/userController");
const profileController = require("../controllers/user/profileController");
const cartController = require("../controllers/user/cartController");
const checkoutController = require("../controllers/user/checkoutController")
const orderController = require("../controllers/user/orderController");
const wishlistController = require("../controllers/user/wishlistController")
const passport = require("passport");
const walletController = require("../controllers/user/walletController");
const userCouponController = require("../controllers/user/usercoupenController");
const orderItemReturnController = require("../controllers/user/orderItemReturnController");
const invoiceDownloadController = require("../controllers/user/invoiceDownloadController")


//Homepage
user_router.get("/",userAuth,userController.loadLandingPage);
user_router.get("/home",userAuth,userController.loadHomepage);
user_router.get("/shop",userAuth,userController.loadShoppingPage)



user_router.get("/signup",isLogout,userController.loadSignup);
user_router.post("/signup", userController.signup);

user_router.get("/login",isLogout,userController.loadLogin)
user_router.post("/login",userController.login)
user_router.get("/logout",userController.logout);
user_router.get("/verify-otp",isLogout, userController.getotp);
user_router.post("/verify-otp",isLogout, userController.verifyOtp);
user_router.post("/resend-otp",isLogout, userController.resendOtp);

user_router.get("/productDetails",userAuth,userController.loadProductDetail);



//Profile Management
user_router.get("/forget-password",isLogout,profileController. getForgetPassPage);
user_router.post("/forgot-email-valid",profileController.forgotEmailValid);
user_router.post('/verify-passForgot-otp',profileController.verifyForgotPassOtp);
user_router.get("/reset-password",isLogout,profileController.getResetPassPage);
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

//return order:-

user_router.post("/returnOrder",userAuth,orderItemReturnController.itemReturnRequest)



//Address management:-
user_router.get("/userAddress",userAuth,profileController. loadAddressPage);
user_router.post("/addaddress",userAuth,profileController.addAddress);
user_router.put("/updateaddress/:id",userAuth,profileController. updateAddress)
user_router.delete("/deleteaddress",userAuth,profileController.deleteAddress)



//Wishlist Management:-
user_router.get("/getWishlist",userAuth,wishlistController.getWishlistPage);
user_router.post("/addToWishlist",userAuth,wishlistController.addToWishlist);
user_router.post("/remove-from-wishlist",userAuth,wishlistController.removeFromWishlist);



// Wallet management:-

user_router.get("/getWallet",userAuth,walletController. getWallet);


//Coupon Management:-

user_router.post('/apply-coupon',userAuth,userCouponController.coupenApply);
user_router.post("/removeCoupons",userAuth,userCouponController.removeCoupon)





//Payment Integration:-

user_router.post("/create-razorpay-order",userAuth,orderController.paymentOrder);
user_router.post("/verify-payment",userAuth,checkoutController.placeOrder)
user_router.post("/failedOrder",userAuth,checkoutController.razorpayFailedPayment)



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



user_router.post('/retry-payment',async (req,res)=>{

  const {pendingOrderId} = req.body;
  console.log(pendingOrderId,"pending order")

  try {

     const pendingOrder = await Order.findById(pendingOrderId).populate('orderItem.productId');
     console.log(pendingOrder,"pendingg orderIddddd");

     if(!pendingOrder || pendingOrder.orderStatus !== 'Failed') {

      return res.status(400).json({error: 'Order not found or not eligible for retry'})
     }


     // recreation of razorpay ordersss:-

     const razorpay = new Razorpay({

      key_id:process.env.RAZORPAY_KEYID,
      key_secret:process.env.RAZORPAY_KEYSECRET

     })

     const options ={

      amount: pendingOrder.totalAmount *100,
      currency: 'INR',
      receipt: pendingOrder._id.toString(),
      
     };

     const razorpayOrder = await razorpay.orders.create(options);

     pendingOrder.razorpayOrderId = razorpayOrder._id;
     await pendingOrder.save();

     return res.status(200).json({
      status: 'ok',
      razorpayOrderId: razorpayOrder.id,
      key: process.env.RAZORPAY_KEYID,
      amount: options.amount,
      currency: options.currency,
      orderId: pendingOrder._id
     })
    
  } catch (error) {
    res.status(400).send('Not able to create order. Please try again!')
    
  }
})



user_router.get("/invoiceDownload/:orderId/:itemId", invoiceDownloadController.downloadInvoice);


module.exports = user_router;
