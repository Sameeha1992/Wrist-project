const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose');
const { viewOrderDetails } = require("../user/orderController");
const generateOrderId = require("../../utils/generateOrderId");






const userOrders = async(req,res)=>{
    try {
     const page=parseInt(req.query.page) || 1;
     const limit = 10;
     const skip =(page-1) * limit;
     
     const orders = await Order.find({})
     .populate({
      path:'userId',
      select:'name email'
     })
     .populate({
      path:'orderItem.productId',
      select:'productName productImage'
     })
     .sort({createdAt:-1})
     .skip(skip)
     .limit(limit);

    


     
     const totalOrders = await Order.countDocuments();
      res.render("adminOrder",{
        orders:orders,
        orderId:generateOrderId(),
        currentPage:page,
        totalPages:Math.ceil(totalOrders/limit),
        totalOrders:totalOrders

      });
     
    
      
    } catch (error) {
      console.error("Error in getting the order page:",error);
      res.status(500).render("error",{
        message:"Failed to load orders",
        error:error.message
      });
      
    }
  }



  const updatedOrderStatus = async(req,res)=>{
   
      try {
        const { productId, itemId, color, newStatus } = req.body;

        
        const orderId = req.params.id;
    
        if (!orderId || !newStatus) {
          return res.status(400).json({
            success: false,
            message: "Missing required fields",
            details: { orderId, newStatus },
          });
        }
    
        const order = await Order.findById(orderId).populate({
          path: 'orderItem.productId',
          select: 'productName productImage salePrice colorStock',
        });
    
        if (!order) {
          return res.status(404).json({
            success: false,
            message: "Order not found",
          });
        }
    
        const validStatuses = ['Processing', 'Delivered', 'Cancelled', 'Shipped'];
        if (!validStatuses.includes(newStatus)) {
          return res.status(400).json({
            success: false,
            message: "Invalid order status",
          });
        }
    
        const itemToUpdate = order.orderItem.find(
          (item) => item._id.toString() === itemId && item.color === color
        );
    
        if (!itemToUpdate) {
          return res.status(404).json({
            success: false,
            message: "Order item not found",
          });
        }
    
        
        const currentStatus = itemToUpdate.itemStatus;
      

        const allowedTransitions = {
          Processing: ['Shipped', 'Delivered','Cancelled'],
          Shipped: ['Delivered'],
          Delivered: [], 
          Cancelled: [], 
        };

        
    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${currentStatus} to ${newStatus}`,
      });
    }


    let cancelledItemDetails;
      
       
        if (newStatus === 'Cancelled') {
          const product = await Product.findById(productId);
          if (product) {
              
              const colorStockIndex = product.colorStock.findIndex(
                  colorStock => colorStock.color === color
              );

              if (colorStockIndex !== -1) {
                  
                  product.colorStock[colorStockIndex].quantity += itemToUpdate.quantity;
                  
                  
                  if (product.colorStock[colorStockIndex].quantity > 0) {
                      product.colorStock[colorStockIndex].status = "In_Stock";
                  }
                  
                  await product.save();

                  cancelledItemDetails = {
                      quantity: itemToUpdate.quantity,
                      price: itemToUpdate.price,
                      color: color,
                      updatedStock: product.colorStock[colorStockIndex].quantity
                  };
              }
          }
      }
  
      
      itemToUpdate.itemStatus = newStatus;

      
      const allItemsHaveSameStatus = order.orderItem.every(
          item => item.itemStatus === newStatus
      );

      if (allItemsHaveSameStatus) {
          order.orderStatus = newStatus;
      }
  
    
      await order.save();
  
      return res.status(200).json({
          success: true,
          message: "Order item status updated successfully",
          updatedItem: itemToUpdate,
          orderStatus: order.orderStatus,
          ...(cancelledItemDetails && { cancelledItemDetails })
      });
      
  } catch (error) {
      console.error("Error updating order status:", error);
      return res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error.message,
      });
  }
};

  const viewUserOrderDetails = async (req,res)=>{

 
    try {

      const orderId = req.params.id;
      
      
      const order = await Order.findOne({
        _id:orderId,
        
      }).populate({
        path:"orderItem.productId",
        select:'productName productImage salePrice'
      });


  
    

      if(!order){
        return res.status(404).render('404')
      }

      const items = order.orderItem.map(item=>({
        id:item.productId._id,
        name:item.productId.productName,
        Image:item.productId.productImage,
        color:item.color,
        price:item.price || item.productId.salePrice,
        quantity:item.quantity,
        totalPrice:item.totalPrice,
        orderItemId:item._id,
        itemStatus:item.itemStatus
      }));

      const orderData ={
        _id:order._id,
        orderId:generateOrderId(),
        couponDiscount:order.couponDiscount,
        createdAt:order.createdAt,
        orderStatus:order.orderStatus,
        shippingAddress:order.shippingAddress,
        paymentMethod:order.paymentMethod,
        subtotal:items.reduce((acc,item)=>acc +item.price * item.quantity,0),
        items
      };
      res.render("userOrdersdetailPage",{order:orderData})
      
    } catch (error) {

      console.error("Error in userOrderdetailPage",error);
      res.status(500).render("500")
      
    }
  }




  module.exports={
    userOrders,
    updatedOrderStatus,
    viewUserOrderDetails,
   
  }