const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Wallet = require("../../models/walletSchema")
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

        console.log(orderData,"order data in the ordersss")

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

       const refundAmount = itemToCancel.totalPrice;
       const useridForWallet = order.userId;


        if(order.paymentMethod === 'Razorpay'){
            

            const wallet = await Wallet.findOneAndUpdate(
                {userId: useridForWallet},
                {$inc: { walletBalance: refundAmount}},
                {new: true,upsert:true}
            )

            wallet.transactions = wallet.transactions || [];
            wallet.transactions.push({
                transactionType:'credit',
                transactionAmount: refundAmount,
                transactionDescription: 'Order amount refunded',
                transactionId: `TXN-${Date.now()}`
            });

            await wallet.save();
        } else if(order.paymentMethod==='Wallet'){

            
            const wallet = await Wallet.findByIdAndUpdate(
                {userId},
                {$inc:{walletBalance:refundAmount}},
                {new: true, upsert: true}

            )

            wallet.transactions = wallet.transactions || [];
            wallet.transactions.push({
                transactionType:'credit',
                transactionAmount:refundAmount,
                transactionDescription:'Order cancel amount refunded',
                transactionId:`TXN-${Date.now()}`
            });
            await wallet.save();
        }


        
      
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



const paymentOrder = async(req,res)=>{
    

        const {amount,currency = "INR",paymentMethod,shippingAddress} = req.body;
        console.log(req.body,"razorpay req.body");

        if(!amount || !currency){
            return res.status(400).json({error: 'Invalid request. Amount and currency are required'})
        }

        const options = {
            amount: amount *100,
            currency:currency,
            receipt: `receipt_${Math.random().toString(36).substr(2, 9)}`,
            payment_capture:1
        };

        try{
            const response = await razorpay.orders.create(options);
            

            res.json({
                order_id:response.id,
                currency: response.currency,
                amount:response.amount

            });
            console.log(response,"response of razorpay")

        } catch (error) {
        console.error('Error creating razorpay order:',error);
        res.status(500).json({error:'Failed to create order'});
        
    }
}


// const retryPayment = async(req,res)=>{
//     try {

//         const { orderId,razorpay_order_id,razorpay_payment_id,razorpay_signature} = req.body;

//         if(!orderId || !razorpay_order_id || razorpay_payment_id || razorpay_signature){
//             return res.status(400).json({message:"Missing payment details"});

//         }

//         const order = await Order.findById(orderId);
//         if(!order){
//             return res.status(404).json({message:"Order not found or not eligible for retry"})
//         }

//         if(order.orderStatus!=='Pending_payment'){
//             return res.status(400).json({success:false,message:"Order is not eligible for the retry payment"})
//         }

//         const secretKey = process.env.RAZORPAY_KEYSECRET;
//         const generatedSignature = crypto
//         .createHmac('sha256', secretKey)
//         .update(`${razorpay_order_id}|${razorpay_payment_id}`)
//         .digest('hex');

//         if(generatedSignature!== razorpay_signature){
//             return res.status(400).json({message: "Payment verification failed"})
//         }

//         order.orderStatus = "Processing";

//         await order.save();

//         return res.status(200).json({
//             success: true,
//             message:"Payment successful.Order status updated to processing"
//         })
        
        
//     } catch (error) {
//         console.error("Error retrying payment",error);
//         return res.status(400).json({
//             success: false,
//             message: error.message || 'Failed to retry payment'
//         })
//     }
// }



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
    paymentOrder,
    // retryPayment,
    // verifyPayment,
    
}