odoo.define('kzm_pos_login.db', function (require) {
    "use strict";

    var DB = require('point_of_sale.DB');
    var core = require('web.core');
    var rpc = require('web.rpc');

    var _t = core._t;

    DB.include({
        init: function(options){
            this._super.apply(this, arguments);
//            this.pay_button_by_id = {};
//            this.group_products = [];
//            this.order_write_date = null;
//            /*ORDER SYNC*/
//            this.sale_note_list = [];
//            this.sale_note_by_id = {};
//            this.order_sorted = [];
//            this.order_search_string = "";
//
//            this.order_by_id = {};
//            this.line_by_id = {};
//            this.line_search_string = ""
//            this.product_search_string = "";
//            this.doctor_by_id = {};
//            this.doctor_search_string = "";
//            this.all_categories = [];
//            this.all_brands = [];
//            this.products_by_brand_id = {};
//            this.brands_search_list =[];
//            this.product_namelist = [];
//            this.dummy_product_ids = [];
//            this.product_write_date = '';
////        	Gift Card
//            this.card_products = [];
//            this.card_write_date = null;
//            this.card_by_id = {};
//            this.card_sorted = [];
//            this.card_search_string = "";
//            this.gift_card_cust_search_string = "";
////            Voucher
//            this.voucher_write_date = null;
//            this.voucher_by_id = {};
//            this.voucher_sorted = [];
//            this.voucher_search_string = "";
//
//            this.partners_name = [];
//            this.partner_by_name = {};
//            this.all_partners = [];
////          Stock Picking Data
//            this.stock_picking_by_id = {};
//            this.picking_sorted = [];
//            this.picking_search_string = "";
//            this.expire_categ_by_id = {};
//            this.expire_categ_string = "";
//            this.product_detail_search_string = "";
//            this.product_expire_detail_by_id = {};
////          Internal Stock Transfer
//            this.picking_type_by_id = {};
////          Sale order extension
//            this.sale_order_write_date = null;
//            this.sale_order_by_id = {};
//            this.sale_order_sorted = [];
//            this.sale_order_search_string = "";
//
//            this.sale_invoice_write_date = null;
//            this.sale_invoice_by_id = {};
//            this.sale_invoice_sorted = [];
//            this.sale_invoice_search_string = "";
//            this.all_product = []
////        	Recurrent Order
//            this.recurrent_order_products = [];
//            this.recurrent_order_write_date = null;
//            this.recurrent_order_by_id = {};
//            this.recurrent_order_sorted = [];
//            this.recurrent_order_search_string = "";
////            Product Variant
//            this.template_by_id = {};
//            this.product_attribute_by_id = {};
//            this.product_attribute_value_by_id = {};
//            this.pay_button_by_id = {};

        },
        notification: function(type, message){
            var types = ['success','warning','info', 'danger'];
            if($.inArray(type.toLowerCase(),types) != -1){
                $('div.span4').remove();
                var newMessage = '';
                message = _t(message);
                switch(type){
                case 'success' :
                    newMessage = '<i class="fa fa-check" aria-hidden="true"></i> '+message;
                    break;
                case 'warning' :
                    newMessage = '<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> '+message;
                    break;
                case 'info' :
                    newMessage = '<i class="fa fa-info" aria-hidden="true"></i> '+message;
                    break;
                case 'danger' :
                    newMessage = '<i class="fa fa-ban" aria-hidden="true"></i> '+message;
                    break;
                }
                $('body').append('<div class="span4 pull-right">' +
                        '<div class="alert alert-'+type+' fade">' +
                        newMessage+
                       '</div>'+
                     '</div>');
                $(".alert").removeClass("in").show();
                $(".alert").delay(200).addClass("in").fadeOut(5000);
            }
        },
        });

});