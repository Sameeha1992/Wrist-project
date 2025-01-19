const User=require("../../models/userSchema");
const Order = require("../../models/orderSchema");
const Product = require("../../models/productSchema");
const mongoose=require("mongoose");

const bcrypt= require("bcrypt");
const { Admin } = require("mongodb");




const pageerror= async (req,res)=>{
  res.render("adminerror")
}



//Loading the home page
const loadLogin = (req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin")
    }
    res.render("adminLogin",{message:null})
}


//Login functionaliteies:-
const login= async(req,res)=>{
  try {
    const {email,password}=req.body;
  

    const admin = await User.findOne({email,isAdmin:true});
  
    if(admin){

      const passwordMatch = bcrypt.compare(password,admin.password);
      
      if(passwordMatch){
        req.session.admin_id = admin._id;
      
        return res.json({success : true});
        
      }else {
        return res.json({success : false , message : 'password not match please try again'})
      }
    } else{
      return res.json({success : false  , message : 'admin not found'});
    }
  } catch (error) {
    console.log("login error",error);
    return res.status(500).json({success : false , message : "An error occured please try again later"})
  }
};

//Dashboard loading

const loadDashboard = async (req,res)=>{
  try {
       res.render('dashboard');
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const loadDashboardData = async (req, res, next) => {
  console.log("hello dashboard")
  try {
    const { filter } = req.query;
    const currentDate = new Date();
    let startDate;
    let endDate;
    let labels = [];

    // Determine the date range based on the filter
    if (filter === 'week') {
      startDate = new Date(currentDate.setDate(currentDate.getDate() - 6));
      endDate = new Date();
    } else if (filter === 'month') {
      startDate = new Date(currentDate.getFullYear(), 0, 1);
      endDate = new Date(currentDate.getFullYear(), 11, 31);
    } else if (filter === 'year') {
      startDate = null;
      endDate = null;
    } else {
      startDate = new Date(0);
      endDate = new Date();
    }

    // Match stage for aggregation
    const matchStage = startDate && endDate ? { createdAt: { $gte: startDate, $lte: endDate } } : {};

    // Chart Data Aggregation
    const chartData = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: filter === 'week'
            ? { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
            : filter === 'month'
              ? { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
              : { $dateToString: { format: '%Y', date: '$createdAt' } },
          deliveredOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Delivered'] }, 1, 0] } },
          cancelledOrders: { $sum: { $cond: [{ $eq: ['$orderStatus', 'Cancelled'] }, 1, 0] } },
          totalDiscounts: { $sum: '$totalDiscount' },
          totalRevenue: { $sum: '$totalAmount' },
        },
      },
      { $sort: { _id: 1 } }
    ]);

    console.log(chartData,"chardata in dashboard")

    // Summary Data Aggregation
    const summary = await Order.aggregate([
      {
        $facet: {
          deliveredMetrics: [
            { $match: { orderStatus: 'Delivered' } },
            {
              $group: {
                _id: null,
                totalDeliveredOrders: { $sum: 1 },
                totalDiscounts: { $sum: '$totalDiscount' },
                totalRevenue: { $sum: '$totalAmount' },
              },
            },
          ],
          cancelledMetrics: [
            { $match: { orderStatus: 'Cancelled' } },
            {
              $group: {
                _id: null,
                totalCancelledOrders: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalDeliveredOrders: { $arrayElemAt: ['$deliveredMetrics.totalDeliveredOrders', 0] },
          totalDiscounts: { $arrayElemAt: ['$deliveredMetrics.totalDiscounts', 0] },
          totalRevenue: { $arrayElemAt: ['$deliveredMetrics.totalRevenue', 0] },
          totalCancelledOrders: { $arrayElemAt: ['$cancelledMetrics.totalCancelledOrders', 0] },
        },
      },
    ]);

    console.log(summary,"summary")

    // Top 10 Categories Aggregation
    const topCategories = await Order.aggregate([
      { $unwind: '$orderItem' },
      { $match: { 'orderStatus': 'Delivered' } },
      {
        $lookup: {
          from: 'products',
          localField: 'orderItem.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$productDetails.category',
          totalSales: { $sum: '$orderItem.quantity' }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      {
        $project: {
          _id: '$categoryDetails.name',
          totalSales: 1
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);

    // Top Brands Aggregation
    const topBrands = await Order.aggregate([
      { $unwind: '$orderItem' },
      { $match: { 'orderStatus': 'Delivered' } },
      {
        $lookup: {
          from : 'products',
          localField: 'orderItem.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$productDetails.brand',
          totalSales: { $sum: '$orderItem.quantity' }
        }
      },
      {
        $lookup: {
          from: 'brands',
          localField: '_id',
          foreignField: '_id',
          as: 'brandDetails'
        }
      },
      { $unwind: '$brandDetails' },
      {
        $project: {
          _id: '$brandDetails.brandName',
          totalSales: 1
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);

    // Top Products Aggregation
    const topProducts = await Order.aggregate([
      { $unwind: '$orderItem' },
      { $match: { 'orderStatus': 'Delivered' } },
      {
        $lookup: {
          from: 'products',
          localField: 'orderItem.productId',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      {
        $group: {
          _id: '$productDetails.productName',
          totalSales: { $sum: '$orderItem.quantity' }
        }
      },
      { $sort: { totalSales: -1 } },
      { $limit: 10 }
    ]);

    // Complete response handler
    const response = {
      chartData,
      labels,
      summary: summary[0] || {},
      topCategories,
      topBrands,
      topProducts,
    };

    return res.status(200).json(response);
  } catch (error) {
      console.eoor("something went wrong.Please check it",error)
  }
};


const logout=async(req,res)=>{
  try {
    
    if(req.session.admin_id) {
      delete req.session.admin_id

    }
     
      res.redirect("/admin/login")
          
  
  } catch (error) {
    console.log("unexpected error during logout");
    res.redirect("/pageerror")
    
  }
}



module.exports={
    loadLogin,
    login,
    loadDashboard,
    pageerror,
    logout,
    loadDashboardData,
   
}