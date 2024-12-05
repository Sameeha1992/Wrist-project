const Product = require("../../models/productSchema");
const User = require("../../models/userSchema");
const Cart = require("../../models/cartSchema");
const Order = require("../../models/orderSchema");
const mongoose = require('mongoose');






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
      console.log("got userOrderPage")
      console.log(totalOrders,"TORDERSSSSSSSS...........")
      
    } catch (error) {
      console.error("Error in getting the order page:",error);
      res.status(500).render("error",{
        message:"Failed to load orders",
        error:error.message
      });
      
    }
  }





// const updateStatus = async (req,res)=>{
//   try {
//     const {orderId,productId,color}= req.params;
//     const {status} = req.body;

//     const order = await Order.findById(orderId);

//     if(!order){
//       return res.status(404).json({
//         success:false,
//         message:"Order not found"
//       })
//     }

//     const itemIndex = order.orderItem.findIndex(
//       (item)=>
//         item.productId.toString()===productId && item.color ===color
//     )
//     if(itemIndex === -1){
//       return res.status(404).json({
//         success:false,
//         message:"Product not found in this order",
//       })
//     }

//     order.orderStatus = status;
//     order.orderItem[itemIndex].orderStatus = status;

//     await order.save();

//     return res.status(200).json({
//       success:true,
//       message:"Order status changed successfully",
//       order:order,
//     })
    
//   } catch (error) {
//     console.log("Error in updateStatus",error);
//     return res.status(500).json({
//       success:false,
//       message:"internal server error"
//     })
    
//   }
// }


// const getPopUpOrderDetails = async (req, res) => {
//   try {
//     return res.render("popUpProductDetails");
//   } catch (error) {
//     console.log("Error in getPopUpOrderDetails", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// };

// const deleteOrderListProduct = async (req, res) => {
//   try {
//     const { orderId, productId, color } = req.params;

//     const order = await Order.findById(orderId);
//     const userId = order.userId;

//     const itemIndex = order.orderItem.findIndex(
//       (item) => 
//         item.productId.toString() === productId && 
//         item.color === color
//     );

//     if (itemIndex === -1) {
//       return res.status(400).json({
//         success: false,
//         message: "Item not found in the order",
//       });
//     }

//     const cancelledItem = order.orderItem[itemIndex];

//     // Remove or mark the item as canceled
//     order.orderItem.splice(itemIndex, 1);

//     // Recalculate total amount
//     order.totalAmount = order.orderItem.reduce((acc, curr) => acc + curr.totalPrice, 0);

//     await order.save();

//     // Update product stock
//     const product = await Product.findById(productId);
//     if (!product) {
//       return res.status(400).json({
//         success: false,
//         message: "Product not found",
//       });
//     }

//     const variantIndex = product.colorStock.findIndex(v => v.color === color);
//     if (variantIndex === -1) {
//       return res.status(400).json({
//         success: false,
//         message: `Color variant ${color} not found for product ${product.productName}`,
//       });
//     }

//     // Restore product quantity
//     product.colorStock[variantIndex].quantity += cancelledItem.quantity;
//     await product.save();

//     return res.status(200).json({
//       success: true,
//       message: "Order item cancelled successfully",
//       redirectURL: "/orderList",
//     });
//   } catch (error) {
//     console.log("Error in deleteOrderListProduct", error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// };

// const handleReturn = async (req, res) => {
//   try {
//     const { orderId, productId } = req.params;
//     const { action } = req.body;

//     const order = await Order.findById(orderId);

//     if (!order) {
//       return res.status(404).json({
//         success: false,
//         message: "Order not found",
//       });
//     }

//     const itemIndex = order.orderItem.findIndex(
//       (item) => item.productId.toString() === productId
//     );

//     if (itemIndex === -1) {
//       return res.status(400).json({
//         success: false,
//         message: "Item not found in the order",
//       });
//     }

//     const returnedItem = order.orderItem[itemIndex];

//     if (action === 'Approved') {
//       // Remove the item from the order
//       order.orderItem.splice(itemIndex, 1);

//       // Recalculate total amount
//       order.totalAmount = order.orderItem.reduce((acc, curr) => acc + curr.totalPrice, 0);

//       await order.save();

//       // Update product stock
//       const product = await Product.findById(productId);
//       if (!product) {
//         return res.status(400).json({
//           success: false,
//           message: "Product not found",
//         });
//       }

//       const variantIndex = product.colorStock.findIndex(v => v.color === returnedItem.color);
//       if (variantIndex === -1) {
//         return res.status(400).json({
//           success: false,
//           message: `Color variant ${returnedItem.color} not found for product ${product.productName}`,
//         });
//       }

//       // Restore product quantity
//       product.colorStock[variantIndex].quantity += returnedItem.quantity;
//       await product.save();

//       return res.status(200).json({
//         success: true,
//         message: 'Return request approved successfully',
//       });
//     } else {
//       return res.status(200).json({
//         success: true,
//         message: 'Return request rejected successfully',
//       });
//     }
//   } catch (error) {
//     console.log('Error in handleReturn', error);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: error.message
//     });
//   }
// };


// const userOrders = async(req,res)=>{
//     try {
//      const page=1;
//      const limit = 10;
     
//      const orders = await Order.find()
//      .populate({
//       path:'userId',
//       select:'name email'
//      })
//      .populate({
//       path:'orderItem.productId',
//       select:'productName productImage'
//      })
//      .sort({createdAt:-1})
//      .limit(limit);

//      const totalOrders = await Order.countDocuments();
//       res.render("adminOrder",{
//         orders:orders,
//         currentPage:page,
//         totalPages:Math.ceil(totalOrders/limit),
//         totalOrders:totalOrders

//       });
//       console.log("got userOrderPage")
//       console.log(totalOrders,"TORDERSSSSSSSS...........")
      
//     } catch (error) {
//       console.error("Error in getting the order page:",error);
//       res.status(500).render("error",{
//         message:"Failed to load orders",
//         error:error.message
//       });
      
//     }
//   }




  module.exports={
    userOrders,
    // updateStatus,
    // getPopUpOrderDetails,
    // deleteOrderListProduct,
    // handleReturn,
   
  }