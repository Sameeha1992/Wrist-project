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
        console.log(userId,"USERIDD")
        const orders = await Order.find({userId:userId})
        .populate({
            path:'orderItem.productId',
            select:"productName"
        })
        .select('orderId orderStatus totalAmount createdAt')
        .sort({createdAt:-1});

        console.log(orders.map(order => ({ orderId: order.orderId, orderStatus: order.orderStatus })));

        console.log("GOT THE ORDERIDDDD---------------- ")


        console.log(orders,"ORDERSSSS")

        const newDate =(date)=>{return new Date(date)};

        res.render("orders",{
            orders,
            newDate,
            
            
           
        });

        
        console.log("The order page is successfull rendered")
        
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

        res.render("orderDetails",{
            order,
            
            formateDate :(date)=>new Date(date).toLocaleDateString()

        })
        
    } catch (error) {
        console.error("Error is viewing order detail page",error);
        res.status(500).render("500")
        
    }
}



const cancelOrder = async (req,res)=>{

    try {
        const {orderId} = req.body;
        const userId = req.session.user;

        const order = await Order.findOne({
            _id:orderId,
            userId:userId
        });

        if(!order) {
            return res.status(404).json({message:"Order not found"})
        }

        if(order.orderStatus !=="Processing"){
            return res.status(400).json({
                message:"Order cannot be cancelled at this stage"
            });
        }

        order.orderStatus = 'Cancelled';
        await order.save();

        for(let item of order.orderItem) {
            await Product.updateOne(
                {
                    _id:item.productId,
                    'colorStock.color': item.color
                },
                {
                    $inc:{
                        'colorStock.$.quantity':item.quantity
                    }
                }
            );
        }
        res.status(200).json({
            message:"Order cancelled successfully",
            orderId:order._id
        })
        
    } catch (error) {
        console.error("Error cancelling order",error);
        res.status(500).json({message:"Failed to cancel order"})
        
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