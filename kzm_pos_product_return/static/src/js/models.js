odoo.define('kzm_pos_product_return.models', function (require) {
    "use strict";


    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;

    var _super_Order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options){
            var res = _super_Order.initialize.apply(this, arguments);
             this.set({
                ret_o_id:       null,
                ret_o_ref:      null,
//                sale_mode:      true,
//                missing_mode:   false,
//                type_for_wallet: false,
//                change_amount_for_wallet: false,
//                use_wallet: false,
//                used_amount_from_wallet: false,
//                // Credit Management
//                paying_due: false,
//                paying_order: false,
//                type_for_credit: false,
//                change_amount_for_credit: false,
//                use_credit: false,
//                order_make_picking: false,
//                credit_detail: [],
//                customer_credit:false,
//                // Reservation
//                reservation_mode: false,
//                reserve_delivery_date: false,
//                draft_order: false,
//                paying_due: false,
//                fresh_order: false,
//                // Sales Order Extension
//                sale_order_name: false,
//                invoice_name: false,
//                order_id: false,
//                shipping_address: false,
//                invoice_address: false,
//                sale_note: false,
//                signature: false,
//                inv_id: false,
//                sale_order_date: false,
//                edit_quotation: false,
//                paying_sale_order: false,
//                sale_order_pay: false,
//                invoice_pay: false,
//                sale_order_requested_date: false,
//                invoice_id:false,
//                delivery_mode:false,
//                credit_payment:false,
            });
            $("div#order_return").removeClass('selected-menu');
            return this;
        },
        empty_cart: function(){
            var self = this;
            var currentOrderLines = this.get_orderlines();
            var lines_ids = []
            if(!this.is_empty()) {
                _.each(currentOrderLines,function(item) {
                    lines_ids.push(item.id);
                });
                _.each(lines_ids,function(id) {
                    self.remove_orderline(self.get_orderline(id));
                });
            }
        },
//        get_salesman_id: function(){
//            return this.get('salesman_id');
//        },
//        generate_unique_id: function() {
//            var timestamp = new Date().getTime();
//            return Number(timestamp.toString().slice(-10));
//        },
//        generateUniqueId_barcode: function() {
//            return new Date().getTime();
//        },
//        set_ereceipt_mail: function(ereceipt_mail) {
//            this.set('ereceipt_mail', ereceipt_mail);
//        },
//        get_ereceipt_mail: function() {
//            return this.get('ereceipt_mail');
//        },
//        set_prefer_ereceipt: function(prefer_ereceipt) {
//            this.set('prefer_ereceipt', prefer_ereceipt);
//        },
//        get_prefer_ereceipt: function() {
//            return this.get('prefer_ereceipt');
//        },
//        set_order_note: function(order_note) {
//            this.order_note = order_note;
//        },
//        get_order_note: function() {
//            return this.order_note;
//        },
//        set_ret_o_id: function(ret_o_id) {
//            this.set('ret_o_id', ret_o_id)
//        },
////        get_ret_o_id: function(){
////            return this.get('ret_o_id');
////        },
//        set_ret_o_ref: function(ret_o_ref) {
//            this.set('ret_o_ref', ret_o_ref)
//        },
//        get_ret_o_ref: function(){
//            return this.get('ret_o_ref');
//        },
//        remove_orderline: function(line){
//            var self = this;
//            _super_Order.remove_orderline.call(this, line);
//            if(line){
//                var lines = this.get_orderlines();
//                if(line && line.get_child_line_id()){
//                    var child_line = self.get_orderline(line.get_child_line_id());
//                    lines.map(function(_line){
//                        if(_line.get_child_line_id() == line.get_child_line_id()){
//                            _line.set_child_line_id(false);
//                            _line.set_is_rule_applied(false);
//                        }
//                    });
//                    if(child_line){
//                        line.set_child_line_id(false);
//                        line.set_is_rule_applied(false);
//                        self.remove_orderline(child_line);
//                        self.apply_promotion();
//                    }
//                }else if(line.get_buy_x_get_dis_y()){
//                    _.each(lines, function(_line){
//                        if(_line && _line.get_buy_x_get_y_child_item()){
//                            _line.set_discount(0);
//                            _line.set_buy_x_get_y_child_item({});
//                            _line.set_is_rule_applied(false);
//                            self.pos.chrome.screens.products.order_widget.rerender_orderline(_line);
//                        }
//                    });
//                }else if(line.get_multi_prods_line_id()){
//                    var multi_prod_id = line.get_multi_prods_line_id() || false;
//                    if(multi_prod_id){
//                        _.each(lines, function(_line){
//                            if(_line && _line.get_multi_prods_line_id() == multi_prod_id){
//                                _line.set_discount(0);
//                                _line.set_is_rule_applied(false);
//                                _line.set_combinational_product_rule(false);
//                                self.pos.chrome.screens.products.order_widget.rerender_orderline(_line);
//                            }
//                        });
//                    }
//                }
//            }
//        },
        // end reservation
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
        clear_cart: function(){
            var self = this;
            var order = self.pos.get_order();
            var currentOrderLines = order.get_orderlines();
            var lines_ids = []
            if(!order.is_empty()) {
                _.each(currentOrderLines,function(item) {
                    lines_ids.push(item.id);
                });
                _.each(lines_ids,function(id) {
                    order.remove_orderline(order.get_orderline(id));
                });
            }
        },
//        add_product: function(product, options){
//            var self = this;
//            if(this.get_missing_mode()){
//                return _super_Order.add_product.call(this, product, {quantity:-1});
//            } else if(options && options.force_allow){
//                _super_Order.add_product.call(this, product, options);
//            } else {
//                var product_quaty = self.cart_product_qnty(product.id,true);
//                if(self.pos.config.restrict_order && self.pos.get_cashier().access_show_qty && product.type != "service"){
//                    if(self.pos.config.prod_qty_limit){
//                        var remain = product.qty_available-self.pos.config.prod_qty_limit
//                        if(product_quaty>=remain){
//                            if(self.pos.config.custom_msg){
//                                self.pos.db.notification('warning',self.pos.config.custom_msg);
//                            } else{
//                                self.pos.db.notification('warning', _t('Product Out of Stock'));
//                            }
//                            return
//                        }
//                    }
//                    if(product_quaty>=product.qty_available && !self.pos.config.prod_qty_limit){
//                        if(self.pos.config.custom_msg){
//                            self.pos.db.notification('warning',self.pos.config.custom_msg);
//                        } else{
//                            self.pos.db.notification('warning', _t('Product Out of Stock'));
//                        }
//                        return
//                    }
//                }
//                _super_Order.add_product.call(this, product, options);
//            }
//            var selected_line = this.get_selected_orderline();
//            if(this.get_delivery() && $('#delivery_mode').hasClass('deliver_on')){
//                selected_line.set_deliver_info(true);
//            }
//            if(selected_line && this.pricelist != this.pos.default_pricelist && this.pos.config.use_pricelist){
//                selected_line.set_original_price(product.get_price(this.pos.default_pricelist, selected_line.get_quantity()))
//            }
//            if(self.pos.config.customer_display){
//                self.mirror_image_data();
//            }
//            var return_valid_days = 0;
//            if(self.pos.config.enable_print_valid_days){
//                if(!product.non_refundable){
//                    if(product.return_valid_days > 0){
//                        return_valid_days = product.return_valid_days;
//                    }else{
//                        if(product.pos_categ_id && product.pos_categ_id[0]){
//                            var categ = self.pos.db.category_by_id[product.pos_categ_id[0]];
//                            while (categ.parent_id && categ.parent_id[0]) {
//                                categ = self.pos.db.category_by_id[categ.parent_id[0]];
//                                if(categ && categ.return_valid_days > 0){
//                                    return_valid_days = categ.return_valid_days;
//                                }
//                            }
//                        }
//                    }
//                }else{
//                    return_valid_days = 0;
//                }
//            }
////            selected_line.set_return_valid_days(return_valid_days);
//        },
        change_mode: function(mode){

            if(mode == 'sale'){
                //Enable mode
                this.set_sale_mode(true);
                $("div#sale_mode").addClass('selected-menu');

                //disable other modes

                $("div#reservation_mode").removeClass('selected-menu');
                $("div#order_return").removeClass('selected-menu');
                $("div#sale_order_mode").removeClass('selected-menu');
                this.set_missing_mode(false);
                this.set_reservation_mode(false);
                this.set_sale_order_mode(false);
            }
            else if( mode == 'missing') {
                if(this.get_is_delivery()){
                    this.pos.db.notification('danger',_t('Sorry, Delivery only allow with Sale Mode!'));
                    this.set_sale_mode(true);
                    $("div#sale_mode").addClass('selected-menu');
                    return
                }

                //Enable mode
                this.set_missing_mode(true);
                $("div#order_return").addClass('selected-menu');

                //disable other modes
                this.set_sale_mode(false);
                this.set_reservation_mode(false);
                this.set_sale_order_mode(false);
                this.set_is_delivery(false);
                this.set_order_total_discount(0.00);

                $("div#sale_mode").removeClass('selected-menu');
                $("div#reservation_mode").removeClass('selected-menu');
                $("div#sale_order_mode").removeClass('selected-menu');
                $('#delivery_mode').removeClass('deliver_on');
            }
            else if(mode == 'reservation_mode'){
                if(this.get_is_delivery()){
                    this.pos.db.notification('danger',_t('Sorry, Delivery only allow with Sale Mode!'));
                    this.set_sale_mode(true);
                    $("div#sale_mode").addClass('selected-menu');
                    return
                }

                //Enable mode
                this.set_reservation_mode(true);
                $("div#reservation_mode").addClass('selected-menu');

                //disable other modes
                this.set_sale_mode(false);
                this.set_is_delivery(false);
                this.set_missing_mode(false);
                this.set_sale_order_mode(false);
                this.set_order_total_discount(0.00);

                $("div#sale_mode").removeClass('selected-menu');
                $("div#order_return").removeClass('selected-menu');
                $("div#sale_order_mode").removeClass('selected-menu');
                $('#delivery_mode').removeClass('deliver_on');
            }else if(mode == 'sale_order_mode'){
                if(this.get_is_delivery()){
                    this.pos.db.notification('danger',_t('Sorry, Delivery only allow with Sale Mode!'));
                    this.set_sale_mode(true);
                    $("div#sale_mode").addClass('selected-menu');
                    return
                }
                this.set_sale_order_mode(true);
                $("div#sale_order_mode").addClass('selected-menu');

                //disable other modes
                this.set_sale_mode(false);
                this.set_is_delivery(false);
                this.set_missing_mode(false);
                this.set_reservation_mode(false);
                this.set_order_total_discount(0.00);
                $("div#sale_mode").removeClass('selected-menu');
                $("div#reservation_mode").removeClass('selected-menu');
                $("div#order_return").removeClass('selected-menu');
                $('#delivery_mode').removeClass('deliver_on');
            }else if(mode == 'delivery_mode'){
                var order = this.pos.get_order();
                //disable other modes
                this.set_sale_order_mode(false);
                this.set_missing_mode(false);
                this.set_reservation_mode(false);
                $("div#reservation_mode").removeClass('selected-menu');
                $("div#order_return").removeClass('selected-menu');
                $("div#sale_order_mode").removeClass('selected-menu');
                var lines = order.get_orderlines();
                var line = order.get_selected_orderline();
                if(!order.get_sale_mode()){
                    this.pos.db.notification('danger',_t('Sorry, This operation only allow with Sale Mode!'));
                    this.set_sale_mode(true);
                    $("div#sale_mode").addClass('selected-menu');
                    return
                }
                if($('#delivery_mode').hasClass('deliver_on')){
                    if(lines.length > 0){
                        self.gui.show_popup('confirm',{
                            'title': _t('Delivery Order?'),
                            'body':  _t('You want to remove delivery order?'),
                            confirm: function(){
                                order.set_is_delivery(false);
                                lines.map(function(line){
                                    line.set_deliver_info(false);
                                    if(line.get_delivery_charges_flag()){
                                        order.remove_orderline(line);
                                    }
                                });
                                $('#delivery_mode').removeClass('deliver_on');
                            },
                        });
                    }
                }else{
                    if(lines.length > 0){
                        this.pos.gui.show_popup('confirm',{
                            'title': _t('Delivery Order?'),
                            'body':  _t('You want to make delivery order?'),
                            confirm: function() {
                                var self = this;
                                if (!order.get_is_delivery()) {
                                    var deliver_product_id = self.pos.config.delivery_product_id[0];
                                    var deliver_amt = self.pos.config.delivery_amount;
                                    var product = self.pos.db.get_product_by_id(deliver_product_id);
                                    if (product) {
                                        var line_deliver_charges = new models.Orderline({}, {
                                            pos: self.pos,
                                            order: order,
                                            product: product
                                        });
                                        line_deliver_charges.set_quantity(1);
                                        line_deliver_charges.set_unit_price(deliver_amt || 0);
                                        line_deliver_charges.set_delivery_charges_color(true);
                                        line_deliver_charges.set_delivery_charges_flag(true);
                                        line_deliver_charges.state = 'done';
                                        order.add_orderline(line_deliver_charges);
                                        order.set_is_delivery(true);
                                        lines.map(function (line) {
                                            line.set_deliver_info(true);
                                        });
                                        order.set_delivery(true);
                                        order.mirror_image_data();
                                        $('#delivery_mode').addClass('deliver_on');
                                    }
                                }
                            }
                        });
                    }
                }
            }
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

        export_as_JSON: function() {
            var self = this;
            var orders = _super_Order.export_as_JSON.call(this);
            var parent_return_order = '';
            var ret_o_id = this.get_ret_o_id();
            var ret_o_ref = this.get_ret_o_ref();
            var return_seq = 0;
            if (ret_o_id) {
                parent_return_order = this.get_ret_o_id();
            }
            var backOrders_list = [];
            _.each(this.get_orderlines(),function(item) {
                if (item.get_back_order()) {
                    backOrders_list.push(item.get_back_order());
                }
            });
            var unique_backOrders = "";
            for ( var i = 0 ; i < backOrders_list.length ; ++i ) {
                if ( unique_backOrders.indexOf(backOrders_list[i]) == -1 && backOrders_list[i] != "" )
                    unique_backOrders += backOrders_list[i] + ', ';
            }
            var cancel_orders = '';
            _.each(self.get_orderlines(), function(line){
                if(line.get_cancel_item()){
                    cancel_orders += " "+line.get_cancel_item();
                }
            });
            var new_val = {
//                signature: this.get_signature(),
//                is_debit : this.get_is_debit() || false,
//                customer_email: this.get_ereceipt_mail(),
//                prefer_ereceipt: this.get_prefer_ereceipt(),
//                order_note: this.get_order_note(),
                parent_return_order: parent_return_order,
                return_seq: return_seq || 0,
                back_order: unique_backOrders,
//                sale_mode: this.get_sale_mode(),
                /*ORDER SYNC START*/
                salesman_id: this.get_salesman_id() || this.pos.get_cashier().id,
                old_order_id: this.get_order_id(),
                sequence: this.get_sequence(),
                /*ORDER SYNC END*/
                pos_reference: this.get_pos_reference(),
//                rounding: this.get_rounding(),
//                is_rounding: this.pos.config.enable_rounding,
//                rounding_option: this.pos.config.enable_rounding ? this.pos.config.rounding_options : false,
//                delivery_date: this.get_delivery_date(),
//                delivery_time: this.get_delivery_time(),
//                delivery_address: this.get_delivery_address(),
//                delivery_charge_amt: this.get_delivery_charge_amt(),
//                giftcard: this.get_giftcard() || false,
//                redeem: this.get_redeem_giftcard() || false,
//                recharge: this.get_recharge_giftcard() || false,
//                voucher: this.get_voucher() || false,
//                wallet_type: this.get_type_for_wallet() || false,
//                change_amount_for_wallet: this.get_change_amount_for_wallet() || false,
//                used_amount_from_wallet: this.get_used_amount_from_wallet() || false,
//                //Credit Management
//                amount_due: this.get_due() ? this.get_due() : 0.00,
//                credit_type: this.get_type_for_credit() || false,
//                change_amount_for_credit: this.get_change_amount_for_credit() || false,
//                order_make_picking: this.get_order_make_picking() || false,
//                credit_detail: this.get_credit_detail(),
//                //Reservation
//                amount_due: this.get_due() ? this.get_due() : 0.00,
//                reserved: this.get_reservation_mode() || false,
//                reserve_delivery_date: this.get_reserve_delivery_date() || false,
//                cancel_order_ref: cancel_orders || false,
//                cancel_order: this.get_cancel_order() || false,
//                set_as_draft: this.get_draft_order() || false,
//                customer_email: this.get_client() ? this.get_client().email : false,
//                fresh_order: this.get_fresh_order() || false,
//                partial_pay: this.get_partial_pay() || false,
//                doctor_id: this.get_doctor() ? this.get_doctor().id : false,
//                shop_id : self.pos.config.multi_shop_id ? self.pos.config.multi_shop_id[0] : false,
//                rating: this.get_rating() || '0',
//                // Delivery Management
//                delivery_type: this.get_delivery_type(),
//                delivery_user_id: (this.get_delivery_user_id() != 0 ? this.get_delivery_user_id() : false),
//                to_be_deliver: this.get_deliver_mode() || false,
//                order_on_debit: this.get_order_on_debit() || false,
//                pos_normal_receipt_html: this.get_pos_normal_receipt_html() || '',
//                pos_xml_receipt_html: this.get_pos_xml_receipt_html() || '',
            }
            $.extend(orders, new_val);
            return orders;
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

    var _super_orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            _super_orderline.initialize.call(this, attr, options);
            this.line_note = '';
            this.oid = null;
            this.backorder = null;
            this.cancel_item = false;
            this.consider_qty = 0;
            this.return_valid_days = 0;
        },
        set_return_valid_days: function(return_valid_days){
            this.return_valid_days = return_valid_days;
        },
        get_return_valid_days: function(return_valid_days){
            return this.return_valid_days;
        },
        //Credit Management
        set_from_credit: function(from_credit) {
            this.from_credit = from_credit;
        },
        get_from_credit: function() {
            return this.from_credit;
        },
        set_cancel_item: function(val){
            this.set('cancel_item', val)
        },
        get_cancel_item: function(){
            return this.get('cancel_item');
        },
        set_consider_qty: function(val){
            this.set('consider_qty', val)
        },
        get_consider_qty: function(){
            return this.get('consider_qty');
        },
        set_location_id: function(location_id){
            this.set({
                'location_id': location_id,
            });
        },
        set_cancel_process: function(oid) {
            this.set('cancel_process', oid)
        },
        get_cancel_process: function() {
            return this.get('cancel_process');
        },
        set_cancel_item_id: function(val) {
            this.set('cancel_item_id', val)
        },
        get_cancel_item_id: function() {
            return this.get('cancel_item_id');
        },
        set_line_status: function(val) {
            this.set('line_status', val)
        },
        get_line_status: function() {
            return this.get('line_status');
        },
        get_location_id: function(){
            return this.get('location_id');
        },
        set_location_name: function(location_name){
            this.set({
                'location_name': location_name,
            });
        },
        get_location_name: function(){
            return this.get('location_name');
        },
        set_quantity: function(quantity, keep_price){
            if(quantity === 'remove'){
                this.set_oid('');
                this.pos.get_order().remove_orderline(this);
                return;
            }else{
                _super_orderline.set_quantity.call(this, quantity, keep_price);
            }
            this.trigger('change',this);
        },
        set_bag_color: function(bag_color) {
            this.bag_color = bag_color;
        },
        get_bag_color: function() {
            return this.get('bag_color');
        },
        set_is_bag: function(is_bag){
            this.is_bag = is_bag;
        },
        get_is_bag: function(){
            return this.is_bag;
        },
        set_line_note: function(line_note) {
            this.set('line_note', line_note);
        },
        get_line_note: function() {
            return this.get('line_note');
        },
        set_oid: function(oid) {
            this.set('oid', oid)
        },
        get_oid: function() {
            return this.get('oid');
        },
        set_back_order: function(backorder) {
            this.set('backorder', backorder);
        },
        get_back_order: function() {
            return this.get('backorder');
        },
        set_delivery_charges_color: function(delivery_charges_color) {
            this.delivery_charges_color = delivery_charges_color;
        },
        get_delivery_charges_color: function() {
            return this.get('delivery_charges_color');
        },
        set_deliver_info: function(deliver_info) {
            this.set('deliver_info', deliver_info);
        },
        get_deliver_info: function() {
            return this.get('deliver_info');
        },
        set_delivery_charges_flag: function(delivery_charge_flag) {
            this.set('delivery_charge_flag',delivery_charge_flag);
        },
        get_delivery_charges_flag: function() {
            return this.get('delivery_charge_flag');
        },
        set_original_price: function(price){
            this.set('original_price', price)
        },
        get_original_price: function(){
            return this.get('original_price')
        },
        set_promotion_data: function(data){
            this.promotion_data = data;
        },
        get_promotion_data: function(){
            return this.promotion_data
        },
        init_from_JSON: function(json) {
            _super_orderline.init_from_JSON.apply(this, arguments)
            this.set_original_price(json.original_price);
        },
        export_as_JSON: function() {
            var lines = _super_orderline.export_as_JSON.call(this);
            var oid = this.get_oid();
            var return_process = oid;
            var return_qty = this.get_quantity();
            var order_ref = this.pos.get_order() ? this.pos.get_order().get_ret_o_id() : false;
            var default_stock_location = this.pos.config.stock_location_id ? this.pos.config.stock_location_id[0] : false;
            var serials = "Serial No(s).: ";
            var back_ser = "";
            var serials_lot = [];
            if(this.pack_lot_lines && this.pack_lot_lines.models){
                var self = this;
                _.each(this.pack_lot_lines.models,function(lot) {
                    if(lot && lot.get('lot_name')){
                        if($.inArray(lot.get('lot_name'), serials_lot) == -1){
                            var count = 0;
                            serials_lot.push(lot.get('lot_name'));
                            _.each(self.pack_lot_lines.models,function(lot1) {
                                if(lot1 && lot1.get('lot_name')){
                                    if(lot1.get('lot_name') == lot.get('lot_name')){
                                        count ++;
                                    }
                                }
                            });
                            serials += lot.get('lot_name')+"("+count+")"+", ";
                        }
                    }
                });
            } else {
                serials = "";
            }
            this.lots = serials;
            var new_attr = {
                line_note: this.get_line_note(),
                cost_price: this.product.standard_price,
                return_process: return_process,
                return_qty: parseInt(return_qty),
                back_order: this.get_back_order(),
                deliver: this.get_deliver_info(),
                location_id: this.get_location_id() || default_stock_location,
                from_credit:this.get_from_credit(),
                //reservation
                cancel_item: this.get_cancel_item() || false,
                cancel_process: this.get_cancel_process() || false,
                cancel_qty: this.get_quantity() || false,
                consider_qty : this.get_consider_qty(),
                cancel_item_id: this.get_cancel_item_id() || false,
                new_line_status: this.get_line_status() || false,
                serial_nums: this.lots || false,
                return_valid_days: this.get_return_valid_days(),
            }
            $.extend(lines, new_attr);
            return lines;
        },

    });




    });