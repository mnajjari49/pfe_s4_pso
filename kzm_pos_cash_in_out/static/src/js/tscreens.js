
odoo.define('kzm_pos_cash_in_out.screen', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');

    var QWeb = core.qweb;
    var _t = core._t;

    var posmodel_super = models.PosModel.prototype;
    models.PosModel.prototype.models.push({
        model:  'res.users',
        fields: [],
        loaded: function(self,users){
            self.users = users;
        },
    });

	screens.ProductScreenWidget.include({
        start: function(){
            var self = this;
            self._super();
            $('#money_in').click(function(){
                if(self.pos.config.cash_control){
                    var is_cashdrawer = false;
                    self.gui.show_popup('cash_operation_popup', {
                        button: this,
                        title: _t("Put Money In"),
                        msg: _t('Fill in this form if you put money in the cash register: '),
                        operation: "put_money",
                    });
                }else{
                    self.pos.db.notification('danger',_t('Please enable cash control from pos configuration.'));
                }
            });
            $('#money_out').click(function(){
                if(self.pos.config.cash_control){
                    self.gui.show_popup('cash_operation_popup', {
                        button: this,
                        title: _t("Take Money Out"),
                        msg: _t('Describe why you take money from the cash register: '),
                        operation: "take_money",
                    });
                }else{
                    self.pos.db.notification('danger',_t('Please enable cash control from pos configuration.'));
                }
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
        },
        show: function(){
            var self = this;
            var order = this.pos.get_order();
            this._super();
        },
        render_receipt: function() {
            var order = this.pos.get_order();
            var test = true;
            if(order.get_money_inout_details()){
                $('.pos-receipt-container', this.$el).html(QWeb.render('MoneyInOutTicket',{
                   widget:this,
                   order: order,
                   money_data: order.get_money_inout_details(),
                }));
                test = false;
            } else{
                this.$('.pos-receipt-container').html(QWeb.render('OrderReceipt', this.get_receipt_render_env()));
            }


        },
//        print_credit_receipt : function(times){
//            var order = this.pos.get_order();
//            var receipt = "";
//            for (var step = 0; step < times; step++) {
//                receipt += QWeb.render('PosTicket',{
//                    widget:this,
//                    order: order,
//                    receipt: order.export_for_printing(),
//                    orderlines: order.get_orderlines(),
//                    paymentlines: order.get_paymentlines(),
//                })
//            }
//            this.$('.pos-receipt-container').html(receipt);
//        },

//        render_change: function() {
//            this._super();
//            this.$('.total-value').html(this.format_currency(this.pos.get_order().getNetTotalTaxIncluded()));
//        },
//        print_xml: function() {
//            var order = this.pos.get_order();
//            var env = {
//                widget:  this,
//                pos: this.pos,
//                order: this.pos.get_order(),
//                receipt: this.pos.get_order().export_for_printing(),
//                paymentlines: this.pos.get_order().get_paymentlines()
//            };
//            if(order.get_free_data()){
//                var receipt = QWeb.render('XmlFreeTicket',env);
//            } else if(order.get_money_inout_details()){
//                var receipt = QWeb.render('XMLMoneyInOutTicket',{
//                    widget:this,
//                    order: order,
//                    money_data: order.get_money_inout_details(),
//                 });
//            } else if(order.get_delivery_payment_data()){
//                var data = {
//                    widget:  this,
//                    pos: this.pos,
//                    order: this.pos.get_order(),
//                    pos_order: order.get_delivery_payment_data(),
//                }
//                var receipt = QWeb.render('XmlDeliveryPaymentTicket',data);
//            } else{
//                if(order && order.is_reprint){
//                    order.is_reprint = false;
//                    this.pos.proxy.print_receipt(order.print_xml_receipt_html);
//                    return this.pos.get_order()._printed = true;
//                }else{
//                    var receipt = "";
//                    if(order.get_credit_payment()){
//                        for (var step = 0; step < 2; step++) {
//                            receipt += QWeb.render('XmlReceipt',env);
//                        }
//                    }else{
//                        receipt = QWeb.render('XmlReceipt',env);
//                    }
//                }
//            }
//            this.pos.proxy.print_receipt(receipt);
//            this.pos.get_order()._printed = true;
//        },
    });


});
