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
                path: 'colorStock', // Populate the colorStock array
                model: 'ColorStock' // Ensure this matches your ColorStock model name
            }
        })
        .populate('categoryId')// Assuming you have a categoryId in your Cart schema
        .populate('colorStockId')
       console.log(cartDetails,"CARTDETAILSS")


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
        const userId = req.session.user; // Get the user ID from session
        const { selectedAddress, paymentMethod } = req.body; // Extract data from the request body

        console.log("User ID:", userId);
        console.log("Selected Address:", selectedAddress);
        console.log("Payment Method:", paymentMethod);

        // Fetch cart items directly from the Cart collection
        const cartItems = await Cart.find({ userId: userId })
            .populate({
                path: 'productId',
                select: 'productName salePrice productImage colorStock'
            })
            .populate({
                path: 'colorStockId',
                select: 'color'
            })
            .populate({
                path: 'categoryId',
                select: 'categoryName'
            });

        // If cart is empty, return an error response
        if (cartItems.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        // Find the selected shipping address from the user's profile
        const currentUser = await User.findById(userId);
        const shippingAddress = currentUser.address.find(
            addr => addr._id.toString() === selectedAddress
        );

        // If the address is invalid, return an error response
        if (!shippingAddress) {
            return res.status(400).json({ message: 'Invalid address selected' });
        }

        // Validate stock for each cart item and prepare the order items
        const orderItems = await Promise.all(cartItems.map(async (cartItem) => {
            const product = await Product.findById(cartItem.productId._id);
            const colorStock = product.colorStock.find(
                stock => stock._id.toString() === cartItem.colorStockId._id.toString()
            );

            // Check if there is sufficient stock for the selected color
            if (!colorStock || colorStock.quantity < cartItem.quantity) {
                throw new Error(`Insufficient stock for ${product.productName} in ${cartItem.colorStockId.color}`);
            }

            // Return the order item with product details
            return {
                productId: cartItem.productId._id,
                quantity: cartItem.quantity,
                color: colorStock.color, // Ensure color is assigned from colorStock
                price: cartItem.productId.salePrice,
                totalPrice: cartItem.productId.salePrice * cartItem.quantity
            };
        }));

        // Calculate the total order amount
        const totalAmount = orderItems.reduce((total, item) => total + item.totalPrice, 0);

        // Create a new order in the database
        const newOrder = new Order({
            userId,
            orderItem: orderItems,
            shippingAddress: `${shippingAddress.address_name}, ${shippingAddress.house_name}, ${shippingAddress.street_address}, ${shippingAddress.city}, ${shippingAddress.state}, ${shippingAddress.pincode}`,
            zip: shippingAddress.pincode,
            country: 'India', // Default to India
            phone: currentUser.phone || 'Not Provided',
            paymentMethod: paymentMethod || 'COD', // Default to COD if no payment method is provided
            orderStatus: 'Processing', // Initial status of the order
            totalAmount
        });

        // Save the order to the database
        const savedOrder = await newOrder.save();

        // Update product stock based on the order items
        for (let item of orderItems) {
            await Product.updateOne(
                { _id: item.productId, "colorStock._id": item.colorStockId },
                { $inc: { "colorStock.$.quantity": -item.quantity } }
            );
        }

        // Clear the user's cart and update order history
        await User.findByIdAndUpdate(
            userId,
            {
                $push: { orderHistory: savedOrder._id },
                $set: { cart: [] } // Empty the cart after the order is placed
            }
        );

        // Delete the cart items to prevent reordering
        await Cart.deleteMany({ userId: userId });

        // Respond with the success message and order ID
        res.status(201).json({
            message: 'Order placed successfully',
            orderId: savedOrder._id,
            paymentMethod:savedOrder.paymentMethod,
            order:savedOrder
        });

    } catch (error) {
        console.error("Error placing order:", error);
        res.status(400).json({
            message: "Order validation failed",
            error: error.message
        });
    }
};











module.exports = {
    LoadCheckout,
    placeOrder,
}