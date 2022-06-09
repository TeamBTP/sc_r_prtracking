jQuery.sap.require("sap.ui.core.format.DateFormat");
sap.ui.define([
	], function () {
		"use strict";

		return {
            formatDate: function (sDate) {
                if (!sDate) {
                    return;
                }
                sDate = sDate.trim();
                let year = sDate.slice(0,4);
                let mounth = sDate.slice(4,6);
                let day = sDate.slice(6,8)
                // var date = new Date(sDate);
                // var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                //     pattern: "yyyy-MM-dd"
                // });
                // return dateFormat.format(date);
                return year + "-" + mounth + "-" + day
                
            },
            formatType: function (sStatus) {
                if (!sStatus) {
                    return;
                }
                return this._get_i18n(sStatus);
            },
            formatSelected: function (value) {
                if (value == "" ||  value == undefined) {
                    return false;
                } else {
                    return true;
                }
            },
            formatCurrency: function (value) {
                var myNumeral = numeral (value);
                var currencyString = myNumeral.format('0,0.00');
                return currencyString;
            }
		};
	}, true);