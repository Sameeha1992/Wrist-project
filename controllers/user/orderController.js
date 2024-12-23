const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
require("dotenv").config();
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id:process.env.RAZORPAY_KEYID,
    key_secret:process.env.RAZORPAY_KEYSECRET
})


const loadOrderPage = async(req,res)=>{
    try {
        const userId = req.session.user;
        if(!userId){
            return res.redirect("/login")
        }
     
        const orders = await Order.find({userId:userId})
        .populate({
            path:'orderItem.productId',
            select:"productName"
        })
        .select('orderId orderStatus totalAmount createdAt')
        .sort({createdAt:-1});

      


        

        const newDate =(date)=>{return new Date(date)};

        res.render("orders",{
            orders,
            newDate,
            
            
           
        });

        
        
        
    } catch (error) {
        console.error("Error in loading the orderPage",error);
        res.status(500).render("500")
        
    }
}



const viewOrderDetails = async (req,res)=>{
    try {
        const orderId = req.params.id;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id:orderId,
            userId:userId
        }).populate({
            path:'orderItem.productId',
            select:'productName productImage salePrice'
        });

        if(!order){
            return res.status(404).render('404')
        }

        const items = order.orderItem.map(item =>({
            _id:item._id,
            name:item.productId.productName,
            Image:item.productId.productImage,
            color:item.color,
            price:item.price || item.productId.salePrice,
            quantity:item.quantity,
            totalPrice:item.totalPrice,
            itemStatus:item.itemStatus
        }))

        const orderData = {
            _id: order._id,
            createdAt: order.createdAt,
            orderStatus: order.orderStatus,
            shippingAddress: order.shippingAddress,
            paymentMethod: order.paymentMethod,
            subtotal: items.reduce((acc, item) => acc + item.price * item.quantity, 0),
            total: order.totalAmount || items.reduce((acc, item) => acc + item.price * item.quantity, 0),
            items 
        };

        res.render("orderDetails", { order: orderData });

    } catch (error) {
        console.error("Error is viewing order detail page",error);
        res.status(500).render("500")
        
    }
}



const cancelOrder = async(req,res)=>{
    try {
        const {orderId,itemId} = req.params;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id:orderId,
            userId:userId
        })

        if(!order) {
            return res.status(404).json({message:"Order not found"})
        }

        const itemToCancel = order.orderItem.find(item =>item._id.toString() === itemId);

        if(!itemToCancel){
            return res.status(404).json({success:false,message:'Item not found'})
        }

        const cancelableStatuses =["Processing","Dispatched","Shipped"];
        if(!cancelableStatuses.includes(itemToCancel.itemStatus)){
            return res.status(400).json({
                success:false,
                message:'This order cannot be cancelled'
            })
        }

       itemToCancel.itemStatus  ='Cancelled';
      
            const product = await Product.findById(itemToCancel.productId);
            if (product) {
                const colorStockIndex = product.colorStock.findIndex(
                    (colorStock) => colorStock.color === itemToCancel.color
                );

                if (colorStockIndex !== -1) {
                    product.colorStock[colorStockIndex].quantity += itemToCancel.quantity;
                    await product.save();
                }
            }
        
            const allitemsCancelled = order.orderItem.every(item =>item.itemStatus ==='Cancelled');

            if(allitemsCancelled) {
                order.orderStatus ='Cancelled'
            }
            await order.save()

        res.json({success:true,message:'Order cancelled successfully',orderStatus:order.orderStatus})
        
    } catch (error) {
        console.error('Error cancelling order:',error);
        res.status(500).json({message:'Internal server error'})
        
    }
};







const formatOrderStatus = (status) => {
    const statusClasses = {
        'Processing': 'badge bg-warning text-dark',
        'Shipped': 'badge bg-info',
        'Delivered': 'badge bg-success',
        'Cancelled': 'badge bg-danger'
    };
    return statusClasses[status] || 'badge bg-secondary';
};


module.exports={
    loadOrderPage,
    viewOrderDetails,
    cancelOrder,
    
}