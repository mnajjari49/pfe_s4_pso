odoo.define('kzm_pos_customer_display.pos', function (require) {
	"use strict";

	var gui = require('point_of_sale.gui');
	var models = require('point_of_sale.models');
	var screens = require('point_of_sale.screens');
	var chrome = require('point_of_sale.chrome');
	var core = require('web.core');
	var DB = require('point_of_sale.DB');
	var keyboard = require('point_of_sale.keyboard').OnscreenKeyboardWidget;
	var rpc = require('web.rpc');
	var utils = require('web.utils');
	var PopupWidget = require('point_of_sale.popups');
	var bus_service = require('bus.BusService');
    var bus = require('bus.Longpolling');
    var session = require('web.session');

	var QWeb = core.qweb;
	var _t = core._t;
	var round_pr = utils.round_precision;

	var _super_Order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options){
            var res = _super_Order.initialize.apply(this, arguments);
            return this;
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
        set_credit_payment : function(credit_payment){
            this.credit_payment = credit_payment;
        },
        get_credit_payment : function(){
            return this.credit_payment;
        },
        /*Credit Payment End*/
        set_doctor: function(doctor){
            this.assert_editable();
            this.set('doctor',doctor);
        },
        get_doctor: function(){
            return this.get('doctor');
        },
        set_salesman_id: function(salesman_id){
            this.set('salesman_id',salesman_id);
        },
        get_salesman_id: function(){
            return this.get('salesman_id');
        },
        set_sale_order_mode: function(sale_order_mode){
            this.sale_order_mode = sale_order_mode;
        },
        get_sale_order_mode: function(){
            return this.sale_order_mode;
        },
        set_reserved_order: function(reseved_mode){
            this.reseved_mode = reseved_mode;
        },
        get_reserved_order : function(){
            return this.reseved_mode;
        },
//        Cash In/Out
        set_money_inout_details: function(money_inout_details){
            this.money_inout_details = money_inout_details;
        },
        get_money_inout_details: function(){
            return this.money_inout_details;
        },
        set_cash_register: function(result){
            this.result = result;
        },
        get_cash_register: function(){
            return this.result;
        },
        set_statement_cashier: function(user_id){
            this.user_id = user_id;
        },
        get_statement_cashier: function(){
            return this.user_id;
        },
        //Out of Stock
        set_receipt_mode: function(receipt_mode) {
            this.receipt_mode = receipt_mode;
        },
        get_receipt_mode: function() {
            return this.receipt_mode;
        },
        set_product_vals :function(product_vals) {
            this.product_vals = product_vals;
        },
        get_product_vals: function() {
            return this.product_vals;
        },
        set_location_vals: function(select_location) {
            this.select_location = select_location;
        },
        get_location_vals: function() {
            return this.select_location;
        },
        set_list_products: function(list_products){
            this.list_products = list_products;
        },
        get_list_products: function(){
            return this.list_products;
        },
        //Reservation
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
        //Vertical Category
        set_is_categ_sideber_open: function(is_categ_sideber_open){
            this.is_categ_sideber_open = is_categ_sideber_open;
        },
        get_is_categ_sideber_open: function(){
            return this.is_categ_sideber_open;
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
        //Rounding
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
	    mirror_image_data:function(neworder){
            var self = this;
            var client_name = false;
            var order_total = self.getNetTotalTaxIncluded();
            var change_amount = self.get_change();
            var payment_info = [];
            var paymentlines = self.paymentlines.models;
            if(paymentlines && paymentlines[0]){
                paymentlines.map(function(paymentline){
                    payment_info.push({
                        'name':paymentline.name,
                        'amount':paymentline.amount,
                    });
                });
            }
            if(self.get_client()){
                client_name = self.get_client().name;
            }
            var vals = {
                'cart_data':$('.order-container').html(),
                'client_name':client_name,
                'order_total':order_total,
                'change_amount':change_amount,
                'payment_info':payment_info,
                'enable_customer_rating':self.pos.config.enable_customer_rating,
                'set_customer':self.pos.config.set_customer,
            }
            if(neworder){
                vals['new_order'] = true;
            }
            rpc.query({
                model: 'customer.display',
                method: 'broadcast_data',
                args: [vals],
            })
            .then(function(result) {});
        },
        add_product: function(product, options){
            var self = this;
            _super_Order.add_product.call(this, product, options);
            if(self.pos.config.customer_display){
                self.mirror_image_data();
            }

        },
        });

//    screens.ProductScreenWidget.include({
//        start: function(){
//            console.log('herrreeee')
//            $('#customer_display').click(function(){
//                window.open(self.pos.attributes.origin+'/web/customer_display' , '_blank');
//            });
//        },
//    });

//    screens.ProductScreenWidget.include({
//        start: function(){
//            var self = this;
//            self._super();
//            $('#customer_display').click(function(){
//                window.open(self.pos.attributes.origin+'/web/customer_display' , '_blank');
//            });
//        },
//
//    });

    screens.ProductScreenWidget.include({
        start: function(){
            var self = this;
            self._super();
            $('#customer_display').click(function(){
                window.open(self.pos.attributes.origin+'/web/customer_display' , '_blank');
            });

        },
        show: function(){
            this._super();
            var self = this;
            var order = this.pos.get_order();
            var partner = self.pos.config.default_partner_id;
//    		$('.breadcrumb-button.breadcrumb-home.js-category-switch').trigger('click');

        },
    });

    screens.ReceiptScreenWidget.include({
        renderElement: function() {
            var self = this;
            this._super();
            var customer_display = this.pos.config.customer_display;
            this.$('.next').click(function(){
            	if(self.pos.get_order()){
            		if(customer_display){
            			self.pos.get_order().mirror_image_data(true);
            		}
            	}
            });
        },
    });

    screens.NumpadWidget.include({
        start: function() {
            var self = this;
            this._super();
            var customer_display = this.pos.config.customer_display;
            this.$(".input-button").click(function(){
                if(customer_display){
                    self.pos.get_order().mirror_image_data();
                }
            });
        },
    });

    screens.PaymentScreenWidget.include({

        payment_input: function(input) {
            var self = this;
            var order = this.pos.get_order();
            var customer_display = self.pos.config.customer_display;
            if(order.selected_paymentline && order.selected_paymentline.get_freeze_line()){
                return
            }
            if(order.selected_paymentline && order.selected_paymentline.get_freeze()){
                return
            }
            this._super(input);
            if(customer_display){
                order.mirror_image_data();
            }
        },

        render_paymentlines: function() {
            var self  = this;
            var order = this.pos.get_order();
            if (!order) {
                return;
            }
            var customer_display = this.pos.config.customer_display;
            var lines = order.get_paymentlines();
            var due = order.get_due();
            var extradue = 0;
            var charge = 0;
            if (due && lines.length  && due !== order.get_due(lines[lines.length-1])) {
                extradue = due;
            }
            if(!order.get_ret_o_id() && order.get_sale_mode() && self.pos.config.enable_card_charges && self.pos.get_cashier().access_card_charges){
                if (order.selected_paymentline && order.selected_paymentline.cashregister.journal.apply_charges) {
                    if(order.selected_paymentline.cashregister.journal.fees_type === _t('percentage')){
                        charge = (order.selected_paymentline.get_amount() * order.selected_paymentline.cashregister.journal.fees_amount) / 100;
                    } else if(order.selected_paymentline.cashregister.journal.fees_type === _t('fixed')){
                        charge = order.selected_paymentline.cashregister.journal.fees_amount;
                    }
                    order.selected_paymentline.set_payment_charge(charge.toFixed(2));
                }
            }
            this.$('.paymentlines-container').empty();
            var lines = $(QWeb.render('PaymentScreen-Paymentlines', {
                widget: this,
                order: order,
                paymentlines: lines,
                extradue: extradue,
            }));

            lines.on('click','.delete-button',function(){
                self.click_delete_paymentline($(this).data('cid'));
                if(customer_display){
                    order.mirror_image_data();
                }
            });

            lines.on('click','.paymentline',function(){
                self.click_paymentline($(this).data('cid'));
            });

            lines.on('input','.payment_charge_input',function(){
                if(order.get_sale_mode()){
                    order.selected_paymentline.set_payment_charge($(this).val());
                }
                if(customer_display){
                    order.mirror_image_data();
                }
            });

            if(self.pos.config.enable_card_charges && self.pos.get_cashier().access_card_charges) {
                lines.on('focus','.payment_charge_input',function(){
                    window.document.body.removeEventListener('keypress',self.keyboard_handler);
                    window.document.body.removeEventListener('keydown',self.keyboard_keydown_handler);
                });
                lines.on('focusout','.payment_charge_input',function(){
                    window.document.body.addEventListener('keypress',self.keyboard_handler);
                    window.document.body.addEventListener('keydown',self.keyboard_keydown_handler);
                });
            }
            lines.appendTo(this.$('.paymentlines-container'));
            if(customer_display){
                this.pos.get_order().mirror_image_data();
            }
        },
/*        click_paymentmethods: function(id) {
            var cashregister = null;
            for ( var i = 0; i < this.pos.cashregisters.length; i++ ) {
                if ( this.pos.cashregisters[i].journal_id[0] === id ){
                    cashregister = this.pos.cashregisters[i];
                    break;
                }
            }
            this.pos.get_order().add_paymentline( cashregister );
            this.reset_input();
            this.render_paymentlines();
            var order = this.pos.get_order();
            var customer_display = this.pos.config.customer_display;
            if(customer_display){
                order.mirror_image_data();
            }
        },*/
        click_paymentmethods: function(id) {
            this._super(id);
            var order = this.pos.get_order();
            var customer_display = this.pos.config.customer_display;
            if(customer_display){
                order.mirror_image_data();
            }
        },
    });

	chrome.OrderSelectorWidget.include({
        start: function(){
            this._super();
            var customer_display = this.pos.config.customer_display;
            if(this.pos.get_order()){
                if(customer_display){
                    this.pos.get_order().mirror_image_data();
                }
            }
        },
        deleteorder_click_handler: function(event, $el) {
            var self  = this;
//            $('.show-left-cart').hide();
            if(self.gui.get_current_screen() == "receipt"){
                return
            }
            var order = this.pos.get_order();
            var customer_display = this.pos.config.customer_display;
            if (!order) {
                return;
            } else if ( !order.is_empty() ){
                this.gui.show_popup('confirm',{
                    'title': _t('Destroy Current Order ?'),
                    'body': _t('You will lose any data associated with the current order'),
                    confirm: function(){
                        self.pos.delete_current_order();
                        if(customer_display){
                            self.pos.get_order().mirror_image_data();
                        }
//                        $('#slidemenubtn1').css({'right':'0px'});
//                        $('.product-list-container').css('width','100%');
//                        $('#wrapper1').addClass('toggled');
                    },
                });
            } else {
                this.pos.delete_current_order();
                if(customer_display){
                    self.pos.get_order().mirror_image_data();
                }
//                $('#slidemenubtn1').css({'right':'0px'});
//                $('.product-list-container').css('width','100%');
//                $('#wrapper1').addClass('toggled');
            }
        },
        renderElement: function(){
            var self = this;
            this._super();
            var customer_display = this.pos.config.customer_display;
            this.$('.order-button.select-order').click(function(event){
                if(self.pos.get_order() && customer_display){
                    self.pos.get_order().mirror_image_data(true);
                }
            });
            this.$('.neworder-button').click(function(event){
                if(self.pos.get_order() && customer_display){
                    self.pos.get_order().mirror_image_data(true);
                }
            });
            this.$('.deleteorder-button').click(function(event){
                if(self.pos.get_order() && customer_display){
                    self.pos.get_order().mirror_image_data(true);
                }
            });
//            if(this.pos.config.enable_automatic_lock && self.pos.get_cashier().access_pos_lock){
//                var time_interval = this.pos.config.time_interval || 3;
//                start_lock_timer(time_interval,self);
//            }
            // Click on Manual Lock button
//            $('.order-button.lock_button').click(function(){
//                self.gui.show_popup('lock_popup');
//            });
            // Click on Unlock button
//            $('.unlock_button').click(function(){
//                $('.freeze_screen').removeClass("active_state");
//                $('.unlock_button').hide();
//                $('.unlock_button').css('z-index',0);
//                self.gui.show_screen('login');
//                $('.get-input').focus();
//            });
        },
    });
});
