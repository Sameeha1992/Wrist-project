const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose');
const { viewOrderDetails } = require("../user/orderController");






const userOrders = async(req,res)=>{
    try {
     const page=1;
     const limit = 10;
     
     const orders = await Order.find()
     .populate({
      path:'userId',
      select:'name email'
     })
     .populate({
      path:'orderItem.productId',
      select:'productName productImage'
     })
     .sort({createdAt:-1})
     .limit(limit);


     
     const totalOrders = await Order.countDocuments();
      res.render("adminOrder",{
        orders:orders,
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

      const orderId = req.params.id;
      

      // const {orderId} = req.params.id;
      const {newStatus} = req.body;

      // console.log("ORDERID:--",orderId);
      console.log('Request params:', orderId);

      if (!orderId ||!newStatus) {
        console.log("Missing required fields", { orderId, newStatus });
        return res.status(400).json({
            success: false,
            message: "Missing required fields",
            details: { orderId,newStatus }
        });
    }
     
      const order = await Order.findById(orderId);

      if(!order) {
        return res.status(404).json({
          success:false,
          message:"Order not found"
        });
      }

      console.log("ORDERRRR",order)

      if(order.orderStatus ==='Cancelled'){
        return res.status(400).json({
          success:false,
          message:"Cannot update status of a cancelled order"
        });
      }


      const validStatuses = ['Processing','Delivered','Cancelled','Shipped','Dispatched'];
      if(!validStatuses.includes(newStatus)){
        return res.status(400).json({
          success:false,
          message:"Invalid order status"
        });
      }

      for (let item of order.orderItem) {
        const product = await Product.findById(item.productId);  // Assuming Product is the model for products
        if (product) {
          product.stockQuantity += item.quantity;
          await product.save();
        }
      }
      
      

      order.orderItem.forEach((item)=>{
        item.orderStatus = newStatus;
      });

      const isAllSameStatus = order.orderItem.every(item => item.orderStatus === newStatus);
      if (isAllSameStatus) {
        order.orderStatus = newStatus;
      }

      await order.save();

     

     

    
      return res.status(200).json({
        success:true,
        message:"Order status updated successfully",
        updatedOrder:order
      });


      
    } catch (error) {
      console.error("Error updating order status:",error)
      return res.status(500).json({
        success:false,
        message:"Internal server error",
        error:error.message

      })
      
    }
  }



  const viewUserOrderDetails = async (req,res)=>{
    try {

      const orderId = req.params.id;
      const userId = req.session.user;

      const order = await Order.findOne({
        _id:orderId,
        userId:userId
      }).populate({
        path:"orderItem.productId",
        select:'productName productImage salePrice'
      });

      if(!order){
        return res.status(404).render('404')
      }

      const items = order.orderItem.map(item=>({
        name:item.productId.productName,
        Image:item.productId.productImage,
        color:item.color,
        price:item.price || item.productId.salePrice,
        quantity:item.quantity,
        totalPrice:item.totalPrice
      }));

      const orderData ={
        _id:order._id,
        createdAt:order.createdAt,
        orderStatus:order.orderStatus,
        shippingAddress:order.shippingAddress,
        paymentMethod:order.paymentMethod,
        subtotal:items.reduce((acc,item)=>acc +item.price * item.quantity,0),
        items
      };
      res.json({success:true,order:orderData})
      
    } catch (error) {

      console.error("Error in userOrderdetailPage",error);
      res.status(500).render("500")
      
    }
  }




  module.exports={
    userOrders,
    updatedOrderStatus,
    viewUserOrderDetails,
    // deleteOrderListProduct,
    // handleReturn,
   
  }