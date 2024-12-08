const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose');


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
            name:item.productId.productName,
            Image:item.productId.productImage,
            color:item.color,
            price:item.price || item.productId.salePrice,
            quantity:item.quantity,
            totalPrice:item.totalPrice
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
        const orderId = req.params.id;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id:orderId,
            userId:userId
        })

        if(!order) {
            return res.status(404).json({message:"Order not found"})
        }

        const cancelableStatuses =["Processing","Dispatched","Shipped"];
        if(!cancelableStatuses.includes(order.orderStatus)){
            return res.status(400).json({
                message:'This order cannot be cancelled'
            })
        }

        order.orderStatus ='Cancelled';
        await order.save();

        for (let item of order.orderItem) {
            const product = await Product.findById(item.productId);
            if (product) {
                const colorStockIndex = product.colorStock.findIndex(
                    (colorStock) => colorStock.color === item.color
                );

                if (colorStockIndex !== -1) {
                    product.colorStock[colorStockIndex].quantity += item.quantity;
                    await product.save();
                }
            }
        }

        res.status(200).json({message:'Order cancelled successfully'})
        
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