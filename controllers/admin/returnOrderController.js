const Order = require("../../models/orderSchema");
const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Wallet = require("../../models/walletSchema");
const generateOrderId = require("../../utils/generateOrderId");

const updateReturnStatus = async (req, res) => {
    try {
        const { orderId, itemId, status,productId} = req.body;

        console.log(req.body,"order returnssssss")

        // Validate required fields
        if (!orderId || !itemId || !status) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields"
            });
        }

        // Find order and populate necessary fields
        const order = await Order.findById(orderId)
            .populate('userId')
            .populate('orderItem.productId');

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Find the specific item in the order
        const itemToUpdate = order.orderItem.find(item => item._id.toString() === itemId && 
        item.productId._id.toString() === productId);



        if (!itemToUpdate) {
            return res.status(404).json({
                success: false,
                message: "Order item not found"
            });
        }

        // Verify if return request exists and is pending
        if (!itemToUpdate.returnRequest || itemToUpdate.returnRequest !== 'Pending') {
            return res.status(400).json({
                success: false,
                message: "Invalid return request status"
            });
        }

        // Update return request status
        itemToUpdate.returnRequest = status;

        if (status === 'Approved') {
            // Update item status
            itemToUpdate.returnStatus = true;
            itemToUpdate.itemStatus = 'Returned';

            // Handle wallet refund
            try {
                let wallet = await Wallet.findOne({ userId: order.userId });
                const refundAmount = itemToUpdate.totalPrice;

                if (wallet) {
                    // Update existing wallet
                    wallet.walletBalance += refundAmount;
                    wallet.transactions.push({
                        orderId: order._id,
                        transactionType: 'credit',
                        transactionAmount: refundAmount,
                        transactionStatus: 'completed',
                        transactionId: `REF${Date.now()}`,
                        transactionDate: new Date()
                    });
                } else {
                    // Create new wallet if it doesn't exist
                    wallet = new Wallet({
                        userId: order.userId,
                        walletBalance: refundAmount,
                        transactions: [{
                            orderId: order._id,
                            transactionType: 'credit',
                            transactionAmount: refundAmount,
                            transactionStatus: 'completed',
                            transactionId: `REF${Date.now()}`,
                            transactionDate: new Date()
                        }]
                    });
                }

                await wallet.save();

                // Check if all items in order are returned
                const allItemsReturned = order.orderItem.every(item => 
                    item.returnStatus=== 'Returned');
                if (allItemsReturned) {
                    order.orderStatus = 'Full Order Returned';
                }
            } catch (error) {
                console.error("Error handling wallet refund:", error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to process refund",
                    error: error.message
                });
            }
        } else if( status === 'Rejected') {

            itemToUpdate.returnStatus = false;
            itemToUpdate.itemStatus = 'Processing'
        }

        await order.save();

        return res.status(200).json({
            success: true,
            message: `Return request ${status.toLowerCase()} successfully`,
            walletUpdated: status === 'Approved',
            orderStatus: order.orderStatus
        });

    } catch (error) {
        console.error("Error in updateReturnStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

const getReturnsPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;

        // Only show orders with actual return requests
        let query = { 
            'orderItem': { 
                $elemMatch: { 
                    returnRequest: { $exists: true, $ne:null },
                    returnReason: { $exists: true, $ne: 'Not specified' }
                } 
            }
        };

        if (req.query.status && req.query.status !== 'all') {
            query['orderItem']['$elemMatch']['returnRequest'] = req.query.status;
        }


       
        const orders = await Order.find(query)
            .populate({
                path: 'userId',
                select: 'name email'
            })
            .populate({
                path: 'orderItem.productId',
                select: 'productName productImage salePrice _id'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);


           

            const filteredOrders = orders.map(order => {
                // Convert to plain object and filter orderItems
                const orderObj = order.toObject();
                orderObj.orderItem = orderObj.orderItem.filter(item => 
                    item.returnRequest && 
                    item.returnReason && 
                    item.returnReason !== "Not specified"
                );

                if(!orderObj.userId) {
                    orderObj.userId = {name: "Unknown User", email: "N/A"}
                }

                return orderObj
                
            }).filter(order => order.orderItem.length > 0)
    
            const totalFilteredOrders = filteredOrders.length;

            const invalidOrders = await Order.find({userId: { $exists: false}})
           
    
            res.render("returnOrder", {
                orders: filteredOrders,
                orderId:generateOrderId(),
                currentPage: page,
                totalPages: Math.ceil(totalFilteredOrders / limit),
                totalOrders: totalFilteredOrders
            });
    
        } catch (error) {
            console.error("Error in getReturnsPage:", error);
            res.status(500).render("error", {
                message: "Failed to load returns",
                error: error.message
            });
        }
    };


module.exports = {
    getReturnsPage,
    updateReturnStatus
}