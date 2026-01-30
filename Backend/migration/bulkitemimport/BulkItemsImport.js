var masterColumns = [];
var excelRows;
var seconds = 1000, inProgress = false, intervalId;

var MasterID = "", MasterName = "", GblItemNameString = "", GblItemDecString = "";

var fileUpload = $("#fileUpload").prop('disabled', true);

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
            onSelectionChanged: function (data) {
                if (data.selectedItem !== null) { 
                MasterID = data.selectedItem.ItemGroupID;
                MasterName = data.selectedItem.ItemGroupName;
                getMasterColumns();
                  
                // Handle the query string creation
                if (queryString.length === 0) {
                    if (window.location.search.split('?').length > 1) {
                        var params = window.location.search.split('?')[1].split('&');
                        for (var i = 0; i < params.length; i++) {
                            var key = params[i].split('=')[0];
                            var value = decodeURIComponent(params[i].split('=')[1]).replace(/"/g, '');
                            queryString[key] = value;
                        }
                    }
                }

                if (queryString["MasterID"] !== null) {
                    queryString["MasterID"] = MasterID;
                }
                if (queryString["MasterName"] !== null) {
                    queryString["MasterName"] = MasterName;
                }
                }
                fileUpload.prop('disabled', data.selectedItem === null);
            }
        });
    }
});
 
function exportdata() {
  
    // Extract field names
    var fieldNames = masterColumns.map(column => column.FieldName);

    // Create an object to hold data
    var data = {};

    // Initialize data object with empty arrays
    fieldNames.forEach(fieldName => {
        data[fieldName] = [];
    });

    // Populate data object with corresponding values
    masterColumns.forEach(column => {
        data[column.FieldName].push(column[column.FieldName]);  
    });

    // Convert the data object to a format suitable for xlsx library
    var dataArray = [fieldNames, ...fieldNames.map(fieldName => data[fieldName])];

    // Create a new workbook
    var wb = XLSX.utils.book_new();

    // Convert the data array to a worksheet
    var ws = XLSX.utils.aoa_to_sheet(dataArray);

    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "Columns");

    // Save the workbook as an Excel file
    XLSX.writeFile(wb, "./ExportMaster.xls");
}
 
 
function getMasterColumns() {
    $.ajax({
        type: "POST",
        url: "WebService_Master.asmx/Master",
        data: '{masterID:' + JSON.stringify(MasterID) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027u0027/g, "''");
            res = res.substr(1);
            res = res.slice(0, -1);
            masterColumns = "";
            masterColumns = JSON.parse(res);
        }
    });

    $.ajax({
        type: "POST",
        url: "WebService_Master.asmx/MasterGridColumnHide",
        data: '{masterID:' + JSON.stringify(MasterID) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.substr(1);
            res = res.slice(0, -1);
            var RES1 = JSON.parse(res);

            GblItemNameString = RES1[0].ItemNameFormula;
            GblItemDecString = RES1[0].ItemDescriptionFormula;

        }
    });
}

function SaveData() {
    try {
        if (!excelRows) {
            alert("Please check import data by clicking show button");
            return;
        }
        if (MasterID === "" || MasterName === "" || MasterID <= 0) return;

        //$("#progressBarStatus").removeClass("complete");
        //if (inProgress) {
        //    clearInterval(intervalId);
        //} else {
        //    setCurrentStatus();
        //    intervalId = setInterval(timer, 1000);
        //}
        //inProgress = !inProgress;
        $("#LoadIndicator").dxLoadPanel("instance").option("visible", true);

        var ObjIMDRecord = [];
        var ArrIMDRecord = {};
        var ObjMainData = [];
        var ObjDetailsData = {};

        for (var i = 0; i < excelRows.length; i++) {
            ObjMainData = [];
            ObjDetailsData = {};

            ///Progress status
            //progressBarStatus.option("value", excelRows.length - (seconds - i));
            //$("#timer").text(("0" + (seconds - i)).slice(-2));
            //document.getElementById("totalItems").innerHTML = Number(document.getElementById("totalItems").innerHTML) - i;

            ////            ObjDetailsData.ItemName = MasterName;
            ObjDetailsData.ItemType = MasterName;
            ObjDetailsData.ItemGroupID = MasterID;

            ObjIMDRecord = [];
            var count = 0; var INValue = ""; var DSValue = "";
            for (var j = 0; j < masterColumns.length; j++) {
                ArrIMDRecord = {};
                var colnam = masterColumns[j].FieldName;
                var colvalue = excelRows[i][colnam];
                if (colvalue === "-") colvalue = "";
                if (colvalue === undefined || colvalue === "undefined") {
                    continue;
                }
                ArrIMDRecord.FieldName = masterColumns[j].FieldName.trim();
                ArrIMDRecord.ParentFieldName = masterColumns[j].FieldName.trim();

                ArrIMDRecord.ParentItemID = 0;

                ArrIMDRecord.ParentFieldValue = colvalue;
                ArrIMDRecord.FieldValue = colvalue;


                if (GblItemNameString !== "" && GblItemNameString !== undefined && GblItemNameString !== "null" && GblItemNameString !== null) {

                    if (GblItemNameString.includes(masterColumns[j].FieldName)) {
                        if (INValue === "") {
                            if (masterColumns[j].UnitMeasurement === "" || masterColumns[j].UnitMeasurement === null || masterColumns[j].UnitMeasurement.toUpperCase() === "NULL") {
                                INValue = colvalue;
                            }
                            else {
                                INValue = colvalue + " " + masterColumns[j].UnitMeasurement;
                            }
                        } else {
                            if (masterColumns[j].UnitMeasurement === "" || masterColumns[j].UnitMeasurement === null || masterColumns[j].UnitMeasurement.toUpperCase() === "NULL") {
                                INValue = INValue + ", " + colvalue;
                            }
                            else {
                                INValue = INValue + ", " + colvalue + " " + masterColumns[j].UnitMeasurement;
                            }
                        }
                    }
                }

                if (GblItemDecString !== "" && GblItemDecString !== undefined && GblItemDecString !== "null" && GblItemDecString !== null) {

                    if (GblItemDecString.includes(masterColumns[j].FieldName)) {
                        if (DSValue === "") {
                            DSValue = masterColumns[j].FieldName + ":" + colvalue;
                        } else {
                            DSValue = DSValue + ", " + masterColumns[j].FieldName + ":" + colvalue;
                        }
                    }
                }

                ArrIMDRecord.SequenceNo = count + 1;
                ArrIMDRecord.ItemGroupID = MasterID;

                if (masterColumns[j].FieldName.toUpperCase() === "STOCKUNIT") {
                    ObjDetailsData.StockUnit = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "PURCHASEUNIT") {
                    ObjDetailsData.PurchaseUnit = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "ESTIMATIONUNIT") {
                    ObjDetailsData.EstimationUnit = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "UNITPERPACKING") {
                    ObjDetailsData.UnitPerPacking = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "WTPERPACKING") {
                    ObjDetailsData.WtPerPacking = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "CONVERSIONFACTOR") {
                    ObjDetailsData.ConversionFactor = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "ITEMSUBGROUPID") {
                    ObjDetailsData.ItemSubGroupID = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "PRODUCTHSNID") {
                    ObjDetailsData.ProductHSNID = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "STOCKTYPE") {
                    ObjDetailsData.StockType = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "STOCKCATEGORY") {
                    ObjDetailsData.StockCategory = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "SIZEW") {
                    ObjDetailsData.SizeW = colvalue;
                } else if (masterColumns[j].FieldName.toUpperCase() === "PURCHASERATE") {
                    ObjDetailsData.PurchaseRate = colvalue;
                }

                ObjIMDRecord.push(ArrIMDRecord);
                count = count + 1;
            }

            if (excelRows[i]["ItemName"] !== "" && excelRows[i]["ItemName"] !== undefined) {
                INValue = excelRows[i]["ItemName"];
            }
            ObjDetailsData.ItemName = INValue;
            ObjDetailsData.ItemDescription = DSValue;

            ObjMainData.push(ObjDetailsData);

            $.ajax({
                type: "POST",
                async: false,
                url: "WebService_Master.asmx/SaveData",
                data: '{CostingDataItemMaster:' + JSON.stringify(ObjMainData) + ',CostingDataItemDetailMaster:' + JSON.stringify(ObjIMDRecord) + ',MasterName:' + JSON.stringify(MasterName) + ',ItemGroupID:' + JSON.stringify(MasterID) + ',ActiveItem:' + JSON.stringify(true) + ',StockRefCode:' + JSON.stringify("") + '}',
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (results) {
                    var res = JSON.stringify(results);
                    res = res.replace(/"d":/g, '');
                    res = res.replace(/{/g, '');
                    res = res.replace(/}/g, '');
                    res = res.substr(1);
                    res = res.slice(0, -1);
                },
                error: function errorFunc(jqXHR) {
                    alert(jqXHR);
                }
            });
        }
        $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
        alert("Your Data has been Saved Successfully...!");
        location.reload();
    } catch (e) {
        alert(e);
    }
}

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
    excelRows = XLSX.utils.sheet_to_row_object_array(workbook.Sheets[firstSheet]);

    //Create a HTML Table element.
    var table = document.createElement("table");
    table.border = "1";

    //Add the header row.
    var row = table.insertRow(-1);

    //Add the header cells.
    for (var j = 0; j < masterColumns.length; j++) {
        var headerCell = document.createElement("TH");
        headerCell.innerHTML = masterColumns[j].FieldName;
        row.appendChild(headerCell);
    }
    var headerCellX = document.createElement("TH");
    headerCellX.innerHTML = "ItemName";
    row.appendChild(headerCellX);
    //for (var col in excelRows[0]) {
    //    var headerCell = document.createElement("TH");
    //    headerCell.innerHTML = col.replace('/', 'Per').replace(' ', '');
    //    row.appendChild(headerCell);
    //}
    seconds = excelRows.length;
    document.getElementById("totalItems").innerHTML = seconds;
    //Add the data rows from Excel file.
    for (var i = 0; i < excelRows.length; i++) {

        //progressBarStatus.option("value", excelRows.length - (seconds - i));
        //$("#timer").text(("0" + (seconds - i)).slice(-2));
        //Add the data row.
        row = table.insertRow(-1);

        //Add the data cells.        
        //for (var col1 in excelRows[i]) {
        //    var cell = row.insertCell(-1);
        //    var colnam = masterColumns[i].Field_Name;
        //    cell.innerHTML = excelRows[i][colnam];
        //}
        try {
            for (j = 0; j < masterColumns.length; j++) {
                var cell = row.insertCell(-1);
                var colnam = masterColumns[j].FieldName;
                var cellValue = excelRows[i][colnam];
                if (cellValue === "-") cellValue = "";
                cell.innerHTML = cellValue;
            }
            var cell1 = row.insertCell(-1);
            cell1.innerHTML = excelRows[i]["ItemName"];
        } catch (e) {
            console.log(e);
            $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
        }
    }

    var dvExcel = document.getElementById("dvExcel");
    dvExcel.innerHTML = "";
    dvExcel.appendChild(table);
    $("#LoadIndicator").dxLoadPanel("instance").option("visible", false);
}


//var progressBarStatus = $("#progressBarStatus").dxProgressBar({
//    min: 0,
//    max: 100,
//    width: "100%",
//    statusFormat: function (value) {
//        return "Loading: " + value * 100 + "%";
//    },
//    onComplete: function (e) {
//        inProgress = false;
//        clearInterval(intervalId);
//        e.element.addClass("complete");
//    }
//}).dxProgressBar("instance");

//function setCurrentStatus() {
//    progressBarStatus.option("value", (excelRows.length - seconds) * 1);
//    $("#timer").text(("0" + seconds).slice(-2));
//}

//function timer() {
//    seconds--;
//    setCurrentStatus();
//    if (seconds === 0) {
//        clearInterval(intervalId);
//        seconds = 100;
//        return;
//    }
//}
$(document).ready(function () {
    $("#LoadIndicator").dxLoadPanel({
        shadingColor: "rgba(0,0,0,0.4)",
        indicatorSrc: "images/Indus logo.png",
        message: 'Please Wait...',
        width: 300,
        showPane: true,
        shading: true,
        closeOnOutsideClick: false,
        visible: false,
    });
});
