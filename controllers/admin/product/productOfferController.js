const Product = require('../../../models/productSchema');
const Category = require('../../../models/categorySchema');
const Brand = require("../../../models/brandSchema");
const mongoose = require("mongoose")





const calculateFinalOffer = async(product)=>{
    const highestOffer = Math.max(
        product.productOffer || 0,
        product.categoryOffer || 0);

        product.finalOffer = highestOffer;
        product.salePrice = product.regularPrice - Math.round(product.regularPrice * (highestOffer / 100));
        await product.save()
 }


const addOffer = async (req,res)=>{

   
        const {productId} = req.params;
        const {offer} = req.body;


        if(!productId || offer <0 || offer >100) {
            return res.status(400).json({success: false,message: "Invalid productId or percentage!"})
        }


    try {
 

        const product = await Product.findById(productId);

        if(!product) {
            return res.status(404).json({success: false,message:"Product not found"})
        }
        
        product.productOffer = offer;
        await calculateFinalOffer(product)

        res.status(200).json({ success: true, message:"Offer updated successfully"})
    } catch (error) {
        console.error("Error adding offer:",error);
        return res.status(500).json({success: false, message: "An error occured while adding the offer"})
    }
}


const removeProductOffer = async(req,res)=>{
    try {
        const {productId} = req.params;
        

        const product = await Product.findById(productId);
        if(!product){
            return res.status(404).json({success: false,message:"Product not found"});

        }

        product.productOffer =0;
        await product.save();

        return res.status(200).json({success: true,message:"Offer removed successfully"});
        
    } catch (error) {
        console.error("Error removing offer:",error);
        return res.status(500).json({success: false,message: "An error occured while removing the offer"})
    }
}


const addCategoryOffer = async (req,res)=>{

    const percentage = parseInt(req.body.percentage);
        
       
        const categoryId = req.body.categoryId;
       


        if(!percentage || percentage<0 || percentage > 100){
            return res.status(400).json({success: false,message:"Invalid offer percentage"})
        } 


    try {
        

        const category = await Category.findById(categoryId);
       
        if(!category){
            return res.status(404).json({status:false,message:"Category not found"})
        }

        const products = await Product.find({category:categoryId});

        
        
        
       
        await Promise.all(
            products.map(async (product) => {
                
                if (!mongoose.Types.ObjectId.isValid(product.brand)) {
                    console.error(`Invalid brand ID for product: ${product.productName}`);
                    return; 
                }

                
               

               
                product.categoryOffer = percentage;
                await calculateFinalOffer(product);
            })
        );

        

        category.categoryOffer = percentage;
        await category.save();

        
        return res.status(200).json({success:true,message:"Category offer added successfully"})
       
    } catch (error) {
        console.error("Error in addcategory offer:",error)
        return res.status(500).json({status:false,message:"Internal Server error"})
        
    }
 };


 const removeCategoryOffer = async(req,res)=>{
    try {

        const percentage = parseInt(req.body.percentage);

        const categoryId = req.body.categoryId;
        

        const category = await Category.findById(categoryId);
       

        if(!category) {
            return res.status(404).json({success:false,message:"Category not found"})
        }

        category.categoryOffer =0;
        await category.save();
        return res.status(200).json({success:true,message:"Offer removed successfully"})


        
    } catch (error) {
        res.status(500).json({status:false,message:"Internal Server error"})
        
    }

 }


 




module.exports={
    addOffer,
    removeProductOffer,
    addCategoryOffer,
    removeCategoryOffer,
    calculateFinalOffer,
   
}
