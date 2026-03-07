"use strict";
$("#LoadIndicator").dxLoadPanel({
    shadingColor: "rgba(0,0,0,0.4)",
    indicatorSrc: "images/Indus logo.png",
    message: 'Please Wait...',
    width: 250,
    showPane: true,
    shading: true,
    closeOnOutsideClick: false,
    visible: false
});
$("#StockBatchWiseGrid").dxDataGrid({
    dataSource: [],
    columnAutoWidth: true,
    showBorders: true,
    showRowLines: true,
    allowColumnReordering: true,
    allowColumnResizing: true,
    sorting: {
        mode: "multiple"
    },
    paging: { enabled: false },
    selection: { mode: "single" },
    filterRow: { visible: true, applyFilter: "auto" },
    columnChooser: { enabled: false },
    headerFilter: { visible: true },
    searchPanel: { visible: false },
    loadPanel: {
        enabled: true,
        height: 90,
        width: 200,
        text: 'Data is loading...'
    },
    editing: {
        mode: "cell",
    },
    columns: [
        { dataField: "ParentTransactionID", visible: false, caption: "ParentTransactionID", width: 120 },
        { dataField: "ItemID", visible: false, caption: "ItemID", width: 120 },
        { dataField: "ItemGroupID", visible: false, caption: "ItemGroupID", width: 120 },
        { dataField: "ItemSubGroupID", visible: false, caption: "ItemSubGroupID", width: 120 },
        { dataField: "WarehouseID", visible: false, caption: "WarehouseID", width: 120 },
        { dataField: "ItemCode", visible: true, caption: "ItemCode", width: 80 },
        { dataField: "ItemGroupName", visible: true, caption: "Item Group", width: 120 },
        { dataField: "ItemName", visible: true, caption: "ItemName", width: 400 },
        { dataField: "ItemDescription", visible: false, caption: "ItemDescription", width: 200 },
        { dataField: "StockUnit", visible: true, caption: "Stock Unit", width: 100 },
        { dataField: "FloorStock", visible: true, caption: "Floor Stock", width: 100 },
        { dataField: "GRNNo", visible: true, caption: "Receipt No.", width: 100 },
        { dataField: "GRNDate", visible: true, caption: "Receipt Date", width: 100 },
        { dataField: "BatchNo", visible: true, caption: "Batch No", width: 100 },
        { dataField: "SupplierBatchNo", visible: true, caption: "Supplier Batch No", width: 100 },
        { dataField: "MfgDate", visible: true, width: 100, dataType: "date", format: "dd-MMM-yyyy" },
        { dataField: "ExpiryDate", visible: true, width: 100, dataType: "date", format: "dd-MMM-yyyy" },
        { dataField: "Warehouse", visible: true, caption: "Warehouse", width: 100 },
        { dataField: "Bin", visible: true, caption: "Bin", width: 80 },
        { dataField: "WtPerPacking", visible: false, caption: "WtPerPacking", width: 100 },
        { dataField: "UnitPerPacking", visible: false, caption: "UnitPerPacking", width: 100 },
        { dataField: "ConversionFactor", visible: false, caption: "ConversionFactor", width: 100 }
    ],
    height: function () {
        return window.innerHeight / 1.3;
    },
    onRowPrepared: function (e) {
        if (e.rowType === "header") {
            e.rowElement.css('background', '#509EBC');
            e.rowElement.css('color', 'white');
            e.rowElement.css('font-weight', 'bold');
        }
        e.rowElement.css('fontSize', '11px');
    },

});

GetAllFloorStock("");
function GetAllFloorStock(ItemGroupID) {
    $("#LoadIndicator").dxLoadPanel("instance").option("visible", true);
    try {
        $.ajax({
            type: "POST",
            url: "WebService_FloorStockReset.asmx/GetAllFloorStock",
            data: `{ 'ItemGroupID': '${ItemGroupID}' }`,
            contentType: "application/json; charset=utf-8",
            dataType: "text",
            success: function (results) {
                let res = results.replace(/\\/g, '');
                res = res.replace(/"d":""/g, '');
                res = res.replace(/""/g, '');
                res = res.replace(/u0026/g, '&');
                res = res.replace(/u0027/g, "'");
                res = res.replace(/:,/g, ":null,");
                res = res.replace(/,}/g, ",null}");
                res = res.replace(/:}/g, ":null}");
                res = res.replaceAll("\'", "#-");
                res = res.substr(1);
                res = res.slice(0, -1);
                $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
                let StockRES1 = JSON.parse(res);
                $("#StockBatchWiseGrid").dxDataGrid({
                    dataSource: StockRES1
                });
            }
        });
    } catch (e) {
        $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
        console.log(e);
    }
}


$("#BtnSave").click(function () {
    let batchstockrow = $("#StockBatchWiseGrid").dxDataGrid('instance');
    if (batchstockrow.totalCount() <= 0) {
        DevExpress.ui.notify("Please add any item to adjust physical stock!", "warning", 1200);
        return;
    }
    var prefix = "RTS";
    var voucherid = -16;
    var totalreceiptqty = 0;
    try {

        var jsonObjectsTransactionMain = [];
        var TransactionMainRecord = {};

        TransactionMainRecord.VoucherID = -25;

        TransactionMainRecord.Particular = "Stock Reset";
        TransactionMainRecord.TotalQuantity = totalreceiptqty;
        jsonObjectsTransactionMain.push(TransactionMainRecord);

        var jsonObjectsTransactionDetail = [];
        var TransactionDetailRecord = {};
        for (var e = 0; e < batchstockrow.totalCount(); e++) {
            TransactionDetailRecord = {};



            TransactionDetailRecord.TransID = e + 1;
            TransactionDetailRecord.ParentTransactionID = batchstockrow._options.dataSource[e].ParentTransactionID;
            TransactionDetailRecord.IssueTransactionID = batchstockrow._options.dataSource[e].TransactionID;
            TransactionDetailRecord.DepartmentID = 0;   // batchstockrow._options.dataSource[e].DepartmentID;
            TransactionDetailRecord.ItemID = batchstockrow._options.dataSource[e].ItemID;
            TransactionDetailRecord.ItemGroupID = batchstockrow._options.dataSource[e].ItemGroupID;
            TransactionDetailRecord.JobBookingID = batchstockrow._options.dataSource[e].JobBookingID;
            TransactionDetailRecord.JobBookingJobCardContentsID = batchstockrow._options.dataSource[e].JobBookingJobCardContentsID;
            TransactionDetailRecord.MachineID = batchstockrow._options.dataSource[e].MachineID;
            TransactionDetailRecord.ProcessID = batchstockrow._options.dataSource[e].ProcessID;
            TransactionDetailRecord.ConsumeQuantity = batchstockrow._options.dataSource[e].FloorStock;
            TransactionDetailRecord.IssueQuantity = batchstockrow._options.dataSource[e].FloorStock;
            TransactionDetailRecord.BatchNo = batchstockrow._options.dataSource[e].BatchNo;
            TransactionDetailRecord.BatchID = batchstockrow._options.dataSource[e].BatchID;
            TransactionDetailRecord.FloorWarehouseID = batchstockrow._options.dataSource[e].FloorWarehouseID;
            TransactionDetailRecord.StockUnit = batchstockrow._options.dataSource[e].StockUnit;
            TransactionDetailRecord.WarehouseID = batchstockrow._options.dataSource[e].BinID;

            //TransactionDetailRecord.TransID = e + 1;
            //TransactionDetailRecord.ItemID = Number(batchstockrow._options.dataSource[e].ItemID);
            //TransactionDetailRecord.JobBookingJobCardContentsID = Number(batchstockrow._options.dataSource[e].JobBookingJobCardContentsID);
            //TransactionDetailRecord.JobBookingID = Number(batchstockrow._options.dataSource[e].JobBookingID);
            //TransactionDetailRecord.ItemGroupID = Number(batchstockrow._options.dataSource[e].ItemGroupID);
            //TransactionDetailRecord.ParentTransactionID = Number(batchstockrow._options.dataSource[e].ParentTransactionID);
            ////if (Number(batchstockrow[e].AdjustedStock) > 0) {
            ////    TransactionDetailRecord.ReceiptQuantity = Number(batchstockrow[e].AdjustedStock);
            ////} else if
            //// (Number(batchstockrow[e].AdjustedStock) < 0) {
            //TransactionDetailRecord.IssueQuantity = Number(batchstockrow._options.dataSource[e].FloorStock);
            //TransactionDetailRecord.ConsumeQuantity = Number(batchstockrow._options.dataSource[e].FloorStock);
            //// }
            ////if (Number(batchstockrow[e].CurrentStock) > 0) {
            ////    TransactionDetailRecord.OldStockQuantity = Number(batchstockrow[e].CurrentStock);
            ////}
            ////if (Number(batchstockrow[e].CurrentStock) > 0) {
            ////    TransactionDetailRecord.NewStockQuantity = Number(batchstockrow[e].NewStock);
            ////}
            //TransactionDetailRecord.BatchNo = batchstockrow._options.dataSource[e].BatchNo;
            //TransactionDetailRecord.BatchID = batchstockrow._options.dataSource[e].BatchID;
            //if (Number(TransactionDetailRecord.BatchID) <= 0) {
            //    TransactionDetailRecord.SupplierBatchNo = batchstockrow._options.dataSource[e].SupplierBatchNo;
            //    if (batchstockrow._options.dataSource[e].MfgDate !== undefined && batchstockrow._options.dataSource[e].MfgDate !== null && batchstockrow._options.dataSource[e].MfgDate !== "") TransactionDetailRecord.MfgDate = new Date(batchstockrow._options.dataSource[e].MfgDate).format('yyyy-MM-dd HH:mm:ss');
            //    if (batchstockrow._options.dataSource[e].ExpiryDate !== undefined && batchstockrow._options.dataSource[e].ExpiryDate !== null && batchstockrow._options.dataSource[e].ExpiryDate !== "") TransactionDetailRecord.ExpiryDate = new Date(batchstockrow._options.dataSource[e].ExpiryDate).format('yyyy-MM-dd HH:mm:ss');
            //}
            //TransactionDetailRecord.StockUnit = batchstockrow._options.dataSource[e].StockUnit;
            //TransactionDetailRecord.WarehouseID = batchstockrow._options.dataSource[e].WarehouseID;

            jsonObjectsTransactionDetail.push(TransactionDetailRecord);
        }

        jsonObjectsTransactionMain = JSON.stringify(jsonObjectsTransactionMain);
        jsonObjectsTransactionDetail = JSON.stringify(jsonObjectsTransactionDetail);

        var txt = 'If you confident please click on \n' + 'Yes, Save it ! \n' + 'otherwise click on \n' + 'Cancel';
        swal({
            title: "Do you want to continue",
            text: txt,
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, Save it !",
            closeOnConfirm: true
        },
            function () {
                $("#LoadIndicator").dxLoadPanel("instance").option("visible", true);
                try {
                    $.ajax({
                        type: "POST",
                        url: "WebService_FloorStockReset.asmx/SaveStockResetVoucher",
                        data: '{prefix:' + JSON.stringify(prefix) + ',voucherid:' + JSON.stringify(voucherid) + ',jsonObjectsTransactionMain:' + jsonObjectsTransactionMain + ',jsonObjectsTransactionDetail:' + jsonObjectsTransactionDetail + '}',
                        // data: '{prefix:' + JSON.stringify(prefix) + '}',
                        contentType: "application/json; charset=utf-8",
                        dataType: "json",
                        success: function (results) {
                            var res = JSON.stringify(results);
                            res = res.replace(/"d":/g, '');
                            res = res.replace(/{/g, '');
                            res = res.replace(/}/g, '');
                            res = res.substr(1);
                            res = res.slice(0, -1);

                            $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);

                            if (res === "Success") {
                                // RadioValue = "Pending Requisitions";
                                swal("Saved!", "Your data saved", "success");
                                // alert("Your Data has been Saved Successfully...!");
                                location.reload();
                            } else if (res.includes("Error:")) {
                                swal("Error..!", res, "error");
                            }
                        },
                        error: function errorFunc(jqXHR) {
                            $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
                            swal("Error!", "Please try after some time..", "");
                            console.log(jqXHR);
                        }
                    });
                } catch (e) {
                    console.log(e);
                }
            });
    } catch (e) {
        console.log(e);
    }
});


getItemName()
function getItemName() {
    var queryString = new Array();
    $.ajax({
        type: "POST",
        url: "WebService_Master.asmx/GetItem",
        data: '{}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027u0027/g, "''");
            res = res.replace(/u0026/g, "&");
            res = res.substr(1);
            res = res.slice(0, -1);
            var Res1 = JSON.parse(res);


            $("#SelItemGroupName").dxSelectBox({
                items: Res1,
                placeholder: "Select--",
                displayExpr: 'ItemGroupName',
                valueExpr: 'ItemGroupID',
                searchEnabled: true,
                showClearButton: true,
                onValueChanged: function (e) {
                    var selectedItemGroupID = e.value;
                    GetAllFloorStock(selectedItemGroupID);
                }

            });
        }
    });
}