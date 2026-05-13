"use Strict"
var GridSelectedData = [];
var linesArray = [];
const scaleFactor = 2;
var jsonObjectsSvgCoordinates = [];
var mergedArray = [];
var pagewidth = 1000;
var pageHeight = 1000;
var ObjFormula = [];
var ObjFormulaX1 = [];
var ObjFormulaY1 = [];
var ObjFormulaX2 = [];
var ObjFormulaY2 = [];
var ObjContent = [];
var ObjShapeName = [];
var ObjGridData = [];
var EditFlag = false;
var FormulaID = 0;
let selectedContent = '';
var Global_W = 40;         //Width
var Global_L = 60;         //Length
var Global_H = 100;          //Height
var Global_PF = 10;          //Pasting Flap
var Global_OF = 15;          //Open Flap
var Global_BF = 11.25;      //Bottom Flap
var Global_FH = 6.5;        //Flap Height
var Global_TH = 9;          //Toungue Height
var Global_xd = 5;          //X-axis Margin
var Global_yd = 5;          //Y-axis Margin

$("#Grain").dxSelectBox({
    items: ["With Grain", "Across Grain"],
    placeholder: "Grain",
    searchEnabled: true,
    showClearButton: true
});

$("#UpsType").dxSelectBox({
    items: ["First Up", "Even Up", "Odd Up", "Last Up"],
    placeholder: "UpsType",
    searchEnabled: true,
    showClearButton: true,
    onValueChanged: function () {
        GetShapeType();
        GetAllFormula();
    }
});

$("#SheetSize").dxSelectBox({
    items: ["Length", "Width"],
    placeholder: "SheetSize",
    searchEnabled: true,
    showClearButton: true

});

GetContent()
$("#TxtContentType").dxSelectBox({
    dataSource: [],
    displayExpr: 'ContentName',
    valueExpr: 'ContentName',
    placeholder: "Select Content",
    searchEnabled: true,
    showClearButton: true,
    onValueChanged: function (e) {
        selectedContent = e.value;
    }
});

function GetContent() {
    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/CallContent",
        data: '{}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027/g, "'");
            res = res.replace(/u0026/g, "&");
            res = res.replace(/:,/g, ":null,");
            res = res.replace(/:}/g, ":null}");
            res = res.substr(1);
            res = res.slice(0, -1);
            ObjContent = JSON.parse(res);

            $("#TxtContentType").dxSelectBox({
                dataSource: ObjContent,
            });
        },
        error: function errorFunc(jqXHR) {
            document.getElementById("LOADER").style.display = "none";
            alert(jqXHR);
        }
    });
    return TxtContentType;
}


$("#ShapeName").dxSelectBox({
    dataSource: [],
    displayExpr: 'ShapeName',
    valueExpr: 'ShapeName',
    placeholder: "Select Shape",
    searchEnabled: true,
    showClearButton: true,

    onValueChanged: function (e) {
        selectedContent = e.value;
    }

});

function GetShapeType() {
    let grain = $('#Grain').dxSelectBox('instance').option('text');
    let UpsType = $('#UpsType').dxSelectBox('instance').option('text');
    var ContentType = $("#TxtContentType").dxSelectBox('instance').option('value');

    if (!grain) {
        alert("Please select Grain.");
        return; // Exit the function if grain is not selected
    }

    if (!UpsType) {
        alert("Please select Ups Type.");
        return; // Exit the function if UpsType is not selected
    }
    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/GetShapeNames",
        data: '{ContentType:' + JSON.stringify(ContentType) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027/g, "'");
            res = res.replace(/u0026/g, "&");
            res = res.replace(/:,/g, ":null,");
            res = res.replace(/:}/g, ":null}");
            res = res.substr(1);
            res = res.slice(0, -1);
            ObjShapeName = JSON.parse(res);

            $("#ShapeName").dxSelectBox({
                dataSource: ObjShapeName,
            });
        },
        error: function errorFunc(jqXHR) {
            document.getElementById("LOADER").style.display = "none";
            alert(jqXHR);
        }
    });
    //return TxtContentType;
}

function LoadShapeWiseData() {
    let grain = $('#Grain').dxSelectBox('instance').option('text');
    let UpsType = $('#UpsType').dxSelectBox('instance').option('text');
    let ContentType = $("#TxtContentType").dxSelectBox('instance').option('value');
    let ShapeName = $("#ShapeName").dxSelectBox('instance').option('value');

    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/LoadShapeWiseData",
        data: '{ContentType:' + JSON.stringify(ContentType) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + ', ShapeName:' + JSON.stringify(ShapeName) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027/g, "'");
            res = res.replace(/u0026/g, "&");
            res = res.replace(/:,/g, ":null,");
            res = res.replace(/:}/g, ":null}");
            res = res.substr(1);
            res = res.slice(0, -1);
            let adddata = JSON.parse(res)

            let KeylineGrid = $("#KeylineGrid").dxDataGrid('instance');

            let currentData = KeylineGrid.option('dataSource') || [];

            let updatedData = currentData.concat(adddata);
            KeylineGrid.option('dataSource', updatedData);
            DevExpress.ui.notify("Selected Shape Name: " + ShapeName, "info", 2000);
        },
        error: function errorFunc(jqXHR) {
            document.getElementById("LOADER").style.display = "none";
            alert(jqXHR);
        }
    });
}

function GetFormula() {
    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/CallFormula",
        data: '{}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027/g, "'");
            res = res.replace(/u0026/g, "&");
            res = res.replace(/:,/g, ":null,");
            res = res.replace(/:}/g, ":null}");
            res = res.substr(1);
            res = res.slice(0, -1);
            ObjFormula = JSON.parse(res);

            $("#Formulas").dxSelectBox({
                dataSource: ObjFormula,
            });
        },
        error: function errorFunc(jqXHR) {
            document.getElementById("LOADER").style.display = "none";
            alert(jqXHR);
        }
    });
    return ObjFormula;
}
const ObjFormulas = new DevExpress.data.DataSource({
    store: ObjFormula,
});

function GetAllFormula() {
    let grain = $('#Grain').dxSelectBox('instance').option('text');
    let UpsType = $('#UpsType').dxSelectBox('instance').option('text');
    var ContentType = $("#TxtContentType").dxSelectBox('instance').option('value');

    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/CallFormulaX1",
        data: '{ContentType:' + JSON.stringify(ContentType) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027/g, "'");
            res = res.replace(/u0026/g, "&");
            res = res.replace(/:,/g, ":null,");
            res = res.replace(/:}/g, ":null}");
            res = res.substr(1);
            res = res.slice(0, -1);
            ObjFormulaX1 = JSON.parse(res);

            $.ajax({
                type: "POST",
                url: "WebService_ContentSVGKeyLine.asmx/CallFormulaY1",
                data: '{ContentType:' + JSON.stringify(ContentType) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + '}',
                contentType: "application/json; charset=utf-8",
                dataType: "text",
                success: function (results) {
                    var res = results.replace(/\\/g, '');
                    res = res.replace(/"d":""/g, '');
                    res = res.replace(/""/g, '');
                    res = res.replace(/u0027/g, "'");
                    res = res.replace(/u0026/g, "&");
                    res = res.replace(/:,/g, ":null,");
                    res = res.replace(/:}/g, ":null}");
                    res = res.substr(1);
                    res = res.slice(0, -1);
                    ObjFormulaY1 = JSON.parse(res);


                    $.ajax({
                        type: "POST",
                        url: "WebService_ContentSVGKeyLine.asmx/CallFormulaX2",
                        data: '{ContentType:' + JSON.stringify(ContentType) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + '}',
                        contentType: "application/json; charset=utf-8",
                        dataType: "text",
                        success: function (results) {
                            var res = results.replace(/\\/g, '');
                            res = res.replace(/"d":""/g, '');
                            res = res.replace(/""/g, '');
                            res = res.replace(/u0027/g, "'");
                            res = res.replace(/u0026/g, "&");
                            res = res.replace(/:,/g, ":null,");
                            res = res.replace(/:}/g, ":null}");
                            res = res.substr(1);
                            res = res.slice(0, -1);
                            ObjFormulaX2 = JSON.parse(res);

                            $.ajax({
                                type: "POST",
                                url: "WebService_ContentSVGKeyLine.asmx/CallFormulaY2",
                                data: '{ContentType:' + JSON.stringify(ContentType) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + '}',
                                contentType: "application/json; charset=utf-8",
                                dataType: "text",
                                success: function (results) {
                                    var res = results.replace(/\\/g, '');
                                    res = res.replace(/"d":""/g, '');
                                    res = res.replace(/""/g, '');
                                    res = res.replace(/u0027/g, "'");
                                    res = res.replace(/u0026/g, "&");
                                    res = res.replace(/:,/g, ":null,");
                                    res = res.replace(/:}/g, ":null}");
                                    res = res.substr(1);
                                    res = res.slice(0, -1);
                                    ObjFormulaY2 = JSON.parse(res);
                                },

                            });
                        },

                    });

                },

            });
        },

    });
}



$("#Formulas").dxSelectBox({
    dataSource: ObjFormulas,
    displayExpr: 'Formula',
    valueExpr: 'ID',
    placeholder: "Select Formula",
    searchEnabled: true,
    showClearButton: true,
    allowEditing: true,
    acceptCustomValue: true,
    customItemCreateEvent: 'focusout',
    onCustomItemCreating: function (e) {
        e.customItem = { Formula: e.text };
        ObjFormulas.store().insert(e.customItem);
        ObjFormulas.reload();
    },
    onValueChanged: function (data) {
        if (data.value !== "" && data.value !== undefined && data.value !== null) {
            EditFlag = true;
            FormulaID = data.value;
        }
    }
});

$("#BtnFormulaSave").click(function () {
    GetShapeType()
    let arr = [];
    let obj = {};
    let Formula = '';
    if (EditFlag == true) {
        Formula = $('#Formulas').dxSelectBox('instance').option('text');
        obj.Formula = Formula;
    }
    else {
        Formula = $('#Formulas').dxSelectBox('instance').option('text');
        obj.Formula = Formula;
    }
    arr.push(obj);
    try {
        $.ajax({
            type: "POST",
            url: "WebService_ContentSVGKeyLine.asmx/SaveFormula",
            data: '{FormulaArr:' + JSON.stringify(arr) + ',EditFlag:' + JSON.stringify(EditFlag) + ',FormulaID:' + JSON.stringify(FormulaID) + '}',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (results) {
                var res = JSON.stringify(results);
                res = res.replace(/"d":/g, '');
                res = res.replace(/{/g, '');
                res = res.replace(/}/g, '');
                res = res.substr(1);
                res = res.slice(0, -1);
                if (res === "Success") {
                    swal("Saved!", "Your data saved", "success");
                    GetFormula();
                    EditFlag = false;
                }
                else {
                    swal("Error..!", res, "warning");
                }
            },
            error: function errorFunc(jqXHR) {
                swal("Error!", "Please try after some time..", "");
                console.log(jqXHR);
            }
        });
    } catch (e) {
        console.log(e);
    }
});

$("#BtnFormulaDelete").click(function () {
    try {
        $.ajax({
            type: "POST",
            url: "WebService_ContentSVGKeyLine.asmx/DeleteFormula",
            data: '{FormulaID:' + JSON.stringify(FormulaID) + '}',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (results) {
                var res = JSON.stringify(results);
                res = res.replace(/"d":/g, '');
                res = res.replace(/{/g, '');
                res = res.replace(/}/g, '');
                res = res.substr(1);
                res = res.slice(0, -1);
                if (res === "Success") {
                    swal("Saved!", "Formula deleted", "success");
                    GetFormula();
                }
                else {
                    swal("Error..!", res, "warning");
                }
            },
            error: function errorFunc(jqXHR) {
                swal("Error!", "Please try after some time..", "");
                console.log(jqXHR);
            }
        });
    } catch (e) {
        console.log(e);
    }
});

$("#BtnCoordinatesDelete").click(function () {
    let grain = $('#Grain').dxSelectBox('instance').option('text');
    let UpsType = $('#UpsType').dxSelectBox('instance').option('text');

    if (!grain) {
        alert("Please select Grain.");
        return; 
    }

    if (!UpsType) {
        alert("Please select Ups Type.");
        return; 
    }

    showCustomConfirmationAlert(
        "Are you sure you want to delete this transaction?",
        "You will not be able to recover this transaction!",

        function () {
            $.ajax({
                type: "POST",
                url: "WebService_ContentSVGKeyLine.asmx/DeleteCoordinates",
                data: '{ContantName:' + JSON.stringify(selectedContent) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + '}',
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (results) {
                    var res = JSON.stringify(results);
                    res = res.replace(/"d":/g, '');
                    res = res.replace(/{/g, '');
                    res = res.replace(/}/g, '');
                    res = res.substr(1);
                    res = res.slice(0, -1);
                    if (res === "Success") {
                        showCustomAlert("Deleted!", "Planning has been deleted.", "success");
                        $("#BtnLoadData").click();
                    } else {
                        showCustomAlert("Error!", res, "warning");
                    }
                },
                error: function errorFunc(jqXHR) {
                    showCustomAlert("Error!", "Please try again later.", "error");
                    console.log(jqXHR);
                }
            });
        });
});

GetFormula();
$("#KeylineGrid").dxDataGrid({
    dataSource: [],
    columnAutoWidth: true,
    showBorders: true,
    showRowLines: true,
    allowColumnReordering: true,
    allowColumnResizing: true,
    columnResizingMode: "widget",
    selection: { mode: "multiple" },
    paging: {
        enabled: false
    },
    editing: {
        mode: "cell",
        allowUpdating: true,
        /*allowAdding: true,*/
    },
    scrolling: {
        mode: "virtual",
    },

    height: 600,

    onToolbarPreparing: function (e) {

        e.toolbarOptions.items.push({
            widget: "dxButton",
            options: {
                icon: "refresh",
                text: "Refresh Drawing",
                hint: "Refresh Drawing",
                elementAttr: {
                    style: "background-color: #138496; color: white; border-color: #007bff;" // Blue Draw button
                },
                onClick: function () {
                    $("g").empty(); // Clear previous drawings
                    DrawNew(); // Call the function to draw based on data
                }
            },
            location: "before"
        });

        e.toolbarOptions.items.push({
            widget: "dxButton",
            options: {
                icon: "save",
                text: "Save Accross Grain",
                hint: "Save Accross Grain",
                elementAttr: {
                    style: "background-color: #28a745; color: white; border-color: #007bff;" // Blue Draw button
                },
                onClick: function () {
                    SaveCoordinatesForAcrossGrain();
                }
            },
            location: "center"
        });

        e.toolbarOptions.items.push({
            widget: "dxButton",
            options: {
                icon: "plus",
                text: "Add Row",
                hint: "Add New Row",
                elementAttr: {
                    style: "background-color: #28a745; color: white; border-color: #28a745;" // Green Add button
                },
                onClick: function () {
                    e.component.addRow();
                }
            },
            location: "after"
        });

        e.toolbarOptions.items.push({
            widget: "dxButton",
            options: {
                icon: "trash",
                text: "Delete Selected",
                hint: "Delete Selected Rows",
                elementAttr: {
                    style: "background-color: #dc3545; color: white; border-color: #dc3545;" // Red Delete button
                },
                onClick: function () {
                    const selectedRows = e.component.getSelectedRowKeys(); // Get selected rows
                    if (selectedRows.length === 0) {
                        alert("No rows selected for deletion.");
                        return;
                    }

                    const confirmDelete = confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`);
                    if (confirmDelete) {
                        // Filter out selected rows from dataSource
                        let gridData = e.component.option("dataSource");
                        gridData = gridData.filter(item => !selectedRows.includes(item));
                        e.component.option("dataSource", gridData); // Update grid dataSource
                        e.component.refresh(); // Refresh grid
                    }
                }
            },
            location: "after"
        });
    },
    rowAlternationEnabled: true,
    rowDragging: {
        allowReordering: true,
        onReorder: function (e) {
            var visibleRows = e.component.getVisibleRows(),
                toIndex = e.component._options.dataSource.indexOf(visibleRows[e.toIndex].data),
                fromIndex = e.component._options.dataSource.indexOf(e.itemData);

            e.component._options.dataSource.splice(fromIndex, 1);
            e.component._options.dataSource.splice(toIndex, 0, e.itemData);

            e.component.refresh();
        }
    },
    onInitNewRow: function (e) {
        e.data.LineType = "Solid";
        e.data.LineStyles = "Solid";
    },
    onSelectionChanged: function (clicked) {
        //SaveCoordinates();
        var W = Global_W;
        var L = Global_L;
        var H = Global_H;
        var PF = Global_PF;
        var OF = Global_OF;
        var BF = Global_BF;
        var FH = Global_FH;
        var TH = Global_TH;
        var xd = Global_xd;
        var yd = Global_yd;
        var svg = document.getElementById("mysvg");
        const GridSelectedData = clicked.selectedRowsData[0]; // Get the selected row's data
        if (!GridSelectedData) return; // Exit if no row is selected
        svg.setAttribute("width", 800 + "mm");
        svg.setAttribute("height", 800 + "mm");

        //$("g").empty(); // Clear previous drawings
        let x1, y1, x2, y2;

        try {
            // Try to evaluate the formulas
            x1 = eval(GridSelectedData.AddInX1);
            y1 = eval(GridSelectedData.AddInY1);
            x2 = eval(GridSelectedData.AddInX2);
            y2 = eval(GridSelectedData.AddInY2);
        } catch (error) {
            alert(`Error evaluating coordinates: ${error.message}`);
            return;
        }
        console.log(`X1: ${x1}, Y1: ${y1}, X2: ${x2}, Y2: ${y2}`);

        if (GridSelectedData.LineType === "Solid" && GridSelectedData.LineStyles === "Solid") {
            drawlineNSolid(xd + x1, yd + y1, xd + x2, yd + y2);
        } else if (GridSelectedData.LineType === "Solid" && GridSelectedData.LineStyles === "Dashed") {
            drawlineNDashed(xd + x1, yd + y1, xd + x2, yd + y2);
        } else if (GridSelectedData.LineType === "Circle" && GridSelectedData.LineStyles === "Solid") {
            drawCircleSolid(xd + x1, yd + y1, xd + x2, yd + y2);
        } else if (GridSelectedData.LineType === "Circle" && GridSelectedData.LineStyles === "Dashed") {
            drawCircleDashed(xd + x1, yd + y1, xd + x2, yd + y2);
        } else if (GridSelectedData.LineType === "Curve" && GridSelectedData.LineStyles === "Solid") {
            drawCurveNSolid(xd + x2, xd + x1, yd + y2, yd + y1);
        } else if (GridSelectedData.LineType === "Curve" && GridSelectedData.LineStyles === "Dashed") {
            drawCurveNDashed(xd + x2, xd + x1, yd + y2, yd + y1);
        }

        DevExpress.ui.notify(
            `Drawing completed successfully for Shape:-> ${GridSelectedData.ShapeName}.`,
            "success",
            3000
        );

        function drawlineNSolid(x1, y1, x2, y2) {
            var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            newLine.setAttribute('x1', x1);
            newLine.setAttribute('y1', y1);
            newLine.setAttribute('x2', x2);
            newLine.setAttribute('y2', y2);
            newLine.setAttribute("stroke", "black");
            newLine.setAttribute("stroke-width", 0.5);
            $("g").append(newLine);
        }

        function drawlineNDashed(x1, y1, x2, y2) {
            var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            newLine.setAttribute('x1', x1);
            newLine.setAttribute('y1', y1);
            newLine.setAttribute('x2', x2);
            newLine.setAttribute('y2', y2);
            newLine.setAttribute("stroke", "black");
            newLine.setAttribute("stroke-width", 0.5);
            newLine.setAttribute("stroke-dasharray", 1); // Dashed line
            $("g").append(newLine);
        }

        function drawCurveNSolid(x1, x2, y1, y2) {
            var string = `M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`;
            var curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            curve.setAttribute("d", string);
            curve.setAttribute("stroke", "black");
            curve.setAttribute("stroke-width", 0.5);
            curve.setAttribute("fill", "transparent");
            $("g").append(curve);
        }

        function drawCurveNDashed(x1, x2, y1, y2) {
            var string = `M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`;
            var curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            curve.setAttribute("d", string);
            curve.setAttribute("stroke", "black");
            curve.setAttribute("stroke-width", 0.5);
            curve.setAttribute("stroke-dasharray", 1); // Dashed curve
            curve.setAttribute("fill", "transparent");
            $("g").append(curve);
        }

        function drawCircleSolid(x1, y1, x2, y2) {
            var r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
            var pathString = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            circle.setAttribute("d", pathString);
            circle.setAttribute("stroke", "black");
            circle.setAttribute("stroke-width", 0.5);
            circle.setAttribute("fill", "transparent");
            $("g").append(circle);
        }

        function drawCircleDashed(x1, y1, x2, y2) {
            var r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
            var pathString = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            circle.setAttribute("d", pathString);
            circle.setAttribute("stroke", "black");
            circle.setAttribute("stroke-width", 0.5);
            circle.setAttribute("stroke-dasharray", 2); // Dashed circle
            circle.setAttribute("fill", "transparent");
            $("g").append(circle);
        }
    },

    columns: [
        {
            caption: "S.No",
            allowEditing: false,
            cellTemplate: function (container, options) {
                const dataSource = options.component.option("dataSource");
                const rowIndex = dataSource.indexOf(options.data);
                container.text(rowIndex + 1);
            },
            width: 40
        },
        { dataField: "ShapeType", allowEditing: true, caption: "Shape Type", allowSorting: false, },

        {
            dataField: "ShapeName",
            caption: "Shape Name",
            allowEditing: true,
            allowSorting: true, // Enable sorting
            editCellTemplate: function (cellElement, cellInfo) {
                $("<div>").appendTo(cellElement).dxSelectBox({
                    dataSource: ObjShapeName,
                    displayExpr: "ShapeName",
                    valueExpr: "ShapeName",
                    value: cellInfo.value,
                    acceptCustomValue: true,
                    showClearButton: true,
                    onCustomItemCreating: function (args) {
                        const customValue = { ShapeName: args.text };
                        if (!ObjShapeName.some(item => item.ShapeName === customValue.ShapeName)) {
                            ObjShapeName.push(customValue);

                            args.component.option("dataSource", ObjShapeName);
                        }

                        args.customItem = customValue;
                    },
                    onValueChanged: function (e) {
                        cellInfo.setValue(e.value);
                    }
                });
            }
        },
        {
            dataField: "LineType",
            allowEditing: true,
            caption: "Line Type",
            allowSorting: false,
            lookup: {
                dataSource: [
                    { id: "Solid", text: "Solid" },
                    { id: "Curve", text: "Curve" },
                    { id: "Circle", text: "Circle" }
                ],
                valueExpr: "id",
                displayExpr: "text",
                allowClearing: true
            }
        },

        {
            dataField: "AddInX1",
            caption: "Add In X1",
            allowEditing: true,
            allowSorting: false,
            editCellTemplate: function (cellElement, cellInfo) {
                $("<div>").appendTo(cellElement).dxSelectBox({
                    dataSource: ObjFormulaX1,
                    displayExpr: "AddinX1",
                    valueExpr: "AddinX1",
                    value: cellInfo.value,
                    acceptCustomValue: true,
                    showClearButton: true,
                    onCustomItemCreating: function (args) {
                        const customValue = { AddinX1: args.text };
                        if (!ObjFormulaX1.some(item => item.AddinX1 === customValue.AddinX1)) {
                            ObjFormulaX1.push(customValue);

                            args.component.option("dataSource", ObjFormulaX1);
                        }

                        args.customItem = customValue;
                    },
                    onValueChanged: function (e) {
                        cellInfo.setValue(e.value);
                    }
                });
            }
        },

        {
            dataField: "AddInY1",
            caption: "Add In Y1",
            allowEditing: true,
            allowSorting: false,
            editCellTemplate: function (cellElement, cellInfo) {
                $("<div>").appendTo(cellElement).dxSelectBox({
                    dataSource: ObjFormulaY1,
                    displayExpr: "AddinY1",
                    valueExpr: "AddinY1",
                    value: cellInfo.value,
                    acceptCustomValue: true,
                    showClearButton: true,
                    onCustomItemCreating: function (args) {
                        const customValue = { AddinY1: args.text };

                        if (!ObjFormulaY1.some(item => item.AddinY1 === customValue.AddinY1)) {
                            ObjFormulaY1.push(customValue);

                            args.component.option("dataSource", ObjFormulaY1);
                        }

                        args.customItem = customValue;
                    },
                    onValueChanged: function (e) {
                        cellInfo.setValue(e.value);
                    }
                });
            }
        },

        {
            dataField: "AddInX2",
            caption: "Add In X2",
            allowEditing: true,
            allowSorting: false,
            editCellTemplate: function (cellElement, cellInfo) {
                $("<div>").appendTo(cellElement).dxSelectBox({
                    dataSource: ObjFormulaX2,
                    displayExpr: "AddinX2",
                    valueExpr: "AddinX2",
                    value: cellInfo.value,
                    acceptCustomValue: true,
                    showClearButton: true,
                    onCustomItemCreating: function (args) {
                        const customValue = { AddinX2: args.text };

                        if (!ObjFormulaX2.some(item => item.AddinX2 === customValue.AddinX2)) {
                            ObjFormulaX2.push(customValue);

                            args.component.option("dataSource", ObjFormulaX2);
                        }

                        args.customItem = customValue;
                    },
                    onValueChanged: function (e) {
                        cellInfo.setValue(e.value);
                    }
                });
            }
        },

        {
            dataField: "AddInY2",
            caption: "Add In Y2",
            allowEditing: true,
            allowSorting: false,
            editCellTemplate: function (cellElement, cellInfo) {
                $("<div>").appendTo(cellElement).dxSelectBox({
                    dataSource: ObjFormulaY2,
                    displayExpr: "AddinY2",
                    valueExpr: "AddinY2",
                    value: cellInfo.value,
                    acceptCustomValue: true,
                    showClearButton: true,
                    onCustomItemCreating: function (args) {
                        const customValue = { AddinY2: args.text };

                        if (!ObjFormulaY2.some(item => item.AddinY2 === customValue.AddinY2)) {
                            ObjFormulaY2.push(customValue);

                            args.component.option("dataSource", ObjFormulaY2);
                        }

                        args.customItem = customValue;
                    },
                    onValueChanged: function (e) {
                        cellInfo.setValue(e.value);
                    }
                });
            }
        },

        {
            dataField: "LineStyles",
            allowEditing: true,
            caption: "Line Style",
            allowSorting: false,
            lookup: {
                dataSource: [
                    { id: "Solid", text: "Solid" },
                    { id: "Dashed", text: "Dashed" }
                ],
                valueExpr: "id",
                displayExpr: "text",
                allowClearing: true
            }
        },
        {
            dataField: "SheetSize",
            allowEditing: true,
            caption: "Sheet Size",
            allowSorting: false,
            lookup: {
                dataSource: [
                    { id: "Length", text: "Length" },
                    { id: "Width", text: "Width" }
                ],
                valueExpr: "id",
                displayExpr: "text",
                allowClearing: true
            }
        }
    ]
}).dxDataGrid("instance");


$("#SheetPlanningGrid").dxDataGrid({
    dataSource: [],
    columnAutoWidth: true,
    showBorders: true,
    showRowLines: true,
    allowColumnReordering: true,
    allowColumnResizing: true,
    columnResizingMode: "widget",
    selection: { mode: "multiple" },
    paging: {
        enabled: false
    },
    editing: {
        mode: "cell",
        allowUpdating: true,
    },
    scrolling: {
        mode: "virtual",
    },

    height: 300,
    onToolbarPreparing: function (e) {
        e.toolbarOptions.items.push({
            widget: "dxButton",
            options: {
                icon: "plus",
                text: "Add Row",
                hint: "Add New Row",
                elementAttr: {
                    style: "background-color: #28a745; color: white; border-color: #28a745;" // Green Add button
                },
                onClick: function () {
                    e.component.addRow();
                }
            },
            location: "after"
        });

        e.toolbarOptions.items.push({
            widget: "dxButton",
            options: {
                icon: "trash",
                text: "Delete Selected",
                hint: "Delete Selected Rows",
                elementAttr: {
                    style: "background-color: #dc3545; color: white; border-color: #dc3545;" // Red Delete button
                },
                onClick: function () {
                    const selectedRows = e.component.getSelectedRowKeys(); // Get selected rows
                    if (selectedRows.length === 0) {
                        alert("No rows selected for deletion.");
                        return;
                    }

                    const confirmDelete = confirm(`Are you sure you want to delete ${selectedRows.length} row(s)?`);
                    if (confirmDelete) {
                        // Filter out selected rows from dataSource
                        let gridData = e.component.option("dataSource");
                        gridData = gridData.filter(item => !selectedRows.includes(item));
                        e.component.option("dataSource", gridData); // Update grid dataSource
                        e.component.refresh(); // Refresh grid
                    }
                }
            },
            location: "after"
        });
    },

    rowAlternationEnabled: true,

    columns: [
        { dataField: "ContentType", allowEditing: true, caption: "Content Type" },
        { dataField: "Grain", allowEditing: true, caption: "Grain" },
        { dataField: "UpsType", allowEditing: true, caption: "Ups Type" },
        { dataField: "SheetSize", allowEditing: true, caption: "Sheet Size" },
        { dataField: "Formula", allowEditing: true, caption: "Formula" },
    ]

}).dxDataGrid("instance");


//function GridData() {


//    console.log(jsonObjectsSvgCoordinates);
//    return jsonObjectsSvgCoordinates;
//}

function SaveCoordinates() {
    jsonObjectsSvgCoordinates = [];

    var OtherHeadsGrid = $("#KeylineGrid").dxDataGrid('instance');
    var gridDataCount = OtherHeadsGrid.totalCount();
    var selGrain = $("#Grain").dxSelectBox('instance').option('value');
    var selUpType = $("#UpsType").dxSelectBox('instance').option('value');

    var contentname = $("#TxtContentType").dxSelectBox('instance').option('value');
    var AddInXForUps = $("#AddInXForUps").val();
    var AddInYForUps = $("#AddInYForUps").val();
    var SvgCoordinates = {};

    if (gridDataCount > 0) {
        for (var h = 0; h < gridDataCount; h++) {
            SvgCoordinates = {};
            if (OtherHeadsGrid._options.dataSource[h].AddInX1 != "") {
                SvgCoordinates.ContentType = contentname;

                SvgCoordinates.Grain = selGrain;

                SvgCoordinates.UpsType = selUpType;

                SvgCoordinates.AddInXForUps = AddInXForUps

                SvgCoordinates.AddInYForUps = AddInYForUps;

                SvgCoordinates.ShapeType = OtherHeadsGrid._options.dataSource[h].ShapeType;

                SvgCoordinates.ShapeName = OtherHeadsGrid._options.dataSource[h].ShapeName;

                SvgCoordinates.LineType = OtherHeadsGrid._options.dataSource[h].LineType;

                SvgCoordinates.AddInX1 = OtherHeadsGrid._options.dataSource[h].AddInX1;

                SvgCoordinates.AddInY1 = OtherHeadsGrid._options.dataSource[h].AddInY1;

                SvgCoordinates.AddInX2 = OtherHeadsGrid._options.dataSource[h].AddInX2;

                SvgCoordinates.AddInY2 = OtherHeadsGrid._options.dataSource[h].AddInY2;

                SvgCoordinates.LineStyles = OtherHeadsGrid._options.dataSource[h].LineStyles;

                SvgCoordinates.SheetSize = OtherHeadsGrid._options.dataSource[h].SheetSize;

                jsonObjectsSvgCoordinates.push(SvgCoordinates);

            }
        }
    }
    if (!contentname || contentname.trim() === "") {
        alert("Please enter a valid content name.");
        return;
    }

    if (!selGrain || selGrain.trim() === "") {
        alert("Please select a valid grain option.");
        return;
    }

    if (!selUpType || selUpType.trim() === "") {
        alert("Please select a valid Ups Type option.");
        return;
    }

    //GridData();

    if (!jsonObjectsSvgCoordinates || jsonObjectsSvgCoordinates.length === 0) {
        alert("No coordinates to save! The object is empty.");
        return;
    }

    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/SaveSVGCoordinates",
        data: '{SvgCoordinates:' + JSON.stringify(jsonObjectsSvgCoordinates) + ', ContantName:' + JSON.stringify(contentname) + ', grain:' + JSON.stringify(selGrain) + ', selUpType:' + JSON.stringify(selUpType) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function (response) {
            console.log("Response from server:", response);
            if (response.d === "Success") {
                DevExpress.ui.notify("Data saved successfully!", "success", 2000);
                //alert("Data saved successfully!");
            } else {
                DevExpress.ui.notify("Error saving data: " + response.d, "error", 3000);
                //alert("Error saving data: " + response.d);
            }
        },
        error: function (xhr, status, error) {
            console.error("Status: " + status);
            console.error("Error: " + error);
            console.error("Response: " + xhr.responseText);
            alert("Error occurred while saving data. Check console for details.");
        }
    });
}

function SaveCoordinatesForAcrossGrain() {
    jsonObjectsSvgCoordinates = [];
    var Grain = $("#Grain").dxSelectBox('instance').option('value');
    var OtherHeadsGrid = $("#KeylineGrid").dxDataGrid('instance');
    var gridDataCount = OtherHeadsGrid.totalCount();
    var selGrain = 'Across Grain';
    var selUpType = $("#UpsType").dxSelectBox('instance').option('value');

    var contentname = $("#TxtContentType").dxSelectBox('instance').option('value');
    var AddInXForUps = $("#AddInXForUps").val();
    var AddInYForUps = $("#AddInYForUps").val();
    var SvgCoordinates = {};

    if (gridDataCount > 0) {
        for (var h = 0; h < gridDataCount; h++) {
            SvgCoordinates = {};
            if (OtherHeadsGrid._options.dataSource[h].AddInX1 != "") {
                SvgCoordinates.ContentType = contentname;

                SvgCoordinates.Grain = selGrain;

                SvgCoordinates.UpsType = selUpType;

                SvgCoordinates.AddInXForUps = AddInYForUps

                SvgCoordinates.AddInYForUps = AddInXForUps;

                SvgCoordinates.ShapeType = OtherHeadsGrid._options.dataSource[h].ShapeType;

                SvgCoordinates.ShapeName = OtherHeadsGrid._options.dataSource[h].ShapeName;

                SvgCoordinates.LineType = OtherHeadsGrid._options.dataSource[h].LineType;

                SvgCoordinates.AddInX1 = OtherHeadsGrid._options.dataSource[h].AddInY2;

                SvgCoordinates.AddInY1 = OtherHeadsGrid._options.dataSource[h].AddInX2;

                SvgCoordinates.AddInX2 = OtherHeadsGrid._options.dataSource[h].AddInY1;

                SvgCoordinates.AddInY2 = OtherHeadsGrid._options.dataSource[h].AddInX1;

                SvgCoordinates.LineStyles = OtherHeadsGrid._options.dataSource[h].LineStyles;

                SvgCoordinates.SheetSize = OtherHeadsGrid._options.dataSource[h].SheetSize;

                jsonObjectsSvgCoordinates.push(SvgCoordinates);

            }
        }
    }
    if (!contentname || contentname.trim() === "") {
        alert("Please enter a valid content name.");
        return;
    }

    if (!Grain || Grain.trim() === "Across Grain") {
        showCustomAlert("Coordinates cannot be saved when the grid loads 'With Grain' data instead of 'Across Grain' data. First load the 'With Grain' data.");
        return;
    }

    if (!selUpType || selUpType.trim() === "") {
        alert("Please select a valid Ups Type option.");
        return;
    }

    //GridData();

    if (!jsonObjectsSvgCoordinates || jsonObjectsSvgCoordinates.length === 0) {
        alert("No coordinates to save! The object is empty.");
        return;
    }
    showConfirmationAlert("Confirm Save", "Do you want to save the 'Accross Grain' coordinates?", function (confirm) {
        if (confirm) {
            $.ajax({
                type: "POST",
                url: "WebService_ContentSVGKeyLine.asmx/SaveSVGCoordinates",
                data: '{SvgCoordinates:' + JSON.stringify(jsonObjectsSvgCoordinates) + ', ContantName:' + JSON.stringify(contentname) + ', grain:' + JSON.stringify(selGrain) + ', selUpType:' + JSON.stringify(selUpType) + '}',
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (response) {
                    console.log("Response from server:", response);
                    if (response.d === "Success") {
                        DevExpress.ui.notify("Data saved successfully!", "success", 2000);
                        //alert("Data saved successfully!");
                    } else {
                        DevExpress.ui.notify("Error saving data: " + response.d, "error", 3000);
                        //alert("Error saving data: " + response.d);
                    }
                },
                error: function (xhr, status, error) {
                    console.error("Status: " + status);
                    console.error("Error: " + error);
                    console.error("Response: " + xhr.responseText);
                    alert("Error occurred while saving data. Check console for details.");
                }
            });
        }
        else {
            // If user canceled, you can handle this scenario
            console.log("User canceled the save action.");

        }
    });

}

function calldata(ContentType, grain, UpsType) {
    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/CallDataForKeyline",
        data: '{ContentType:' + JSON.stringify(ContentType) + ', grain:' + JSON.stringify(grain) + ', UpsType:' + JSON.stringify(UpsType) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027/g, "'");
            res = res.replace(/u0026/g, "&");
            res = res.replace(/:,/g, ":null,");
            res = res.replace(/:}/g, ":null}");
            res = res.substr(1);
            res = res.slice(0, -1);
            ObjGridData = JSON.parse(res)

            $("#KeylineGrid").dxDataGrid({
                dataSource: ObjGridData
            })
            if (ObjGridData.length > 0) {
                var firstItem = ObjGridData[0]; // Assuming you want the first item's data
                $("#AddInXForUps").val(firstItem.AddInXForUps || ''); // Replace 'XForUps' with the actual property
                $("#AddInYForUps").val(firstItem.AddInYForUps || ''); // Replace 'YForUps' with the actual property
            }

        },
        error: function errorFunc(jqXHR) {
            document.getElementById("LOADER").style.display = "none";
            alert(jqXHR);
        }
    });
}

let hasConditionBeenMet = false;
document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file && file.type === "image/svg+xml") {
        const reader = new FileReader();
        reader.onload = function (e) {
            const svgContent = e.target.result;
            try {
                // Parse the uploaded SVG
                const parser = new DOMParser();
                const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
                const svgElement = svgDoc.querySelector('svg');
                if (!svgElement) {
                    alert('No valid SVG content found.');
                    return;
                }
                //const svgContainer = document.getElementById('svgContainer');
                //svgContainer.innerHTML = '';  // Clear previous content
                //svgContainer.appendChild(svgElement);  // Append new SVG

                const linesArray = extractAllLines(svgElement);
                const pathsArray = extractAllPaths(svgElement);

                mergedArray = [...linesArray, ...pathsArray];

                $("#KeylineGrid").dxDataGrid({
                    dataSource: mergedArray
                })
                let formulaDataSource = GetFormula();
                $("#KeylineGrid").dxDataGrid({
                    rowDragging: {
                        allowReordering: true,
                        onReorder: function (e) {
                            var visibleRows = e.component.getVisibleRows(),
                                toIndex = e.component._options.dataSource.indexOf(visibleRows[e.toIndex].data),
                                fromIndex = e.component._options.dataSource.indexOf(e.itemData);

                            e.component._options.dataSource.splice(fromIndex, 1);
                            e.component._options.dataSource.splice(toIndex, 0, e.itemData);

                            e.component.refresh();
                        }
                    },
                    onInitNewRow: function (e) {
                        e.data.LineType = "Solid";
                        e.data.LineStyles = "Solid";
                    },
                    columns: [
                        {
                            caption: "S.No",
                            allowEditing: false,
                            cellTemplate: function (container, options) {
                                // Calculate the serial number using the row's index and the current page number
                                const rowIndex = options.rowIndex + 1 + options.component.pageIndex() * options.component.pageSize();
                                container.text(rowIndex);
                            },
                            width: 40
                        },
                        { dataField: "ShapeType", allowEditing: true, caption: "Shape Type", allowSorting: false },
                        {
                            dataField: "ShapeName",
                            caption: "Shape Name",
                            allowEditing: true,
                            allowSorting: false,
                            editCellTemplate: function (cellElement, cellInfo) {
                                $("<div>").appendTo(cellElement).dxSelectBox({
                                    dataSource: ObjShapeName,
                                    displayExpr: "ShapeName",
                                    valueExpr: "ShapeName",
                                    value: cellInfo.value,
                                    acceptCustomValue: true,
                                    showClearButton: true,
                                    onCustomItemCreating: function (args) {
                                        const customValue = { ShapeName: args.text };
                                        if (!ObjShapeName.some(item => item.ShapeName === customValue.ShapeName)) {
                                            ObjShapeName.push(customValue);

                                            args.component.option("dataSource", ObjShapeName);
                                        }

                                        args.customItem = customValue;
                                    },
                                    onValueChanged: function (e) {
                                        cellInfo.setValue(e.value);
                                    }
                                });
                            }
                        },

                        {
                            dataField: "LineType",
                            allowEditing: true,
                            caption: "Line Type",
                            allowSorting: false,
                            lookup: {
                                dataSource: [
                                    { id: "Solid", text: "Solid" },
                                    { id: "Curve", text: "Curve" },
                                    { id: "Circle", text: "Circle" }
                                ],
                                valueExpr: "id",
                                displayExpr: "text",
                                allowClearing: true
                            }
                        },

                        {
                            dataField: "AddInX1",
                            caption: "Add In X1",
                            allowEditing: true,
                            allowSorting: false,
                            editCellTemplate: function (cellElement, cellInfo) {
                                $("<div>").appendTo(cellElement).dxSelectBox({
                                    dataSource: ObjFormulaX1,
                                    displayExpr: "AddinX1",
                                    valueExpr: "AddinX1",
                                    value: cellInfo.value,
                                    acceptCustomValue: true,
                                    showClearButton: true,
                                    onCustomItemCreating: function (args) {
                                        const customValue = { AddinX1: args.text };
                                        if (!ObjFormulaX1.some(item => item.AddinX1 === customValue.AddinX1)) {
                                            ObjFormulaX1.push(customValue);

                                            args.component.option("dataSource", ObjFormulaX1);
                                        }

                                        args.customItem = customValue;
                                    },
                                    onValueChanged: function (e) {
                                        cellInfo.setValue(e.value);
                                    }
                                });
                            }
                        },

                        {
                            dataField: "AddInY1",
                            caption: "Add In Y1",
                            allowEditing: true,
                            allowSorting: false,
                            editCellTemplate: function (cellElement, cellInfo) {
                                $("<div>").appendTo(cellElement).dxSelectBox({
                                    dataSource: ObjFormulaY1,
                                    displayExpr: "AddinY1",
                                    valueExpr: "AddinY1",
                                    value: cellInfo.value,
                                    acceptCustomValue: true,
                                    showClearButton: true,
                                    onCustomItemCreating: function (args) {
                                        const customValue = { AddinY1: args.text };

                                        if (!ObjFormulaY1.some(item => item.AddinY1 === customValue.AddinY1)) {
                                            ObjFormulaY1.push(customValue);

                                            args.component.option("dataSource", ObjFormulaY1);
                                        }

                                        args.customItem = customValue;
                                    },
                                    onValueChanged: function (e) {
                                        cellInfo.setValue(e.value);
                                    }
                                });
                            }
                        },

                        {
                            dataField: "AddInX2",
                            caption: "Add In X2",
                            allowEditing: true,
                            allowSorting: false,
                            editCellTemplate: function (cellElement, cellInfo) {
                                $("<div>").appendTo(cellElement).dxSelectBox({
                                    dataSource: ObjFormulaX2,
                                    displayExpr: "AddinX2",
                                    valueExpr: "AddinX2",
                                    value: cellInfo.value,
                                    acceptCustomValue: true,
                                    showClearButton: true,
                                    onCustomItemCreating: function (args) {
                                        const customValue = { AddinX2: args.text };

                                        if (!ObjFormulaX2.some(item => item.AddinX2 === customValue.AddinX2)) {
                                            ObjFormulaX2.push(customValue);

                                            args.component.option("dataSource", ObjFormulaX2);
                                        }

                                        args.customItem = customValue;
                                    },
                                    onValueChanged: function (e) {
                                        cellInfo.setValue(e.value);
                                    }
                                });
                            }
                        },

                        {
                            dataField: "AddInY2",
                            caption: "Add In Y2",
                            allowEditing: true,
                            allowSorting: false,
                            editCellTemplate: function (cellElement, cellInfo) {
                                $("<div>").appendTo(cellElement).dxSelectBox({
                                    dataSource: ObjFormulaY2,
                                    displayExpr: "AddinY2",
                                    valueExpr: "AddinY2",
                                    value: cellInfo.value,
                                    acceptCustomValue: true,
                                    showClearButton: true,
                                    onCustomItemCreating: function (args) {
                                        const customValue = { AddinY2: args.text };

                                        if (!ObjFormulaY2.some(item => item.AddinY2 === customValue.AddinY2)) {
                                            ObjFormulaY2.push(customValue);

                                            args.component.option("dataSource", ObjFormulaY2);
                                        }

                                        args.customItem = customValue;
                                    },
                                    onValueChanged: function (e) {
                                        cellInfo.setValue(e.value);
                                    }
                                });
                            }
                        },

                        {
                            dataField: "LineStyles",
                            allowEditing: true,
                            caption: "Line Style",
                            allowSorting: false,
                            lookup: {
                                dataSource: [
                                    { id: "Solid", text: "Solid" },
                                    { id: "Dashed", text: "Dashed" }
                                ],
                                valueExpr: "id",
                                displayExpr: "text",
                                allowClearing: true
                            }
                        },
                        {
                            dataField: "SheetSize",
                            allowEditing: true,
                            caption: "Sheet Size",
                            allowSorting: false,
                            lookup: {
                                dataSource: [
                                    { id: "Length", text: "Length" },
                                    { id: "Width", text: "Width" }
                                ],
                                valueExpr: "id",
                                displayExpr: "text",
                                allowClearing: true
                            }
                        }

                    ],
                    onRowUpdating: function (e) {
                        let shouldDrawNew = false;

                        for (var field in e.newData) {
                            if (e.newData.hasOwnProperty(field)) {
                                if (!hasConditionBeenMet && field === "AddInY2") {
                                    hasConditionBeenMet = true;
                                    shouldDrawNew = true;
                                    break;
                                }
                                if (hasConditionBeenMet) {
                                    shouldDrawNew = true;
                                    break;
                                }
                            }
                        }
                        if (shouldDrawNew) {
                            $("g").empty();
                            DrawNew();
                        }
                    },
                    onSelectionChanged: function (clicked) {
                        SaveCoordinates();
                        var W = Global_W;
                        var L = Global_L;
                        var H = Global_H;
                        var PF = Global_PF;
                        var OF = Global_OF;
                        var BF = Global_BF;
                        var FH = Global_FH;
                        var TH = Global_TH;
                        var xd = Global_xd;
                        var yd = Global_yd;
                        var svg = document.getElementById("mysvg");
                        const GridSelectedData = clicked.selectedRowsData[0]; // Get the selected row's data
                        if (!GridSelectedData) return; // Exit if no row is selected
                        svg.setAttribute("width", 800 + "mm");
                        svg.setAttribute("height", 800 + "mm");

                        //$("g").empty(); // Clear previous drawings
                        let x1, y1, x2, y2;

                        try {
                            // Try to evaluate the formulas
                            x1 = eval(GridSelectedData.AddInX1);
                            y1 = eval(GridSelectedData.AddInY1);
                            x2 = eval(GridSelectedData.AddInX2);
                            y2 = eval(GridSelectedData.AddInY2);
                        } catch (error) {
                            // Alert the user and exit if an error occurs
                            alert(`Error evaluating coordinates: ${error.message}`);
                            return;
                        }
                        console.log(`X1: ${x1}, Y1: ${y1}, X2: ${x2}, Y2: ${y2}`);

                        if (GridSelectedData.LineType === "Solid" && GridSelectedData.LineStyles === "Solid") {
                            drawlineNSolid(xd + x1, yd + y1, xd + x2, yd + y2);
                        } else if (GridSelectedData.LineType === "Solid" && GridSelectedData.LineStyles === "Dashed") {
                            drawlineNDashed(xd + x1, yd + y1, xd + x2, yd + y2);
                        } else if (GridSelectedData.LineType === "Circle" && GridSelectedData.LineStyles === "Solid") {
                            drawCircleSolid(xd + x1, yd + y1, xd + x2, yd + y2);
                        } else if (GridSelectedData.LineType === "Circle" && GridSelectedData.LineStyles === "Dashed") {
                            drawCircleDashed(xd + x1, yd + y1, xd + x2, yd + y2);
                        } else if (GridSelectedData.LineType === "Curve" && GridSelectedData.LineStyles === "Solid") {
                            drawCurveNSolid(xd + x2, xd + x1, yd + y2, yd + y1);
                        } else if (GridSelectedData.LineType === "Curve" && GridSelectedData.LineStyles === "Dashed") {
                            drawCurveNDashed(xd + x2, xd + x1, yd + y2, yd + y1);
                        }

                        // Functions to draw the shapes

                        function drawlineNSolid(x1, y1, x2, y2) {
                            var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            newLine.setAttribute('x1', x1);
                            newLine.setAttribute('y1', y1);
                            newLine.setAttribute('x2', x2);
                            newLine.setAttribute('y2', y2);
                            newLine.setAttribute("stroke", "black");
                            newLine.setAttribute("stroke-width", 0.5);
                            $("g").append(newLine);
                        }

                        function drawlineNDashed(x1, y1, x2, y2) {
                            var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                            newLine.setAttribute('x1', x1);
                            newLine.setAttribute('y1', y1);
                            newLine.setAttribute('x2', x2);
                            newLine.setAttribute('y2', y2);
                            newLine.setAttribute("stroke", "black");
                            newLine.setAttribute("stroke-width", 0.5);
                            newLine.setAttribute("stroke-dasharray", 1); // Dashed line
                            $("g").append(newLine);
                        }

                        function drawCurveNSolid(x1, x2, y1, y2) {
                            var string = `M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`;
                            var curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            curve.setAttribute("d", string);
                            curve.setAttribute("stroke", "black");
                            curve.setAttribute("stroke-width", 0.5);
                            curve.setAttribute("fill", "transparent");
                            $("g").append(curve);
                        }

                        function drawCurveNDashed(x1, x2, y1, y2) {
                            var string = `M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`;
                            var curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            curve.setAttribute("d", string);
                            curve.setAttribute("stroke", "black");
                            curve.setAttribute("stroke-width", 0.5);
                            curve.setAttribute("stroke-dasharray", 1); // Dashed curve
                            curve.setAttribute("fill", "transparent");
                            $("g").append(curve);
                        }

                        function drawCircleSolid(x1, y1, x2, y2) {
                            var r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
                            var pathString = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
                            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            circle.setAttribute("d", pathString);
                            circle.setAttribute("stroke", "black");
                            circle.setAttribute("stroke-width", 0.5);
                            circle.setAttribute("fill", "transparent");
                            $("g").append(circle);
                        }

                        function drawCircleDashed(x1, y1, x2, y2) {
                            var r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
                            var pathString = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
                            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                            circle.setAttribute("d", pathString);
                            circle.setAttribute("stroke", "black");
                            circle.setAttribute("stroke-width", 0.5);
                            circle.setAttribute("stroke-dasharray", 2); // Dashed circle
                            circle.setAttribute("fill", "transparent");
                            $("g").append(circle);
                        }
                    }

                }).dxDataGrid("instance");
            } catch (error) {
                alert('There was an error parsing the SVG file.');
            }
        };
        reader.readAsText(file);
    } else {
        alert("Please upload a valid SVG file.");
    }
});

function extractAllLines(svgElement) {
    const lines = svgElement.querySelectorAll('line');
    const linesArray = [];

    if (lines.length > 0) {
        lines.forEach((line, index) => {
            const x1 = parseFloat(line.getAttribute('x1'));
            const y1 = parseFloat(line.getAttribute('y1'));
            const x2 = parseFloat(line.getAttribute('x2'));
            const y2 = parseFloat(line.getAttribute('y2'));

            const strokeDasharray = line.getAttribute('stroke-dasharray');
            let lineStyle = "Solid";
            if (strokeDasharray) {
                const dashArray = strokeDasharray.split(',').map(Number);
                if (dashArray[0] === dashArray[1] && dashArray[0] <= 1) {
                    lineStyle = "Dotted";
                } else {
                    lineStyle = "Dashed";
                }
            }

            const lineObject = {
                ShapeName: `Line ${index + 1}`,
                X1: x1,
                Y1: y1,
                X2: x2,
                Y2: y2,
                LineType: lineStyle,
                AddInX1: "",
                AddInY1: "",
                AddInX2: "",
                AddInY2: "",
            };

            linesArray.push(lineObject);
        });
    } else {
        console.log("No line elements found in the SVG.");
    }

    return linesArray;
}

function extractAllPaths(svgElement) {
    const paths = svgElement.querySelectorAll('path');
    const pathsArray = [];

    if (paths.length > 0) {
        paths.forEach((path, index) => {
            const pathData = path.getAttribute('d');
            if (pathData) {
                // Parse the 'd' attribute to extract M (move to) and A (arc) commands
                const pathCommands = pathData.match(/[MLA]\s*([^MLA]+)/g);
                if (pathCommands && pathCommands.length > 1) {
                    const moveTo = pathCommands[0].replace('M', '').trim().split(',');
                    const x1 = parseFloat(moveTo[0]);
                    const y1 = parseFloat(moveTo[1]);

                    const arcTo = pathCommands[1].replace(/[AL]/, '').trim().split(' ');
                    const x2y2 = arcTo[arcTo.length - 1].split(',');
                    const x2 = parseFloat(x2y2[0]);
                    const y2 = parseFloat(x2y2[1]);

                    const pathObject = {
                        ShapeName: `Path ${index + 1}`,
                        X1: x1,
                        Y1: y1,
                        X2: x2,
                        Y2: y2,
                        LineType: "Curve", // Label it as 'Curve'
                        AddInX1: "",
                        AddInY1: "",
                        AddInX2: "",
                        AddInY2: ""
                    };

                    pathsArray.push(pathObject);
                }
            }
        });
    } else {
        console.log("No path elements found in the SVG.");
    }

    return pathsArray;
}

$("#BtnDraw").click(function () {
    drawsvg();
});

$("#BtnSavePlanning").click(function () {

    var PlanningGrid = $("#SheetPlanningGrid").dxDataGrid('instance');

    var gridData = PlanningGrid.getDataSource().items();
    var objformula1 = {};
    var arr = [];
    var contentName = '';
    if (gridData.length > 0) {
        for (var h = 0; h < gridData.length; h++) {
            objformula1 = {};
            objformula1.ContentType = gridData[h].ContentType;
            objformula1.Grain = gridData[h].Grain;
            objformula1.UpsType = gridData[h].UpsType;
            objformula1.SheetSize = gridData[h].SheetSize;
            objformula1.Formula = gridData[h].Formula;
            contentName = gridData[h].ContentType;

            arr.push(objformula1);
        }
    }


    try {
        $.ajax({
            type: "POST",
            url: "WebService_ContentSVGKeyLine.asmx/SavePlanning",
            data: '{Planning:' + JSON.stringify(arr) + ',contentName:' + JSON.stringify(contentName) + '}',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (results) {
                var res = JSON.stringify(results);
                res = res.replace(/"d":/g, '');
                res = res.replace(/{/g, '');
                res = res.replace(/}/g, '');
                res = res.substr(1);
                res = res.slice(0, -1);
                if (res === "Success") {
                    swal("Saved!", "Your data saved", "success");
                    GetFormula();
                    EditFlag = false;
                }
                else {
                    swal("Error..!", res, "warning");
                }
            },
            error: function errorFunc(jqXHR) {
                swal("Error!", "Please try after some time..", "");
                console.log(jqXHR);
            }
        });

    } catch (e) {
        console.log(e);
    }
});

$("#BtnLoadPlanning").click(function () {
    $("g").empty();
    var contentname = selectedContent;
    callPlanningData(contentname);
});

function callPlanningData(ContentType) {
    $.ajax({
        type: "POST",
        url: "WebService_ContentSVGKeyLine.asmx/callPlanningData",
        data: '{ContentType:' + JSON.stringify(ContentType) + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "text",
        success: function (results) {
            var res = results.replace(/\\/g, '');
            res = res.replace(/"d":""/g, '');
            res = res.replace(/""/g, '');
            res = res.replace(/u0027/g, "'");
            res = res.replace(/u0026/g, "&");
            res = res.replace(/:,/g, ":null,");
            res = res.replace(/:}/g, ":null}");
            res = res.substr(1);
            res = res.slice(0, -1);
            ObjGridData = JSON.parse(res)

            $("#SheetPlanningGrid").dxDataGrid({
                dataSource: ObjGridData
            })
        },
        error: function errorFunc(jqXHR) {
            document.getElementById("LOADER").style.display = "none";
            alert(jqXHR);
        }
    });
}

$("#BtnDeletePlanning").click(function () {
    showCustomConfirmationAlert(
        "Are you sure you want to delete this transaction?",
        "You will not be able to recover this transaction!",
        function () {
            $.ajax({
                type: "POST",
                url: "WebService_ContentSVGKeyLine.asmx/DeletePlanning",
                data: '{ContantName:' + JSON.stringify(selectedContent) + '}',
                contentType: "application/json; charset=utf-8",
                dataType: "json",
                success: function (results) {
                    var res = JSON.stringify(results);
                    res = res.replace(/"d":/g, '');
                    res = res.replace(/{/g, '');
                    res = res.replace(/}/g, '');
                    res = res.substr(1);
                    res = res.slice(0, -1);
                    if (res === "Success") {
                        showCustomAlert("Deleted!", "Planning has been deleted.", "success");
                        GetContent();
                    } else {
                        showCustomAlert("Error!", res, "warning");
                    }
                },
                error: function errorFunc(jqXHR) {
                    showCustomAlert("Error!", "Please try again later.", "error");
                    console.log(jqXHR);
                }
            })
        })


});


$("#BtnAddButton").click(function () {
    var SheetPlanningGrid = $('#SheetPlanningGrid').dxDataGrid('instance');
    let Formula = '';
    let ContentType = '';
    let UpsType = '';
    let Grain = '';
    let SheetSize = '';

    Formula = $('#Formulas').dxSelectBox('instance').option('text');
    ContentType = $('#TxtContentType').dxSelectBox('instance').option('text');
    UpsType = $('#UpsType').dxSelectBox('instance').option('text');
    SheetSize = $('#SheetSize').dxSelectBox('instance').option('text');
    Grain = $('#Grain').dxSelectBox('instance').option('text');

    var Obj = {};

    Obj = {};
    Obj.ContentType = ContentType;
    Obj.Grain = Grain;
    Obj.UpsType = UpsType;
    Obj.SheetSize = SheetSize;
    Obj.Formula = Formula;

    var clonedItem = $.extend({}, Obj);
    SheetPlanningGrid._options.dataSource.splice(SheetPlanningGrid._options.dataSource.length, 0, clonedItem);
    SheetPlanningGrid.refresh(true);
});

function drawsvg() {
    var canvas = document.getElementById('canvas');
    const scale = scaleFactor;
    canvas.width = 1500 * scale;
    canvas.height = 600 * scale;
    const ctx = canvas.getContext('2d');
    ctx.scale(1.5 / scale, 1.5 / scale);

    mergedArray.forEach(shape => {
        if (shape.LineType === "Curve") {
            drawCurve(ctx, shape.X1 * scaleFactor, shape.Y1 * scaleFactor, shape.X2 * scaleFactor, shape.Y2 * scaleFactor);
        } else {
            drawLine(ctx, shape.X1 * scaleFactor, shape.Y1 * scaleFactor, shape.X2 * scaleFactor, shape.Y2 * scaleFactor);
        }
    });
}

$("#BtnLoadData").click(function () {
    $("g").empty();
    let contentname = selectedContent;
    let grain = $('#Grain').dxSelectBox('instance').option('text');
    let UpsType = $('#UpsType').dxSelectBox('instance').option('text');

    if (!contentname) {
        alert("Please select Content Name.");
        return;
    }

    if (!grain) {
        alert("Please select Grain.");
        return;
    }

    if (!UpsType) {
        alert("Please select Ups Type.");
        return;
    }

    showConfirmationAlert(
        "Confirmation",
        "Are you sure you want to load the data?",
        function (confirmed) {
            if (confirmed) {
                calldata(contentname, grain, UpsType);
            } else {
                console.log("Action cancelled by the user.");
            }
        }
    );
});


function drawLine(ctx, x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = '#808080';
    ctx.lineWidth = 0.8;
    ctx.stroke();
}
function drawCurve(ctx, x1, y1, x2, y2) {
    const radius = 100 * scaleFactor;
    const sweepFlag = 1; // 1 for clockwise, 0 for counterclockwise


    if (x1 === x2 || y1 === y2) {
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;

        const startAngle = (x1 === x2) ? Math.PI / 2 : 0;
        const endAngle = startAngle + Math.PI;

        // Draw the half-circle
        ctx.beginPath();
        ctx.arc(midX, midY, radius / 2, startAngle, endAngle, sweepFlag === 0);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        return;
    }

    const angle = Math.atan2(y2 - y1, x2 - x1);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const distance = Math.hypot(x2 - x1, y2 - y1);
    const height = Math.sqrt(Math.pow(radius, 2) - Math.pow(distance / 2, 2));

    const cx = midX + height * Math.cos(angle + (sweepFlag ? Math.PI / 2 : -Math.PI / 2));
    const cy = midY + height * Math.sin(angle + (sweepFlag ? Math.PI / 2 : -Math.PI / 2));

    const startAngle = Math.atan2(y1 - cy, x1 - cx);
    const endAngle = Math.atan2(y2 - cy, x2 - cx);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, !sweepFlag);
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 0.8;
    ctx.stroke();
}

$("#BtnDrawFromData").click(function () {
    $("g").empty();
    DrawNew();
});

function DrawNew() {
    var W = Global_W;
    var L = Global_L;
    var H = Global_H;
    var PF = Global_PF;
    var OF = Global_OF;
    var BF = Global_BF;
    var FH = Global_FH;
    var TH = Global_TH;
    var xd = Global_xd;
    var yd = Global_yd;
    var t = 0;
    var svg = document.getElementById("mysvg");

    svg.setAttribute("width", 800 + "mm");
    svg.setAttribute("height", 800 + "mm");

    var LineArray = $('#KeylineGrid').dxDataGrid('instance');
    var shapeCounts = {
        Solid: 0,
        Circle: 0,
        Curve: 0,
        total: 0
    };

    for (let t = 0; t < LineArray._options.dataSource.length; t++) {
        let x1, y1, x2, y2;

        try {
            // Try to evaluate the formulas
            x1 = eval(LineArray._options.dataSource[t].AddInX1);
            y1 = eval(LineArray._options.dataSource[t].AddInY1);
            x2 = eval(LineArray._options.dataSource[t].AddInX2);
            y2 = eval(LineArray._options.dataSource[t].AddInY2);
        } catch (error) {
            // If an error occurs, alert the user and skip this line
            alert(`Error evaluating coordinates at row ${t + 1}: ${error.message}`);
            continue;
        }
        console.log(`X1: ${x1}, Y1: ${y1}, X2: ${x2}, Y2: ${y2}`);

        let currentLine = LineArray._options.dataSource[t];

        if (currentLine.LineType === "Solid" && currentLine.LineStyles === "Solid") {
            drawlineNSolid(xd + x1, yd + y1, xd + x2, yd + y2);
            shapeCounts.Solid++;
        } else if (currentLine.LineType === "Solid" && currentLine.LineStyles === "Dashed") {
            drawlineNDashed(xd + x1, yd + y1, xd + x2, yd + y2);
            shapeCounts.Solid++;
        } else if (currentLine.LineType === "Circle" && currentLine.LineStyles === "Solid") {
            drawCircleSolid(xd + x1, yd + y1, xd + x2, yd + y2);
            shapeCounts.Circle++;
        } else if (currentLine.LineType === "Circle" && currentLine.LineStyles === "Dashed") {
            drawCircleDashed(xd + x1, yd + y1, xd + x2, yd + y2);
            shapeCounts.Circle++;
        } else if (currentLine.LineType === "Curve" && currentLine.LineStyles === "Solid") {
            drawCurveNSolid(xd + x2, xd + x1, yd + y2, yd + y1);
            shapeCounts.Curve++;
        } else if (currentLine.LineType === "Curve" && currentLine.LineStyles === "Dashed") {
            drawCurveNDashed(xd + x2, xd + x1, yd + y2, yd + y1);
            shapeCounts.Curve++;
        }
    }
    shapeCounts.total = shapeCounts.Solid + shapeCounts.Circle + shapeCounts.Curve;

    if (shapeCounts.total > 0) {
        DevExpress.ui.notify(
            `Drawing completed successfully! Total Shapes: ${shapeCounts.total}.
            Breakdown:
            - Solid: ${shapeCounts.Solid}
            - Circle: ${shapeCounts.Circle}
            - Curve: ${shapeCounts.Curve}`,
            "success",
            3000
        );
    } else {
        DevExpress.ui.notify("No shapes were drawn. Please check the input data.", "warning", 3000);
    }
}

function drawlineNSolid(x1, y1, x2, y2) {
    var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    newLine.setAttribute('x1', x1);
    newLine.setAttribute('y1', y1);
    newLine.setAttribute('x2', x2);
    newLine.setAttribute('y2', y2);
    newLine.setAttribute("stroke", "red");
    newLine.setAttribute("stroke-width", 0.2);
    $("g").append(newLine);
}

function drawlineNDashed(x1, y1, x2, y2) {
    var newLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    newLine.setAttribute('x1', x1);
    newLine.setAttribute('y1', y1);
    newLine.setAttribute('x2', x2);
    newLine.setAttribute('y2', y2);
    newLine.setAttribute("stroke", "red");
    newLine.setAttribute("stroke-width", 0.2);
    newLine.setAttribute("stroke-dasharray", 1); // Dashed line
    $("g").append(newLine);
}

function drawCurveNSolid(x1, x2, y1, y2) {
    var string = `M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`;
    var curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curve.setAttribute("d", string);
    curve.setAttribute("stroke", "blue");
    curve.setAttribute("stroke-width", 0.2);
    curve.setAttribute("fill", "transparent");
    $("g").append(curve);
}

function drawCurveNDashed(x1, x2, y1, y2) {
    var string = `M ${x1} ${y1} Q ${x1} ${y2} ${x2} ${y2}`;
    var curve = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    curve.setAttribute("d", string);
    curve.setAttribute("stroke", "blue");
    curve.setAttribute("stroke-width", 0.2);
    curve.setAttribute("stroke-dasharray", 1); // Dashed curve
    curve.setAttribute("fill", "transparent");
    $("g").append(curve);
}

function drawCircleSolid(x1, y1, x2, y2) {
    var r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
    var pathString = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    circle.setAttribute("d", pathString);
    circle.setAttribute("stroke", "blue");
    circle.setAttribute("stroke-width", 0.2);
    circle.setAttribute("fill", "transparent");
    $("g").append(circle);
}

function drawCircleDashed(x1, y1, x2, y2) {
    var r = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
    var pathString = `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x2} ${y2}`;
    var circle = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    circle.setAttribute("d", pathString);
    circle.setAttribute("stroke", "blue");
    circle.setAttribute("stroke-width", 0.2);
    circle.setAttribute("stroke-dasharray", 1); // Dashed circle
    circle.setAttribute("fill", "transparent");
    $("g").append(circle);
}

document.querySelector("#BtnDownload").onclick = function () {
    const svg = document.getElementById("mysvg");
    const outFileName = "KeyLine";
    const pageWidth = 500; // Width in mm for A4
    const pageHeight = 297; // Height in mm for A4

    downloadPDF(svg, outFileName, [(pageWidth * 2.83465) + 5, (pageHeight * 2.83465) + 5]);
};

function downloadPDF(svg, outFileName, Size) {
    let doc = new PDFDocument({ compress: false, size: Size });

    SVGtoPDF(doc, svg, 0, 0);

    let stream = doc.pipe(blobStream());

    stream.on('finish', () => {
        let blob = stream.toBlob('application/pdf');
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = outFileName + ".pdf";
        link.click();
    });


    doc.end();
}

$("#BtnShowSVG").click(function () {
    $("#largemodal").modal('show');
});

$("#BtnShowDrawnSVG").click(function () {
    $("g").empty();
    DrawNew();
    $("#largemodal").modal('show');
});

// Get the SVG group element and zoom buttons
let svgGroup = document.getElementById('svg-group');
let zoomInButton = document.getElementById('zoom-in');
let zoomOutButton = document.getElementById('zoom-out');

// Set the initial scale for zoom
let scale = 1;

// Function to zoom in
zoomInButton.onclick = function (event) {
    event.preventDefault(); // Prevent page refresh
    scale *= 1.2; // Increase scale by 20%
    svgGroup.setAttribute('transform', `scale(${scale})`);
};

// Function to zoom out
zoomOutButton.onclick = function (event) {
    event.preventDefault(); // Prevent page refresh
    scale /= 1.2; // Decrease scale by 20%
    svgGroup.setAttribute('transform', `scale(${scale})`);
};
function showCustomConfirmationAlert(title, message, onConfirm) {
    const confirmationBox = document.createElement('div');
    confirmationBox.style.position = 'fixed';
    confirmationBox.style.top = '50%';
    confirmationBox.style.left = '50%';
    confirmationBox.style.transform = 'translate(-50%, -50%)';
    confirmationBox.style.backgroundColor = '#fff';
    confirmationBox.style.color = '#333';
    confirmationBox.style.border = '2px solid #ff6f61';
    confirmationBox.style.padding = '20px';
    confirmationBox.style.borderRadius = '8px';
    confirmationBox.style.zIndex = '1000';
    confirmationBox.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
    confirmationBox.style.fontFamily = 'Arial, sans-serif';
    confirmationBox.style.textAlign = 'center';
    confirmationBox.style.minWidth = '300px';

    // Create a span for the title
    const titleSpan = document.createElement('h3');
    titleSpan.innerText = title;
    titleSpan.style.margin = '0 0 10px';
    titleSpan.style.fontWeight = 'bold';
    confirmationBox.appendChild(titleSpan);

    // Create a span for the message
    const messageSpan = document.createElement('p');
    messageSpan.innerText = message;
    messageSpan.style.margin = '0 0 20px';
    confirmationBox.appendChild(messageSpan);

    // Create Yes button to confirm the deletion
    const yesButton = document.createElement('button');
    yesButton.innerText = 'Yes, delete it!';
    yesButton.style.backgroundColor = '#ff6f61';
    yesButton.style.color = 'white';
    yesButton.style.border = 'none';
    yesButton.style.padding = '10px 20px';
    yesButton.style.cursor = 'pointer';
    yesButton.style.marginTop = '10px';
    yesButton.style.borderRadius = '5px';
    yesButton.style.transition = 'background-color 0.3s';

    yesButton.addEventListener('mouseover', function () {
        yesButton.style.backgroundColor = '#e55a47';
    });

    yesButton.addEventListener('mouseout', function () {
        yesButton.style.backgroundColor = '#ff6f61';
    });

    yesButton.addEventListener('click', function () {
        document.body.removeChild(confirmationBox); // Remove the confirmation box
        onConfirm(); // Call the onConfirm callback
    });
    confirmationBox.appendChild(yesButton);

    // Create No button to cancel the deletion
    const noButton = document.createElement('button');
    noButton.innerText = 'No, cancel!';
    noButton.style.backgroundColor = '#f1f1f1';
    noButton.style.color = '#333';
    noButton.style.border = 'none';
    noButton.style.padding = '10px 20px';
    noButton.style.cursor = 'pointer';
    noButton.style.marginTop = '10px';
    noButton.style.marginLeft = '10px';
    noButton.style.borderRadius = '5px';
    noButton.style.transition = 'background-color 0.3s';

    noButton.addEventListener('mouseover', function () {
        noButton.style.backgroundColor = '#ddd';
    });

    noButton.addEventListener('mouseout', function () {
        noButton.style.backgroundColor = '#f1f1f1';
    });

    noButton.addEventListener('click', function () {
        document.body.removeChild(confirmationBox); // Remove the confirmation box
    });
    confirmationBox.appendChild(noButton);

    // Append the confirmation box to the body of the document
    document.body.appendChild(confirmationBox);
}

// Custom function for displaying alerts
function showCustomAlert(title, message, type) {
    const alertBox = document.createElement('div');
    alertBox.style.position = 'fixed';
    alertBox.style.top = '20%';
    alertBox.style.left = '50%';
    alertBox.style.transform = 'translate(-50%, -50%)';
    alertBox.style.backgroundColor = type === "success" ? '#e6ffe6' : (type === "warning" ? '#ffe6e6' : '#ffcccc');
    alertBox.style.color = type === "success" ? '#006600' : (type === "warning" ? '#b30000' : '#990000');
    alertBox.style.border = '2px solid ' + (type === "success" ? '#006600' : (type === "warning" ? '#b30000' : '#990000'));
    alertBox.style.padding = '20px';
    alertBox.style.borderRadius = '8px';
    alertBox.style.zIndex = '1000';
    alertBox.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
    alertBox.style.fontFamily = 'Arial, sans-serif';
    alertBox.style.textAlign = 'center';
    alertBox.style.minWidth = '250px';

    // Create a span for the title
    const titleSpan = document.createElement('h3');
    titleSpan.innerText = title;
    titleSpan.style.margin = '0 0 10px';
    alertBox.appendChild(titleSpan);

    // Create a span for the message
    const messageSpan = document.createElement('p');
    messageSpan.innerText = message;
    alertBox.appendChild(messageSpan);

    // Create a button to close the alert box
    const closeButton = document.createElement('button');
    closeButton.innerText = 'OK';
    closeButton.style.backgroundColor = '#b30000';
    closeButton.style.color = 'white';
    closeButton.style.border = 'none';
    closeButton.style.padding = '10px 20px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.marginTop = '10px';
    closeButton.style.borderRadius = '5px';

    closeButton.addEventListener('click', function () {
        document.body.removeChild(alertBox); // Remove the alert box
    });
    alertBox.appendChild(closeButton);

    // Append the alert box to the body of the document
    document.body.appendChild(alertBox);
}
function showConfirmationAlert(title, message, callback) {
    const alertBox = document.createElement('div');
    alertBox.style.position = 'fixed';
    alertBox.style.top = '20%';
    alertBox.style.left = '50%';
    alertBox.style.transform = 'translate(-50%, -50%)';
    alertBox.style.backgroundColor = '#fff';
    alertBox.style.color = '#333';
    alertBox.style.border = '2px solid #007bff';
    alertBox.style.padding = '20px';
    alertBox.style.borderRadius = '8px';
    alertBox.style.zIndex = '1000';
    alertBox.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.2)';
    alertBox.style.fontFamily = 'Arial, sans-serif';
    alertBox.style.textAlign = 'center';
    alertBox.style.minWidth = '300px';

    const titleSpan = document.createElement('h3');
    titleSpan.innerText = title;
    titleSpan.style.margin = '0 0 10px';
    alertBox.appendChild(titleSpan);

    const messageSpan = document.createElement('p');
    messageSpan.innerText = message;
    alertBox.appendChild(messageSpan);

    // Create buttons for confirmation
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginTop = '10px';

    const confirmButton = document.createElement('button');
    confirmButton.innerText = 'Yes';
    confirmButton.style.backgroundColor = '#28a745';
    confirmButton.style.color = 'white';
    confirmButton.style.border = 'none';
    confirmButton.style.padding = '10px 20px';
    confirmButton.style.cursor = 'pointer';
    confirmButton.style.marginRight = '10px';
    confirmButton.style.borderRadius = '5px';

    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'No';
    cancelButton.style.backgroundColor = '#dc3545';
    cancelButton.style.color = 'white';
    cancelButton.style.border = 'none';
    cancelButton.style.padding = '10px 20px';
    cancelButton.style.cursor = 'pointer';
    cancelButton.style.borderRadius = '5px';

    // Attach button events
    confirmButton.addEventListener('click', function () {
        document.body.removeChild(alertBox); // Remove the alert box
        callback(true); // User confirmed
    });

    cancelButton.addEventListener('click', function () {
        document.body.removeChild(alertBox); // Remove the alert box
        callback(false); // User canceled
    });

    buttonContainer.appendChild(confirmButton);
    buttonContainer.appendChild(cancelButton);
    alertBox.appendChild(buttonContainer);

    // Append the alert box to the body of the document
    document.body.appendChild(alertBox);
}