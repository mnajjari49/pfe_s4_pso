odoo.define('kzm_pos_report.models', function (require) {
    "use strict";
    console.log("============")
    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;


    models.load_fields("res.users", ['access_pos_graph','access_x_report','access_today_sale_report','access_pos_dashboard','access_product_expiry_report']);

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
        set_title_detail_expire_screen:function(title){
            this.set('screen_title',title)
        },
        get_title_detail_expire_screen: function(){
            return this.get('screen_title');
        },
        load_server_data: function () {
            var self = this;

            return posmodel_super.load_server_data.apply(this, arguments).then(function () {
                var session_params = {
                    model: 'pos.session',
                    method: 'search_read',
                    domain: [['state','=','opened']],
                    fields: ['id','name','config_id'],
                    orderBy: [{ name: 'id', asc: true}],
                }
                rpc.query(session_params, {async: false})
                .then(function(sessions){
                    if(sessions && sessions[0]){
                        self.all_pos_session = sessions;
                    }
                });


            if(self.config.print_audit_report || self.config.out_of_stock_detail){
                    var stock_location_params = {
                        model: 'stock.location',
                        method: 'search_read',
                        domain: [['usage','=','internal'],['company_id','=',self.company.id]],
                        fields: ['id','name','company_id','complete_name'],
                    }
                    rpc.query(stock_location_params, {async: false})
                    .then(function(locations){
                        if(locations && locations[0]){
                            self.all_locations = locations;
                        }
                    });
                }
});
        },
    });

    var _super_Order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options){
            if(options.json){
                options.json.lines = [];
                options.json.statement_ids = [];
            }
            this.serial_list = [];
            this.print_serial = true;
            var res = _super_Order.initialize.apply(this, arguments);
            this.set({
                ret_o_id:       null,
                ret_o_ref:      null,
                sale_mode:      true,
                missing_mode:   false,
                type_for_wallet: false,
                change_amount_for_wallet: false,
                use_wallet: false,
                used_amount_from_wallet: false,
                // Credit Management
                paying_due: false,
                paying_order: false,
                type_for_credit: false,
                change_amount_for_credit: false,
                use_credit: false,
                order_make_picking: false,
                credit_detail: [],
                customer_credit:false,
                // Reservation
                reservation_mode: false,
                reserve_delivery_date: false,
                draft_order: false,
                paying_due: false,
                fresh_order: false,
                // Sales Order Extension
                sale_order_name: false,
                invoice_name: false,
                order_id: false,
                shipping_address: false,
                invoice_address: false,
                sale_note: false,
                signature: false,
                inv_id: false,
                sale_order_date: false,
                edit_quotation: false,
                paying_sale_order: false,
                sale_order_pay: false,
                invoice_pay: false,
                sale_order_requested_date: false,
                invoice_id:false,
                delivery_mode:false,
                credit_payment:false,
            });
            $("div#sale_mode").addClass('selected-menu');
            $("div#order_return").removeClass('selected-menu');
            $("div#reservation_mode").removeClass('selected-menu');
            $("div#sale_order_mode").removeClass('selected-menu');
            this.receipt_type = 'receipt';  // 'receipt' || 'invoice'
            this.temporary = options.temporary || false;
            this.rounding_status = false;
            this.giftcard = [];
            this.redeem =[];
            this.recharge=[];
            this.date=[];
            this.voucher = [];
            this.remaining_redeemption = false;
            this.is_categ_sideber_open = false;
            this.delivery_user_id = false;
            return this;
        },
        /*Credit Payment Start*/
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
        // end reservation
        is_sale_product: function(product){
            var self = this;
            var delivery_product_id = self.pos.config.delivery_product_id[0] || false;
            if(product.is_packaging){
                return false;
            } else if(product.id == delivery_product_id){
                return false;
            }else {
                return true;
            }
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
            } else if( mode == 'missing') {
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
            } else if(mode == 'reservation_mode'){
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
        set_pricelist: function (pricelist) {
            var self = this;
            this.pricelist = pricelist;
            if(pricelist != self.pos.default_pricelist && self.pos.config.use_pricelist){
                _.each(this.get_orderlines(), function (line) {
                    line.set_original_price(line.get_display_price());
                });
            }
            var lines_to_recompute = _.filter(this.get_orderlines(), function (line) {
                return ! line.price_manually_set;
            });
            _.each(lines_to_recompute, function (line) {
                if(!line.product.is_dummy_product && !line.get_is_rule_applied()){
                    line.set_unit_price(line.product.get_price(self.pricelist, line.get_quantity()));
                    self.fix_tax_included_price(line);
                }
            });
            this.trigger('change');
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
        get_product_qty: function(product_id){
            var self = this;
            var order = self.pos.get_order();
            var lines = order.get_new_order_lines();
            var new_lines = [];
            var line_ids = [];
            var qty = 0;
            _.each(lines, function(line){
                if(line && line.get_quantity() > 0 && !line.get_is_rule_applied()){
                    if(line.product.id == product_id){
                        qty += line.get_quantity();
                        line_ids.push(line.id);
                    }
                }
            });
            var result = {
                'total_qty':Number(qty),
                'line_ids':line_ids,
            }
            return result;
        },
        add_product: function(product, options){
            var self = this;
            if(this.get_missing_mode()){
                return _super_Order.add_product.call(this, product, {quantity:-1});
            } else if(options && options.force_allow){
                _super_Order.add_product.call(this, product, options);
            } else {
                var product_quaty = self.cart_product_qnty(product.id,true);
                if(self.pos.config.restrict_order && self.pos.get_cashier().access_show_qty && product.type != "service"){
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
            }
            var selected_line = this.get_selected_orderline();
            if(this.get_delivery() && $('#delivery_mode').hasClass('deliver_on')){
                selected_line.set_deliver_info(true);
            }
            if(selected_line && this.pricelist != this.pos.default_pricelist && this.pos.config.use_pricelist){
                selected_line.set_original_price(product.get_price(this.pos.default_pricelist, selected_line.get_quantity()))
            }
            self.remove_promotion();
            self.apply_promotion();
            if(self.pos.config.customer_display){
                self.mirror_image_data();
            }
            var return_valid_days = 0;
            if(self.pos.config.enable_print_valid_days){
                if(!product.non_refundable){
                    if(product.return_valid_days > 0){
                        return_valid_days = product.return_valid_days;
                    }else{
                        if(product.pos_categ_id && product.pos_categ_id[0]){
                            var categ = self.pos.db.category_by_id[product.pos_categ_id[0]];
                            while (categ.parent_id && categ.parent_id[0]) {
                                categ = self.pos.db.category_by_id[categ.parent_id[0]];
                                if(categ && categ.return_valid_days > 0){
                                    return_valid_days = categ.return_valid_days;
                                }
                            }
                        }
                    }
                }else{
                    return_valid_days = 0;
                }
            }
            selected_line.set_return_valid_days(return_valid_days);
        },
        set_client: function(client){
            if(this.get_sale_order_name()){
                return;
            }
            _super_Order.set_client.apply(this, arguments);
            if(this.pos.gui.get_current_screen() == 'products') {
                if (client) {
                    $('.c-user').text(client.name);
                    var img_src = "<img style='height:50px;width:50px' src='/web/image?model=res.partner&id=" + client.id + "&field=image_small'/>";
                    $('span.avatar-img').html(img_src);
                } else {
                    var img_src = "<i style='font-size:50px;padding: 8px;' class='fa fa-user' aria-hidden='true'></i>";
                    $('span.avatar-img').html(img_src);
                    $('.c-user').text('Guest Patient');
                }
            }
            this.mirror_image_data();
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
        set_rating: function(rating){
            this.rating = rating;
        },
        get_rating: function(){
            return this.rating;
        },
        remove_promotion: function(){
            var self = this;
            var order = self.pos.get_order();
            var lines = order.get_orderlines();
            var selected_line = order.get_selected_orderline() || false;
            var cashier = self.pos.get_cashier();
            if(selected_line){
                if(selected_line.get_child_line_id()){
                    var child_line = order.get_orderline(selected_line.get_child_line_id());
                    if(child_line){
                        selected_line.set_child_line_id(false);
                        selected_line.set_is_rule_applied(false);
                        order.remove_orderline(child_line);
                    }
                }else if(selected_line.get_buy_x_get_dis_y()){
                    if(selected_line.get_quantity() < 1){
                        _.each(lines, function(line){
                            if(line && line.get_buy_x_get_y_child_item()){
                                line.set_discount(0);
                                line.set_buy_x_get_y_child_item({});
                                line.set_promotion_data("");
                                line.set_is_rule_applied(false);
                                self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                            }
                        });
                    }
                }else if(selected_line.get_quantity_discount()){
                    selected_line.set_quantity_discount({});
                    selected_line.set_promotion_data("");
                    selected_line.set_discount(0);
                    selected_line.set_is_rule_applied(false);
                }else if(selected_line.get_discount_amt()){
                    selected_line.set_discount_amt_rule(false);
                    selected_line.set_promotion_data("");
                    selected_line.set_discount_amt(0);
                    selected_line.set_unit_price(selected_line.product.list_price);
                    selected_line.set_is_rule_applied(false);
                }
                else if(selected_line.get_multi_prods_line_id()){
                    var multi_prod_id = selected_line.get_multi_prods_line_id() || false;
                    if(multi_prod_id){
                        _.each(lines, function(_line){
                            if(_line && _line.get_multi_prods_line_id() == multi_prod_id){
                                _line.set_discount(0);
                                _line.set_is_rule_applied(false);
                                _line.set_promotion_data(false);
                                self.pos.chrome.screens.products.order_widget.rerender_orderline(_line);
                            }
                        });
                    }
                }
            }
        },
        apply_promotion: function(){
            var self = this;
            self.remove_promotion();
//    		if(!self.pos.config.pos_promotion || !self.pos.get_cashier().access_pos_promotion){
//    			return;
//    		}
            var order = self.pos.get_order();
            var lines = order.get_new_order_lines();
            var promotion_list = self.pos.pos_promotions;
            var condition_list = self.pos.pos_conditions;
            var discount_list = self.pos.pos_get_discount;
            var pos_get_qty_discount_list = self.pos.pos_get_qty_discount;
            var pos_qty_discount_amt = self.pos.pos_qty_discount_amt;
            var pos_discount_multi_prods = self.pos.pos_discount_multi_prods;
            var pos_discount_multi_categ = self.pos.pos_discount_multi_categ;
            var pos_discount_above_price = self.pos.pos_discount_above_price;
            var selected_line = self.pos.get_order().get_selected_orderline();
            var current_time = Number(moment(new Date().getTime()).locale('en').format("H"));
            if(order && lines && lines[0]){
                _.each(lines, function(line){
                    if(promotion_list && promotion_list[0]){
                        _.each(promotion_list, function(promotion){
                            if((Number(promotion.from_time) <= current_time && Number(promotion.to_time) > current_time) || (!promotion.from_time && !promotion.to_time)){
                                if(promotion && promotion.promotion_type == "buy_x_get_y"){
                                    if(promotion.pos_condition_ids && promotion.pos_condition_ids[0]){
                                        _.each(promotion.pos_condition_ids, function(pos_condition_line_id){
                                            var line_record = _.find(condition_list, function(obj) { return obj.id == pos_condition_line_id});
                                            if(line_record){
                                                if(line_record.product_x_id && line_record.product_x_id[0] == line.product.id){
                                                    if(!line.get_is_rule_applied()){
                                                        if(line_record.operator == 'is_eql_to'){
                                                            if(line_record.quantity == line.quantity){
                                                                if(line_record.product_y_id && line_record.product_y_id[0]){
                                                                    var product = self.pos.db.get_product_by_id(line_record.product_y_id[0]);
                                                                    var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                                                                    new_line.set_quantity(line_record.quantity_y);
                                                                    new_line.set_unit_price(0);
                                                                    new_line.set_promotion({
                                                                        'prom_prod_id':line_record.product_y_id[0],
                                                                        'parent_product_id':line_record.product_x_id[0],
                                                                        'rule_name':promotion.promotion_code,
                                                                    });
                                                                    new_line.set_promotion_data(promotion);
                                                                    new_line.set_is_rule_applied(true);
                                                                    order.add_orderline(new_line);
                                                                    line.set_child_line_id(new_line.id);
                                                                    line.set_is_rule_applied(true);
                                                                }
                                                            }
                                                        }else if(line_record.operator == 'greater_than_or_eql'){
                                                            var data = order.get_product_qty(line.product.id);
        //													if(line.quantity >= line_record.quantity){
                                                            if(data.total_qty >= line_record.quantity){
                                                                if(line_record.product_y_id && line_record.product_y_id[0]){
                                                                    var product = self.pos.db.get_product_by_id(line_record.product_y_id[0]);
                                                                    var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                                                                    new_line.set_quantity(line_record.quantity_y);
                                                                    new_line.set_unit_price(0);
                                                                    new_line.set_promotion({
                                                                        'prom_prod_id':line_record.product_y_id[0],
                                                                        'parent_product_id':line_record.product_x_id[0],
                                                                        'rule_name':promotion.promotion_code,
                                                                    });
                                                                    new_line.set_promotion_data(promotion);
                                                                    new_line.set_is_rule_applied(true);
                                                                    order.add_orderline(new_line);
                                                                    if(data.line_ids[0]){
                                                                        data.line_ids.map(function(line_id){
                                                                            var temp_line = order.get_orderline(line_id);
                                                                            if(temp_line){
                                                                                temp_line.set_child_line_id(new_line.id);
                                                                                temp_line.set_is_rule_applied(true);
                                                                            }
                                                                        });
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }else if(promotion && promotion.promotion_type == "buy_x_get_dis_y"){
                                    if(promotion.parent_product_ids && promotion.parent_product_ids[0] && (jQuery.inArray(line.product.id,promotion.parent_product_ids) != -1)){
                                        var disc_line_ids = [];
                                        _.each(promotion.pos_quntity_dis_ids, function(pos_quntity_dis_id){
                                            var disc_line_record = _.find(discount_list, function(obj) { return obj.id == pos_quntity_dis_id});
                                            if(disc_line_record){
                                                if(disc_line_record.product_id_dis && disc_line_record.product_id_dis[0]){
                                                    disc_line_ids.push(disc_line_record);
                                                }
                                            }
                                        });
                                        line.set_buy_x_get_dis_y({
                                            'disc_line_ids':disc_line_ids,
                                            'promotion':promotion,
                                        });
                                    }
                                    if(line.get_buy_x_get_dis_y().disc_line_ids){
                                        _.each(line.get_buy_x_get_dis_y().disc_line_ids, function(disc_line){
                                            _.each(lines, function(orderline){
                                                if(disc_line.product_id_dis && disc_line.product_id_dis[0] == orderline.product.id){
    //												orderline.set_discount(disc_line.discount_dis_x);
    //												orderline.set_buy_x_get_y_child_item({
    //													'rule_name':line.get_buy_x_get_dis_y().promotion.promotion_code
    //												});
    //												orderline.set_promotion_data(line.get_buy_x_get_dis_y().promotion);
    //												orderline.set_is_rule_applied(true);
    //												self.pos.chrome.screens.products.order_widget.rerender_orderline(orderline);
    //												return false;
                                                    var count = 0;
                                                    _.each(order.get_orderlines(), function(_line){
                                                        if(_line.product.id == orderline.product.id){
                                                            count += 1;
                                                        }
                                                    });
                                                    if(count <= disc_line.qty){
                                                        var cart_line_qty = orderline.get_quantity();
                                                        if(cart_line_qty >= disc_line.qty){
                                                            var prmot_disc_lines = [];
                                                            var flag = true;
                                                            order.get_orderlines().map(function(o_line){
                                                                if(o_line.product.id == orderline.product.id){
                                                                    if(o_line.get_is_rule_applied()){
                                                                        flag = false;
                                                                    }
                                                                }
                                                            });
                                                            if(flag){
                                                                var extra_prod_qty = cart_line_qty - disc_line.qty;
                                                                if(extra_prod_qty != 0){
                                                                    orderline.set_quantity(disc_line.qty);
                                                                }
                                                                orderline.set_discount(disc_line.discount_dis_x);
                                                                orderline.set_buy_x_get_y_child_item({
                                                                    'rule_name':line.get_buy_x_get_dis_y().promotion.promotion_code,
                                                                    'promotion_type':line.get_buy_x_get_dis_y().promotion.promotion_type,
                                                                });
                                                                orderline.set_is_rule_applied(true);
                                                                self.pos.chrome.screens.products.order_widget.rerender_orderline(orderline);
                                                                if(extra_prod_qty != 0){
                                                                    var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: orderline.product});
                                                                    new_line.set_quantity(extra_prod_qty);
                                                                    order.add_orderline(new_line);
                                                                }
                                                                return false;
                                                            }
                                                        }
                                                    }
                                                }
                                            });
                                        });
                                    }
                                }else if(promotion && promotion.promotion_type == "quantity_discount"){
                                    if(promotion.product_id_qty && promotion.product_id_qty[0] == line.product.id){
                                        var line_ids = [];
                                        _.each(promotion.pos_quntity_ids, function(pos_quntity_id){
                                            var line_record = _.find(pos_get_qty_discount_list, function(obj) { return obj.id == pos_quntity_id});
                                            if(line_record){
                                                if(line.get_quantity() == line_record.quantity_dis){
                                                    if(line_record.discount_dis){
                                                        line.set_discount(line_record.discount_dis);
                                                        line.set_quantity_discount({
                                                            'rule_name':promotion.promotion_code,
                                                        });
                                                        line.set_promotion_data(promotion);
                                                        line.set_is_rule_applied(true);
                                                        self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                                                        return false;
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }else if(promotion && promotion.promotion_type == "quantity_price"){
                                    if(promotion.product_id_amt && promotion.product_id_amt[0] == line.product.id){
                                        var line_ids = [];
                                        _.each(promotion.pos_quntity_amt_ids, function(pos_quntity_amt_id){
                                            var line_record = _.find(pos_qty_discount_amt, function(obj) { return obj.id == pos_quntity_amt_id});
                                            if(line_record){
                                                if(line.get_quantity() >= line_record.quantity_amt){
                                                    if(line_record.discount_price){
                                                        line.set_discount_amt(line_record.discount_price);
                                                        line.set_discount_amt_rule(promotion.promotion_code);
                                                        line.set_promotion_data(promotion);
    //													line.set_unit_price(((line.get_unit_price()*line.get_quantity()) - line_record.discount_price)/line.get_quantity());
                                                        line.set_unit_price(line_record.discount_price);
                                                        line.set_is_rule_applied(true);
                                                        self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                                                        return false;
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }else if(promotion && promotion.promotion_type == "discount_on_multi_product"){
                                    if(promotion.multi_products_discount_ids && promotion.multi_products_discount_ids[0]){
                                        _.each(promotion.multi_products_discount_ids, function(disc_line_id){
                                            var disc_line_record = _.find(pos_discount_multi_prods, function(obj) { return obj.id == disc_line_id});
                                            if(disc_line_record){
                                                self.check_products_for_disc(disc_line_record, promotion);
                                            }
                                        })
                                    }
                                }else if(promotion && promotion.promotion_type == "discount_on_multi_categ"){
                                    if(promotion.multi_categ_discount_ids && promotion.multi_categ_discount_ids[0]){
                                        _.each(promotion.multi_categ_discount_ids, function(disc_line_id){
                                            var disc_line_record = _.find(pos_discount_multi_categ, function(obj) { return obj.id == disc_line_id});
                                            if(disc_line_record){
                                                self.check_categ_for_disc(disc_line_record, promotion);
                                            }
                                        })
                                    }
                                }else if(promotion && promotion.promotion_type == "discount_on_above_price"){
                                    if(promotion && promotion.discount_price_ids && promotion.discount_price_ids[0]){
                                        _.each(promotion.discount_price_ids, function(line_id){
                                            var line_record = _.find(pos_discount_above_price, function(obj) { return obj.id == line_id});
                                            if(line_record && line_record.product_brand_ids && line_record.product_brand_ids[0]
                                                && line_record.product_categ_ids && line_record.product_categ_ids[0]){
                                                if(line.product.product_brand_id && line.product.product_brand_id[0]){
                                                    if($.inArray(line.product.product_brand_id[0], line_record.product_brand_ids) != -1){
                                                        if(line.product.pos_categ_id){
                                                            var product_category = self.pos.db.get_category_by_id(line.product.pos_categ_id[0])
                                                            if(product_category){
                                                                if($.inArray(product_category.id, line_record.product_categ_ids) != -1){
    //																if(line_record.price && line_record.discount){
    //																	if(line.product.list_price >= line_record.price && line.quantity > 0){
    //																		line.set_discount(line_record.discount);
    //																		line.set_is_rule_applied(true);
    //																		line.set_promotion_data(promotion);
    //																	}
    //																}
                                                                    if(line_record.discount_type == "fix_price"){
                                                                        if(line.product.lst_price >= line_record.price && line.quantity > 0){
                                                                            if(line_record.price){
                                                                                line.set_discount_amt(line_record.price);
                                                                                line.set_discount_amt_rule(line_record.pos_promotion_id[1]);
                                                                                line.set_unit_price(((line.get_unit_price()*line.get_quantity()) - line_record.price)/line.get_quantity());
                                                                                line.set_promotion_data(promotion);
                                                                                line.set_is_rule_applied(true);
                                                                                self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                                                                            }
                                                                        }
                                                                    } else if(line_record.discount_type == "percentage"){
                                                                        if(line_record.discount){
                                                                            if(line.product.lst_price >= line_record.price && line.quantity > 0){
                                                                                line.set_discount(line_record.discount);
                                                                                line.set_promotion_data(promotion);
                                                                                line.set_is_rule_applied(true);
                                                                            }
                                                                        }
                                                                    } else if(line_record.discount_type == "free_product"){
                                                                        if(line_record.free_product && line_record.free_product[0]){
                                                                            var product = self.pos.db.get_product_by_id(line_record.free_product[0]);
                                                                            var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                                                                            new_line.set_quantity(1);
                                                                            new_line.set_unit_price(0);
                                                                            new_line.set_promotion({
                                                                                'prom_prod_id':line_record.free_product[0],
                                                                                'parent_product_id':line.id,
                                                                                'rule_name':line_record.pos_promotion_id[1],
                                                                            });
                                                                            new_line.set_is_rule_applied(true);
                                                                            order.add_orderline(new_line);
                                                                            line.set_child_line_id(new_line.id);
                                                                            line.set_promotion_data(promotion);
                                                                            line.set_is_rule_applied(true);
                                                                        }
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }else if(line_record.product_brand_ids.length <= 0 && line_record.product_categ_ids.length > 0){
                                                if(line.product.pos_categ_id){
                                                    var product_category = self.pos.db.get_category_by_id(line.product.pos_categ_id[0])
                                                    if(product_category){
                                                        if($.inArray(product_category.id, line_record.product_categ_ids) != -1){
    //														if(line_record.price && line_record.discount){
    //															if(line.product.list_price >= line_record.price && line.quantity > 0){
    //																line.set_discount(line_record.discount);
    //																line.set_is_rule_applied(true);
    //																line.set_promotion_data(promotion);
    //																self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
    //															}
    //														}
                                                            if(line_record.discount_type == "fix_price"){
                                                                if(line.product.lst_price >= line_record.price && line.quantity > 0){
                                                                    if(line_record.price){
                                                                        line.set_discount_amt(line_record.price);
                                                                        line.set_discount_amt_rule(line_record.pos_promotion_id[1]);
                                                                        line.set_unit_price(((line.get_unit_price()*line.get_quantity()) - line_record.price)/line.get_quantity());
                                                                        line.set_is_rule_applied(true);
                                                                        line.set_promotion_data(promotion);
                                                                        self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                                                                    }
                                                                }
                                                            } else if(line_record.discount_type == "percentage"){
                                                                if(line_record.discount){
                                                                    if(line.product.lst_price >= line_record.price && line.quantity > 0){
                                                                        line.set_discount(line_record.discount);
                                                                        line.set_promotion_data(promotion);
                                                                        line.set_is_rule_applied(true);
                                                                    }
                                                                }
                                                            } else if(line_record.discount_type == "free_product"){
                                                                if(line_record.free_product && line_record.free_product[0]){
                                                                    var product = self.pos.db.get_product_by_id(line_record.free_product[0]);
                                                                    var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                                                                    new_line.set_quantity(1);
                                                                    new_line.set_unit_price(0);
                                                                    new_line.set_promotion({
                                                                        'prom_prod_id':line_record.free_product[0],
                                                                        'parent_product_id':line.id,
                                                                        'rule_name':line_record.pos_promotion_id[1],
                                                                    });
                                                                    new_line.set_is_rule_applied(true);
                                                                    order.add_orderline(new_line);
                                                                    line.set_child_line_id(new_line.id);
                                                                    line.set_promotion_data(promotion);
                                                                    line.set_is_rule_applied(true);
                                                                }
                                                            }
                                                        }
                                                    }
                                                }
                                            }else if(line_record.product_categ_ids.length == 0 && line_record.product_brand_ids.length > 0){
                                                if(line.product.product_brand_id && line.product.product_brand_id[0]){
                                                    if($.inArray(line.product.product_brand_id[0], line_record.product_brand_ids) != -1){
    //													if(line_record.price && line_record.discount){
    //														if(line.product.list_price >= line_record.price && line.quantity > 0){
    //															line.set_discount(line_record.discount);
    //															line.set_is_rule_applied(true);
    //															line.set_promotion_data(promotion);
    //															self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
    //														}
    //													}
                                                        if(line_record.discount_type == "fix_price"){
                                                            if(line.product.lst_price >= line_record.price && line.quantity > 0){
                                                                if(line_record.price){
                                                                    line.set_discount_amt(line_record.price);
                                                                    line.set_discount_amt_rule(line_record.pos_promotion_id[1]);
                                                                    line.set_promotion_data(promotion);
                                                                    line.set_unit_price(((line.get_unit_price()*line.get_quantity()) - line_record.price)/line.get_quantity());
                                                                    line.set_is_rule_applied(true);
                                                                    self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                                                                }
                                                            }
                                                        } else if(line_record.discount_type == "percentage"){
                                                            if(line_record.discount){
                                                                if(line.product.lst_price >= line_record.price && line.quantity > 0){
                                                                    line.set_discount(line_record.discount);
                                                                    line.set_promotion_data(promotion);
                                                                    line.set_is_rule_applied(true);
                                                                }
                                                            }
                                                        } else if(line_record.discount_type == "free_product"){
                                                            if(line_record.free_product && line_record.free_product[0]){
                                                                var product = self.pos.db.get_product_by_id(line_record.free_product[0]);
                                                                var new_line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                                                                new_line.set_quantity(1);
                                                                new_line.set_unit_price(0);
                                                                new_line.set_promotion({
                                                                    'prom_prod_id':line_record.free_product[0],
                                                                    'parent_product_id':line.id,
                                                                    'rule_name':line_record.pos_promotion_id[1],
                                                                });
                                                                new_line.set_is_rule_applied(true);
                                                                order.add_orderline(new_line);
                                                                line.set_child_line_id(new_line.id);
                                                                line.set_is_rule_applied(true);
                                                                line.set_promotion_data(promotion);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        });
                                    }
                                }
                            }
                        });
                    }
                });
            }
        },
        check_products_for_disc: function(disc_line, promotion){
            var self = this;
            var product_ids = disc_line.product_ids;
            var discount = disc_line.products_discount;
            var order = self.pos.get_order();
            var lines = self.get_new_order_lines();
            var product_cmp_list = [];
            var orderline_ids = [];
            var products_qty = [];
            if(product_ids && product_ids[0] && discount){
                _.each(lines, function(line){
                    if(jQuery.inArray(line.product.id,product_ids) != -1){
                        product_cmp_list.push(line.product.id);
                        orderline_ids.push(line.id);
                        products_qty.push(line.get_quantity());
                    }
                });
                if(!_.contains(products_qty, 0)){
                    if(_.isEqual(_.sortBy(product_ids), _.sortBy(product_cmp_list))){
                        _.each(orderline_ids, function(orderline_id){
                            var orderline = order.get_orderline(orderline_id);
                            if(orderline && orderline.get_quantity() > 0){
                                orderline.set_discount(discount);
                                orderline.set_multi_prods_line_id(disc_line.id);
                                orderline.set_is_rule_applied(true);
//            					orderline.set_promotion_data(promotion);
                                orderline.set_combinational_product_rule(promotion.promotion_code);
                                self.pos.chrome.screens.products.order_widget.rerender_orderline(orderline);
                            }
                        });
                    }
                }
            }
        },
        check_categ_for_disc: function(disc_line, promotion){
            var self = this;
            var order = self.pos.get_order();
            var lines = self.get_new_order_lines();
            var categ_ids = disc_line.categ_ids;
            var discount = disc_line.categ_discount;
            if(categ_ids && categ_ids[0] && discount){
                _.each(categ_ids, function(categ_id){
                    var products = self.pos.db.get_product_by_category(categ_id);
                    if(products && products[0]){
                        _.each(lines, function(line){
                            if($.inArray(line.product, products) != -1){
                                line.set_discount(discount);
                                line.set_is_rule_applied(true);
//    							line.set_promotion_data(promotion);
                                line.set_multi_prod_categ_rule(promotion.promotion_code);
                                self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                            }
                        });
                    }
                });
            }
        },
        get_new_order_lines: function(){
            var self = this;
            var order = self.pos.get_order();
            var lines = order.get_orderlines();
            var new_lines = [];
            _.each(lines, function(line){
                if(line && line.get_quantity() > 0 && !line.get_is_rule_applied()){
                    new_lines.push(line);
                }
            });
            return new_lines;
        },
        calculate_discount_amt: function(){
            var self = this;
            var order = self.pos.get_order();
            var total = 0;
            if(order.get_orderlines().length){
                _.each(order.get_orderlines(),function(line){
                    if(!line.product.is_dummy_product){
                        total += line.get_display_price();
                    }
                });
            }
            var promotion_list = self.pos.pos_promotions;
            var discount = 0;
            var current_time = Number(moment(new Date().getTime()).locale('en').format("H"));
            if(promotion_list && promotion_list[0]){
                _.each(promotion_list, function(promotion){
                    if((Number(promotion.from_time) <= current_time && Number(promotion.to_time) > current_time) || (!promotion.from_time && !promotion.to_time)){
                        if(promotion.promotion_type == 'dicount_total'){
                            if(promotion.operator == 'greater_than_or_eql'){
                                if(promotion.total_amount && total >= promotion.total_amount){
                                    if(promotion.discount_product && promotion.discount_product[0]){
                                        discount = (total * promotion.total_discount)/100;
                                        order.set_discount_product_id(promotion.discount_product[0]);
                                    }
                                }
                            }else if(promotion.operator == 'is_eql_to'){
                                if(promotion.total_amount && total == promotion.total_amount){
                                    if(promotion.discount_product && promotion.discount_product[0]){
                                        discount = (total * promotion.total_discount)/100;
                                        order.set_discount_product_id(promotion.discount_product[0]);
                                    }
                                }
                            }
                        }
                    }
                });
            }
            return Number(discount);
        },
        get_total_without_tax: function() {
            var result = _super_Order.get_total_without_tax.call(this);
            if(this.pos.config.pos_promotion && this.get_order_total_discount()){
                return result - this.get_order_total_discount();
            } else{
                return result;
            }
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
        // Order History
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
        /*count_to_be_deliver:function(){
            var self = this;
            var order = self.pos.get_order();
            var lines = order.get_orderlines();
            var count = 0;
            for(var i=0;i<lines.length;i++){
                if(lines[i].get_deliver_info()){
                    count = count + 1;
                }
            }
            if(count === 0){
                for(var j=0; j<lines.length;j++){
                    if(lines[j].get_delivery_charges_flag()){
                        order.remove_orderline(lines[j]);
                        order.set_is_delivery(false);
                        $('#delivery_mode').removeClass('deliver_on');
                    }
                }
            }
        },*/
        set_giftcard: function(giftcard) {
            this.giftcard.push(giftcard)
        },
        get_giftcard: function() {
            return this.giftcard;
        },
        set_recharge_giftcard: function(recharge) {
            this.recharge.push(recharge)
        },
        get_recharge_giftcard: function(){
            return this.recharge;
        },
        set_redeem_giftcard: function(redeem) {
            this.redeem.push(redeem)
        },
        get_redeem_giftcard: function() {
            return this.redeem;
        },
        remove_card:function(code){
            var redeem = _.reject(this.redeem, function(objArr){ return objArr.redeem_card == code });
            this.redeem = redeem
        },
        set_free_data: function(freedata) {
            this.freedata = freedata;
        },
        get_free_data: function() {
            return this.freedata;
        },
        set_voucher: function(voucher) {
            this.voucher.push(voucher)
        },
        get_voucher: function() {
            return this.voucher;
        },
        remove_voucher: function(barcode, pid){
            this.voucher = _.reject(this.voucher, function(objArr){ return objArr.voucher_code == barcode && objArr.pid == pid; });
        },
        set_remaining_redeemption: function(vals){
            this.remaining_redeemption = vals;
        },
        get_remaining_redeemption: function(){
            return this.remaining_redeemption;
        },
        set_type_for_wallet: function(type_for_wallet) {
            this.set('type_for_wallet', type_for_wallet);
        },
        get_type_for_wallet: function() {
            return this.get('type_for_wallet');
        },
        set_change_amount_for_wallet: function(change_amount_for_wallet) {
            this.set('change_amount_for_wallet', change_amount_for_wallet);
        },
        get_change_amount_for_wallet: function() {
            return this.get('change_amount_for_wallet');
        },
        set_use_wallet: function(use_wallet) {
            this.set('use_wallet', use_wallet);
        },
        get_use_wallet: function() {
            return this.get('use_wallet');
        },
        set_used_amount_from_wallet: function(used_amount_from_wallet) {
            this.set('used_amount_from_wallet', used_amount_from_wallet);
        },
        get_used_amount_from_wallet: function() {
            return this.get('used_amount_from_wallet');
        },
        get_dummy_product_ids: function(){
            var list_ids = [];
            if(this.pos.config.delivery_product_id)
                list_ids.push(this.pos.config.delivery_product_id[0]);
            if(this.pos.config.gift_card_product_id)
                list_ids.push(this.pos.config.gift_card_product_id[0]);
            if(this.pos.config.payment_product_id)
                list_ids.push(this.pos.config.payment_product_id[0]);
            if(this.pos.config.wallet_product)
                list_ids.push(this.pos.config.wallet_product[0]);
            if(this.pos.config.cancellation_charges_product_id)
                list_ids.push(this.pos.config.cancellation_charges_product_id[0]);
            if(this.pos.config.prod_for_payment)
                list_ids.push(this.pos.config.prod_for_payment[0]);
            if(this.pos.config.refund_amount_product_id)
                list_ids.push(this.pos.config.refund_amount_product_id[0]);
            if(this.pos.db.get_dummy_product_ids().length > 0){
                this.pos.db.get_dummy_product_ids().map(function(dummy_id){
                    if(!_.contains(list_ids, dummy_id)){
                        list_ids.push(dummy_id);
                    }
                });
            }
            return list_ids;
        },
        remove_orderline: function(line){
            var self = this;
            _super_Order.remove_orderline.call(this, line);
            if(line){
                var lines = this.get_orderlines();
                if(line && line.get_child_line_id()){
                    var child_line = self.get_orderline(line.get_child_line_id());
                    lines.map(function(_line){
                        if(_line.get_child_line_id() == line.get_child_line_id()){
                            _line.set_child_line_id(false);
                            _line.set_is_rule_applied(false);
                        }
                    });
                    if(child_line){
                        line.set_child_line_id(false);
                        line.set_is_rule_applied(false);
                        self.remove_orderline(child_line);
                        self.apply_promotion();
                    }
                }else if(line.get_buy_x_get_dis_y()){
                    _.each(lines, function(_line){
                        if(_line && _line.get_buy_x_get_y_child_item()){
                            _line.set_discount(0);
                            _line.set_buy_x_get_y_child_item({});
                            _line.set_is_rule_applied(false);
                            self.pos.chrome.screens.products.order_widget.rerender_orderline(_line);
                        }
                    });
                }else if(line.get_multi_prods_line_id()){
                    var multi_prod_id = line.get_multi_prods_line_id() || false;
                    if(multi_prod_id){
                        _.each(lines, function(_line){
                            if(_line && _line.get_multi_prods_line_id() == multi_prod_id){
                                _line.set_discount(0);
                                _line.set_is_rule_applied(false);
                                _line.set_combinational_product_rule(false);
                                self.pos.chrome.screens.products.order_widget.rerender_orderline(_line);
                            }
                        });
                    }
                }
            }
        },
        add_paymentline: function(cashregister) {
            _super_Order.add_paymentline.call(this,cashregister);
            var total = this.get_total_with_tax();
            var paymentline = this.get_paymentlines();
            _.each(paymentline, function(line){
                if(line.selected && total < 0){
                    line.set_amount(total);
                }
            });
        },
        add_paymentline_by_journal: function(cashregister) {
            this.assert_editable();
            var newPaymentline = new models.Paymentline({}, {order: this, cashregister:cashregister, pos: this.pos})
            var newPaymentline = new models.Paymentline({}, {order: this, cashregister:cashregister, pos: this.pos})
            if((this.pos.get_order().get_due() > 0) && (this.pos.get_order().get_client().remaining_credit_amount > this.pos.get_order().get_due())) {
                newPaymentline.set_amount(Math.min(this.pos.get_order().get_due(),this.pos.get_order().get_client().remaining_credit_amount));
            }else if((this.pos.get_order().get_due() > 0) && (this.pos.get_order().get_client().remaining_credit_amount < this.pos.get_order().get_due())) {
                newPaymentline.set_amount(Math.min(this.pos.get_order().get_due(),this.pos.get_order().get_client().remaining_credit_amount));
            }else if(this.pos.get_order().get_due() > 0) {
                    newPaymentline.set_amount( Math.max(this.pos.get_order().get_due(),0) );
            }
            this.paymentlines.add(newPaymentline);
            this.select_paymentline(newPaymentline);
        },
        set_records: function(records) {
            this.records = records;
        },
        get_records: function() {
            return this.records;
        },
        get_remaining_credit: function(){
            var credit_total = 0.00,use_credit = 0.00;
            var self = this;
            var partner = self.pos.get_client();
            if(partner && partner.deposite_info){
                var client_account = partner.deposite_info['content'];
                var credit_detail = this.get_credit_detail();
                _.each(client_account, function(values){
                    credit_total = values.amount + credit_total
                });
                if(credit_detail && credit_detail.length > 0 && client_account && client_account.length > 0){
                    for (var i=0;i<client_account.length;i++){
                        for(var j=0;j<credit_detail.length;j++){
                            if(client_account[i].id == credit_detail[j].journal_id){
                                use_credit += Math.abs(credit_detail[j].amount)
                            }
                        }
                    }
                }
            }
            if(use_credit){
                return 	credit_total - use_credit;
            } else{
                return false
            }
        },
        // Debit Management
        set_is_debit: function(is_debit) {
            this.set('is_debit',is_debit);
        },
        get_is_debit: function(){
            return this.get('is_debit');
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
                signature: this.get_signature(),
                is_debit : this.get_is_debit() || false,
                customer_email: this.get_ereceipt_mail(),
                prefer_ereceipt: this.get_prefer_ereceipt(),
                order_note: this.get_order_note(),
                parent_return_order: parent_return_order,
                return_seq: return_seq || 0,
                back_order: unique_backOrders,
                sale_mode: this.get_sale_mode(),
                /*ORDER SYNC START*/
                salesman_id: this.get_salesman_id() || this.pos.get_cashier().id,
                old_order_id: this.get_order_id(),
                sequence: this.get_sequence(),
                /*ORDER SYNC END*/
                pos_reference: this.get_pos_reference(),
                rounding: this.get_rounding(),
                is_rounding: this.pos.config.enable_rounding,
                rounding_option: this.pos.config.enable_rounding ? this.pos.config.rounding_options : false,
                delivery_date: this.get_delivery_date(),
                delivery_time: this.get_delivery_time(),
                delivery_address: this.get_delivery_address(),
                delivery_charge_amt: this.get_delivery_charge_amt(),
                giftcard: this.get_giftcard() || false,
                redeem: this.get_redeem_giftcard() || false,
                recharge: this.get_recharge_giftcard() || false,
                voucher: this.get_voucher() || false,
                wallet_type: this.get_type_for_wallet() || false,
                change_amount_for_wallet: this.get_change_amount_for_wallet() || false,
                used_amount_from_wallet: this.get_used_amount_from_wallet() || false,
                //Credit Management
                amount_due: this.get_due() ? this.get_due() : 0.00,
                credit_type: this.get_type_for_credit() || false,
                change_amount_for_credit: this.get_change_amount_for_credit() || false,
                order_make_picking: this.get_order_make_picking() || false,
                credit_detail: this.get_credit_detail(),
                //Reservation
                amount_due: this.get_due() ? this.get_due() : 0.00,
                reserved: this.get_reservation_mode() || false,
                reserve_delivery_date: this.get_reserve_delivery_date() || false,
                cancel_order_ref: cancel_orders || false,
                cancel_order: this.get_cancel_order() || false,
                set_as_draft: this.get_draft_order() || false,
                customer_email: this.get_client() ? this.get_client().email : false,
                fresh_order: this.get_fresh_order() || false,
                partial_pay: this.get_partial_pay() || false,
                doctor_id: this.get_doctor() ? this.get_doctor().id : false,
                shop_id : self.pos.config.multi_shop_id ? self.pos.config.multi_shop_id[0] : false,
                rating: this.get_rating() || '0',
                // Delivery Management
                delivery_type: this.get_delivery_type(),
                delivery_user_id: (this.get_delivery_user_id() != 0 ? this.get_delivery_user_id() : false),
                to_be_deliver: this.get_deliver_mode() || false,
                order_on_debit: this.get_order_on_debit() || false,
                pos_normal_receipt_html: this.get_pos_normal_receipt_html() || '',
                pos_xml_receipt_html: this.get_pos_xml_receipt_html() || '',
            }
            $.extend(orders, new_val);
            return orders;
        },
        export_for_printing: function(){
            var orders = _super_Order.export_for_printing.call(this);
            var order_no = this.get_name() || false ;
            var self = this;
            var order_no = order_no ? this.get_name().replace(_t('Order '),'') : false;
            var last_paid_amt = 0;
            var currentOrderLines = this.get_orderlines();
            if(currentOrderLines.length > 0) {
                _.each(currentOrderLines,function(item) {
                    if(item.get_product().id == self.pos.config.prod_for_credit_payment[0] ){
                        last_paid_amt = item.get_display_price()
                    }
                });
            }
            var total_paid_amt = this.get_total_paid()-last_paid_amt
            var new_val = {
                order_note: this.get_order_note() || false,
                ret_o_id: this.get_ret_o_id(),
                order_no: order_no,
                reprint_payment: this.get_journal() || false,
                ref: this.get_pos_reference() || false,
                date_order: this.get_date_order() || false,
                rounding: this.get_rounding(),
                net_amount: this.getNetTotalTaxIncluded(),
                giftcard: this.get_giftcard() || false,
                recharge: this.get_recharge_giftcard() || false,
                redeem:this.get_redeem_giftcard() || false,
                free:this.get_free_data()|| false,
                remaining_redeemption: this.get_remaining_redeemption() || false,
                // Sale Order
                sale_order_name: this.get_sale_order_name() || false,
                invoice_name: this.get_invoice_name() || false,
                sale_note: this.get_sale_note() || '',
                signature: this.get_signature() || '',
                //reservation
                reprint_payment: this.get_journal() || false,
                ref: this.get_pos_reference() || false,
                last_paid_amt: last_paid_amt || 0,
                total_paid_amt: total_paid_amt || false,
                amount_due: this.get_due() ? this.get_due() : 0.00,
                old_order_id: this.get_order_id(),
                reserve_delivery_date: moment(this.get_reserve_delivery_date()).locale('en').format('L') || false,
                // Delivery Management
                delivery_date: this.get_delivery_date() || false,
                delivery_time: this.get_delivery_time() || false,
                delivery_address: this.get_delivery_address() || false,
                delivery_type: this.get_delivery_type() || false,
                delivery_user_id: this.get_delivery_user_id() || false,
            };
            $.extend(orders, new_val);
            return orders;
        },
        set_pos_xml_receipt_html: function(pos_xml_receipt_html){
            this.pos_xml_receipt_html = pos_xml_receipt_html;
        },
        get_pos_xml_receipt_html: function(){
            return this.pos_xml_receipt_html;
        },
        set_pos_normal_receipt_html: function(pos_normal_receipt_html){
            this.pos_normal_receipt_html = pos_normal_receipt_html;
        },
        get_pos_normal_receipt_html: function(){
            return this.pos_normal_receipt_html;
        },
        set_order_on_debit: function(order_on_debit){
            this.order_on_debit = order_on_debit;
        },
        get_order_on_debit: function(){
            return this.order_on_debit;
        },
        set_deliver_mode: function(mode){
            this.set('delivery_mode',mode)
        },
        get_deliver_mode: function(){
            return this.get('delivery_mode')
        },
        set_delivery_type: function(delivery_type){
            this.delivery_type = delivery_type;
        },
        get_delivery_type: function(){
            return this.delivery_type;
        },
        set_delivery_payment_data: function(delivery_payment_data){
            this.delivery_payment_data = delivery_payment_data;
        },
        get_delivery_payment_data: function(){
            return this.delivery_payment_data;
        },
        set_delivery_user_id: function(delivery_user_id){
            this.delivery_user_id = delivery_user_id;
        },
        get_delivery_user_id: function(){
            return this.delivery_user_id;
        },
        set_result: function(result) {
            this.set('result', result);
        },
        get_result: function() {
            return this.get('result');
        },
        // POS Serial/lots
        set_print_serial: function(val) {
            this.print_serial = val
        },
        get_print_serial: function() {
            return this.print_serial;
        },
        display_lot_popup: function() {
            var self = this;
            var order_line = this.get_selected_orderline();
            if(order_line && order_line.product.type == "product"){
                var pack_lot_lines =  order_line.compute_lot_lines();
                var product_id = order_line.get_product().id;
                if(this.pos.config.enable_pos_serial){
                    if(product_id){
                        var params = {
                            model: 'stock.production.lot',
                            method: 'search_lot_details',
                            args: [product_id] ,
                        }
                        rpc.query(params, {async: false}).then(function(serials){
                            if(serials){
                                self.pos.gui.show_popup('packlotline', {
                                    'title': _t('Lot/Serial Number(s) Required'),
                                    'pack_lot_lines': pack_lot_lines,
                                    'order': self,
                                    'serials': serials
                                });
                            }
                        });
                    }
                } else {
                    self.pos.gui.show_popup('packlotline', {
                        'title': _t('Lot/Serial Number(s) Required'),
                        'pack_lot_lines': pack_lot_lines,
                        'order': self,
                        'serials': []
                    });
                }
            }
        },
//      Sale Order Extension
        set_sale_order_name: function(name){
            this.set('sale_order_name', name);
        },
        get_sale_order_name: function(){
            return this.get('sale_order_name');
        },
        set_invoice_name: function(name){
            this.set('invoice_name', name);
        },
        get_invoice_name: function(){
            return this.get('invoice_name');
        },
        set_shipping_address: function(val){
            this.set('shipping_address', val);
        },
        get_shipping_address: function() {
            return this.get('shipping_address');
        },
        set_invoice_address: function(val){
            this.set('invoice_address', val);
        },
        get_invoice_address: function() {
            return this.get('invoice_address');
        },
        set_sale_note: function(val){
            this.set('sale_note', val);
        },
        get_sale_note: function() {
            return this.get('sale_note');
        },
        set_signature: function(signature) {
            this.set('signature', signature);
        },
        get_signature: function() {
            return this.get('signature');
        },
        set_inv_id: function(inv_id) {
            this.set('inv_id', inv_id)
        },
        get_inv_id: function() {
            return this.get('inv_id');
        },
        set_sale_order_date: function(sale_order_date) {
            this.set('sale_order_date', sale_order_date)
        },
        get_sale_order_date: function() {
            return this.get('sale_order_date');
        },
        set_sale_order_requested_date: function(sale_order_requested_date) {
            this.set('sale_order_requested_date', sale_order_requested_date)
        },
        get_sale_order_requested_date: function() {
            return this.get('sale_order_requested_date');
        },
        set_edit_quotation: function(edit_quotation) {
            this.set('edit_quotation', edit_quotation)
        },
        get_edit_quotation: function() {
            return this.get('edit_quotation');
        },
        set_paying_sale_order: function(paying_sale_order) {
            this.set('paying_sale_order', paying_sale_order)
        },
        get_paying_sale_order: function() {
            return this.get('paying_sale_order');
        },
        set_sale_order_pay: function(sale_order_pay) {
            this.set('sale_order_pay', sale_order_pay)
        },
        get_sale_order_pay: function() {
            return this.get('sale_order_pay');
        },
        set_invoice_id: function(invoice_id) {
            this.set('invoice_id', invoice_id)
        },
        get_invoice_id: function() {
            return this.get('invoice_id');
        },
        set_invoice_pay: function(invoice_pay) {
            this.set('invoice_pay', invoice_pay)
        },
        get_invoice_pay: function() {
            return this.get('invoice_pay');
        },
//      Product summary report
        set_order_summary_report_mode: function(order_summary_report_mode) {
            this.order_summary_report_mode = order_summary_report_mode;
        },
        get_order_summary_report_mode: function() {
            return this.order_summary_report_mode;
        },
        set_product_summary_report :function(product_summary_report) {
            this.product_summary_report = product_summary_report;
        },
        get_product_summary_report: function() {
            return this.product_summary_report;
        },
        set_result_expire_graph: function(result) {
            this.set('result', result);
        },
        get_result_expire_graph: function() {
            return this.get('result');
        },
//        Credit Management
        set_type_for_credit: function(type_for_credit) {
            this.set('type_for_credit', type_for_credit);
        },
        get_type_for_credit: function() {
            return this.get('type_for_credit');
        },
        set_change_amount_for_credit: function(change_amount_for_credit) {
            this.set('change_amount_for_credit', change_amount_for_credit);
        },
        get_change_amount_for_credit: function() {
            return this.get('change_amount_for_credit');
        },
        set_ledger_click: function(ledger_click){
            this.ledger_click = ledger_click;
        },
        get_ledger_click: function() {
            return this.ledger_click;
        },
        set_change_and_cash: function(change_and_cash) {
            this.change_and_cash = change_and_cash;
        },
        get_change_and_cash: function() {
            return this.change_and_cash;
        },
        set_use_credit: function(use_credit) {
            this.set('use_credit', use_credit);
        },
        get_use_credit: function() {
            return this.get('use_credit');
        },
        set_client_name: function(client_name){
            this.client_name = client_name;
        },
        get_client_name: function(){
            return this.client_name;
        },
        set_credit_mode: function(credit_mode) {
            this.credit_mode = credit_mode;
        },
        get_credit_mode: function() {
            return this.credit_mode;
        },
        set_credit_detail: function(credit_detail) {
            var data = this.get('credit_detail')
            data.push(credit_detail);
            this.set('credit_detail',data);
        },
        get_credit_detail: function() {
            return this.get('credit_detail')
        },
        set_customer_credit:function(){
            var data = this.get('customer_credit')
            data = true;
            this.set('customer_credit',data);
        },
        get_customer_credit: function() {
            return this.get('customer_credit')
        },
        set_order_make_picking: function(order_make_picking) {
            this.set('order_make_picking', order_make_picking);
        },
        get_order_make_picking: function() {
            return this.get('order_make_picking');
        },
        set_paying_order: function(val){
            this.set('paying_order',val)
        },
        get_paying_order: function(){
            return this.get('paying_order')
        },
//        Sale Summary Dashboard
        set_graph_data_journal: function(result) {
            this.set('result_graph_data_journal', result);
        },
        get_graph_data_journal: function() {
            return this.get('result_graph_data_journal');
        },
        set_active_session_sales: function(active_session_sale){
            this.set('active_session_sale',active_session_sale)
        },
        get_active_session_sales: function(){
            return this.get('active_session_sale');
        },
        set_closed_session_sales: function(closed_session_sale){
            this.set('closed_session_sale',closed_session_sale)
        },
        get_closed_session_sales: function(){
            return this.get('closed_session_sale');
        },
        set_hourly_summary: function(hourly_summary){
            this.set('hourly_summary',hourly_summary)
        },
        get_hourly_summary: function(){
            return this.get('hourly_summary');
        },
        set_month_summary: function(month_summary){
            this.set('month_summary',month_summary);
        },
        get_month_summary: function(){
            return this.get('month_summary');
        },
        set_six_month_summary: function(six_month_summary){
            this.set('last_six_month_sale',six_month_summary);
        },
        get_six_month_summary: function(){
            return this.get('last_six_month_sale');
        },
        set_customer_summary: function(customer_summary){
            this.set('customer_summary',customer_summary);
        },
        get_customer_summary: function(){
            return this.get('customer_summary');
        },
        set_top_product_result: function(top_products){
            this.set('top_product',top_products);
        },
        get_top_product_result: function(){
            return this.get('top_product');
        },
    });

    var _super_orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            _super_orderline.initialize.call(this, attr, options);
            this.line_note = '';
            this.oid = null;
            this.backorder = null;
            this.bag_color = false;
            this.is_bag = false;
            this.promotion = {};
            this.child_line_id = false;
            this.product_ids = false;
            this.buy_x_get_y_child_item = false;
            this.discount_line_id = false;
            this.discount_rule_name = false;
            this.quantity_discount = false;
            this.discount_amt_rule = false;
            this.discount_amt = false;
            this.multi_prods_line_id = false;
            this.is_rule_applied = false;
            this.combinational_product_rule = false;
            this.multi_prod_categ_rule = false;
            this.disc_above_price = false;
            this.set({
                location_id: false,
                location_name: false,
            });
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
        is_print_serial: function() {
            var order = this.pos.get('selectedOrder');
            return order.get_print_serial();
        },
        export_for_printing: function() {
            var lines = _super_orderline.export_for_printing.call(this);
            var order = this.pos.get('selectedOrder');
            lines.original_price = this.get_original_price() || false;
            var serials = "Serial No(s).: ";
            var serials_lot = [];
            var self = this;
            if(this.pack_lot_lines && this.pack_lot_lines.models){
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
            } else { serials = "";}
            var new_attr = {
                line_note: this.get_line_note(),
                promotion_data: this.get_promotion_data() || false,
                serials: serials ? serials : false,
                return_valid_days: this.get_return_valid_days(),
                is_print: order.get_print_serial()
            }
            $.extend(lines, new_attr);
            return lines;
        },
        get_required_number_of_lots: function(){
            var lots_required = 1;
            lots_required = this.quantity;
            return lots_required;
        },

        set_promotion: function(promotion) {
            this.set('promotion', promotion);
        },
        get_promotion: function() {
            return this.get('promotion');
        },
        set_child_line_id: function(child_line_id){
            this.child_line_id = child_line_id;
        },
        get_child_line_id: function(){
            return this.child_line_id;
        },
        set_buy_x_get_dis_y: function(product_ids){
            this.product_ids = product_ids;
        },
        get_buy_x_get_dis_y: function(){
            return this.product_ids;
        },
        set_buy_x_get_y_child_item: function(buy_x_get_y_child_item){
            this.buy_x_get_y_child_item = buy_x_get_y_child_item;
        },
        get_buy_x_get_y_child_item: function(buy_x_get_y_child_item){
            return this.buy_x_get_y_child_item;
        },
        set_discount_line_id: function(discount_line_id){
            this.discount_line_id = discount_line_id;
        },
        get_discount_line_id: function(discount_line_id){
            return this.discount_line_id;
        },
        set_quantity_discount: function(quantity_discount){
            this.quantity_discount = quantity_discount;
        },
        get_quantity_discount: function(){
            return this.quantity_discount;
        },
        set_discount_amt_rule: function(discount_amt_rule){
            this.discount_amt_rule = discount_amt_rule;
        },
        get_discount_amt_rule: function(){
            return this.discount_amt_rule;
        },
        set_discount_amt: function(discount_amt){
            this.discount_amt = discount_amt;
        },
        get_discount_amt: function(){
            return this.discount_amt;
        },
        get_discount_amt_str: function(){
            return this.pos.chrome.format_currency(this.discount_amt);
        },
        set_multi_prods_line_id: function(multi_prods_line_id){
            this.multi_prods_line_id = multi_prods_line_id;
        },
        get_multi_prods_line_id: function(){
            return this.multi_prods_line_id;
        },
        set_is_rule_applied: function(is_rule_applied){
            this.is_rule_applied = is_rule_applied;
        },
        get_is_rule_applied: function(){
            return this.is_rule_applied;
        },
        set_combinational_product_rule: function(combinational_product_rule){
            this.combinational_product_rule = combinational_product_rule;
        },
        get_combinational_product_rule: function(){
            return this.combinational_product_rule;
        },
        set_multi_prod_categ_rule: function(multi_prod_categ_rule){
            this.multi_prod_categ_rule = multi_prod_categ_rule;
        },
        get_multi_prod_categ_rule: function(){
            return this.multi_prod_categ_rule;
        },
    });

    var _super_paymentline = models.Paymentline.prototype;
    models.Paymentline = models.Paymentline.extend({
        initialize: function(attributes, options) {
           var self = this;
           _super_paymentline.initialize.apply(this, arguments);
        },
        set_freeze_line: function(freeze_line){
            this.set('freeze_line', freeze_line)
        },
        get_freeze_line: function(){
            return this.get('freeze_line')
        },
        set_giftcard_line_code: function(gift_card_code) {
            this.gift_card_code = gift_card_code;
        },
        get_giftcard_line_code: function(){
            return this.gift_card_code;
        },
        set_freeze: function(freeze) {
            this.freeze = freeze;
        },
        get_freeze: function(){
            return this.freeze;
        },
        set_gift_voucher_line_code: function(code) {
            this.code = code;
        },
        get_gift_voucher_line_code: function(){
            return this.code;
        },
        set_pid: function(pid) {
            this.pid = pid;
        },
        get_pid: function(){
            return this.pid;
        },
        set_payment_charge: function(val){
            this.set('payment_charge',val);
        },
        get_payment_charge: function(val){
            return this.get('payment_charge');
        },
    });

});