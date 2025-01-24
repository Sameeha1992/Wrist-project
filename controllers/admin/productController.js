const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema")
const fs = require("fs");
const path = require("path");
const mongoose= require('mongoose')

const sharp = require("sharp")



const getProductAddPage = async (req,res)=>{
    try{
        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});
        res.render("product-add",{
            cat:category,
            brand:brand,
            // product:{}
        });
       

    }
    catch(error){
        res.redirect("/pageerror")

    }
};


const addProducts = async (req,res)=>{
    try {
        const products = req.body;
      


        const productExists = await Product.findOne({
            productName:products.productName,
        });
            
        if(!productExists){
            const images =[];

            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }




            const categoryId = await Category.findOne({name:products.category});
            const brandId = await Brand.findOne({brandName:products.brand});

            if(!categoryId){
                return res.status(400).json("Invalid category name")
            }
            if(!brandId){
                return res.status(400).json("Invalid brand name")
            }

            const categoryOffer = categoryId.categoryOffer || 0;
            const productOffer = parseFloat(products.productOffer) || 0;
            

            const finalOffer = Math.max(categoryOffer,productOffer);

            const regularPrice = parseFloat(products.regularPrice);
            const calculatedSalePrice = finalOffer > 0 ? Math.round(regularPrice *(1-finalOffer /100))
            :regularPrice;

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:brandId._id,
                category:categoryId._id,
                regularPrice:regularPrice,
                salePrice:calculatedSalePrice,
                productOffer:productOffer,
                categoryOffer:categoryOffer,
                finalOffer:finalOffer,
                colorStock: products.colorStock.map(stock => ({
                    color: stock.color,
                    quantity: parseInt(stock.quantity),
                    status: stock.status
                })),
                productImage:images,
               

            });

            await newProduct.save();
            return res.redirect("/admin/addProducts")
        }else {
            return res.status(400).json("Product Already exist.please try with another name");
           
        }
        
    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect("/admin/pageerror")
        
    }
}




const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const searchQuery = {
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        };

        const productData = await Product.find(searchQuery)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('category')
            .populate('brand')
            .exec();

        const count = await Product.countDocuments(searchQuery);

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (productData) {
            res.render("products", {
                data: productData.map(product => ({
                    ...product.toObject(),
                    colorStockDetails: product.colorStock.map(stock => ({
                        color: stock.color,
                        quantity: stock.quantity,
                        status: stock.status
                    }))
                })),
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        console.error("Error in fetching products:", error);
        res.redirect("/pageerror");
    }
};



const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/product")
        
    } catch (error) {
        res.redirect("/pageerror")
        
    }
};

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;
       
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/product")
    } catch (error) {
       res.redirect("/pageerror");
    
    }
};


const getEditProduct = async (req,res)=>{

    try {
        const id = req.query.id;
        
        const product = await Product.findOne({_id:id})
        .populate('category',"_id name")
        .populate('brand','_id brandName');
        
       
       
        const category = await Category.find({isListed:true});
        
        const brand = await Brand.find({isBlocked:false});
       
        
        res.render("edit-product",{
            product:product,
            cat:category,
            brand:brand,
            productOffer:product.productOffer,
            colorStock:product.colorStock
           

        })
        

    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

const editProduct = async (req, res) => {
    try {
       
        const id = new mongoose.Types.ObjectId(req.params.id);
       

       
        const product = await Product.findById(id);

        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/product');
        }

       
        const {
            productName,
            brand,
            category,
            descriptionData,
            regularPrice,
            salePrice,
            colorStock,
            productOffer
        } = req.body;

        

        
        const existingProduct = await Product.findOne({
            productName,
            _id: { $ne: product._id }
        });

        if (existingProduct) {
            req.flash('error', 'Product with this name already exists');
            return res.redirect(`/admin/editProduct/${id}`);
        }

        const categoryId = await Category.findById(category);

        if(!categoryId){

            return res.json({message:"Invalid category name"})
        }

        const categoryOffer = categoryId.categoryOffer || 0;
        const productOfferValue = parseFloat(productOffer) || 0;
       const finalOffer = Math.max(categoryOffer,productOfferValue);
       

       const calculatedSalePrice = finalOffer > 0 
       ? Math.round(parseFloat(regularPrice) * (1 - finalOffer / 100))
       : parseFloat(regularPrice);


        
        let images = product.productImage || [];
        if (req.files && req.files.length > 0) {
            const newImages = [];
            for (const file of req.files) {
                const originalImagePath = file.path;
                const resizedImagePath = path.join('public','uploads','product-images',file.filename);

               
                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                newImages.push(file.filename);
            }
            images = [...images, ...newImages];
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            id,
            {
                $set: {
                    productName,
                    brand,
                    category,
                    description: descriptionData,
                    regularPrice: parseFloat(regularPrice),
                    salePrice: calculatedSalePrice,
                    productImage: images,
                    productOffer: productOfferValue,
                    colorStock: colorStock.map(stock => ({
                        color: stock.color,
                        quantity: parseInt(stock.quantity),
                        status: stock.status
                    })),
                    lastUpdated: new Date()  // Add this to track updates
                }
            },
            { new: true }  // Return updated document
        );
       

        if (!updatedProduct) {
            req.flash('error', 'Error updating product');
            return res.redirect('/admin/product');
        }


       req.flash("Product updated successfully");
       res.redirect('/admin/product');

    } catch (error) {
        console.error('Edit Product Error:', error);
        req.flash('error', 'Error updating product');
        res.redirect('/admin/product');
    }
};

const deleteSingleImage = async(req,res)=>{
    try {

        const {imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath = path.join("public","uploads","re-image",imageNameToServer);
        if(fs.existsSync(imagePath)){
         fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted Successfully`)
        } else{
            console.log(`image ${imageNameToServer}  not found`)
        }
        res.send({status:true})
        
    } catch (error) {
        res.redirect("/pageerror")
    }
}



module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}