const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/coupenSchema")
const mongoose = require('mongoose')
const Razorpay = require('razorpay');
const Wallet = require("../../models/walletSchema");
const AppliedCoupen = require("../../models/coupenAppliedSchema");
const generateOrderId = require("../../utils/generateOrderId")
require("dotenv").config();
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEYID,
    key_secret:process.env.RAZORPAY_KEYSECRET
})



const LoadCheckout = async(req,res)=>{
    
        const userId = req.session.user;
        const user = await User.findOne({_id:userId});

  try{
        // const cartDetails = await Cart.find({ userId: user._id })
        // .populate({
        //     path: 'productId',
        //     populate: {
        //         path: 'colorStock',
        //         model: 'ColorStock' 
        //     }
        // })
        // .populate('categoryId')
        // .populate('colorStockId')


        const [userData,cart,coupons,usedCoupons]= await Promise.all([
            User.findById(userId),
            Cart.find({userId})
            .populate({
                path:'productId',
                populate: {
                    path: 'colorStock',
                    model: 'ColorStock'
                }
            })
            .populate('categoryId')
            .populate('colorStockId'),
            Coupon.find({isActive: true}).sort({createdAt:-1}),
            AppliedCoupen.find({userId}).select('couponId')
        ])
      
        const usedCouponIds =usedCoupons.map(uc=> uc.couponId.toString());

       
        
        

        const wallet = await Wallet.findOne({userId})
        if(wallet){
            var walletAmount = wallet.walletBalance || 0;
        }

        let totalSavings = 0;
        let totalAmount = 0;
        let discountAmount =0;
        const validCartItems = [];
        for(const item of cart) {
            const product = item.productId;

            if(!product.isBlocked && !product.brand.isBlocked && !product.category.isListed){
                validCartItems.push(item);

                const savingsPerItem = (product.regularPrice - product.salePrice) * item.quantity;
               
                totalSavings+= Math.max(savingsPerItem,0);

                totalAmount +=product.salePrice * item.quantity;
           
                
            } 
           
        }

        const grandTotal = totalAmount - discountAmount;

        const blockedProducts = cart.filter(cartItem => cartItem.productId.isBlocked)
        
        

        const availableCoupons = coupons.filter(coupon=> {
            const isExpired = new Date(coupon.expiryDate) < new Date();
            const isUsageLimitReached = coupon.usedCount >= coupon.usageLimit;
            const isAlreadyUsed = usedCouponIds.includes(coupon._id.toString());
            return !isExpired && !isUsageLimitReached && !isAlreadyUsed
        })

     
        if(blockedProducts.length > 0){
            return res.redirect("/cart")
        }



        

       

        res.render("checkout",{
            cart: validCartItems,
            address:userData.address,
            user:userData,
            totalAmount,
            grandTotal,
            discountAmount,
            totalSavings,
            coupons: availableCoupons,
            blockedProducts: blockedProducts || [],
            coupons: coupons,
            wallet,
            walletAmount


        })
        
    } catch (error) {
        console.error(error.message);
        res.status(500).render(500)
        
    }
}

const placeOrder = async (req, res) => {
    try {
        let userId = req.session.user; 

        if(!mongoose.Types.ObjectId.isValid(userId)){
            console.log("Invalid user id format");
            return res.status(400).json({message: "Invalid user id"})
            
            
        }

        userId = new mongoose.Types.ObjectId(userId);


      
        const { orderItem,selectedAddress, paymentMethod,razorpay_order_id,razorpay_payment_id,razorpay_signature,couponInput,pendingOrderId} = req.body;

       
        if(pendingOrderId && paymentMethod==='Razorpay'){
            const existingOrder = await Order.findById(pendingOrderId);

            if(!existingOrder){
                return res.status(404).json({message:'Pending order not found'});
            }

            if(existingOrder.userId.toString() !== userId.toString()){
                return res.status(403).json({message:"Unauthorized access to order"})
            }


             // Verify Razorpay signature
             if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({message: "Missing razorpay payment details"})
            }

            const secretKey = process.env.RAZORPAY_KEYSECRET;
            const generate_signature = crypto
                .createHmac('sha256', secretKey)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if(generate_signature !== razorpay_signature){
                return res.json({success: false, message: "Payment verification failed"})
            }

            // Update the pending order
            const updatedOrder = await Order.findOneAndUpdate(
                { _id: pendingOrderId },
                { 
                    $set: {
                        orderStatus: 'Processing',
                        paymentMethod: 'Razorpay',
                        'paymentDetails.razorpay_order_id': razorpay_order_id,
                        'paymentDetails.razorpay_payment_id': razorpay_payment_id,
                        'paymentDetails.razorpay_signature': razorpay_signature
                    }
                },
                { new: true }
            );

            return res.status(200).json({
                success: true,
                message: "Your pending order has been successfully processed",
                order: updatedOrder
            });
        }
        
   
       
        const cartItems = await Cart.find({ userId: userId })
            .populate({
                path: 'productId',
                select: 'productName salePrice productImage colorStock isBlocked'
            })
            .populate({
                path: 'colorStockId',
                select: 'color quantity status'
            })
            .populate({
                path: 'categoryId',
                select: 'categoryName'
            });


        
           
          
       
        if (cartItems.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }


        const blockedProducts = cartItems.filter(item => item.productId.isBlocked);

        if(blockedProducts.length >0){
            return res.status(400).json({message: "Some products in your cart are blocked by admin and cannot be purchased"})
        }

       
        
        const currentUser = await User.findById(userId);

        if(! currentUser){
            return res.status(404).json({message: 'User not found'})
        }
        const shippingAddress = currentUser.address.find(
            addr => addr._id.toString() === selectedAddress
        );

        

       
        
        if (!shippingAddress) {
            return res.status(400).json({ message: 'Invalid address selected' });
        }

       
        
        const orderItems = await Promise.all(cartItems.map(async (cartItem) => {
            const product = await Product.findById(cartItem.productId._id);

            if(!product){
                throw new Error(`Product not found: ${cartItem.productId._id}`);
            }
            const colorStock = product.colorStock.find(
                stock => stock._id.toString() === cartItem.colorStockId._id.toString()
            );

            if (!colorStock) {
                throw new Error(`Product not found ${product.productName}`);
            }

           
            if (!colorStock || colorStock.quantity < cartItem.quantity) {
                throw new Error(`Insufficient stock for ${product.productName} in ${cartItem.colorStockId.color}`);
            }


            const remainingStock = colorStock.quantity - cartItem.quantity;
            const stockStatus = remainingStock === 0 ? 'Out_of_Stock' : 
                              remainingStock < 5 ? 'low_stock' : 'Available';

                 
                              
                   await Product.updateOne(
                           { 
                                    _id: product._id,
                                    'colorStock._id': colorStock._id 
                                },
                                { 
                                    $set: { 
                                        'colorStock.$.status': stockStatus
                                    }
                                }
                            );              

            return{
                productId: cartItem.productId._id,
                quantity: cartItem.quantity,
                color: colorStock.color, 
                price: cartItem.productId.salePrice,
                totalPrice: cartItem.productId.salePrice * cartItem.quantity,
                colorStockId: cartItem.colorStockId._id 
            };

          
        }));
        

       
        
       
        let totalAmount = orderItems.reduce((total, item) => total + item.totalPrice, 0);
        if(isNaN(totalAmount)){
            return res.status(400).json({message:'Invalid total amount'})
        }

        //Coupon Updating:-

        let coupon = null;
        let discount =0;

        
        if (couponInput) {
            coupon = await Coupon.findOne({code: couponInput, isActive: true});
            
            if (!coupon) {
                return res.status(400).json({message: "Invalid or inactive coupon code"});
            }

            if (coupon.expiryDate < new Date()) {
                return res.status(400).json({message: "This coupon has expired"});
            }

            const existingCoupon = await AppliedCoupen.findOne({
                userId: userId,
                couponId: coupon._id
            });

            if (existingCoupon) {
                return res.status(400).json({message: "This coupon has already been used"});
            }

            discount = coupon.minDiscountValue;
            totalAmount = totalAmount - discount;
        }


        if(paymentMethod === 'Razorpay'){

            if(!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return res.status(400).json({message: "Missing razorpay payment details"})
            }

            const secretKey = process.env.RAZORPAY_KEYSECRET;
            console.log("secret key",secretKey)

            const generate_signature = crypto
            .createHmac('sha256',secretKey)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

            if(generate_signature !==razorpay_signature){
                console.log('retru psymrnt funvtion ')
                return res.json({success:false,message: "Payment verification failed"})
            } 


           


        }
       


      

        if(paymentMethod==='Wallet'){
            const wallet=await Wallet.findOne({userId});
            

            if(!wallet){
                return res.status(400).json({message:"Wallet not found for the user"});

            }

            if(wallet.walletBalance < totalAmount){
                return res.status(400).json({message:"Insufficient wallet balance"})
            }

            wallet.walletBalance -= totalAmount;
            

            wallet.transactions.push({
                transactionType:'debit',
                transactionAmount: totalAmount,
                transactionDescription:'Order Payment',

            })

            await wallet.save();

        }
        

        else if(paymentMethod === "COD"){
            console.log("Processing cash on delivery order")
        }


        
        const newOrder = new Order({
            userId,
            orderItem: orderItems,
            shippingAddress: `${shippingAddress.address_name}, ${shippingAddress.house_name}, ${shippingAddress.street_address}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}`,
            zip: shippingAddress.pincode,
            country: 'India', 
            phone: currentUser.phone || 'Not Provided',
            paymentMethod: paymentMethod,
            orderStatus: 'Processing', 
            totalAmount,
            couponDiscount: discount
        });

        
       
        const savedOrder = await newOrder.save()
        
       
        console.log(savedOrder,"saved order ");

        

        
        for (let item of orderItems) {
           const updated= await Product.updateOne(
                { _id: item.productId, "colorStock._id": item.colorStockId },
                { $inc: { "colorStock.$.quantity": -item.quantity } }
            );
       

            if(updated.modifiedCount ===0) {
                throw new Error(`Failed to update stock for ${item.productId}`);
            }
        }

        
        await User.findByIdAndUpdate(
            userId,
            {
                $push: { orderHistory: savedOrder._id },
                $set: { cart: [] } 
            }
        );

       

        await Cart.deleteMany({ userId: userId });

        if(couponInput){
            const appliedCoupon = new AppliedCoupen({
                userId,
                couponId:coupon._id,
                orderId:savedOrder._id,
                redeemedAt:new Date()

            });

            await appliedCoupon.save();
            
        }




        return res.status(200).json({
            success: true,
            message: "Your order has been successfully placed"
        });


    } catch (error) {
        console.error("Error placing order:", error);
            return res.status(400).json({
                success:false,
                message: error.message || "Failed to place order"
               
            }); 
        
    }
};


const razorpayFailedPayment = async(req,res)=>{
    const {cartItems,selectedAddress,paymentMethod,amount,discountAmount,couponInput,grandTotal,razorpay_payment_id,razorpay_order_id} = req.body;

    console.log(req.body,"this is the req.body of the failed ordersssss")
   
   
    try {

        const userId = req.session.user

        console.log(userId,"userId of the faied orderr")
    
    
        const user = await User.findById(userId);
        console.log(user,"this is the failed user")

       const addressDetails = user.address.find(addre =>addre._id.toString()===selectedAddress);
    //    console.log(addressDetails,'addressDetails')

    console.log(cartItems,"cartItemsss")

       if(!addressDetails){
        return res.status(400).json({status: "error",message:"Invalid address provided..!"})
       }
        

       const transformedOrderItems = cartItems.map((item)=>({
        productId: item.productId,
        quantity: item.quantity,
        color: item.color,
        price: item.price,
        totalPrice: item.price * item.quantity,
        itemStatus: "Processing"
       

       }));

       console.log(transformedOrderItems,'transformedOrderItems')

       const failOrder = await Order.create({
        userId,
        orderId: generateOrderId (),
        orderItem:transformedOrderItems,
        shippingAddress: addressDetails.street_address,
        zip: addressDetails.pincode.toString(),
        country: "India",
        phone: addressDetails.phone.toString(),
        orderStatus: 'Failed',
        paymentMethod:'Razorpay',
        paymentStatus: 'Failed',
        totalAmount: parseFloat(amount),
        totalDiscount: parseFloat(discountAmount) || 0,
        couponDiscount: parseFloat(discountAmount) || 0,
        appliedCouponCode: couponInput || null,
        razorpay: {
            orderId: razorpay_order_id,
                paymentId: razorpay_payment_id,
                failureTimestamp: new Date(),
                failureDetails: req.body // Store complete failure detail
        }

       });
       

      await failOrder.save()

        // Log the failure for monitoring
        console.log(`Payment failed for order ${failOrder}`, {
            userId,
            razorpay_order_id,
            razorpay_payment_id,
            amount
        });


      res.status(200).json({
        status: "success",
        message: "Failed order has been recorded",
        orderId: failOrder.orderId,

        failureDetails: {
            timestamp: new Date(),
            orderId: failOrder.orderId,
            paymentId: razorpay_payment_id
        }
    });
        
    } catch (error) {

        console.error('Error in razorpayFailedPayment:', error);
        res.status(500).json({
            status: "error",
            message: "Failed to save order details",
            error: error.message
        });

        return res.status(500).json({
            status: "error",
            message: "Failed to save order details",
            error: error.message
        });

        
    }
}





const successOrder = async(req,res)=>{
    try {
       
        res.status(200).render("orderSuccess")
        
    } catch (error) {
        console.error("Error occured while order success",error)
        
    }
}












module.exports = {
    LoadCheckout,
    placeOrder,
    successOrder,
    razorpayFailedPayment
}