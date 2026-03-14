"use strict";

$("#LoadIndicator").dxLoadPanel({
    shadingColor: "rgba(0,0,0,0.4)",
    indicatorSrc: "images/Indus logo.png",
    message: 'Please Wait...',
    width: 300,
    showPane: true,
    shading: true,
    closeOnOutsideClick: false,
    visible: false
});

$("#gridnewstock").dxDataGrid({
    dataSource: [],
    columnAutoWidth: true,
    showBorders: true,
    showRowLines: true,
    allowColumnReordering: true,
    allowColumnResizing: true,
    columnResizingMode: "widget",
    sorting: {
        mode: "multiple"
    },
    //selection: { mode: "multiple", showCheckBoxesMode: "always" },
    height: function () {
        return window.innerHeight / 1.2;
    },
    filterRow: { visible: true },
    headerFilter: { visible: true },
    searchPanel: { visible: true },
    onRowPrepared: function (e) {
        if (e.rowType === "header") {
            e.rowElement.css('background', '#509EBC');
            e.rowElement.css('color', 'white');
            e.rowElement.css('font-weight', 'bold');
        }
        e.rowElement.css('fontSize', '11px');
    },
    editing: {
        mode: "cell",
        allowUpdating: true
    },
    onEditorPreparing: function (e) {
        if (e.parentType === 'headerRow' && e.command === 'select') {
            e.editorElement.remove();
        }
    },
    onEditingStart: function (e) {
        if (e.column.visibleIndex > 1) {
            e.cancel = true;
        }
    }
});

function Upload() {
    //Reference the FileUpload element.
    var fileUpload = document.getElementById("fileUpload");

    //Validate whether File is valid Excel file.
    var regex = /^([a-zA-Z0-9\s_\\.\-:])+(.xls|.xlsx)$/;
    if (regex.test(fileUpload.value.toLowerCase())) {
        $("#LoadIndicator").dxLoadPanel("instance").option("visible", true);
        if (typeof (FileReader) !== "undefined") {
            var reader = new FileReader();

            //For Browsers other than IE.
            if (reader.readAsBinaryString) {
                reader.onload = function (e) {
                    ProcessExcel(e.target.result);
                };
                reader.readAsBinaryString(fileUpload.files[0]);
            } else {
                //For IE Browser.
                reader.onload = function (e) {
                    var data = "";
                    var bytes = new Uint8Array(e.target.result);
                    for (var i = 0; i < bytes.byteLength; i++) {
                        data += String.fromCharCode(bytes[i]);
                    }
                    ProcessExcel(data);
                };
                reader.readAsArrayBuffer(fileUpload.files[0]);
            }
        } else {
            $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
            alert("This browser does not support HTML5.");
        }
    } else {
        alert("Please upload a valid Excel file.");
    }
}

function ProcessExcel(data) {
    //Read the Excel File data.
    var workbook = XLSX.read(data, {
        type: 'binary'
    });

    var SNo = Number(document.getElementById("SheetNumber").value);
    if (isNaN(SNo) || SNo === undefined || SNo <= 0) SNo = 0;
    //Fetch the name of First Sheet.
    var firstSheet = workbook.SheetNames[SNo];

    //Read all rows from First Sheet into an JSON array.
    var excelRows = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[firstSheet]);

    $("#gridnewstock").dxDataGrid({
        dataSource: excelRows
    });

    $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
}

$("#BtnSave").click(function () {
    var dataGrid = $("#gridnewstock").dxDataGrid('instance');
    if (dataGrid._options.dataSource.length <= 0) {
        DevExpress.ui.notify("Please add any Spare to adjust physical stock!", "warning", 1200);
        return;
    }

    try {

        var jsonObjectsTransactionMain = [];
        var TransactionMainRecord = {};

        ///Main 
        TransactionMainRecord = {};
        jsonObjectsTransactionMain = [];

        TransactionMainRecord.TotalQuantity = 0;
        TransactionMainRecord.Particular = "Stock Verification";
        TransactionMainRecord.Narration = "";

        var jsonObjectsTransactionDetail = [];
        var TransactionDetailRecord = {};
        for (var e = 0; e < dataGrid._options.dataSource.length; e++) {
            if (dataGrid._options.dataSource[e].SpareID === "" || dataGrid._options.dataSource[e].SpareID === undefined) continue;

            ////Details
            TransactionDetailRecord = {};

            TransactionDetailRecord.TransID = e + 1;
            TransactionDetailRecord.SpareID = dataGrid._options.dataSource[e].SpareID;
            TransactionDetailRecord.SpareGroupID = dataGrid._options.dataSource[e].SpareID;
            TransactionDetailRecord.PurchaseRate = Number(dataGrid._options.dataSource[e].PurchaseRate);

            TransactionDetailRecord.ReceiptQuantity = Number(dataGrid._options.dataSource[e].ReceiptQuantity);
            TransactionDetailRecord.NewStockQuantity = Number(dataGrid._options.dataSource[e].ReceiptQuantity);
            TransactionDetailRecord.OldStockQuantity = Number(dataGrid._options.dataSource[e].ReceiptQuantity);

            TransactionDetailRecord.BatchNo = dataGrid._options.dataSource[e].BatchNo;
            TransactionDetailRecord.StockUnit = dataGrid._options.dataSource[e].StockUnit;
            TransactionDetailRecord.WarehouseID = dataGrid._options.dataSource[e].WarehouseID;

            TransactionMainRecord.TotalQuantity = Number(TransactionMainRecord.TotalQuantity) + Number(TransactionDetailRecord.ReceiptQuantity);

            jsonObjectsTransactionDetail.push(TransactionDetailRecord);
        }

        jsonObjectsTransactionMain.push(TransactionMainRecord);

        if (jsonObjectsTransactionMain.length <= 0) return;

        var txt = 'Do you want to continue..?';
        swal({
            title: "Importing stock data...",
            text: txt,
            type: "warning",
            showCancelButton: true,
            confirmButtonColor: "#DD6B55",
            confirmButtonText: "Yes, Save it !",
            closeOnConfirm: true
        },
            function () {
                $("#LoadIndicator").dxLoadPanel("instance").option("visible", true);

                $.ajax({
                    type: "POST",
                    url: "WebServiceItemPhysicalVerification.asmx/ImportSpareStockVerificationData",
                    data: '{jsonObjectsTransactionMain:' + JSON.stringify(jsonObjectsTransactionMain) + ',jsonObjectsTransactionDetail:' + JSON.stringify(jsonObjectsTransactionDetail) + '}',
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
                            swal("Saved!", "Your data saved", "success");
                        } else if (res.includes("Error:")) {
                            swal("Error..!", res, "error");
                            console.log(res);
                        } else {
                            swal("Error..!", res, "warning");
                        }
                    },
                    error: function errorFunc(jqXHR) {
                        $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
                        console.log(jqXHR);
                    }
                });
            });
    } catch (ex) {
        console.log(ex);
    }
});
