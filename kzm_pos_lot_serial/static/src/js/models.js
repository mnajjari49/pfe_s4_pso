odoo.define('kzm_pos_lot_serial.models', function (require) {
    "use strict";


    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;

    models.load_fields("product.product", ['type']);

    var _super_Order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options){
            this.serial_list = [];
            this.print_serial = true;
            var res = _super_Order.initialize.apply(this, arguments);
            return this;
        },
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
    });

    var _super_orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            _super_orderline.initialize.call(this, attr, options);
            this.set({
                location_id: false,
                location_name: false,
            });
        },
//        set_return_valid_days: function(return_valid_days){
//            this.return_valid_days = return_valid_days;
//        },
//        get_return_valid_days: function(return_valid_days){
//            return this.return_valid_days;
//        },
//        //Credit Management
//        set_from_credit: function(from_credit) {
//            this.from_credit = from_credit;
//        },
//        get_from_credit: function() {
//            return this.from_credit;
//        },
//        set_cancel_item: function(val){
//            this.set('cancel_item', val)
//        },
//        get_cancel_item: function(){
//            return this.get('cancel_item');
//        },
//        set_consider_qty: function(val){
//            this.set('consider_qty', val)
//        },
//        get_consider_qty: function(){
//            return this.get('consider_qty');
//        },
//        set_location_id: function(location_id){
//            this.set({
//                'location_id': location_id,
//            });
//        },
//        set_cancel_process: function(oid) {
//            this.set('cancel_process', oid)
//        },
//        get_cancel_process: function() {
//            return this.get('cancel_process');
//        },
//        set_cancel_item_id: function(val) {
//            this.set('cancel_item_id', val)
//        },
//        get_cancel_item_id: function() {
//            return this.get('cancel_item_id');
//        },
//        set_line_status: function(val) {
//            this.set('line_status', val)
//        },
//        get_line_status: function() {
//            return this.get('line_status');
//        },
//        get_location_id: function(){
//            return this.get('location_id');
//        },
//        set_location_name: function(location_name){
//            this.set({
//                'location_name': location_name,
//            });
//        },
//        get_location_name: function(){
//            return this.get('location_name');
//        },
//        set_quantity: function(quantity, keep_price){
//            if(quantity === 'remove'){
//                this.set_oid('');
//                this.pos.get_order().remove_orderline(this);
//                return;
//            }else{
//                _super_orderline.set_quantity.call(this, quantity, keep_price);
//            }
//            this.trigger('change',this);
//        },
//        set_bag_color: function(bag_color) {
//            this.bag_color = bag_color;
//        },
//        get_bag_color: function() {
//            return this.get('bag_color');
//        },
//        set_is_bag: function(is_bag){
//            this.is_bag = is_bag;
//        },
//        get_is_bag: function(){
//            return this.is_bag;
//        },
//        set_line_note: function(line_note) {
//            this.set('line_note', line_note);
//        },
//        get_line_note: function() {
//            return this.get('line_note');
//        },
//        set_oid: function(oid) {
//            this.set('oid', oid)
//        },
//        get_oid: function() {
//            return this.get('oid');
//        },
//        set_back_order: function(backorder) {
//            this.set('backorder', backorder);
//        },
//        get_back_order: function() {
//            return this.get('backorder');
//        },
//        set_delivery_charges_color: function(delivery_charges_color) {
//            this.delivery_charges_color = delivery_charges_color;
//        },
//        get_delivery_charges_color: function() {
//            return this.get('delivery_charges_color');
//        },
//        set_deliver_info: function(deliver_info) {
//            this.set('deliver_info', deliver_info);
//        },
//        get_deliver_info: function() {
//            return this.get('deliver_info');
//        },
//        set_delivery_charges_flag: function(delivery_charge_flag) {
//            this.set('delivery_charge_flag',delivery_charge_flag);
//        },
//        get_delivery_charges_flag: function() {
//            return this.get('delivery_charge_flag');
//        },
//        set_original_price: function(price){
//            this.set('original_price', price)
//        },
//        get_original_price: function(){
//            return this.get('original_price')
//        },
//        set_promotion_data: function(data){
//            this.promotion_data = data;
//        },
//        get_promotion_data: function(){
//            return this.promotion_data
//        },
        init_from_JSON: function(json) {
            _super_orderline.init_from_JSON.apply(this, arguments)
//            this.set_original_price(json.original_price);
        },
        export_as_JSON: function() {
            var lines = _super_orderline.export_as_JSON.call(this);
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
//                line_note: this.get_line_note(),
//                cost_price: this.product.standard_price,
//                return_process: return_process,
//                return_qty: parseInt(return_qty),
//                back_order: this.get_back_order(),
//                deliver: this.get_deliver_info(),
                location_id: this.get_location_id() || default_stock_location,
//                from_credit:this.get_from_credit(),
                //reservation
//                cancel_item: this.get_cancel_item() || false,
//                cancel_process: this.get_cancel_process() || false,
//                cancel_qty: this.get_quantity() || false,
//                consider_qty : this.get_consider_qty(),
//                cancel_item_id: this.get_cancel_item_id() || false,
                new_line_status: this.get_line_status() || false,
                serial_nums: this.lots || false,
//                return_valid_days: this.get_return_valid_days(),
            }
            $.extend(lines, new_attr);
            return lines;
        },
        is_print_serial: function() {
            var order = this.pos.get('selectedOrder');
            return order.get_print_serial();
        },
        get_required_number_of_lots: function(){
            var lots_required = 1;
            lots_required = this.quantity;
            return lots_required;
        },
//        can_be_merged_with: function(orderline){
//            var merged_lines = _super_orderline.can_be_merged_with.call(this, orderline);
//            if((this.get_quantity() < 0 || orderline.get_quantity() < 0)){
//                return false;
//            } else if(!merged_lines){
//                if (!this.manual_price) {
//                    if(this.get_location_id() !== this.pos.shop.id){
//                        return false
//                    }
//                    if(this.get_promotion() && this.get_promotion().parent_product_id){
//                        return false;
//                    }else{
//                        return (this.get_product().id === orderline.get_product().id);
//                    }
//                } else {
//                    return false;
//                }
//            } else {
//                if(this.get_is_rule_applied()){
//                    return false;
//                } else{
//                    return merged_lines
//                }
//            }
//        },
//        merge: function(orderline){
//            if (this.get_oid()/* || this.pos.get_order().get_missing_mode()*/) {
//                this.set_quantity(this.get_quantity() + orderline.get_quantity() * -1);
//            } else {
//                _super_orderline.merge.call(this, orderline);
//            }
//        },
//        set_promotion: function(promotion) {
//            this.set('promotion', promotion);
//        },
//        get_promotion: function() {
//            return this.get('promotion');
//        },
//        set_child_line_id: function(child_line_id){
//            this.child_line_id = child_line_id;
//        },
//        get_child_line_id: function(){
//            return this.child_line_id;
//        },
//        set_buy_x_get_dis_y: function(product_ids){
//            this.product_ids = product_ids;
//        },
//        get_buy_x_get_dis_y: function(){
//            return this.product_ids;
//        },
//        set_buy_x_get_y_child_item: function(buy_x_get_y_child_item){
//            this.buy_x_get_y_child_item = buy_x_get_y_child_item;
//        },
//        get_buy_x_get_y_child_item: function(buy_x_get_y_child_item){
//            return this.buy_x_get_y_child_item;
//        },
//        set_discount_line_id: function(discount_line_id){
//            this.discount_line_id = discount_line_id;
//        },
//        get_discount_line_id: function(discount_line_id){
//            return this.discount_line_id;
//        },
//        set_quantity_discount: function(quantity_discount){
//            this.quantity_discount = quantity_discount;
//        },
//        get_quantity_discount: function(){
//            return this.quantity_discount;
//        },
//        set_discount_amt_rule: function(discount_amt_rule){
//            this.discount_amt_rule = discount_amt_rule;
//        },
//        get_discount_amt_rule: function(){
//            return this.discount_amt_rule;
//        },
//        set_discount_amt: function(discount_amt){
//            this.discount_amt = discount_amt;
//        },
//        get_discount_amt: function(){
//            return this.discount_amt;
//        },
//        get_discount_amt_str: function(){
//            return this.pos.chrome.format_currency(this.discount_amt);
//        },
//        set_multi_prods_line_id: function(multi_prods_line_id){
//            this.multi_prods_line_id = multi_prods_line_id;
//        },
//        get_multi_prods_line_id: function(){
//            return this.multi_prods_line_id;
//        },
//        set_is_rule_applied: function(is_rule_applied){
//            this.is_rule_applied = is_rule_applied;
//        },
//        get_is_rule_applied: function(){
//            return this.is_rule_applied;
//        },
//        set_combinational_product_rule: function(combinational_product_rule){
//            this.combinational_product_rule = combinational_product_rule;
//        },
//        get_combinational_product_rule: function(){
//            return this.combinational_product_rule;
//        },
//        set_multi_prod_categ_rule: function(multi_prod_categ_rule){
//            this.multi_prod_categ_rule = multi_prod_categ_rule;
//        },
//        get_multi_prod_categ_rule: function(){
//            return this.multi_prod_categ_rule;
//        },
    });


    });