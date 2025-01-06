const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose')
const Razorpay = require('razorpay');
require("dotenv").config();
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEYID,
    key_secret:process.env.RAZORPAY_KEYSECRET
})



const LoadCheckout = async(req,res)=>{
    try {
        const userId = req.session.user;
        const user = await User.findOne({_id:userId});


        const cartDetails = await Cart.find({ userId: user._id })
        .populate({
            path: 'productId',
            populate: {
                path: 'colorStock',
                model: 'ColorStock' 
            }
        })
        .populate('categoryId')
        .populate('colorStockId')
      
        const blockedProducts = cartDetails.filter(cartItem => cartItem.productId.isBlocked)
        const filteredCartDetails = cartDetails.filter(cartItem => !cartItem.productId.isBlocked);

        if(blockedProducts.length > 0){
            return res.redirect("/cart")
        }


        res.render("checkout",{
            cart: filteredCartDetails,
            address:user.address,
            user:user,
            blockedProducts: blockedProducts || [] 
        })
        
    } catch (error) {
        console.error(error.message);
        res.status(500).render(500)
        
    }
}

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user; 
        const { orderItem,selectedAddress, paymentMethod,razorpay_order_id,razorpay_payment_id,razorpay_signature } = req.body;
   
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
        

       
        
       
        const totalAmount = orderItems.reduce((total, item) => total + item.totalPrice, 0);
        if(isNaN(totalAmount)){
            return res.status(400).json({message:'Invalid total amount'})
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
                return res.json({success:false,message: "Payment verification failed"})
            } 
           


        }

        if(paymentMethod === "COD"){
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
            totalAmount
        });

        
       
        const savedOrder = await newOrder.save();
        

        
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
}