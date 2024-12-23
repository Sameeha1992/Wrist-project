const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose')

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
      


        res.render("checkout",{
            cart: cartDetails,
            address:user.address,
            user:user
        })
        
    } catch (error) {
        console.error(error.message);
        res.status(500).render(500)
        
    }
}

const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user; 
        const { orderItem,selectedAddress, paymentMethod } = req.body;

       

       
        const cartItems = await Cart.find({ userId: userId })
            .populate({
                path: 'productId',
                select: 'productName salePrice productImage colorStock'
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

       
        
        const currentUser = await User.findById(userId);
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
                throw new Error(`Color variant not found for product ${product.productName}`);
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
                colorStockId: cartItem.colorStockId._id // Adding this to ensure all required fields are present
            };

          
        }));
        

       
        
       
        const totalAmount = orderItems.reduce((total, item) => total + item.totalPrice, 0);
        if(isNaN(totalAmount)){
            return res.status(400).json({message:'Invalid total amount'})
        }


        
        
        const newOrder = new Order({
            userId,
            orderItem: orderItems,
            shippingAddress: `${shippingAddress.address_name}, ${shippingAddress.house_name}, ${shippingAddress.street_address}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}`,
            zip: shippingAddress.pincode,
            country: 'India', 
            phone: currentUser.phone || 'Not Provided',
            paymentMethod: paymentMethod || 'COD', 
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