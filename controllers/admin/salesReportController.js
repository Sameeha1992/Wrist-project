const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const Order = require("../../models/orderSchema");

const moment = require('moment');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const {text} = require('pdfkit');
const PdfPrinter = require("pdfmake");

const fonts = {
    Roboto: {

    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
    }
}


const renderSalesReportPage = async(req,res)=>{

    try {

        res.status(200).render('salesReport')
        
        
    } catch (error) {

        console.error('An error occured while loading the sales report page')
        
    }
}

const fetchSalesReport = async(req,res)=>{
  try {
      const {type,startDate,endDate} = req.query;

      if (!type) {
          return res.status(400).json({error: "Report type is required"});
      }

      let matchCriteria = {orderStatus: 'Delivered'};
      let start, end;

      switch(type) {
          case 'daily':
              start = new Date();
              start.setHours(0,0,0,0);
              end = new Date();
              end.setHours(23,59,59,999);
              break;

          case 'weekly':
              start = new Date();
              start.setDate(start.getDate() -7);
              end = new Date();
              break;

          case 'monthly':
              start = new Date();
              start.setDate(1);
              end = new Date();
              end.setMonth(end.getMonth() +1);
              end.setDate(0);
              break;
              
          case 'yearly':
              start = new Date(new Date().getFullYear(),0,1);
              end = new Date(new Date().getFullYear(),11,31);
              break;
          
          case 'custom':
              if (!startDate) {
                  return res.status(400).json({error: "Start date is required for custom range"});
              }
              start = new Date(startDate);
              end = endDate ? new Date(endDate) : new Date();
              end.setHours(23,59,59,999);
              break;

          default:
              return res.status(400).json({error: "Invalid report type"});
      }

      matchCriteria.createdAt = {$gte: start, $lte: end};

      const report = await Order.aggregate([
          {$match: matchCriteria},
          {
              $group:{
                  _id:{$dateToString: { format: '%Y-%m-%d', date: '$createdAt'}},
                  orderIds: { $push: '$_id' },
                  totalOrders: {$sum: 1},
                  totalDiscount: {$sum: {$ifNull: ['$totalDiscount', 0]}},
                  totalCouponDiscount: {$sum: {$ifNull: ['$couponDiscount', 0]}},
                  totalRevenue: {$sum: {$ifNull: ['$totalAmount', 0]}},
              },
          },
          {$sort: {_id: -1}},
      ]);

      const summary = await Order.aggregate([
          { $match: matchCriteria},
          {
              $group: {
                  _id: null,
                  salesCount: {$sum: 1},
                  orderAmount: {$sum: {$ifNull: ['$totalAmount', 0]}},
                  totalDiscount: {$sum: {
                      $add: [
                          {$ifNull: ['$totalDiscount', 0]},
                          {$ifNull: ['$couponDiscount', 0]}
                      ]
                  }}
              }
          }
      ]);

      return res.json({
          report,
          summary: summary[0] || {
              salesCount: 0,
              orderAmount: 0,
              totalDiscount: 0
          }
      });
      
  } catch (error) {
      console.error('An error occurred while getting sales report:', error);
      return res.status(500).json({error: "Internal server error"});
  }
};


const fetchSalesReportData = async (type, startDate,endDate)=>{

    let matchCriteria = {orderStatus: 'Delivered'};
    let start,end;

    switch (type) {
        case 'daily':
            start = new Date();
            start.setHours(0,0,0,0);
            end= new Date();
            end.setHours(23,59,59,999);
            break;

            case 'weekly':
                start = new Date();
                start.setDate(start.getDate()-7);
                end = new Date();
                break;

            case 'monthly':
                start = new Date();
                start.setDate(1);
                end = new Date();
                end.setMonth(end.getMonth() +1);
                end.setDate(0);
                break;
                
           case 'yearly':
            
           start = new Date(new Date().getFullYear(), 0, 1);
           end = new Date(new Date().getFullYear(), 11, 31);
           break;

           case 'custom':

           start = new Date(startDate);
            end = new Date(endDate);
            break;
            default:
                throw new Error('Invalid report type')
    }

      matchCriteria.createdAt = { $gte: start, $lte: end };

      const report = await Order.aggregate([
        {$match:matchCriteria},
        {
            $group: {
                _id: {$dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                orderIds: { $push: '$_id'},
                totalOrders: {$sum: 1},
                totalDiscount: {$sum: '$totalDiscount'},
                totalCouponDiscount: {$sum: '$couponDiscount'},
                totalRevenue: {$sum: {$ifNull: ['$totalAmount', 0]}}, // Fixed spelling and added null check
            },
        },

        { $sort: { _id: -1 } },
      ]);


      const summaryResult = await Order.aggregate([
        {$match: matchCriteria},
        {
            $group: {
                _id:null,
                salesCount: {$sum: 1}, // Count of orders
                orderAmount: {$sum: {$ifNull: ['$totalAmount', 0]}}, // Total order amount
                totalDiscount: {$sum: {
                  $add: [
                      {$ifNull: ['$totalDiscount', 0]}, 
                      {$ifNull: ['$couponDiscount', 0]}
                  ]
              }}            }
        }
      ]);

        const summary = summaryResult.length
        ? summaryResult[0]
        : { salesCount: 0, orderAmount: 0, totalDiscount: 0 };

  

     return { report, summary };
}



const downloadSalesReportPdf = async (req,res)=>{

    try {
        const { type, startDate, endDate } = req.query;
    
    
        const { report = [], summary = { salesCount: 0, orderAmount: 0, totalDiscount: 0 } } = await fetchSalesReportData(type, startDate, endDate);
    
        const printer = new PdfPrinter(fonts);
    
    
    
        //  document structure
        const docDefinition = {
          content: [
            {
              columns: [
                {
                  width: "*",
                  text: "SALES REPORT",
                  style: "header",
                },
                {
                  width: "auto",
                  table: {
                    widths: ["auto", "auto"],
                    body: [
                      ["Date Range:", { }],
                    ],
                  },
                  layout: "noBorders",
                },
              ],
            },
            {
              canvas: [{ type: "line", x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 2 }], // Horizontal line for visual separation
            },
            {
              text: "Sales Data",
              style: "subheader",
              margin: [0, 20, 0, 10],
            },
            {
              table: {
                headerRows: 1,
                widths: ["auto", "auto", "auto", "auto", "auto", "auto"],
                body: [
                  [
                    { text: "Date", style: "tableHeader" },
                    { text: "Order IDs", style: "tableHeader" },
                    { text: "Total Orders", style: "tableHeader" },
                    { text: "Total Discount", style: "tableHeader" },
                    { text: "Coupon Discount", style: "tableHeader" },
                    { text: "Total Revenue", style: "tableHeader" },
                  ],
                  ...report.map((item) => [
                    item._id, 
                    item.orderIds.length > 0 ? item.orderIds.join(', ') : 'No Orders',
                    item.totalOrders, 
                    `₹${(item.totalDiscount || 0).toFixed(2)}`, 
                    `₹${(item.totalCouponDiscount || 0).toFixed(2)}`, 
                    `₹${(item.totalRevenue || 0).toFixed(2)}`, // Fixed spelling and added null check
                ]),

                ],
              },
              layout: 'lightHorizontalLines',
            },
            {
              text: "Summary",
              style: "subheader",
              margin: [0, 20, 0, 5],
            },
            {
              columns: [
                { width: "*", text: "" },
                {
                  width: "auto",
                  style: "totals",
                  table: {
                    widths: ["auto", "auto"],
                    body: [
                      [
                        { text: "Total Sales Count", style: "summaryText" },
                        { text: `${summary.salesCount}`, alignment: "right" },
                      ],
                      [
                        { text: "Total Discounts", style: "summaryText" },
                        { text: `${summary.totalDiscount}`, alignment: "right" },
                      ],
                      [
                        { text: "Total Order Amount", style: "summaryText" },
                        { text: `${summary.orderAmount}`, alignment: "right" },
                      ],
                    ],
                  },
                  layout: "noBorders",
                },
              ],
            },
          ],
          styles: {
            header: {
              fontSize: 20,
              bold: true,
              margin: [0, 0, 0, 10],
            },
            subheader: {
              fontSize: 16,
              bold: true,
              margin: [0, 10, 0, 5],
            },
            tableHeader: {
              bold: true,
              fontSize: 12,
              color: "black",
              fillColor: "#f2f2f2", 
              alignment: "center",
            },
            summaryText: {
              fontSize: 12,
              marginTop: 5,
            },
            totals: {
              margin: [0, 20, 0, 0],
            },
          },
          defaultStyle: {
            fontSize: 10,
          },
        };
    
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
    
        //  headers for the PDF response
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=Sales_Report_${type || 'custom'}.pdf`
        );
    
        
        pdfDoc.pipe(res);
        pdfDoc.end();
      } catch (error) {
        console.error('An error occurred while generating the sales report PDF!', error);
        
      }
    

};




 const downloadSalesReportExel = async (req, res, next) => {
    try {
        const { type, startDate, endDate } = req.query;

        // Fetch the report and summary data
        const { report, summary } = await fetchSalesReportData(type, startDate, endDate);

        // Create a new workbook and worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Summary Section
        worksheet.addRow(['Summary Report']).font = { bold: true, size: 14 };
        worksheet.addRow([]); 
        worksheet.addRow(['Total Sales Count:', summary.salesCount || 0]);
        worksheet.addRow(['Total Order Amount:', `₹${summary.orderAmount || 0}`]);
        worksheet.addRow(['Total Discounts:', `₹${summary.totalDiscount || 0}`]);
        worksheet.addRow([]); 

        //  Headers for Report Data
        worksheet.addRow(['Sales Report Data']).font = { bold: true, size: 12 };
        worksheet.addRow([]);
        worksheet.columns = [
    { header: 'Date', key: '_id', width: 15 },
    { header: 'Order IDs', key: 'orderIds', width: 30 },
    { header: 'Total Orders', key: 'totalOrders', width: 15 },
    { header: 'Total Discount', key: 'totalDiscount', width: 15 },
    { header: 'Coupon Discount', key: 'totalCouponDiscount', width: 15 },
    { header: 'Total Revenue', key: 'totalRevenue', width: 15 }, // Fixed spelling
];

report.forEach(item => {
  worksheet.addRow({
      _id: item._id,
      orderIds: item.orderIds.join('\n'),
      totalOrders: item.totalOrders,
      totalDiscount: `₹${(item.totalDiscount || 0).toFixed(2)}`,
      totalCouponDiscount: `₹${(item.totalCouponDiscount || 0).toFixed(2)}`,
      totalRevenue: `₹${(item.totalRevenue || 0).toFixed(2)}`, // Fixed spelling and added null check
  });
});
        
        worksheet.getRow(8).font = { bold: true }; 
        worksheet.getRow(8).alignment = { horizontal: 'center' };

        worksheet.eachRow((row, rowNumber) => {
          if (rowNumber > 8) { 
              row.getCell(2).alignment = { wrapText: true }; 
          }
      });

        //  response headers
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales-report.xlsx');

        // Write to the response
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error generating Excel report:', error);
        next(error);
    }
};




module.exports={
    renderSalesReportPage,
    fetchSalesReport,
    fetchSalesReportData,
    downloadSalesReportPdf,
    downloadSalesReportExel
}