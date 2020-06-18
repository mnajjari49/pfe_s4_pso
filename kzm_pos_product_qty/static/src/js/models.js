odoo.define('kzm_pos_product_qty.models', function (require) {
    "use strict";


    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;

    models.load_fields("product.product", ['qty_available','write_date', 'type']);
    var posmodel_super = models.PosModel.prototype;
	models.PosModel = models.PosModel.extend({
	    initialize: function(session, attributes) {
            var self = this;
            this.product_list = [];
            this.load_background = false;
            this.product_fields = ['qty_available','write_date'];
            this.product_domain = [];
            this.product_context = {display_default_code: false };
            this.all_pos_session = [];
            this.all_locations = [];
            this.credit_amount = 0.00;
            posmodel_super.initialize.call(this, session, attributes);
            this.set({
                'pos_order_list':[],
            });
        },
		//#########################################################################################

//		_save_to_server: function (orders, options) {
//            var self = this;
//            return posmodel_super._save_to_server.apply(this, arguments)
//            .then(function(server_ids){
//                _.each(orders, function(order) {
//                    var lines = order.data.lines;
//                    _.each(lines, function(line){
////                        console.log(line[2].location_id)
////                        console.log(self.config.stock_location_id)
//
//                        var product_id = line[2].product_id;
//                            var product_qty = line[2].qty;
//                            var product = self.db.get_product_by_id(product_id);
//                            var remain_qty = product.qty_available - product_qty;
//                            product.qty_available = remain_qty;
//                            self.gui.screen_instances.products.product_list_widget.product_cache.clear_node(product.id)
//                            var prod_obj = self.gui.screen_instances.products.product_list_widget;
//                            var current_pricelist = prod_obj._get_active_pricelist();
//                            if(current_pricelist){
//                                prod_obj.product_cache.clear_node(product.id+','+current_pricelist.id);
//                                prod_obj.render_product(product);
//                            }
//                            prod_obj.renderElement();
////                        if(line[2].location_id === self.config.stock_location_id[0]){
////
////                        }
//                    });
//                });
//                if(server_ids && server_ids.length > 0){
//                    var domain_list = [['id','in',server_ids]];
////                    if(self.config.multi_shop_id && self.config.multi_shop_id[0]){
//////						domain_list.push(['shop_id','=',self.config.multi_shop_id[0]])
////                        domain_list = ['|',['shop_id','=',false],['shop_id','=',self.config.multi_shop_id[0]],['id','in',server_ids]]
////                    } else{
////
////                    }
//                    var params = {
//                        model: 'pos.order',
//                        method: 'ac_pos_search_read',
//                        args: [server_ids],
//                    }
//                    rpc.query(params, {async: false}).then(function(orders){
//                        if(orders.length > 0){
//                            orders = orders[0];
//                            var exist_order = _.findWhere(self.get('pos_order_list'), {'pos_reference': orders.pos_reference})
//                            if(exist_order){
//                                _.extend(exist_order, orders);
//                            } else {
//                                self.get('pos_order_list').push(orders);
//                            }
//                            var new_orders = _.sortBy(self.get('pos_order_list'), 'id').reverse();
//                            self.db.add_orders(new_orders);
//                            self.set({ 'pos_order_list' : new_orders });
//                        }
//                    }).catch(function(){
//                        self.db.notification('danger',"Connection lost");
//                    });
//                }
//            });
//        },

	});

    var _super_Order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options){
            var res = _super_Order.initialize.apply(this, arguments);
            return this;
        },
        set_rounding_status: function(rounding_status) {
            this.rounding_status = rounding_status
        },
        get_rounding_status: function() {
            return this.rounding_status;
        },
        getNetTotalTaxIncluded: function() {
            var total = this.get_total_with_tax();
            if(this.get_rounding_status()){
                if(this.pos.config.enable_rounding && this.pos.config.rounding_options == 'digits'){
//	        		var value = round_pr(Math.max(0,total))//decimalAdjust(total);
                    var value = round_pr(total)
                    return value;
                }else if(this.pos.config.enable_rounding && this.pos.config.rounding_options == 'points'){
                    var total = this.get_total_without_tax() + this.get_total_tax();
                    var value = decimalAdjust(total);
                    return value;
                }
            }else {
                return total
            }
        },
        get_rounding : function(){
            if(this.get_rounding_status()){
                var total = this ? this.get_total_with_tax() : 0;
                var rounding = this ? this.getNetTotalTaxIncluded() - total: 0;
                return rounding;
            }
        },
        get_due: function(paymentline) {
            if (!paymentline) {
                var due = this.getNetTotalTaxIncluded() - this.get_total_paid();
            } else {
                var due = this.getNetTotalTaxIncluded();
                var lines = this.paymentlines.models;
                for (var i = 0; i < lines.length; i++) {
                    if (lines[i] === paymentline) {
                        break;
                    } else {
                        due -= lines[i].get_amount();
                    }
                }
            }
            return round_pr(due, this.pos.currency.rounding);
        },
        set_sequence:function(sequence){
            this.set('sequence',sequence);
        },
        get_sequence:function(){
            return this.get('sequence');
        },
        set_order_id: function(order_id){
            this.set('order_id', order_id);
        },
        get_order_id: function(){
            return this.get('order_id');
        },
        set_amount_paid: function(amount_paid) {
            this.set('amount_paid', amount_paid);
        },
        get_amount_paid: function() {
            return this.get('amount_paid');
        },
        set_amount_return: function(amount_return) {
            this.set('amount_return', amount_return);
        },
        get_amount_return: function() {
            return this.get('amount_return');
        },
        set_amount_tax: function(amount_tax) {
            this.set('amount_tax', amount_tax);
        },
        get_amount_tax: function() {
            return this.get('amount_tax');
        },
        set_amount_total: function(amount_total) {
            this.set('amount_total', amount_total);
        },
        get_amount_total: function() {
            return this.get('amount_total');
        },
        set_company_id: function(company_id) {
            this.set('company_id', company_id);
        },
        get_company_id: function() {
            return this.get('company_id');
        },
        set_date_order: function(date_order) {
            this.set('date_order', date_order);
        },
        get_date_order: function() {
            return this.get('date_order');
        },
        set_pos_reference: function(pos_reference) {
            this.set('pos_reference', pos_reference)
        },
        get_pos_reference: function() {
            return this.get('pos_reference')
        },
        set_user_name: function(user_id) {
            this.set('user_id', user_id);
        },
        get_user_name: function() {
            return this.get('user_id');
        },
        set_journal: function(statement_ids) {
            this.set('statement_ids', statement_ids)
        },
        get_journal: function() {
            return this.get('statement_ids');
        },
        get_change: function(paymentline) {
            if (!paymentline) {
                  if(this.get_total_paid() > 0 || this.get_cancel_order()){
//            		  var change = this.get_total_paid() - this.getNetTotalTaxIncluded() - this.get_order_total_discount();
                      if(this.get_order_total_discount()){
                          var change = this.get_total_paid() - this.getNetTotalTaxIncluded() - this.get_order_total_discount();
                      } else{
                          var change = this.get_total_paid() - this.getNetTotalTaxIncluded();
                      }
                  }else{
                      var change = this.get_amount_return();
                  }
            } else {
                var change = -this.getNetTotalTaxIncluded();
                var lines  = this.paymentlines.models;
                for (var i = 0; i < lines.length; i++) {
                    change += lines[i].get_amount();
                    if (lines[i] === paymentline) {
                        break;
                    }
                }
            }
            return round_pr(Math.max(0,change), this.pos.currency.rounding);
        },
        set_delivery_address: function(delivery_address){
            this.delivery_address = delivery_address;
        },
        get_delivery_address: function(){
            return this.delivery_address;
        },
        set_delivery_charge_amt: function(delivery_charge_amt){
            this.delivery_charge_amt = delivery_charge_amt;
        },
        get_delivery_charge_amt: function(){
            return this.delivery_charge_amt;
        },
        set_delivery_date: function(delivery_date) {
            this.delivery_date = delivery_date;
        },
        get_delivery_date: function() {
            return this.delivery_date;
        },
        set_delivery_time: function(delivery_time) {
            this.delivery_time = delivery_time;
        },
        get_delivery_time: function() {
            return this.delivery_time;
        },
        set_delivery: function(delivery) {
            this.delivery = delivery;
        },
        get_delivery: function() {
            return this.delivery;
        },
        set_delivery_charges: function(delivery_state) {
            this.delivery_state = delivery_state;
        },
        get_delivery_charges: function() {
            return this.delivery_state;
        },
        set_is_delivery: function(is_delivery) {
            this.is_delivery = is_delivery;
        },
        get_is_delivery: function() {
            return this.is_delivery;
        },
        set_reservation_mode: function(mode){
            this.set('reservation_mode', mode)
        },
        get_reservation_mode: function(){
            return this.get('reservation_mode');
        },
        set_reserve_delivery_date: function(val){
            this.set('reserve_delivery_date', val)
        },
        get_reserve_delivery_date: function(){
            return this.get('reserve_delivery_date');
        },
        set_cancel_order: function(val){
            this.set('cancel_order', val)
        },
        get_cancel_order: function(){
            return this.get('cancel_order');
        },
        set_paying_due: function(val){
            this.set('paying_due', val)
        },
        get_paying_due: function(){
            return this.get('paying_due');
        },
        set_draft_order: function(val) {
            this.set('draft_order', val);
        },
        get_draft_order: function() {
            return this.get('draft_order');
        },
        set_cancellation_charges: function(val) {
            this.set('cancellation_charges', val);
        },
        get_cancellation_charges: function() {
            return this.get('cancellation_charges');
        },
        set_refund_amount: function(refund_amount) {
            this.set('refund_amount', refund_amount);
        },
        get_refund_amount: function() {
            return this.get('refund_amount');
        },
        set_fresh_order: function(fresh_order) {
            this.set('fresh_order', fresh_order);
        },
        get_fresh_order: function() {
            return this.get('fresh_order');
        },
        set_partial_pay: function(partial_pay) {
            this.set('partial_pay', partial_pay);
        },
        get_partial_pay: function() {
            return this.get('partial_pay');
        },
        set_sale_order_mode: function(sale_order_mode){
            this.sale_order_mode = sale_order_mode;
        },
        set_order_total_discount: function(order_total_discount){
            this.order_total_discount = order_total_discount;
        },
        get_order_total_discount: function(){
            return this.order_total_discount;
        },
        set_discount_price: function(discount_price){
            this.discount_price = discount_price;
        },
        get_discount_price: function(){
            return this.discount_price;
        },
        set_discount_product_id: function(discount_product_id){
            this.discount_product_id = discount_product_id;
        },
        get_discount_product_id: function(){
            return this.discount_product_id;
        },
        set_discount_history: function(disc){
            this.disc_history = disc;
        },
        get_discount_history: function(){
            return this.disc_history;
        },
        cart_product_qnty: function(product_id,flag){
            var self = this;
            var res = 0;
            var order = self.pos.get_order();
            var orderlines = order.get_orderlines();
            if (flag){
                _.each(orderlines, function(orderline){
                    if(orderline.product.id == product_id){
                        res += orderline.quantity
                    }
                });
                return res;
            } else {
                _.each(orderlines, function(orderline){
                    if(orderline.product.id == product_id && !orderline.selected){
                        res += orderline.quantity
                    }
                });
                return res;
            }
        },
        add_product: function(product, options){
            var self = this;
                var product_quaty = self.cart_product_qnty(product.id,true);
                if(self.pos.config.restrict_order && product.type != "service"){
                    if(self.pos.config.prod_qty_limit){
                        var remain = product.qty_available-self.pos.config.prod_qty_limit
                        if(product_quaty>=remain){
                            if(self.pos.config.custom_msg){
                                self.pos.db.notification('warning',self.pos.config.custom_msg);
                            } else{
                                self.pos.db.notification('warning', _t('Product Out of Stock'));
                            }
                            return
                        }
                    }
                    if(product_quaty>=product.qty_available && !self.pos.config.prod_qty_limit){
                        if(self.pos.config.custom_msg){
                            self.pos.db.notification('warning',self.pos.config.custom_msg);
                        } else{
                            self.pos.db.notification('warning', _t('Product Out of Stock'));
                        }
                        return
                    }
                }
                _super_Order.add_product.call(this, product, options);

        },

        set_sale_mode: function(sale_mode) {
            this.set('sale_mode', sale_mode);
        },
        get_sale_mode: function() {
            return this.get('sale_mode');
        },
        set_missing_mode: function(missing_mode) {
            this.set('missing_mode', missing_mode);
        },
        get_missing_mode: function() {
            return this.get('missing_mode');
        },
        get_salesman_id: function(){
            return this.get('salesman_id');
        },
        generate_unique_id: function() {
            var timestamp = new Date().getTime();
            return Number(timestamp.toString().slice(-10));
        },
        generateUniqueId_barcode: function() {
            return new Date().getTime();
        },
        set_ereceipt_mail: function(ereceipt_mail) {
            this.set('ereceipt_mail', ereceipt_mail);
        },
        get_ereceipt_mail: function() {
            return this.get('ereceipt_mail');
        },
        set_prefer_ereceipt: function(prefer_ereceipt) {
            this.set('prefer_ereceipt', prefer_ereceipt);
        },
        get_prefer_ereceipt: function() {
            return this.get('prefer_ereceipt');
        },
        set_order_note: function(order_note) {
            this.order_note = order_note;
        },
        get_order_note: function() {
            return this.order_note;
        },
        set_ret_o_id: function(ret_o_id) {
            this.set('ret_o_id', ret_o_id)
        },
        get_ret_o_id: function(){
            return this.get('ret_o_id');
        },
        set_ret_o_ref: function(ret_o_ref) {
            this.set('ret_o_ref', ret_o_ref)
        },
        get_ret_o_ref: function(){
            return this.get('ret_o_ref');
        },

//        Payment Summary
        set_sales_summary_mode: function(sales_summary_mode) {
            this.sales_summary_mode = sales_summary_mode;
        },
        get_sales_summary_mode: function() {
            return this.sales_summary_mode;
        },
        set_sales_summary_vals :function(sales_summary_vals) {
            this.sales_summary_vals = sales_summary_vals;
        },
        get_sales_summary_vals: function() {
            return this.sales_summary_vals;
        },
// Order Summary
        set_receipt: function(custom_receipt) {
            this.custom_receipt = custom_receipt;
        },
        get_receipt: function() {
            return this.custom_receipt;
        },
        set_order_list: function(order_list) {
            this.order_list = order_list;
        },
        get_order_list: function() {
            return this.order_list;
        },
    });



    });