const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const Coupon = require("../../models/coupenSchema");


const  itemReturnRequest = async(req,res)=>{


    const { orderId,itemId,reason} = req.body;
    const userId = req.session.user



    try {

        if(!orderId || !itemId || !reason){
            return res.status(400).json({message:"Please provide the information..!"})
        }


        // const order = await Order.findOne({
        //     _id:orderId,
        //     userId:userId
        // })


        const order = await Order.findOne(
            { _id: orderId, "orderItem._id": itemId },
            { orderItem: { $elemMatch: { _id: itemId } } }
        ).populate("orderItem.productId");


        if(!order){
            return res.status(404).json({success:false,message:"Order not found or unauthorised access"})
        };

        const orderItem = order.orderItem.find(
            item=> item._id.toString()===itemId
        );
        

        if(!orderItem){
            return res.status(404).json({success:false,message:"Item not found in the order"})
        }



        if(orderItem.returnStatus){
            return res.status(400).json({success:false,message:"Return request already exists for this item"})
        }


        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: orderId,
                'orderItem._id': itemId
            },
            {
                $set: {
                    'orderItem.$.itemStatus': 'Return_request',
                    'orderItem.$.returnStatus': true,
                    'orderItem.$.returnReason': reason,
                    'orderItem.$.returnRequest': 'Pending'
                }
            },
            { new: true }
        );

        if(!updatedOrder){
            return res.status(500).json({
                success:false,
                message:"Failed to updated return request"
            })
        }

        return res.status(200).json({success:true,message:"Return request submitted successfully",
            order: updatedOrder
        })

        
    } catch (error) {
        console.error("Error in itemReturnRequest:",error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
}




module.exports={
    itemReturnRequest
}