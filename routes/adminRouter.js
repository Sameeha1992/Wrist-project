const express = require("express");
const router=express.Router();
const adminController=require("../controllers/admin/adminController");
const customerController=require("../controllers/admin/customerController")
const categoryController = require("../controllers/admin/categoryController");
const brandController = require("../controllers/admin/brandController")
const productController = require("../controllers/admin/productController");
const adminOrderController = require("../controllers/admin/adminOrderController")

const {userAuth,adminAuth, isAdminLogout} = require("../middlewares/auth");
const multer = require("multer");
const storage = require("../helpers/multer");
const uploads = multer({storage:storage});


router.get("/page-error",adminController.pageerror);


//Login Management
router.get("/login",isAdminLogout,adminController.loadLogin);

router.post("/login",adminController.login);

router.get("/",adminAuth,adminController.loadDashboard)

router.get("/logout",adminController.logout);

//Customer Management

router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth,customerController.customerBlocked)
router.get("/unblockCustomer",adminAuth,customerController.customerUnblocked)

//Category Management

router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",categoryController.addCategory);
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer);
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer);
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



//Order Management:-

router.get("/orders",adminAuth,adminOrderController.userOrders);
router.patch("/update-order-status/:id",adminAuth,adminOrderController.updatedOrderStatus);
router.get("/orders/details/:id",adminAuth,adminOrderController.viewUserOrderDetails)
// router.get('/orders/details', adminAuth, adminOrderController.getPopUpOrderDetails);
// router.delete('/orders/:orderId/product/:productId/:color', adminAuth, adminOrderController.deleteOrderListProduct);
// router.put('/orders/:orderId/product/:productId/return', adminAuth, adminOrderController.handleReturn);

module.exports=router;
