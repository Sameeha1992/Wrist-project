const Brand = require("../../models/brandSchema");


const getBrandPage = async (req,res)=>{
    try {
        const page = parseInt(req.query.page) ||1;
        const limit = 4;
        const skip = (page-1)*limit;
        const brandData = await Brand.find({}).sort({ceatedAt:-1}).skip(skip).limit(limit);
        const totalBrands = await Brand.countDocuments();
        const totalPages = Math.ceil(totalBrands/limit);
        const reverseBrand = brandData.reverse();
        res.render("brands",{
            data:reverseBrand,
            currentPage:page,
            totalPages :totalPages,
            totalBrands:totalBrands,
        })
    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

//add brand code orginal:-


const addBrand = async (req,res)=>{
    try {
        const brand = req.body.name;
        const findBrand = await Brand.findOne({brandName:brand});
        if(findBrand){
            return res.status(400).json({error:"Brand already exists"})
        }
        if(!findBrand){
            const image = req.file.filename;
            const newBrand = new Brand({
                brandName: brand,
                brandImage:image,    
            })
            await newBrand.save();
            res.redirect("/admin/brands");
        }
        
    } catch (error) {
        console.error("Error adding brand",error);
        
        res.redirect("/pageerror")
    }
}





const blockBrand = async(req,res)=>{
    try {
        const id = req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:true}});
        res.json({success:true,message:"Brand blocked successfully"})
        
    } catch (error) {
        console.error("Error in blocking brand",error)
        res.json({success:false,message:"Error in blocking the brand"})
        
    }
}

const unBlockBrand = async(req,res)=>{
    try {
        const id = req.query.id;
        await Brand.updateOne({_id:id},{$set:{isBlocked:false}});
        res.json({success:true,message:"Brand unblocked successfully"})
        
    } catch (error) {
        console.error("Error in unblocking brand:",error)
        res.json({success:false,message:"Error in unblocking the brand"})
        
    }
}


const deleteBrand = async(req,res)=>{
    
    try{

    const {id} = req.query;
    if(!id){
        return res.status(400).send("Brand ID is required")
    }

    await Brand.deleteOne({_id:id});
    res.redirect("/admin/brands")
} 
catch(error){
    console.error("Error deleting brand:",error);
    res.status(500).redirect("/pageerror")
}
}





module.exports={
    getBrandPage,
    addBrand,
    blockBrand,
    unBlockBrand,
    deleteBrand
}