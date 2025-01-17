const express = require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController");
const adminOrderController = require("../controllers/admin/adminOrderController");
const productOfferController = require("../controllers/admin/product/productOfferController.js");
const coupenController = require("../controllers/admin/coupenController.js");
const returnOrderController = require("../controllers/admin/returnOrderController");
const salesReportController = require("../controllers/admin/salesReportController.js")

const {userAuth,adminAuth, isAdminLogout} = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});


router.get("/page-error",adminController.pageerror);


//Login Management
router.get("/login",isAdminLogout,adminController.loadLogin);

router.post("/login",adminController.login);

router.get("/",adminAuth,adminController.loadDashboard);
router.get("/dashBoardReport",adminAuth,adminController.loadDashboardData)

router.get("/logout",adminController.logout);

//Customer Management

router.get("/users",adminAuth,customerController.customerInfo)
router.patch("/blockCustomer",adminAuth,customerController.customerBlocked)
router.patch("/unblockCustomer",adminAuth,customerController.customerUnblocked)

//Category Management

router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",categoryController.addCategory);
router.get("/listCategory",adminAuth,categoryController.getListCategory);
router.get("/unlistCategory",adminAuth,categoryController.getUnlistCategory);
router.get("/editCategory",adminAuth,categoryController.getEditCategory);
router.post("/editCategory/:id",adminAuth,categoryController.editCategory);

//Brand Management

router.get("/brands",adminAuth,brandController.getBrandPage);
router.post("/addBrand",adminAuth,uploads.single("image"),brandController.addBrand);
router.get("/blockBrand",adminAuth,brandController.blockBrand);
router.get("/unBlockBrand",adminAuth,brandController.unBlockBrand)
// router.get("/deleteBrand",adminAuth,brandController.deleteBrand);


//Product Management

router.get("/addProducts",adminAuth,productController.getProductAddPage);
router.post("/addProducts",adminAuth,uploads.array("images",4),productController.addProducts)
router.get("/product",adminAuth,productController.getAllProducts);
router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct);
router.post("/editProduct/:id",adminAuth,uploads.array("images",4),productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)

//Product offerAdd:

router.post("/addProductOffer/:productId",adminAuth,productOfferController.addOffer);
router.post("/removeProductOffer/:productId",adminAuth,productOfferController.removeProductOffer);
router.post("/addCategoryOffer",adminAuth,productOfferController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,productOfferController.removeCategoryOffer);




//Order Management:-

router.get("/orders",adminAuth,adminOrderController.userOrders);
router.patch("/update-order-status/:id",adminAuth,adminOrderController.updatedOrderStatus);
router.get("/orderDetails/:id",adminAuth,adminOrderController.viewUserOrderDetails);
// router.put('/orders/:orderId/product/:productId/return', adminAuth, adminOrderController.handleReturn);


router.get('/returns', returnOrderController.getReturnsPage);
router.post('/returnUpdateStatus', returnOrderController.updateReturnStatus);
// //Coupen management:-

router.get("/coupens",adminAuth,coupenController.showCoupen);
router.get("/addcoupen",adminAuth,coupenController.getAddCoupen);
router.post("/addcoupen",adminAuth,coupenController.addCoupen);
router.get('/editCoupons/:id',adminAuth,coupenController.getEditCoupon)
router.put('/editCoupons/:id',adminAuth,coupenController.updateCoupon)
router.delete("/deleteCoupen/:id",adminAuth,coupenController.deleteCoupen)


//salesReport:-

router.get('/renderSalesReportPage',adminAuth,salesReportController.renderSalesReportPage);
router.get('/saleReportFetch',adminAuth,salesReportController.fetchSalesReport);
router.get("/reportDownloadPdf",adminAuth,salesReportController.downloadSalesReportPdf);
router.get('/reportDownloadExcel',adminAuth,salesReportController.downloadSalesReportExel)

module.exports=router;
